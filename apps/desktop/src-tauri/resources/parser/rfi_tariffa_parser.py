#!/usr/bin/env python3
"""
rfi_tariffa_parser.py — v11.0-audit-production
Parser robusto per tariffari RFI (FA, MO, BA, SB, AC, ...) in formato PDF.

Novità v11 — audit layer, source mapping, confidence score, validation report e regole maggiorazioni:
  - Pass 1: parsing normale (records + maggiorazioni + raccolta raw avvertenze)
  - Pass 2: post-processing avvertenze con scope detection e applicazione gerarchica
  - Pass 3: audit post-process con source page, confidence, issues, warning type e maggiorazioni rules

Scope supportati (dal più specifico al più generale):
  sottovoce  → "Avvertenza alla sottovoce FA.PM.A.2001.A"
  voce       → "Avvertenza alla voce FA.PM.A.2000" / "Avvertenza n°1 alla voce MO.AI.F.3137"
  gruppo     → "Avvertenza al gruppo FA.PM.B"
  categoria  → "Avvertenza n°1 alla categoria MO.AC" / "Avvertenza alla categoria CT"
  tariffa    → "Avvertenza Generale n°1 alla tariffa MO" / "Avvertenza generale alla Tariffa FA"
  generico   → qualsiasi avvertenza senza codice esplicito → associata al contesto corrente

Ogni record riceve nel campo "warnings" solo le avvertenze che lo riguardano,
ordinate dal più specifico al più generale.
"""

import json
import os
import re
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from enum import IntEnum
from functools import lru_cache
from pathlib import Path
from typing import Optional
from collections import Counter, defaultdict

# ---------------------------------------------------------------------------
# Dipendenze PDF
# ---------------------------------------------------------------------------

_pdfium = None
pdfplumber = None
pypdf = None

try:
    import pypdfium2 as _pdfium
except ImportError:
    pass

if _pdfium is None:
    try:
        import pdfplumber
    except ImportError:
        pass

if _pdfium is None and pdfplumber is None:
    try:
        import pypdf
    except ImportError as exc:
        print(f"Installa almeno una libreria PDF: pip install pypdfium2 [{exc}]", file=sys.stderr)
        sys.exit(2)

try:
    import orjson as _orjson
    def _dumps(obj):
        return _orjson.dumps(obj, option=_orjson.OPT_NON_STR_KEYS)
except ImportError:
    _orjson = None
    def _dumps(obj):
        return json.dumps(obj, ensure_ascii=False).encode("utf-8")

# ---------------------------------------------------------------------------
# Regex principali
# ---------------------------------------------------------------------------

IMPORT_RE    = re.compile(r"IMPORTO\s+EURO[:\s]+([-]?[\d.,]+)")
PERC_RE      = re.compile(r"PERCENTUALE[:\s]+([-]?[\d.,]+)")
MANOD_RE     = re.compile(r"%\s*Manodopera[:\s]+([-]?[\d.,]+)")
UNIT_RE      = re.compile(r"UNITA['\u2019]?\s*DI\s*MISURA[:\s]+([^\s(]+(?:\s+[^\s(]+)?)\s*\(([^)]+)\)")
UNIT_BARE_RE = re.compile(r"UNITA['\u2019]?\s*DI\s*MISURA[:\s]+(\S+(?:\s+\S+)?)")

PAGE_HEADER_RE    = re.compile(r"^(?:\d+\s+)?TARIFFA\s+[A-Z]{2}\s+CATEGORIA\s+[A-Z]{2}|^(?:\d+\s+)?Il presente volume", re.I)
AVVERTENZE_KW_RE  = re.compile(r"^AVVERTENZ[AE](?:\s+GEN\s*ERALI|\s+GENERALI)?$", re.I)
AVVERTENZA_ID_RE  = re.compile(r"^(\d{4,})\s+(.{3,})$")
AVVERTENZA_TITLE_RE = re.compile(r"^[A-Z][A-Z\s'\-\/\.\(\)]{9,}$")
PAGE_REPEAT_RE    = re.compile(r"^(?:\d+\s+)?TARIFFA\s+\w+(?:\s+CATEGORIA\s+\w+)?(?:\s+GRUPPO\s+\w+)?$")
TARIFFA_PAGE_RE   = re.compile(r"^(?:\d+\s+)?TARIFFA\s+([A-Z]{2})\b", re.I)
VOCE_RE           = re.compile(r"^VOCE\s+(\d+)\s+(\d+)$")
VOCE_SIMPLE       = re.compile(r"^VOCE\s+(\d+)$")
CODE_PREFIX_RE    = re.compile(r"^[A-Z]{2}\.[A-Z]{2,}.[A-Z]\.\d+$")
CODE_CONT_RE      = re.compile(r"^(\d+[\s\d]*\.[A-Z]+)")
VOCE_SPLIT_RE     = re.compile(r"^VOCE\s+(\d{1,2})$")
VOCE_CONT_RE      = re.compile(r"^\d{1,2}$")
CAT_INLINE_RE     = re.compile(r"^CATEGORIA\s+([A-Z]{2,3})\s*(.*)", re.I)
GRUP_INLINE_RE    = re.compile(r"^GRUPPO\s+([A-Z]+)\s*(.*)", re.I)
CAT_PAGE_RE       = re.compile(r"CATEGORIA\s+([A-Z]{2})\s*(.*)", re.I)
GRUP_PAGE_RE      = re.compile(r"GRUPPO\s+([A-Z])\s*(.*)", re.I)

CODE_CANDIDATES = [
    re.compile(r"^([A-Z]{2}\.[A-Z]{2,3}\.[A-Z]\.\d[ ]\d{2,4}\.[A-Z])(?:\s|$)"),
    re.compile(r"^([A-Z]{2}\.[A-Z]{2,3}\.[A-Z]\.\d{3,4}\.[A-Z])(?:\s|$)"),
    re.compile(r"^([A-Z]{2,}\.[A-Z]{2,}\.[A-Z]\.\d+[\s\d]*\.[A-Z]+)(?:\s|$)"),
]

MAGGIORAZIONI_CATEGORIES = frozenset({"MG"})
_CITATION_PUNCT = frozenset({".", ",", ";", ".,", ". "})

# ---------------------------------------------------------------------------
# Regex per scope delle avvertenze
# ---------------------------------------------------------------------------
# Pattern: cerca il livello (tariffa/categoria/gruppo/voce/sottovoce)
# e un eventuale codice di riferimento dopo

# Livelli con codice esplicito tipo "XX.XX.X.NNNN" o "XX.XX.X.NNNN.X" o "XX.XX.X"
_CODE_IN_TITLE_RE = re.compile(
    r"\b([A-Z]{2}\.[A-Z]{2,3}(?:\.[A-Z](?:\.\d{3,4}(?:\.[A-Z])?)?)?)\b"
)
_FULL_CODE_REF_RE = re.compile(
    r"\b([A-Z]{2}\.[A-Z]{2,3}\.[A-Z]\.\d(?:\s?\d){2,3}(?:\.[A-Z])?)\b"
)
_CATEGORY_WORD_RE = re.compile(r"\bcategori[ae]\s+([A-Z]{2,3})\b", re.I)
_GROUP_WORD_RE = re.compile(r"\bgrupp[oi]\s+([A-Z])\b", re.I)
_VOICE_WORD_RE = re.compile(r"\bvoc[ei]\s+(?:n[.°]?\s*)?(\d(?:\s?\d){2,3})\b", re.I)
_SUBVOICE_WORD_RE = re.compile(r"\bsottovoc[ei]\s+([A-Z])\b", re.I)
_SCOPE_LEVEL_RE = re.compile(
    r"\b(tariff[ae]|categori[ae]|grupp[oi]|voc[ei]|sottovoc[ei])\b",
    re.IGNORECASE,
)

