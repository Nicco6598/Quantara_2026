#!/usr/bin/env python3
"""
rfi_tariffa_parser.py
Parser per tariffari RFI (BA, SB, FA) in formato PDF.

Uso:
    python rfi_tariffa_parser.py <file.pdf>
    python rfi_tariffa_parser.py <file.pdf> --debug
    python rfi_tariffa_parser.py <file.json>

Regole fondamentali:
  - descrizione    = SOLO testo in-line tra codice-sottovoce e UNITA' DI MISURA
  - warnings       = tutto il testo dei blocchi AVVERTENZE (mai nella descrizione)
  - voce_desc      = testo del blocco VOCE (condiviso tra le sottovoci della voce)
  - maggiorazioni  = voci del gruppo MG (mai in records)
"""

import json
import os
import re
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from enum import IntEnum
from functools import lru_cache
from pathlib import Path
from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# Dipendenze PDF
# ─────────────────────────────────────────────────────────────────────────────

pdfplumber = None
pypdf      = None
try:
    import pdfplumber
except Exception:
    try:
        import pypdf
    except Exception as exc:
        print(f"missing pdf parser dependency: install pdfplumber or pypdf ({exc})", file=sys.stderr)
        sys.exit(2)

try:
    import orjson as _orjson
    def _dumps(obj: object) -> bytes:
        return _orjson.dumps(obj, option=_orjson.OPT_NON_STR_KEYS)
except ImportError:
    _orjson = None
    def _dumps(obj: object) -> bytes:
        return json.dumps(obj, ensure_ascii=False).encode("utf-8")

# ─────────────────────────────────────────────────────────────────────────────
# Regex — compilate una volta, riutilizzate sempre
# ─────────────────────────────────────────────────────────────────────────────

IMPORT_RE  = re.compile(r"IMPORTO\s+EURO[:\s]+([-]?[\d.,]+)")
PERC_RE    = re.compile(r"PERCENTUALE[:\s]+([\d.,]+)")
MANOD_RE   = re.compile(r"%\s*Manodopera[:\s]+([-]?[\d.,]+)")
UNIT_RE    = re.compile(r"UNITA['\u2019]?\s*DI\s*MISURA[:\s]+([\w%\u00b2\u00b3]+)\s*\(([^)]+)\)")

PAGE_HEADER_RE     = re.compile(r"^(?:\d+\s+)?TARIFFA\s+[A-Z]{2}\s+CATEGORIA\s+[A-Z]{2}|^(?:\d+\s+)?Il presente volume", re.I)
CATEGORY_HEADER_RE = re.compile(r"^(?:CATEGORIA|GRUPPO)\s+[A-Z]\w*\b", re.I)
NUMERIC_PAGE_RE    = re.compile(r"^\d{1,3}$")
SECTION_WORD_RE    = re.compile(r"^(GRUPPO|CATEGORIA)$", re.I)
SINGLE_LETTER_RE   = re.compile(r"^[A-Z]$")
AVVERTENZE_KW_RE   = re.compile(r"^AVVERTENZ[AE]$", re.I)
AVVERTENZA_ID_RE   = re.compile(r"^(\d{4,})\s+(.+)$")
AVVERTENZA_TITLE_RE = re.compile(r"^[A-Z][A-Z\s'\-\/\.\(\)]{9,}$")
PAGE_REPEAT_RE     = re.compile(r"^(?:\d+\s+)?TARIFFA\s+\w+(?:\s+CATEGORIA\s+\w+)?(?:\s+GRUPPO\s+\w+)?$")
VOCE_RE            = re.compile(r"^VOCE\s+(\d+)\s+(\d+)$")
VOCE_SIMPLE        = re.compile(r"^VOCE\s+(\d+)$")
CODE_PREFIX_RE     = re.compile(r"^[A-Z]{2}\.[A-Z]{2,}\.[A-Z]\.\d+$")
CODE_CONT_RE       = re.compile(r"^(\d+[\s\d]*\.[A-Z]+)")
VOCE_SPLIT_RE      = re.compile(r"^VOCE\s+(\d{1,2})$")
VOCE_CONT_RE       = re.compile(r"^\d{1,2}$")