def _parse_warning_scope(title: str) -> tuple:
    """
    Ritorna (scope_level, ref_code) dove:
      scope_level = 'tariffa' | 'categoria' | 'gruppo' | 'voce' | 'sottovoce' | 'generic'
      ref_code    = es. 'FA.MG.A.0100' oppure 'MO.AC' oppure '' (generico)
    """
    sm = _SCOPE_LEVEL_RE.search(title)
    scope_raw = sm.group(1).lower() if sm else ""

    if scope_raw.startswith("tariff"):
        scope = "tariffa"
    elif scope_raw.startswith("categori"):
        scope = "categoria"
    elif scope_raw.startswith("grupp"):
        scope = "gruppo"
    elif scope_raw.startswith("sottovoce") or scope_raw.startswith("sottovoc"):
        scope = "sottovoce"
    elif scope_raw.startswith("voc"):
        scope = "voce"
    else:
        scope = "generic"

    cm = _CODE_IN_TITLE_RE.search(title)
    ref_code = _normalize_ref_code(cm.group(1)) if cm else ""

    # Corregge titoli tipo: "AVVERTENZA ALLE VOCI DELLA CATEGORIA AC.PP".
    # La parola "voci" è presente, ma lo scope effettivo è la categoria AC.PP.
    if ref_code:
        parts = ref_code.split(".")
        if len(parts) == 2:
            scope = "categoria"
        elif len(parts) == 3:
            scope = "gruppo"
        elif len(parts) == 4 and scope not in ("sottovoce",):
            scope = "voce"
        elif len(parts) >= 5:
            scope = "sottovoce"

    return scope, ref_code

def _normalize_ref_code(value: str) -> str:
    return clean(value).upper().replace(" ", "")

def _join_context(*parts: str) -> str:
    return ".".join(p for p in (_normalize_ref_code(x) for x in parts) if p)

def _deepest_context(ctx_tariffa: str, ctx_categoria: str, ctx_gruppo: str, ctx_voce: str = "") -> str:
    return _join_context(ctx_tariffa, ctx_categoria, ctx_gruppo, ctx_voce)

def _expand_warning_refs(w: dict) -> list:
    """Ritorna tutti i ref utili su cui indicizzare una warning.
    Include il ref principale, codici citati nel titolo/body e range semplici di voci.
    """
    refs = []
    primary = _normalize_ref_code(w.get("ref_code", ""))
    if primary:
        refs.append(primary)

    text = f"{w.get('title','')} {w.get('body','')}"
    codes = [_normalize_ref_code(m.group(1)) for m in _FULL_CODE_REF_RE.finditer(text)]
    refs.extend(codes)

    # Espansione range: BA.CE.D.2001 ... BA.CE.D.2003 -> 2001, 2002, 2003
    for a, b in zip(codes, codes[1:]):
        pa, pb = a.split("."), b.split(".")
        if len(pa) >= 4 and len(pb) >= 4 and pa[:3] == pb[:3]:
            try:
                na, nb = int(pa[3]), int(pb[3])
            except ValueError:
                continue
            if 0 < nb - na <= 60:
                width = max(len(pa[3]), len(pb[3]))
                refs.extend([".".join(pa[:3] + [str(n).zfill(width)]) for n in range(na, nb + 1)])

    out, seen = [], set()
    for r in refs:
        if r and r not in seen:
            seen.add(r); out.append(r)
    return out

def _extract_maggiorazione_refs(warnings: list) -> list:
    found, seen = [], set()
    for w in warnings:
        text = f"{w.get('title','')} {w.get('body','')}"
        for m in _FULL_CODE_REF_RE.finditer(text):
            code = _normalize_ref_code(m.group(1))
            parts = code.split(".")
            if len(parts) >= 5 and len(parts) > 1 and parts[1] == "MG" and code not in seen:
                seen.add(code); found.append(code)
    return found

def _infer_applicability_rules(warnings: list) -> dict:
    text = clean(" ".join(f"{w.get('title','')} {w.get('body','')}" for w in warnings)).lower()
    if not text:
        return {}
    mentions_maggiorazione = "maggioraz" in text or "sovrapprezzo" in text or "aument" in text
    return {
        "mentions_maggiorazione": mentions_maggiorazione,
        "quota_manodopera_only": "quota parte" in text and "manodopera" in text,
        "conditions": [c for c, needles in {
            "notturno": ("notturn",),
            "festivo": ("festiv",),
            "interruzione_esercizio": ("interruzione", "esercizio ferroviario"),
            "galleria": ("galleria",),
            "switch_off": ("switch-off", "switch off"),
            "fattore_k": ("fattore k",),
        }.items() if mentions_maggiorazione and any(n in text for n in needles)],
    }

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

@lru_cache(maxsize=4096)
def clean(value: str) -> str:
    if not value:
        return ""
    if value.isascii():
        stripped = value.strip()
        if " " not in stripped and "\t" not in stripped:
            return stripped
        return " ".join(stripped.split())
    safe = "".join(" " if 0xD800 <= ord(c) <= 0xDFFF else c for c in value)
    return unicodedata.normalize("NFC", " ".join(safe.split()))

_IT_TRANS = str.maketrans(",", ".", ".")

def it_float(value: str) -> Optional[float]:
    try:
        return float(value.translate(_IT_TRANS))
    except Exception:
        return None

def is_avvertenza_title(s: str) -> bool:
    n = len(s)
    if n < 10:
        return False
    if s != s.upper():
        return False
    idx = s.find(".")
    while idx != -1 and idx < n - 1:
        if s[idx + 1].isdigit():
            return False
        idx = s.find(".", idx + 1)
    if s[-1] == "." and n > 60:
        return False
    return bool(AVVERTENZA_TITLE_RE.match(s))

def safe_json_value(value):
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
    n = len(lines)
    if n == 0: return ""
    if n == 1: return clean(lines[0])
    return clean(" ".join(lines))

def _needs_sanitize(records: list) -> bool:
    for r in records:
        for v in r.values():
            if isinstance(v, str) and not v.isascii():
                return True
    return False

def _is_mag_cat(categoria: str) -> bool:
    return categoria.upper() in MAGGIORAZIONI_CATEGORIES

# ---------------------------------------------------------------------------
# Estrazione testo PDF
# ---------------------------------------------------------------------------

def _extract_page_plumber(args):
    page, idx = args
    text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
    return idx, text.splitlines()

def extract_text_with_page_count(pdf_path: str) -> tuple:
    if _pdfium is not None:
        doc = _pdfium.PdfDocument(pdf_path)
        page_count = len(doc)
        lines = []
        for i in range(page_count):
            pg = doc[i]
            tp = pg.get_textpage()
            lines.extend(tp.get_text_range().splitlines())
            tp.close(); pg.close()
        doc.close()
        if sum(len(l.strip()) for l in lines) > 200:
            return lines, page_count

    if pdfplumber is not None:
        with pdfplumber.open(pdf_path) as pdf:
            page_count = len(pdf.pages)
            results = [None] * page_count
            with ThreadPoolExecutor(max_workers=min(8, page_count)) as exe:
                futures = {exe.submit(_extract_page_plumber, (p, i)): i
                           for i, p in enumerate(pdf.pages)}
                for fut in as_completed(futures):
                    idx, page_lines = fut.result()
                    results[idx] = page_lines
            lines = []
            for pl in results:
                if pl: lines.extend(pl)
            return lines, page_count

    reader = pypdf.PdfReader(str(pdf_path))
    page_count = len(reader.pages)
    lines = []
    for page in reader.pages:
        lines.extend((page.extract_text() or "").splitlines())
    return lines, page_count


def extract_pages_with_text(pdf_path: str) -> tuple:
    """Estrae testo mantenendo il confine pagina.
    Ritorna (pages_lines, extractor_name). Ogni elemento di pages_lines è list[str].
    """
    if _pdfium is not None:
        doc = _pdfium.PdfDocument(pdf_path)
        pages = []
        try:
            for i in range(len(doc)):
                pg = doc[i]
                tp = pg.get_textpage()
                pages.append(tp.get_text_range().splitlines())
                tp.close(); pg.close()
        finally:
            doc.close()
        if sum(len(l.strip()) for pl in pages for l in pl) > 200:
            return pages, "pypdfium2"

    if pdfplumber is not None:
        with pdfplumber.open(pdf_path) as pdf:
            page_count = len(pdf.pages)
            results = [None] * page_count
            with ThreadPoolExecutor(max_workers=min(8, page_count)) as exe:
                futures = {exe.submit(_extract_page_plumber, (p, i)): i
                           for i, p in enumerate(pdf.pages)}
                for fut in as_completed(futures):
                    idx, page_lines = fut.result()
                    results[idx] = page_lines
            return [pl or [] for pl in results], "pdfplumber"

    reader = pypdf.PdfReader(str(pdf_path))
    pages = [(page.extract_text() or "").splitlines() for page in reader.pages]
    return pages, "pypdf"

def _flatten_pages(pages: list) -> list:
    lines = []
    for pl in pages:
        lines.extend(pl)
    return lines

# ---------------------------------------------------------------------------
# Preprocessing
# ---------------------------------------------------------------------------

def preprocess_lines(lines: list) -> list:
    n = len(lines)
    strips = [l.strip() for l in lines]
    result = []
    i = 0
    while i < n:
        s = strips[i]
        if not s:
            i += 1; continue

        if s.startswith("VOCE "):
            vm = VOCE_SPLIT_RE.match(s)
            if vm and i + 1 < n:
                ns = strips[i + 1]
                if VOCE_CONT_RE.match(ns):
                    result.append(f"{s} {ns}"); i += 2; continue

        elif CODE_PREFIX_RE.match(s) and i + 1 < n:
            ns = strips[i + 1]
            cm = CODE_CONT_RE.match(ns)
            if cm:
                cont = cm.group(1)
                rest = ns[len(cont):].strip()
                result.append(f"{s} {cont}{' ' + rest if rest else ''}"); i += 2; continue

        result.append(s)
        i += 1
    return result

def detect_code_re(lines: list) -> list:
    found = [False, False, False]
    for s in lines:
        if not found[0] and CODE_CANDIDATES[0].match(s): found[0] = True
        if not found[1] and CODE_CANDIDATES[1].match(s): found[1] = True
        if not found[2] and CODE_CANDIDATES[2].match(s): found[2] = True
        if all(found): break
    active = [CODE_CANDIDATES[i] for i, f in enumerate(found) if f]
    return active if active else list(CODE_CANDIDATES)

# ---------------------------------------------------------------------------
# FSM States
# ---------------------------------------------------------------------------

class State(IntEnum):
    IDLE = 0
    IN_CATEGORIA = 1
    IN_GRUPPO = 2
    IN_VOCE_DESC = 3
    IN_AVVERTENZA_HDR = 4
    IN_AVVERTENZA_BODY = 5
    IN_SOTTOVOCE_DESC = 6
    IN_UNITA_PREZZO = 7

# ---------------------------------------------------------------------------
# Accumulatori
# ---------------------------------------------------------------------------

class WarningAcc:
    __slots__ = ("id", "title", "body_lines", "ctx_tariffa", "ctx_categoria",
                 "ctx_gruppo", "ctx_voce")

    def __init__(self, id="", title="", ctx_tariffa="", ctx_categoria="",
                 ctx_gruppo="", ctx_voce=""):
        self.id = id
        self.title = title
        self.body_lines = []
        self.ctx_tariffa = ctx_tariffa
        self.ctx_categoria = ctx_categoria
        self.ctx_gruppo = ctx_gruppo
        self.ctx_voce = ctx_voce

    def to_dict(self) -> dict:
        scope, ref_code = _parse_warning_scope(self.title)

        # Se il codice non è esplicito, ricostruisce il riferimento dal contesto
        # e da eventuali frammenti brevi nel titolo (Categoria CE, Gruppo B, voce 3137).
        if not ref_code:
            if scope == "tariffa":
                ref_code = _normalize_ref_code(self.ctx_tariffa)
            elif scope == "categoria":
                cm = _CATEGORY_WORD_RE.search(self.title)
                cat = cm.group(1).upper() if cm else self.ctx_categoria
                ref_code = _join_context(self.ctx_tariffa, cat)
            elif scope == "gruppo":
                gm = _GROUP_WORD_RE.search(self.title)
                grp = gm.group(1).upper() if gm else self.ctx_gruppo
                ref_code = _join_context(self.ctx_tariffa, self.ctx_categoria, grp)
            elif scope == "voce":
                vm = _VOICE_WORD_RE.search(self.title)
                voce = _normalize_ref_code(vm.group(1)) if vm else self.ctx_voce
                ref_code = _join_context(self.ctx_tariffa, self.ctx_categoria, self.ctx_gruppo, voce)
            elif scope == "sottovoce":
                sm = _SUBVOICE_WORD_RE.search(self.title)
                sottovoce = sm.group(1).upper() if sm else ""
                ref_code = _join_context(self.ctx_tariffa, self.ctx_categoria, self.ctx_gruppo, self.ctx_voce, sottovoce)
            else:
                scope = "generic"
                ref_code = _deepest_context(self.ctx_tariffa, self.ctx_categoria, self.ctx_gruppo, self.ctx_voce)

        # Normalizza ref parziali: CE -> BA.CE, B -> BA.CE.B, 3137 -> MO.AI.F.3137.
        ref_code = _normalize_ref_code(ref_code)
        if scope == "categoria" and ref_code and "." not in ref_code:
            ref_code = _join_context(self.ctx_tariffa, ref_code)
        elif scope == "gruppo" and ref_code and "." not in ref_code:
            ref_code = _join_context(self.ctx_tariffa, self.ctx_categoria, ref_code)
        elif scope == "voce" and ref_code.isdigit():
            ref_code = _join_context(self.ctx_tariffa, self.ctx_categoria, self.ctx_gruppo, ref_code)

        return {
            "id": self.id,
            "scope": scope,
            "ref_code": ref_code,
            "title": clean(self.title),
            "body": clean(" ".join(self.body_lines)),
        }

    def is_empty(self) -> bool:
        return not self.id and not self.title and not self.body_lines