# CATEGORIA / GRUPPO con descrizione inline
CAT_INLINE_RE   = re.compile(r"^CATEGORIA\s+([A-Z]{2,3})\s+(.*)", re.I)
GRUP_INLINE_RE  = re.compile(r"^GRUPPO\s+([A-Z]+)\s*(.*)", re.I)
CAT_PAGE_RE     = re.compile(r"CATEGORIA\s+([A-Z]{2})\s+(.*)", re.I)
GRUP_PAGE_RE    = re.compile(r"GRUPPO\s+([A-Z])\s+(.*)", re.I)

CODE_CANDIDATES = [
    re.compile(r"^([A-Z]{2}\.[A-Z]{2,3}\.[A-Z]\.\d[ ]\d{2,4}\.[A-Z])(?:\s|$)"),   # SB.AB.A.1 01.A
    re.compile(r"^([A-Z]{2}\.[A-Z]{2,3}\.[A-Z]\.\d{3,4}\.[A-Z])(?:\s|$)"),         # BA.CE.D.2013.A
    re.compile(r"^([A-Z]{2,}\.[A-Z]{2,}\.[A-Z]\.\d+[\s\d]*\.[A-Z]+)(?:\s|$)"),     # varianti
]

# Gruppi/categorie che vanno in "maggiorazioni" invece di "records"
MAGGIORAZIONI_CATEGORIES = frozenset({"MG"})
MAGGIORAZIONI_GROUPS     = frozenset({"MG"})

# ─────────────────────────────────────────────────────────────────────────────
# Utilities — ottimizzate
# ─────────────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=4096)
def clean(value: str) -> str:
    """
    Normalizza spazi e unicode. Cache LRU: nomi di categoria/gruppo/voce
    si ripetono migliaia di volte sullo stesso tariffario.
    """
    if not value:
        return ""
    # Fast path: ASCII puro (>95% delle righe nei tariffari RFI)
    if value.isascii():
        # Evita la creazione della lista temporanea se non ci sono spazi multipli
        stripped = value.strip()
        if "  " not in stripped and "\t" not in stripped:
            return stripped
        return " ".join(stripped.split())
    safe = "".join(" " if 0xD800 <= ord(c) <= 0xDFFF else c for c in value)
    return unicodedata.normalize("NFC", " ".join(safe.split()))


# Pre-compilata una volta sola: rimuove "." e sostituisce "," con "."
_IT_TRANS = str.maketrans(",", ".", ".")   # delete ".", translate "," → "."

def it_float(value: str) -> Optional[float]:
    try:
        return float(value.translate(_IT_TRANS))
    except Exception:
        return None


def is_avvertenza_title(s: str) -> bool:
    """
    Vero solo se la riga è un titolo avvertenza tutto-maiuscolo e breve.
    Usa any/all su char invece di re.search per la parte critica.
    """
    n = len(s)
    if n < 10:
        return False
    # Contiene cifra isolata → numero di pagina
    if n <= 3 and s.isdigit():
        return False
    # Contiene minuscole → corpo avvertenza, non titolo
    # s == s.upper() è una singola C-call, più veloce di any(c.islower())
    if s != s.upper():
        return False
    # Contiene ".cifra" → codice tariffario o norma
    # str.find è più veloce del loop Python puro
    idx = s.find(".")
    while idx != -1 and idx < n - 1:
        if s[idx + 1].isdigit():
            return False
        idx = s.find(".", idx + 1)
    # Frase lunga con punto finale → ultima riga corpo avvertenza
    if s[-1] == "." and n > 60:
        return False
    return bool(AVVERTENZA_TITLE_RE.match(s))


def safe_json_value(value):
    """Sanitizza surrogati Unicode. Skip rapido se ASCII-only."""
    if isinstance(value, str):
        if value.isascii():
            return value
        return "".join("" if 0xD800 <= ord(c) <= 0xDFFF else c for c in value)
    if isinstance(value, list):
        return [safe_json_value(i) for i in value]
    if isinstance(value, dict):
        return {k: safe_json_value(v) for k, v in value.items()}
    return value