class ParseCtx:
    __slots__ = (
        "tariffa", "categoria", "categoria_desc",
        "gruppo", "gruppo_desc", "is_maggiorazione",
        "voce", "voce_desc_lines", "_voce_desc_cache", "voce_warnings",
    )
    def __init__(self):
        self.tariffa = ""
        self.categoria = ""
        self.categoria_desc = ""
        self.gruppo = ""
        self.gruppo_desc = ""
        self.is_maggiorazione = False
        self.voce = ""
        self.voce_desc_lines: list = []
        self._voce_desc_cache = ""
        self.voce_warnings: list = []

# ---------------------------------------------------------------------------
# Parser FSM
# ---------------------------------------------------------------------------

class RfiParser:
    __slots__ = (
        "code_patterns", "state", "ctx", "warning_acc",
        "cur_code", "sv_desc_lines", "sv_warnings",
        "cur_unita_codice", "cur_unita_label",
        "cur_importo", "cur_perc", "cur_tipo_valore", "cur_manodopera",
        "records", "maggiorazioni", "skipped",
        "all_warnings",          # lista globale di TUTTE le avvertenze parsate
        "_crossing_page_break",
        "_expecting_perc_value",
    )

    def __init__(self, code_patterns: list):
        self.code_patterns = code_patterns
        self.state = State.IDLE
        self.ctx = ParseCtx()
        self.warning_acc: Optional[WarningAcc] = None
        self.cur_code = ""
        self.sv_desc_lines: list = []
        self.sv_warnings: list = []
        self.cur_unita_codice = ""
        self.cur_unita_label = ""
        self.cur_importo: Optional[float] = None
        self.cur_perc: Optional[float] = None
        self.cur_tipo_valore = "EURO"
        self.cur_manodopera: Optional[float] = None
        self.records: list = []
        self.maggiorazioni: list = []
        self.skipped: list = []
        self.all_warnings: list = []
        self._crossing_page_break: bool = False
        self._expecting_perc_value: bool = False

    def _match_code(self, line: str):
        for p in self.code_patterns:
            m = p.match(line)
            if m: return m
        return None

    def _make_warning_acc(self, id="", title="") -> WarningAcc:
        ctx = self.ctx
        return WarningAcc(
            id=id, title=title,
            ctx_tariffa=ctx.tariffa,
            ctx_categoria=ctx.categoria,
            ctx_gruppo=ctx.gruppo,
            ctx_voce=ctx.voce,
        )

    def _flush_warning(self):
        wa = self.warning_acc
        if wa is None or wa.is_empty():
            self.warning_acc = None
            return
        wd = wa.to_dict()
        self.all_warnings.append(wd)
        # legacy: associa anche inline alla voce/sottovoce corrente
        if self.cur_code:
            self.sv_warnings.append(wd)
        else:
            self.ctx.voce_warnings.append(wd)
        self.warning_acc = None

    def _flush_sottovoce(self):
        if not self.cur_code:
            self._reset_sottovoce(); return

        valore = self.cur_importo if self.cur_importo is not None else self.cur_perc
        tipo_valore = self.cur_tipo_valore

        if valore is None:
            self.skipped.append({"codice": self.cur_code, "motivo": "nessun valore (IMPORTO o PERCENTUALE) trovato"})
            self._reset_sottovoce(); return

        m = self._match_code(self.cur_code)
        code_clean = (m.group(1) if m else self.cur_code).replace(" ", "")
        parts = code_clean.replace(" ", "").split(".")
        ctx = self.ctx

        vw = ctx.voce_warnings
        sw = self.sv_warnings
        warnings = (vw + sw) if (vw and sw) else (list(vw) if vw else list(sw))

        desc = _join1(self.sv_desc_lines)
        if desc.strip() in (".", ",", "-", ";", ""):
            desc = ""

        cat_from_code = parts[1] if len(parts) > 1 else ctx.categoria
        grp_from_code = parts[2] if len(parts) > 2 else ctx.gruppo

        record = {
            "codice": code_clean,
            "tariffa": parts[0] if parts else ctx.tariffa,
            "categoria": cat_from_code,
            "categoria_desc": ctx.categoria_desc if ctx.categoria == cat_from_code else "",
            "gruppo": grp_from_code,
            "gruppo_desc": ctx.gruppo_desc if ctx.gruppo == grp_from_code else "",
            "voce": ctx.voce,
            "voce_desc": ctx._voce_desc_cache,
            "sottovoce": parts[4] if len(parts) > 4 else "",
            "descrizione": desc,
            "unita_codice": self.cur_unita_codice,
            "unita_label": self.cur_unita_label,
            "tipo_valore": tipo_valore,
            "valore": valore,
            "perc_manodopera": self.cur_manodopera,
            "warnings": warnings,  # solo inline; arricchite nel post-process
        }

        if _is_mag_cat(cat_from_code):
            self.maggiorazioni.append(record)
        else:
            self.records.append(record)

        self._reset_sottovoce()

    def _reset_sottovoce(self):
        self.cur_code = ""; self.sv_desc_lines = []; self.sv_warnings = []
        self.cur_unita_codice = ""; self.cur_unita_label = ""
        self.cur_importo = None; self.cur_perc = None
        self.cur_tipo_valore = "EURO"; self.cur_manodopera = None
        self._expecting_perc_value = False

    def _reset_voce(self):
        ctx = self.ctx
        ctx.voce = ""; ctx.voce_desc_lines = []
        ctx._voce_desc_cache = ""; ctx.voce_warnings = []

    def _set_categoria(self, cat: str, desc: str):
        ctx = self.ctx
        ctx.categoria = cat
        ctx.categoria_desc = clean(desc)
        ctx.is_maggiorazione = _is_mag_cat(cat)

    def _set_gruppo(self, grp: str, desc: str):
        ctx = self.ctx
        ctx.gruppo = grp
        ctx.gruppo_desc = clean(desc)

    def process_line(self, s: str):
        if not s: return
        c0 = s[0]; n = len(s)

        if n <= 3 and c0.isdigit() and s.isdigit(): return
        if n == 1 and c0.isupper(): return

        # ── PERCENTUALE in attesa ─────────────────────────────────────────
        if self._expecting_perc_value:
            mp = PERC_RE.search(s)
            if mp:
                self.cur_perc = it_float(mp.group(1))
                self.cur_tipo_valore = "PERCENTUALE"
                self._expecting_perc_value = False
                self.state = State.IN_UNITA_PREZZO
                return
            try:
                self.cur_perc = float(s.replace(",", "."))
                self.cur_tipo_valore = "PERCENTUALE"
                self._expecting_perc_value = False
                self.state = State.IN_UNITA_PREZZO
                return
            except ValueError:
                pass
            self._expecting_perc_value = False

        # ── Codice sottovoce ─────────────────────────────────────────────
        if c0.isupper() and n > 6 and s[1:2].isupper() and s[2:3] == ".":
            if any(p.match(s) for p in self.code_patterns):
                m = self._match_code(s)
                extracted = m.group(1) if m else s.split()[0]
                rest = s[len(extracted):].strip()
                normalized_extracted = extracted.replace(" ", "")
                if "." in normalized_extracted:
                    self.ctx.tariffa = normalized_extracted.split(".", 1)[0]
                if (bool(self.cur_code) and rest in _CITATION_PUNCT
                        and "MISURA" not in s and "IMPORTO" not in s and "PERCENTUALE" not in s):
                    self._dispatch_text(s); return
                self._flush_warning()
                self._flush_sottovoce()
                self._crossing_page_break = False
                self.cur_code = normalized_extracted
                if rest and "MISURA" not in rest and "IMPORTO" not in rest and "PERCENTUALE" not in rest:
                    if not UNIT_RE.search(rest) and not IMPORT_RE.search(rest) and not PERC_RE.search(rest):
                        self.sv_desc_lines.append(rest)
                self.state = State.IN_SOTTOVOCE_DESC
                return

        if c0.islower() or (c0.isupper() and n > 80):
            self._dispatch_text(s); return

        # ── UNITA' DI MISURA ─────────────────────────────────────────────
        if c0 == "U" and "MISURA" in s:
            mu = UNIT_RE.search(s)
            if mu:
                self.cur_unita_codice = mu.group(1).strip()
                self.cur_unita_label = mu.group(2)
            else:
                mb = UNIT_BARE_RE.search(s)
                if mb:
                    raw = mb.group(1).strip()
                    if raw.lower() in ("percentuale", "%"):
                        self.cur_unita_codice = "Percentuale"
                        self.cur_unita_label = "Percentuale"
                        self.cur_tipo_valore = "PERCENTUALE"
                        mp = PERC_RE.search(s)
                        if mp:
                            self.cur_perc = it_float(mp.group(1))
                        else:
                            self._expecting_perc_value = True
                        self._crossing_page_break = False
                        self.state = State.IN_UNITA_PREZZO
                        return
                    else:
                        self.cur_unita_codice = raw
                        self.cur_unita_label = ""
            mi = IMPORT_RE.search(s)
            if mi:
                self.cur_importo = it_float(mi.group(1)); self.cur_tipo_valore = "EURO"
            else:
                mp = PERC_RE.search(s)
                if mp:
                    self.cur_perc = it_float(mp.group(1)); self.cur_tipo_valore = "PERCENTUALE"
            self._crossing_page_break = False
            self.state = State.IN_UNITA_PREZZO
            return

        # ── IMPORTO EURO standalone ───────────────────────────────────────
        if c0 == "I" and s[:6] == "IMPORT":
            mi = IMPORT_RE.search(s)
            if mi:
                self.cur_importo = it_float(mi.group(1)); self.cur_tipo_valore = "EURO"
                self._crossing_page_break = False
                self.state = State.IN_UNITA_PREZZO; return

        # ── PERCENTUALE standalone ───────────────────────────────────────
        if c0 == "P" and s[:11] == "PERCENTUALE":
            mp = PERC_RE.search(s)
            if mp:
                self.cur_perc = it_float(mp.group(1)); self.cur_tipo_valore = "PERCENTUALE"
                self._expecting_perc_value = False
                self._crossing_page_break = False
                self.state = State.IN_UNITA_PREZZO; return

        # ── % Manodopera ─────────────────────────────────────────────────
        if c0 == "%" and "Manodopera" in s:
            mm = MANOD_RE.search(s)
            if mm:
                self.cur_manodopera = it_float(mm.group(1))
                self.state = State.IN_SOTTOVOCE_DESC; return

        # ── VOCE ─────────────────────────────────────────────────────────
        if c0 == "V" and s[:5] == "VOCE ":
            mv = VOCE_RE.match(s) or VOCE_SIMPLE.match(s)
            if mv:
                self._flush_warning(); self._flush_sottovoce()
                self._crossing_page_break = False; self._reset_voce()
                self.ctx.voce = " ".join(g for g in mv.groups() if g)
                self.state = State.IN_VOCE_DESC; return

        # ── AVVERTENZE keyword ────────────────────────────────────────────
        if c0 == "A" and s[:5] == "AVVER":
            if AVVERTENZE_KW_RE.match(s):
                self._flush_warning()
                self.state = State.IN_AVVERTENZA_HDR; return

        # ── Avvertenza con ID numerico ────────────────────────────────────
        if c0.isdigit() and " " in s:
            m = AVVERTENZA_ID_RE.match(s)
            if m:
                self._flush_warning()
                self.warning_acc = self._make_warning_acc(id=m.group(1), title=m.group(2))
                self.state = State.IN_AVVERTENZA_BODY; return

        # ── CATEGORIA ────────────────────────────────────────────────────
        if c0 == "C" and s[:9] == "CATEGORIA":
            m = CAT_INLINE_RE.match(s)
            if m:
                cat = m.group(1).upper(); desc = m.group(2)
                if self._crossing_page_break:
                    self._set_categoria(cat, desc); return
                self._flush_warning(); self._flush_sottovoce()
                self._set_categoria(cat, desc)
                self.state = State.IN_CATEGORIA; return

        # ── GRUPPO ───────────────────────────────────────────────────────
        if c0 == "G" and s[:6] == "GRUPPO":
            m = GRUP_INLINE_RE.match(s)
            if m:
                grp = m.group(1).upper(); desc = m.group(2)
                if self._crossing_page_break:
                    self._set_gruppo(grp, desc); return
                self._flush_warning(); self._flush_sottovoce()
                self._set_gruppo(grp, desc)
                self.state = State.IN_GRUPPO; return

        # ── Page header ──────────────────────────────────────────────────
        if "TARIFFA" in s or "Il presente" in s:
            if PAGE_REPEAT_RE.match(s) or PAGE_HEADER_RE.match(s):
                mt = TARIFFA_PAGE_RE.match(s)
                if mt:
                    self.ctx.tariffa = mt.group(1).upper()
                _mid_record = bool(self.cur_code) and (self.cur_importo is None and self.cur_perc is None)
                self._crossing_page_break = _mid_record
                if not _mid_record:
                    if State.IN_AVVERTENZA_HDR <= self.state <= State.IN_AVVERTENZA_BODY:
                        self._flush_warning()
                    self.state = State.IDLE
                mc = CAT_PAGE_RE.search(s)
                mg = GRUP_PAGE_RE.search(s)
                if mc: self._set_categoria(mc.group(1).upper(), mc.group(2))
                if mg: self._set_gruppo(mg.group(1).upper(), mg.group(2))
                return

        self._dispatch_text(s)

    def _dispatch_text(self, s: str):
        st = self.state
        if st == State.IN_SOTTOVOCE_DESC and self.cur_importo is None and self.cur_perc is None:
            self.sv_desc_lines.append(s); return
        if st == State.IN_VOCE_DESC:
            vdl = self.ctx.voce_desc_lines
            vdl.append(s)
            self.ctx._voce_desc_cache = s if len(vdl) == 1 else clean(" ".join(vdl))
            return
        if st in (State.IN_AVVERTENZA_HDR, State.IN_AVVERTENZA_BODY) and is_avvertenza_title(s):
            self._flush_warning()
            self.warning_acc = self._make_warning_acc(title=s)
            self.state = State.IN_AVVERTENZA_BODY; return
        if st == State.IN_SOTTOVOCE_DESC:
            if self.cur_importo is not None or self.cur_perc is not None:
                wa = self.warning_acc
                if wa is None: self.warning_acc = self._make_warning_acc(); self.warning_acc.body_lines.append(s)
                else: wa.body_lines.append(s)
                self.state = State.IN_AVVERTENZA_BODY
            else:
                self.sv_desc_lines.append(s)
        elif State.IN_AVVERTENZA_HDR <= st <= State.IN_AVVERTENZA_BODY:
            wa = self.warning_acc
            if wa is None: self.warning_acc = self._make_warning_acc(); self.warning_acc.body_lines.append(s)
            else: wa.body_lines.append(s)
            self.state = State.IN_AVVERTENZA_BODY

    def finalize(self):
        self._flush_warning(); self._flush_sottovoce()

# ---------------------------------------------------------------------------
# POST-PROCESS: applicazione avvertenze gerarchica
# ---------------------------------------------------------------------------

def _build_warning_index(all_warnings: list) -> dict:
    """
    Costruisce un indice ref_code → [warning, ...].
    L'indice usa sia lo scope primario sia i codici/range citati nel testo.
    """
    idx: dict = {}
    seen = set()
    for w in all_warnings:
        # Scarta residui di parsing non informativi. Le avvertenze RFI reali hanno
        # quasi sempre id numerico; quelle senza id vengono tenute solo se hanno body.
        if not w.get("id") and not w.get("body"):
            continue
        refs = _expand_warning_refs(w)
        for ref in refs:
            key = (w.get("id", ""), ref, w.get("title", ""))
            if key in seen:
                continue
            seen.add(key)
            idx.setdefault(ref, []).append(w)
    return idx

def _warnings_for_record(record: dict, idx: dict) -> list:
    """
    Restituisce le avvertenze applicabili a un record, dal più specifico
    al più generale, deduplicando per id.

    Gerarchia lookup (dalla più specifica):
      sottovoce → FA.MG.A.0100.A
      voce      → FA.MG.A.0100
      gruppo    → FA.MG.A
      categoria → FA.MG
      tariffa   → FA
    """
    code = record["codice"].replace(" ", "")
    parts = code.split(".")
    # costruisce i livelli dal più specifico
    lookups = []
    if len(parts) == 5:
        lookups.append(code)                                      # sottovoce
        lookups.append(".".join(parts[:4]))                       # voce
        lookups.append(".".join(parts[:3]))                       # gruppo
        lookups.append(".".join(parts[:2]))                       # categoria
        lookups.append(parts[0])                                  # tariffa
    elif len(parts) == 4:
        lookups.append(code)
        lookups.append(".".join(parts[:3]))
        lookups.append(".".join(parts[:2]))
        lookups.append(parts[0])

    seen_ids = set()
    result = []
    for lk in lookups:
        for w in idx.get(lk.upper(), []):
            if w["id"] not in seen_ids:
                seen_ids.add(w["id"])
                result.append(w)

    # Aggiungi anche le avvertenze inline già associate (es. generic scope)
    for w in record.get("warnings", []):
        if w.get("id") and w["id"] not in seen_ids:
            seen_ids.add(w["id"])
            result.append(w)

    return result