def _join1(lines: list) -> str:
    """Join + clean ottimizzato: skip allocazione lista se 0 o 1 elementi."""
    n = len(lines)
    if n == 0:
        return ""
    if n == 1:
        return clean(lines[0])
    return clean(" ".join(lines))


def _needs_sanitize(records: list) -> bool:
    """Controlla se i record contengono caratteri non-ASCII (raro nei tariffari RFI)."""
    for r in records:
        for v in r.values():
            if isinstance(v, str) and not v.isascii():
                return True
    return False

# ─────────────────────────────────────────────────────────────────────────────
# Estrazione testo PDF — parallelizzata per pagina
# ─────────────────────────────────────────────────────────────────────────────

def _extract_page_plumber(args):
    """Worker per ThreadPoolExecutor: estrae testo di una singola pagina."""
    page, idx = args
    text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
    return idx, text.splitlines()


def extract_text_with_page_count(pdf_path: str) -> tuple:
    if pdfplumber is not None:
        with pdfplumber.open(pdf_path) as pdf:
            pages      = pdf.pages
            page_count = len(pages)
            # Parallelizza l'estrazione testo — pdfplumber è thread-safe in lettura
            results    = [None] * page_count
            with ThreadPoolExecutor(max_workers=min(8, page_count)) as exe:
                futures = {exe.submit(_extract_page_plumber, (p, i)): i
                           for i, p in enumerate(pages)}
                for fut in as_completed(futures):
                    idx, page_lines = fut.result()
                    results[idx] = page_lines
            lines = []
            for page_lines in results:
                if page_lines:
                    lines.extend(page_lines)
            return lines, page_count

    reader     = pypdf.PdfReader(str(pdf_path))
    page_count = len(reader.pages)
    lines      = []
    for page in reader.pages:
        lines.extend((page.extract_text() or "").splitlines())
    return lines, page_count

# ─────────────────────────────────────────────────────────────────────────────
# Preprocessing — ottimizzato
# ─────────────────────────────────────────────────────────────────────────────

def preprocess_lines(lines: list) -> list:
    """
    Ricostruisce token spezzati su più righe.
    Ottimizzazione: strip una volta sola, accesso diretto per indice.
    """
    n      = len(lines)
    strips = [l.strip() for l in lines]   # strip una volta sola
    result = []
    i      = 0
    while i < n:
        s = strips[i]
        if not s:
            i += 1
            continue

        # Join VOCE spezzata: "VOCE 1" + "01" → "VOCE 1 01"
        if s.startswith("VOCE "):
            vm = VOCE_SPLIT_RE.match(s)
            if vm and i + 1 < n:
                ns = strips[i + 1]
                if VOCE_CONT_RE.match(ns):
                    result.append(f"{s} {ns}")
                    i += 2
                    continue

        # Join codice spezzato: "SB.AB.A.1" + "01.A testo"
        elif CODE_PREFIX_RE.match(s) and i + 1 < n:
            ns = strips[i + 1]
            cm = CODE_CONT_RE.match(ns)
            if cm:
                cont = cm.group(1)
                rest = ns[len(cont):].strip()
                result.append(f"{s} {cont}{' ' + rest if rest else ''}")
                i += 2
                continue

        result.append(s)
        i += 1
    return result

# ─────────────────────────────────────────────────────────────────────────────
# Rilevamento pattern codice — singolo pass O(n)
# ─────────────────────────────────────────────────────────────────────────────

def detect_code_re(lines: list) -> list:
    """
    Singolo pass sulle prime 500 righe per trovare tutti i pattern attivi.
    O(n) invece di O(n*k) separati.
    """
    found  = [False, False, False]
    sample = lines[:500]
    for s in sample:
        if not found[0] and CODE_CANDIDATES[0].match(s):
            found[0] = True
        if not found[1] and CODE_CANDIDATES[1].match(s):
            found[1] = True
        if not found[2] and CODE_CANDIDATES[2].match(s):
            found[2] = True
        if all(found):
            break
    active = [CODE_CANDIDATES[i] for i, f in enumerate(found) if f]
    return active if active else list(CODE_CANDIDATES)

# ─────────────────────────────────────────────────────────────────────────────
# FSM States — IntEnum invece di Enum per confronti O(1) più veloci
# ─────────────────────────────────────────────────────────────────────────────