def apply_warnings(records: list, maggiorazioni: list, all_warnings: list, embed_record_warnings: bool = False):
    """
    Arricchisce ogni record con le avvertenze appropriate.
    Modifica in-place.
    """
    idx = _build_warning_index(all_warnings)
    derived_cache: dict = {}
    for rec in records + maggiorazioni:
        full_warnings = _warnings_for_record(rec, idx)
        key = tuple((w.get("id", ""), w.get("ref_code", ""), w.get("title", "")) for w in full_warnings)
        derived = derived_cache.get(key)
        if derived is None:
            compact = [
                {
                    "id": w.get("id", ""),
                    "scope": w.get("scope", ""),
                    "ref_code": w.get("ref_code", ""),
                    "title": w.get("title", ""),
                }
                for w in full_warnings
            ]
            derived = (
                [w.get("id", "") for w in full_warnings if w.get("id")],
                compact,
                _extract_maggiorazione_refs(full_warnings),
                _infer_applicability_rules(full_warnings),
            )
            derived_cache[key] = derived
        rec["warning_ids"] = list(derived[0])
        # Default production: niente duplicazione per-record dei testi warning.
        # I testi completi restano nel top-level `warnings`, indicizzabili via warning_ids.
        if embed_record_warnings:
            rec["warnings"] = [dict(w) for w in derived[1]]
        else:
            rec.pop("warnings", None)
        rec["linked_maggiorazioni"] = list(derived[2])
        rec["applicability_rules"] = dict(derived[3])

# ---------------------------------------------------------------------------
# Post-processing merge duplicati
# ---------------------------------------------------------------------------

def merge_duplicate_records(records: list) -> list:
    index: dict = {}
    merged: list = []
    for rec in records:
        code = rec["codice"].strip()
        key = code.lower()
        if not code or key not in index:
            index[key] = len(merged)
            merged.append(rec)
            continue
        existing = merged[index[key]]
        new_desc = rec["descrizione"].strip()
        cur_desc = existing["descrizione"].strip()
        if new_desc and new_desc.lower() not in cur_desc.lower():
            existing["descrizione"] = new_desc if not cur_desc else f"{cur_desc}\n{new_desc}"
    return merged

# ---------------------------------------------------------------------------
# Audit / validation layer v11
# ---------------------------------------------------------------------------

_PERCENT_RE = re.compile(r"([-+]?\d{1,3}(?:[.,]\d+)?)\s*%")
_DAYS_RE = re.compile(r"\b(\d{2,4})\s+giorni\b", re.I)


def _extract_code_source_index(pages: list, code_patterns: list, pdf_name: str) -> dict:
    """Mappa codice normalizzato -> sorgente fisica approssimata.
    Non altera la FSM; serve per audit/debug UI. Usa pagine preprocessate singolarmente.
    """
    source = {}
    for page_no, raw_page_lines in enumerate(pages, start=1):
        page_lines = preprocess_lines(raw_page_lines)
        for line_no, s in enumerate(page_lines, start=1):
            if not s or len(s) < 8:
                continue
            m = None
            for p in code_patterns:
                m = p.match(s)
                if m:
                    break
            if not m:
                continue
            raw_code = m.group(1)
            code = _normalize_ref_code(raw_code)
            if not code or code in source:
                continue
            source[code] = {
                "file": pdf_name,
                "page": page_no,
                "line": line_no,
                "raw_code": raw_code,
                "normalized": raw_code != code,
            }
    return source


def _dedupe_ordered(values: list) -> list:
    out, seen = [], set()
    for v in values:
        if v in seen:
            continue
        seen.add(v); out.append(v)
    return out


def _warning_type(title: str, body: str) -> str:
    text = clean(f"{title} {body}").lower()
    if not text:
        return "unknown"
    if "maggioraz" in text or "sovrapprezzo" in text or "aument" in text:
        return "maggiorazione"
    if "non soggett" in text or "non è soggett" in text or "esclus" in text:
        return "esclusione_ribasso"
    if "quota parte" in text and "manodopera" in text:
        return "quota_manodopera"
    if "fattore k" in text:
        return "fattore_k"
    if "protocollo di legalità" in text or "monitoraggio grandi opere" in text or "mgo" in text:
        return "oneri_speciali"
    if "valid" in text or "applicab" in text:
        return "applicabilita"
    if "comprendono" in text or "compensano" in text or "compreso" in text:
        return "inclusioni_prezzo"
    return "general"