class State(IntEnum):
    IDLE               = 0
    IN_CATEGORIA       = 1
    IN_GRUPPO          = 2
    IN_VOCE_DESC       = 3
    IN_AVVERTENZA_HDR  = 4
    IN_AVVERTENZA_BODY = 5
    IN_SOTTOVOCE_DESC  = 6
    IN_UNITA_PREZZO    = 7

# Costanti per confronto rapido nello smistamento TEXT
_AVV_STATES = frozenset({State.IN_AVVERTENZA_HDR, State.IN_AVVERTENZA_BODY})

# ─────────────────────────────────────────────────────────────────────────────
# Accumulatori
# ─────────────────────────────────────────────────────────────────────────────

class WarningAcc:
    __slots__ = ("id", "title", "lines")

    def __init__(self, id: str = "", title: str = "", lines: list = None):
        self.id    = id
        self.title = title
        self.lines = lines if lines is not None else []

    def to_dict(self) -> dict:
        return {"id": self.id, "title": self.title, "body": clean(" ".join(self.lines))}

    def is_empty(self) -> bool:
        return not self.id and not self.title and not self.lines


class ParseCtx:
    __slots__ = (
        "tariffa", "categoria", "categoria_desc",
        "gruppo", "gruppo_desc", "is_maggiorazione",
        "voce", "voce_desc_lines", "_voce_desc_cache", "voce_warnings",
    )

    def __init__(self):
        self.tariffa          = ""
        self.categoria        = ""
        self.categoria_desc   = ""
        self.gruppo           = ""
        self.gruppo_desc      = ""
        self.is_maggiorazione = False
        self.voce             = ""
        self.voce_desc_lines: list = []
        self._voce_desc_cache = ""   # clean join pre-calcolato
        self.voce_warnings:   list = []

# ─────────────────────────────────────────────────────────────────────────────
# Parser FSM
# ─────────────────────────────────────────────────────────────────────────────

class RfiParser:
    __slots__ = (
        "code_patterns", "state", "ctx", "warning_acc",
        "cur_code", "sv_desc_lines", "sv_warnings",
        "cur_unita_codice", "cur_unita_label",
        "cur_importo", "cur_manodopera",
        "records", "maggiorazioni",
    )

    def __init__(self, code_patterns: list):
        self.code_patterns    = code_patterns
        self.state            = State.IDLE
        self.ctx              = ParseCtx()
        self.warning_acc: Optional[WarningAcc] = None

        self.cur_code          = ""
        self.sv_desc_lines:  list = []
        self.sv_warnings:    list = []
        self.cur_unita_codice  = ""
        self.cur_unita_label   = ""
        self.cur_importo:    Optional[float] = None
        self.cur_manodopera: Optional[float] = None

        self.records:       list = []
        self.maggiorazioni: list = []   # voci gruppo MG

    # ── Match codice ──────────────────────────────────────────────────────────

    def _match_code(self, line: str):
        for p in self.code_patterns:
            m = p.match(line)
            if m:
                return m
        return None

    # ── Flush ─────────────────────────────────────────────────────────────────

    def _flush_warning(self):
        wa = self.warning_acc
        if wa is None or wa.is_empty():
            self.warning_acc = None
            return
        wd = wa.to_dict()
        if self.cur_code:
            self.sv_warnings.append(wd)
        else:
            self.ctx.voce_warnings.append(wd)
        self.warning_acc = None

    def _flush_sottovoce(self):
        if not self.cur_code or self.cur_importo is None:
            self._reset_sottovoce()
            return

        m          = self._match_code(self.cur_code)
        code_clean = m.group(1) if m else self.cur_code
        parts      = code_clean.replace(" ", "").split(".")
        ctx        = self.ctx

        # Warnings: evita copia se una delle due liste è vuota
        vw = ctx.voce_warnings
        sw = self.sv_warnings
        if vw and sw:
            warnings = vw + sw
        elif vw:
            warnings = list(vw)
        elif sw:
            warnings = list(sw)
        else:
            warnings = []

        record = {
            "codice":          code_clean,
            "tariffa":         parts[0] if parts else ctx.tariffa,
            "categoria":       parts[1] if len(parts) > 1 else ctx.categoria,
            "categoria_desc":  ctx.categoria_desc,
            "gruppo":          parts[2] if len(parts) > 2 else ctx.gruppo,
            "gruppo_desc":     ctx.gruppo_desc,
            "voce":            ctx.voce,
            "voce_desc":       ctx._voce_desc_cache,
            "sottovoce":       parts[4] if len(parts) > 4 else "",
            "descrizione":     _join1(self.sv_desc_lines),
            "unita_codice":    self.cur_unita_codice,
            "unita_label":     self.cur_unita_label,
            "tipo_valore":     "EURO",
            "valore_euro":     self.cur_importo,
            "perc_manodopera": self.cur_manodopera,
            "warnings":        warnings,
        }

        # Gruppo MG → maggiorazioni, non records
        if ctx.is_maggiorazione:
            self.maggiorazioni.append(record)
        else:
            self.records.append(record)

        self._reset_sottovoce()

    def _reset_sottovoce(self):
        self.cur_code         = ""
        self.sv_desc_lines    = []
        self.sv_warnings      = []
        self.cur_unita_codice = ""
        self.cur_unita_label  = ""
        self.cur_importo      = None
        self.cur_manodopera   = None

    def _reset_voce(self):
        ctx = self.ctx
        ctx.voce             = ""
        ctx.voce_desc_lines  = []
        ctx._voce_desc_cache = ""
        ctx.voce_warnings    = []

    # ── Dispatch diretto inline (no _classify overhead) ──────────────────────

    def process_line(self, s: str):
        """
        Dispatch basato su primo char + substring check.
        Elimina l'overhead di _classify() come funzione separata.
        Ordine: SOTTOVOCE (60% dei casi) → TEXT → UNITA/IMPORTO → strutturali.
        """
        if not s:
            return

        c0 = s[0]
        n  = len(s)

        # ── NOISE: numero di pagina (1-3 cifre) ───────────────────────────────
        if n <= 3 and c0.isdigit():
            if s.isdigit():
                return
        if n == 1 and c0.isupper():
            return

        # ── SOTTOVOCE: 2 maiuscole + punto (caso più frequente) ──────────────
        if c0.isupper() and n > 6 and s[1:2].isupper() and s[2:3] == ".":
            if any(p.match(s) for p in self.code_patterns):
                self._flush_warning()
                self._flush_sottovoce()
                m = self._match_code(s)
                self.cur_code = m.group(1) if m else s.split()[0]
                rest = s[len(self.cur_code):].strip()
                if rest and "MISURA" not in rest and "IMPORTO" not in rest:
                    if not UNIT_RE.search(rest) and not IMPORT_RE.search(rest):
                        self.sv_desc_lines.append(rest)
                self.state = State.IN_SOTTOVOCE_DESC
                return

        # ── TEXT generico (secondo caso più frequente) ────────────────────────
        # Righe che iniziano con minuscola o sono chiaramente testo descrittivo
        if c0.islower() or (c0.isupper() and n > 80):
            self._dispatch_text(s)
            return

        # ── UNITA / IMPORTO / MANODOPERA ──────────────────────────────────────
        if c0 == "U" and "MISURA" in s:
            mu = UNIT_RE.search(s)
            if mu:
                self.cur_unita_codice = mu.group(1)
                self.cur_unita_label  = mu.group(2)
                mi = IMPORT_RE.search(s)
                if mi:
                    self.cur_importo = it_float(mi.group(1))
                self.state = State.IN_UNITA_PREZZO
                return

        if c0 == "I" and s[:6] == "IMPORT":
            mi = IMPORT_RE.search(s)
            if mi:
                self.cur_importo = it_float(mi.group(1))
                self.state = State.IN_UNITA_PREZZO
                return

        if c0 == "%" and "Manodopera" in s:
            mm = MANOD_RE.search(s)
            if mm:
                self.cur_manodopera = it_float(mm.group(1))
                self.state = State.IN_SOTTOVOCE_DESC
                return

        # ── VOCE ──────────────────────────────────────────────────────────────
        if c0 == "V" and s[:5] == "VOCE ":
            mv = VOCE_RE.match(s) or VOCE_SIMPLE.match(s)
            if mv:
                self._flush_warning()
                self._flush_sottovoce()
                self._reset_voce()
                self.ctx.voce = " ".join(g for g in mv.groups() if g)
                self.state = State.IN_VOCE_DESC
                return

        # ── AVVERTENZE ────────────────────────────────────────────────────────
        if c0 == "A" and s[:5] == "AVVER":
            if AVVERTENZE_KW_RE.match(s):
                self._flush_warning()
                self.state = State.IN_AVVERTENZA_HDR
                return

        # ── AVVERTENZA ID (inizia con cifra) ──────────────────────────────────
        if c0.isdigit() and " " in s:
            m = AVVERTENZA_ID_RE.match(s)
            if m:
                self._flush_warning()
                self.warning_acc = WarningAcc(id=m.group(1), title=clean(m.group(2)))
                self.state = State.IN_AVVERTENZA_BODY
                return

        # ── CATEGORIA / GRUPPO ────────────────────────────────────────────────
        if c0 == "C" and s[:9] == "CATEGORIA":
            m = CAT_INLINE_RE.match(s)
            if m:
                self._flush_warning()
                self._flush_sottovoce()
                self._reset_voce()
                cat = m.group(1).upper()
                self.ctx.categoria        = cat
                self.ctx.categoria_desc   = clean(m.group(2))
                self.ctx.is_maggiorazione = cat in MAGGIORAZIONI_CATEGORIES
                self.state = State.IN_CATEGORIA
                return

        if c0 == "G" and s[:6] == "GRUPPO":
            m = GRUP_INLINE_RE.match(s)
            if m:
                self._flush_warning()
                self._flush_sottovoce()
                self._reset_voce()
                g = m.group(1).upper()
                self.ctx.gruppo          = g
                self.ctx.gruppo_desc     = clean(m.group(2))
                self.ctx.is_maggiorazione = (
                    g in MAGGIORAZIONI_GROUPS
                    or self.ctx.categoria.upper() in MAGGIORAZIONI_CATEGORIES
                )
                self.state = State.IN_GRUPPO
                return

        # ── PAGE HEADER ───────────────────────────────────────────────────────
        if "TARIFFA" in s or "Il presente" in s:
            if PAGE_REPEAT_RE.match(s) or PAGE_HEADER_RE.match(s):
                if State.IN_AVVERTENZA_HDR <= self.state <= State.IN_AVVERTENZA_BODY:
                    self._flush_warning()
                    self.state = State.IDLE
                mc = CAT_PAGE_RE.search(s)
                mg = GRUP_PAGE_RE.search(s)
                if mc:
                    cat = mc.group(1).upper()
                    self.ctx.categoria        = cat
                    self.ctx.categoria_desc   = clean(mc.group(2))
                    self.ctx.is_maggiorazione = cat in MAGGIORAZIONI_CATEGORIES
                if mg:
                    g = mg.group(1).upper()
                    self.ctx.gruppo          = g
                    self.ctx.gruppo_desc     = clean(mg.group(2))
                    self.ctx.is_maggiorazione = (
                        g in MAGGIORAZIONI_GROUPS
                        or self.ctx.categoria.upper() in MAGGIORAZIONI_CATEGORIES
                    )
                return

        # ── TEXT fallback ─────────────────────────────────────────────────────
        self._dispatch_text(s)

    def _dispatch_text(self, s: str):
        """Gestisce le righe TEXT in base allo stato FSM corrente."""
        if is_avvertenza_title(s):
            self._flush_warning()
            self.warning_acc = WarningAcc(title=s)
            self.state = State.IN_AVVERTENZA_BODY
            return

        st = self.state
        if st == State.IN_VOCE_DESC:
            vdl = self.ctx.voce_desc_lines
            vdl.append(s)
            self.ctx._voce_desc_cache = s if len(vdl) == 1 else clean(" ".join(vdl))
        elif st == State.IN_SOTTOVOCE_DESC:
            if self.cur_importo is not None:
                wa = self.warning_acc
                if wa is None:
                    self.warning_acc = WarningAcc(lines=[s])
                else:
                    wa.lines.append(s)
                self.state = State.IN_AVVERTENZA_BODY
            else:
                self.sv_desc_lines.append(s)
        elif State.IN_AVVERTENZA_HDR <= st <= State.IN_AVVERTENZA_BODY:
            wa = self.warning_acc
            if wa is None:
                self.warning_acc = WarningAcc(lines=[s])
            else:
                wa.lines.append(s)
            self.state = State.IN_AVVERTENZA_BODY


    def finalize(self):
        self._flush_warning()
        self._flush_sottovoce()