def _warning_confidence_and_issues(w: dict) -> tuple:
    issues = []
    conf = 0.98
    if not w.get("id"):
        issues.append("missing_numeric_id"); conf -= 0.18
    if not w.get("body"):
        issues.append("empty_body"); conf -= 0.10
    ref = w.get("ref_code", "")
    scope = w.get("scope", "")
    if not ref:
        issues.append("missing_ref_code"); conf -= 0.30
    elif scope == "generic":
        issues.append("scope_inferred_from_context"); conf -= 0.12
    parts = ref.split(".") if ref else []
    if scope == "tariffa" and len(parts) != 1:
        issues.append("scope_ref_depth_mismatch"); conf -= 0.08
    elif scope == "categoria" and len(parts) != 2:
        issues.append("scope_ref_depth_mismatch"); conf -= 0.08
    elif scope == "gruppo" and len(parts) != 3:
        issues.append("scope_ref_depth_mismatch"); conf -= 0.08
    elif scope == "voce" and len(parts) != 4:
        issues.append("scope_ref_depth_mismatch"); conf -= 0.08
    elif scope == "sottovoce" and len(parts) != 5:
        issues.append("scope_ref_depth_mismatch"); conf -= 0.08
    title = w.get("title", "")
    if title.isupper() and len(title) < 30 and not w.get("id"):
        issues.append("possible_header_noise"); conf -= 0.20
    return max(0.0, round(conf, 3)), issues


def _normalize_warnings_audit(all_warnings: list) -> list:
    normalized = []
    seen = set()
    for w in all_warnings:
        nw = dict(w)
        title = nw.get("title", "")
        body = nw.get("body", "")
        nw["type"] = _warning_type(title, body)
        nw["maggiorazione_refs"] = _extract_maggiorazione_refs([nw])
        nw["applies_to_refs"] = _expand_warning_refs(nw)
        confidence, issues = _warning_confidence_and_issues(nw)
        nw["confidence"] = confidence
        nw["issues"] = issues
        key = (nw.get("id", ""), nw.get("ref_code", ""), nw.get("title", ""), nw.get("body", "")[:80])
        if key in seen:
            continue
        seen.add(key)
        normalized.append(nw)
    return normalized


def _extract_rule_percentage(text: str) -> Optional[float]:
    m = _PERCENT_RE.search(text)
    if not m:
        return None
    return it_float(m.group(1))


def _extract_conditions(text: str) -> list:
    t = text.lower()
    tests = {
        "notturno": ("notturn",),
        "festivo": ("festiv",),
        "interruzione_esercizio": ("interruzione", "esercizio ferroviario"),
        "galleria": ("galleria",),
        "switch_off": ("switch-off", "switch off"),
        "fattore_k": ("fattore k",),
        "protocollo_legalita_mgo": ("protocollo di legalità", "monitoraggio grandi opere", "mgo"),
    }
    return [name for name, needles in tests.items() if any(n in t for n in needles)]


def _build_maggiorazione_rules(warnings: list) -> list:
    rules = []
    seen = set()
    for w in warnings:
        text = clean(f"{w.get('title','')} {w.get('body','')}")
        t = text.lower()
        has_rule = (
            w.get("type") in {"maggiorazione", "quota_manodopera", "fattore_k"}
            or bool(w.get("maggiorazione_refs"))
            or "maggioraz" in t
            or "aument" in t
            or "sovrapprezzo" in t
        )
        if not has_rule:
            continue
        base = "unknown"
        if "quota parte" in t and "manodopera" in t:
            base = "quota_manodopera"
        elif "manodopera" in t:
            base = "manodopera"
        elif "import" in t or "prezz" in t:
            base = "importo_voce"
        target_refs = w.get("maggiorazione_refs", [])
        confidence = "high" if target_refs else "medium"
        if w.get("confidence", 1.0) < 0.75:
            confidence = "low"
        rule = {
            "id": f"rule:{w.get('id') or len(rules)+1}",
            "warning_id": w.get("id", ""),
            "source_ref": w.get("ref_code", ""),
            "source_scope": w.get("scope", ""),
            "applies_to_refs": w.get("applies_to_refs", []) or ([w.get("ref_code")] if w.get("ref_code") else []),
            "target_maggiorazioni": target_refs,
            "base": base,
            "percentage": _extract_rule_percentage(text),
            "conditions": _extract_conditions(text),
            "confidence": confidence,
            "requires_human_validation": confidence != "high" or not target_refs,
            "title": w.get("title", ""),
        }
        key = (rule["warning_id"], tuple(rule["target_maggiorazioni"]), rule["source_ref"], rule["percentage"])
        if key in seen:
            continue
        seen.add(key)
        rules.append(rule)
    return rules


def _validate_code_shape(code: str) -> bool:
    return bool(re.match(r"^[A-Z]{2}\.[A-Z]{2,3}\.[A-Z]\.[0-9]{3,4}\.[A-Z]+$", code or ""))


def _record_confidence_and_issues(rec: dict, source_index: dict, mag_codes: set) -> tuple:
    issues = []
    conf = 0.995
    code = rec.get("codice", "")
    if not _validate_code_shape(code):
        issues.append("invalid_code_shape"); conf -= 0.25
    src = source_index.get(code)
    if not src:
        issues.append("source_line_not_found"); conf -= 0.15
    elif src.get("normalized"):
        issues.append("code_normalized_from_source"); conf -= 0.04
    if rec.get("valore") is None:
        issues.append("missing_value"); conf -= 0.50
    if not rec.get("unita_codice"):
        issues.append("missing_unit"); conf -= 0.15
    if rec.get("tipo_valore") == "EURO" and rec.get("perc_manodopera") is None and not _is_mag_cat(rec.get("categoria", "")):
        issues.append("missing_manodopera_percent"); conf -= 0.04
    if rec.get("tipo_valore") == "PERCENTUALE" and rec.get("valore", 0) < 0:
        issues.append("negative_percentage_or_deduction")
    linked = rec.get("linked_maggiorazioni", []) or []
    unresolved_local = [m for m in linked if m.split(".")[0] == rec.get("tariffa") and m not in mag_codes]
    if unresolved_local:
        issues.append("linked_maggiorazione_not_found_in_same_tariffa"); conf -= 0.08
    # Non trasformiamo ogni warning testuale di maggiorazione in errore per-record:
    # la revisione della regola sta nel top-level `maggiorazione_rules`.
    return max(0.0, round(conf, 3)), issues


def _apply_audit(records: list, maggiorazioni: list, warnings: list, pages: list, code_patterns: list, pdf_name: str) -> dict:
    source_index = _extract_code_source_index(pages, code_patterns, pdf_name)
    mag_codes = {m.get("codice", "") for m in maggiorazioni}
    all_items = records + maggiorazioni
    for rec in all_items:
        code = rec.get("codice", "")
        src = source_index.get(code)
        if src:
            rec["source"] = {k: v for k, v in src.items() if k != "raw_code"}
        else:
            rec["source"] = {"file": pdf_name, "page": None, "line": None, "normalized": False}
        confidence, issues = _record_confidence_and_issues(rec, source_index, mag_codes)
        rec["confidence"] = confidence
        rec["issues"] = issues
        review_flags = []
        if rec.get("applicability_rules", {}).get("mentions_maggiorazione") and not rec.get("linked_maggiorazioni"):
            review_flags.append("maggiorazione_rule_without_explicit_target")
        if review_flags:
            rec["review_flags"] = review_flags
        if rec.get("linked_maggiorazioni"):
            rec["linked_maggiorazioni"] = _dedupe_ordered(rec["linked_maggiorazioni"])
        if rec.get("warning_ids"):
            rec["warning_ids"] = _dedupe_ordered(rec["warning_ids"])

    rules = _build_maggiorazione_rules(warnings)
    return {
        "source_index_count": len(source_index),
        "maggiorazione_rules": rules,
    }