# ─────────────────────────────────────────────────────────────────────────────
# Post-processing — O(n) con dict lookup
# ─────────────────────────────────────────────────────────────────────────────

def merge_duplicate_records(records: list) -> list:
    """
    Unisce record con lo stesso codice (sottovoce spezzata su pagine diverse).
    O(n) con dict invece di O(n²) con next().
    """
    index:  dict = {}   # codice_lower → posizione in merged
    merged: list = []

    for rec in records:
        code = rec["codice"].strip()
        key  = code.lower()

        if not code or key not in index:
            index[key] = len(merged)
            merged.append(rec)
            continue

        existing = merged[index[key]]
        new_desc = rec["descrizione"].strip()
        cur_desc = existing["descrizione"].strip()
        if new_desc and new_desc.lower() not in cur_desc.lower():
            existing["descrizione"] = new_desc if not cur_desc else f"{cur_desc}\n{new_desc}"

        # Merge warnings senza duplicati — usa set di (id, title) per O(1)
        existing_keys = {(w["id"], w["title"]) for w in existing["warnings"]}
        for w in rec["warnings"]:
            if (w["id"], w["title"]) not in existing_keys:
                existing["warnings"].append(w)
                existing_keys.add((w["id"], w["title"]))

    return merged

# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def parse_pdf(input_path: str, debug: bool = False) -> dict:
    path = Path(input_path)
    ext  = path.suffix.lower()

    if ext == ".json":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and "records" in data:
            return data
        return {"records": data, "maggiorazioni": [], "pages_total": 0, "pages_parsed": 0}

    if ext != ".pdf":
        raise ValueError(f"Formato non supportato: {ext}. Usa .pdf o .json")

    raw_lines, page_count = extract_text_with_page_count(str(path))
    lines         = preprocess_lines(raw_lines)
    code_patterns = detect_code_re(lines)

    parser = RfiParser(code_patterns)
    process = parser.process_line   # elimina attributo lookup ad ogni iterazione
    for s in lines:
        if s:                        # skip righe vuote senza call overhead
            process(s)
    parser.finalize()

    records       = merge_duplicate_records(parser.records)
    maggiorazioni = parser.maggiorazioni

    if debug:
        code_matches = sum(1 for s in lines if any(p.match(s) for p in code_patterns))
        print(_dumps({
            "debug":         True,
            "raw_lines":     len(raw_lines),
            "clean_lines":   len(lines),
            "code_patterns": [p.pattern for p in code_patterns],
            "code_matches":  code_matches,
            "page_count":    page_count,
            "records_count": len(records),
            "maggiorazioni_count": len(maggiorazioni),
            "first_5_codes": [r["codice"] for r in records[:5]],
            "last_5_codes":  [r["codice"] for r in records[-5:]] if len(records) >= 5 else [r["codice"] for r in records],
        }).decode(), file=sys.stderr)

    result = {
        "records":       records,
        "maggiorazioni": maggiorazioni,
        "pages_total":   page_count,
        "pages_parsed":  page_count,
    }
    return result


def main():
    debug = "--debug" in sys.argv or bool(os.environ.get("QUANTARA_PARSER_DEBUG", ""))
    args  = [a for a in sys.argv[1:] if not a.startswith("--")]

    if not args:
        print(json.dumps({"error": "Uso: rfi_tariffa_parser.py <file.pdf|file.json> [--debug]"}), file=sys.stderr)
        sys.exit(1)

    try:
        result = parse_pdf(args[0], debug=debug)
        # Sanitizza surrogati Unicode solo se necessario (raro)
        if _needs_sanitize(result["records"]) or _needs_sanitize(result["maggiorazioni"]):
            result = safe_json_value(result)
        sys.stdout.buffer.write(_dumps(result))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