def _build_validation_report(records: list, maggiorazioni: list, warnings: list, audit: dict, page_count: int, extractor: str) -> dict:
    all_items = records + maggiorazioni
    issue_counter = Counter(issue for r in all_items for issue in r.get("issues", []))
    review_flag_counter = Counter(flag for r in all_items for flag in r.get("review_flags", []))
    warning_issue_counter = Counter(issue for w in warnings for issue in w.get("issues", []))
    warning_scope_counter = Counter(w.get("scope", "unknown") for w in warnings)
    warning_type_counter = Counter(w.get("type", "unknown") for w in warnings)
    duplicate_codes = [code for code, n in Counter(r.get("codice") for r in all_items).items() if code and n > 1]
    linked_refs = _dedupe_ordered([m for r in all_items for m in r.get("linked_maggiorazioni", [])])
    local_mag_codes = {m.get("codice") for m in maggiorazioni}
    unresolved_local_refs = sorted({m for m in linked_refs if m.split(".")[0] in {r.get("tariffa") for r in all_items} and m not in local_mag_codes})
    low_conf_records = sum(1 for r in all_items if r.get("confidence", 1.0) < 0.85)
    avg_conf = round(sum(r.get("confidence", 0) for r in all_items) / len(all_items), 4) if all_items else 0
    return {
        "schema_version": "11.0-audit",
        "extractor": extractor,
        "pages_total": page_count,
        "counts": {
            "records": len(records),
            "maggiorazioni": len(maggiorazioni),
            "total_price_items": len(all_items),
            "warnings": len(warnings),
            "maggiorazione_rules": len(audit.get("maggiorazione_rules", [])),
            "source_index_codes": audit.get("source_index_count", 0),
            "duplicate_codes": len(duplicate_codes),
            "low_confidence_records": low_conf_records,
            "negative_percentages": sum(1 for r in all_items if r.get("tipo_valore") == "PERCENTUALE" and (r.get("valore") or 0) < 0),
            "records_with_warnings": sum(1 for r in all_items if r.get("warning_ids")),
            "records_with_linked_maggiorazioni": sum(1 for r in all_items if r.get("linked_maggiorazioni")),
            "records_with_review_flags": sum(1 for r in all_items if r.get("review_flags")),
        },
        "confidence": {
            "average_record_confidence": avg_conf,
            "min_record_confidence": min((r.get("confidence", 0) for r in all_items), default=0),
            "max_record_confidence": max((r.get("confidence", 0) for r in all_items), default=0),
        },
        "issues_by_type": dict(issue_counter),
        "review_flags_by_type": dict(review_flag_counter),
        "warnings_by_scope": dict(warning_scope_counter),
        "warnings_by_type": dict(warning_type_counter),
        "warning_issues_by_type": dict(warning_issue_counter),
        "duplicate_code_sample": duplicate_codes[:20],
        "unresolved_local_maggiorazione_refs": unresolved_local_refs[:50],
        "review_queue": [
            {
                "codice": r.get("codice"),
                "confidence": r.get("confidence"),
                "issues": r.get("issues"),
                "source": r.get("source"),
            }
            for r in sorted(all_items, key=lambda x: x.get("confidence", 1.0))[:50]
            if r.get("issues")
        ],
    }

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def parse_pdf(input_path: str, debug: bool = False, embed_record_warnings: bool = False) -> dict:
    path = Path(input_path)
    ext = path.suffix.lower()

    if ext == ".json":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and "records" in data:
            return data
        return {
            "schema_version": "11.0-audit",
            "records": data,
            "maggiorazioni": [],
            "warnings": [],
            "maggiorazione_rules": [],
            "validation_report": {},
            "pages_total": 0,
            "pages_parsed": 0,
        }

    if ext != ".pdf":
        raise ValueError(f"Formato non supportato: {ext}. Usa .pdf o .json")

    pages, extractor = extract_pages_with_text(str(path))
    page_count = len(pages)
    raw_lines = _flatten_pages(pages)
    lines = preprocess_lines(raw_lines)
    code_patterns = detect_code_re(lines)

    parser = RfiParser(code_patterns)
    for s in lines:
        if s:
            parser.process_line(s)
    parser.finalize()

    records = merge_duplicate_records(parser.records)
    maggiorazioni = merge_duplicate_records(parser.maggiorazioni)

    # Pass 2: applica avvertenze gerarchiche compatte
    apply_warnings(records, maggiorazioni, parser.all_warnings, embed_record_warnings=embed_record_warnings)

    # Pass 3: audit layer: normalizza warning, aggiunge source/confidence/issues e rule resolver.
    warnings = _normalize_warnings_audit(parser.all_warnings)
    # Ricalcola warning ids se la normalizzazione ha deduplicato qualcosa solo a livello top-level;
    # i warning_ids nei record restano validi perché sono id numerici RFI.
    audit = _apply_audit(records, maggiorazioni, warnings, pages, code_patterns, path.name)
    validation_report = _build_validation_report(records, maggiorazioni, warnings, audit, page_count, extractor)

    if debug:
        code_matches = sum(1 for s in lines if any(p.match(s) for p in code_patterns))
        scope_counts = {}
        for w in warnings:
            scope_counts[w["scope"]] = scope_counts.get(w["scope"], 0) + 1
        print(_dumps({
            "debug": True,
            "schema_version": "11.0-audit",
            "extractor": extractor,
            "page_count": page_count,
            "raw_lines": len(raw_lines),
            "clean_lines": len(lines),
            "code_matches": code_matches,
            "records_count": len(records),
            "maggiorazioni_count": len(maggiorazioni),
            "skipped_count": len(parser.skipped),
            "warnings_total": len(warnings),
            "warnings_by_scope": scope_counts,
            "maggiorazione_rules_count": len(audit.get("maggiorazione_rules", [])),
            "issue_counts": validation_report.get("issues_by_type", {}),
            "first_5_maggiorazioni": [r["codice"] for r in maggiorazioni[:5]],
            "skipped_sample": parser.skipped[:10],
        }).decode(), file=sys.stderr)

    return {
        "schema_version": "11.0-audit",
        "records": records,
        "maggiorazioni": maggiorazioni,
        "warnings": warnings,
        "maggiorazione_rules": audit.get("maggiorazione_rules", []),
        "validation_report": validation_report,
        "pages_total": page_count,
        "pages_parsed": page_count,
    }


def serve_mode(debug: bool = False):
    for line in sys.stdin:
        path = line.strip()
        if not path: continue
        try:
            result = parse_pdf(path, debug=debug)
            if _needs_sanitize(result["records"]) or _needs_sanitize(result["maggiorazioni"]):
                result = safe_json_value(result)
            sys.stdout.buffer.write(_dumps(result))
        except Exception as exc:
            sys.stdout.buffer.write(_dumps({"error": str(exc)}))
        sys.stdout.buffer.write(b"\n")
        sys.stdout.flush()


def main():
    debug = "--debug" in sys.argv or bool(os.environ.get("QUANTARA_PARSER_DEBUG", ""))
    embed_record_warnings = "--embed-record-warnings" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]

    if not args:
        print(json.dumps({"error": "Uso: rfi_tariffa_parser.py <file.pdf> [--debug]"}), file=sys.stderr)
        sys.exit(1)

    if args[0] == "--serve":
        serve_mode(debug=debug)
        return

    try:
        result = parse_pdf(args[0], debug=debug, embed_record_warnings=embed_record_warnings)
        if _needs_sanitize(result["records"]) or _needs_sanitize(result["maggiorazioni"]):
            result = safe_json_value(result)
        sys.stdout.buffer.write(_dumps(result))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
