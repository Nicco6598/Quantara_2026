#!/usr/bin/env python3
"""
rfi_tariffa_parser.py
Parser per tariffari RFI (BA, SB, FA) in formato PDF.
"""

import json
import os
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from enum import Enum, auto
from pathlib import Path
from typing import Optional

pdfplumber = None
pypdf = None
try:
    import pdfplumber
except Exception:
    try:
        import pypdf
    except Exception as exc:
        print(f"missing pdf parser dependency: install pdfplumber or pypdf ({exc})", file=sys.stderr)
        sys.exit(2)

# ─────────────────────────────────────────────────────────────────────────────
# Regex
# ─────────────────────────────────────────────────────────────────────────────

IMPORT_RE  = re.compile(r"IMPORTO\s+EURO[:\s]+([-]?[\d.,]+)")
PERC_RE    = re.compile(r"PERCENTUALE[:\s]+([\d.,]+)")
MANOD_RE   = re.compile(r"%\s*Manodopera[:\s]+([-]?[\d.,]+)")
UNIT_RE    = re.compile(r"UNITA['\u2019]?\s*DI\s*MISURA[:\s]+([\w%²³]+)\s*\(([^)]+)\)")

PAGE_HEADER_RE     = re.compile(r"^(?:\d+\s+)?TARIFFA\s+[A-Z]{2}\s+CATEGORIA\s+[A-Z]{2}|^(?:\d+\s+)?Il presente volume", re.IGNORECASE)
CATEGORY_HEADER_RE = re.compile(r"^(?:CATEGORIA|GRUPPO)\s+[A-Z]\w*\b", re.IGNORECASE)
NUMERIC_PAGE_RE    = re.compile(r"^\d{1,3}$")
SECTION_WORD_RE    = re.compile(r"^(GRUPPO|CATEGORIA)$", re.IGNORECASE)
SINGLE_LETTER_RE   = re.compile(r"^[A-Z]$")
TARIFFA_RE         = re.compile(r"\s+\d+\s+TARIFFA\s+[A-Z]{2}\s+CATEGORIA\s+[A-Z]{2}\b")
AVVERTENZE_KW_RE   = re.compile(r"^AVVERTENZ[AE]$", re.IGNORECASE)
AVVERTENZA_ID_RE   = re.compile(r"^(\d{4,})\s+(.+)$")
AVVERTENZA_TITLE_RE = re.compile(r"^[A-Z][A-Z\s'\-\/\.\(\)]{9,}$")

CODE_CANDIDATES = [
    re.compile(r"^([A-Z]{2}\.[A-Z]{2,3}\.[A-Z]\.\d[ ]\d{2,4}\.[A-Z])(?:\s|$)"),
    re.compile(r"^([A-Z]{2}\.[A-Z]{2,3}\.[A-Z]\.\d{3,4}\.[A-Z])(?:\s|$)"),
    re.compile(r"^([A-Z]{2,}\.[A-Z]{2,}\.[A-Z]\.\d+[\s\d]*\.[A-Z]+)(?:\s|$)"),
]

PAGE_REPEAT_RE = re.compile(r"^(?:\d+\s+)?TARIFFA\s+\w+(?:\s+CATEGORIA\s+\w+)?(?:\s+GRUPPO\s+\w+)?$")
VOCE_RE        = re.compile(r"^VOCE\s+(\d+)\s+(\d+)$")
VOCE_SIMPLE    = re.compile(r"^VOCE\s+(\d+)$")
CODE_PREFIX_RE = re.compile(r"^[A-Z]{2}\.[A-Z]{2,}\.[A-Z]\.\d+$")
CODE_CONT_RE   = re.compile(r"^(\d+[\s\d]*\.[A-Z]+)")
VOCE_SPLIT_RE  = re.compile(r"^VOCE\s+(\d{1,2})$")
VOCE_CONT_RE   = re.compile(r"^\d{1,2}$")

# ─────────────────────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────────────────────

def clean(value: str) -> str:
    if not value:
        return ""
    if value.isascii():
        return " ".join(value.split())
    safe = "".join(" " if 0xD800 <= ord(c) <= 0xDFFF else c for c in value)
    return unicodedata.normalize("NFC", " ".join(safe.split()))


def it_float(value: str) -> Optional[float]:
    try:
        return float(value.replace(".", "").replace(",", "."))
    except Exception:
        return None


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


def is_avvertenza_title(line: str) -> bool:
    """
    Vero solo se la riga è un titolo avvertenza inline tutto-maiuscolo e breve.
    Esclude:
      - righe con minuscole (= corpo avvertenza)
      - frasi lunghe con punto finale (= ultima riga corpo avvertenza)
      - stringhe con ".CIFRE" (= codici tariffari o norme tipo D.lgs.57/2019)
    """
    s = line.strip()
    if len(s) < 10:
        return False
    if NUMERIC_PAGE_RE.match(s):
        return False
    if re.search(r"[a-z]", s):         # contiene minuscole → corpo, non titolo
        return False
    if re.search(r"\.\d", s):           # ".2013", ".57/2019" ecc.
        return False
    if s.endswith(".") and len(s) > 60: # frase lunga con punto = corpo avvertenza
        return False
    return bool(AVVERTENZA_TITLE_RE.match(s))

# ─────────────────────────────────────────────────────────────────────────────
# Estrazione testo PDF
# ─────────────────────────────────────────────────────────────────────────────

def extract_text_with_page_count(pdf_path: str) -> tuple:
    lines = []
    if pdfplumber is not None:
        with pdfplumber.open(pdf_path) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
                lines.extend(text.splitlines())
            return lines, page_count
    reader = pypdf.PdfReader(str(pdf_path))
    for page in reader.pages:
        text = page.extract_text() or ""
        lines.extend(text.splitlines())
    return lines, len(reader.pages)

# ─────────────────────────────────────────────────────────────────────────────
# Preprocessing
# ─────────────────────────────────────────────────────────────────────────────

def preprocess_lines(lines: list) -> list:
    result = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        voce_match = VOCE_SPLIT_RE.match(line)
        if voce_match and i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            if VOCE_CONT_RE.match(next_line):
                result.append(f"{line} {next_line}")
                i += 2
                continue
        if CODE_PREFIX_RE.match(line) and i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            cont_match = CODE_CONT_RE.match(next_line)
            if cont_match:
                continuation = cont_match.group(1)
                rest = next_line[len(continuation):].strip()
                result.append(f"{line} {continuation}{' ' + rest if rest else ''}")
                i += 2
                continue
        result.append(line)
        i += 1
    return result

# ─────────────────────────────────────────────────────────────────────────────
# Rilevamento pattern codice
# ─────────────────────────────────────────────────────────────────────────────

def detect_code_re(lines: list):
    """
    Ritorna la lista di tutti i CODE_CANDIDATES con almeno un match
    nelle prime 500 righe. Il parser usa _match_code() che li testa in
    ordine, così formati diversi (SB con spazio, BA con 4 cifre) coesistono.
    """
    sample = [l.strip() for l in lines[:500] if l.strip()]
    active = [c for c in CODE_CANDIDATES if any(c.match(line) for line in sample)]
    return active if active else list(CODE_CANDIDATES)

# ─────────────────────────────────────────────────────────────────────────────
# FSM States & Accumulatori
# ─────────────────────────────────────────────────────────────────────────────

class State(Enum):
    IDLE               = auto()
    IN_CATEGORIA       = auto()
    IN_GRUPPO          = auto()
    IN_VOCE_DESC       = auto()
    IN_AVVERTENZA_HDR  = auto()
    IN_AVVERTENZA_BODY = auto()
    IN_SOTTOVOCE_DESC  = auto()
    IN_UNITA_PREZZO    = auto()


@dataclass
class WarningAcc:
    id:    str = ""
    title: str = ""
    lines: list = field(default_factory=list)

    def to_dict(self) -> dict:
        return {"id": self.id, "title": self.title, "body": clean(" ".join(self.lines))}

    def is_empty(self) -> bool:
        return not self.id and not self.title and not self.lines


@dataclass
class ParseCtx:
    tariffa:         str  = ""
    categoria:       str  = ""
    categoria_desc:  str  = ""
    gruppo:          str  = ""
    gruppo_desc:     str  = ""
    voce:            str  = ""
    voce_desc_lines: list = field(default_factory=list)
    voce_warnings:   list = field(default_factory=list)

# ─────────────────────────────────────────────────────────────────────────────
# Parser FSM
# ─────────────────────────────────────────────────────────────────────────────

class RfiParser:
    def __init__(self, code_patterns):
        self.code_patterns = code_patterns
        self.state         = State.IDLE
        self.ctx           = ParseCtx()
        self.warning_acc: Optional[WarningAcc] = None

        self.cur_code          = ""
        self.sv_desc_lines:  list = []
        self.sv_warnings:    list = []
        self.cur_unita_codice  = ""
        self.cur_unita_label   = ""
        self.cur_importo:    Optional[float] = None
        self.cur_manodopera: Optional[float] = None

        self.records: list = []

    def _match_code(self, line: str):
        """Testa tutti i pattern in ordine, ritorna il primo Match valido."""
        for pattern in self.code_patterns:
            m = pattern.match(line)
            if m:
                return m
        return None

    def _flush_warning(self):
        if not self.warning_acc or self.warning_acc.is_empty():
            self.warning_acc = None
            return
        wd = self.warning_acc.to_dict()
        if self.cur_code:
            self.sv_warnings.append(wd)
        else:
            self.ctx.voce_warnings.append(wd)
        self.warning_acc = None

    def _flush_sottovoce(self):
        if not self.cur_code or self.cur_importo is None:
            self._reset_sottovoce()
            return

        m = self._match_code(self.cur_code)
        code_clean = m.group(1) if m else self.cur_code

        parts     = code_clean.replace(" ", "").split(".")
        tariffa   = parts[0] if len(parts) > 0 else self.ctx.tariffa
        categoria = parts[1] if len(parts) > 1 else self.ctx.categoria
        gruppo    = parts[2] if len(parts) > 2 else self.ctx.gruppo
        sottovoce = parts[4] if len(parts) > 4 else ""

        self.records.append({
            "codice":          code_clean,
            "tariffa":         tariffa,
            "categoria":       categoria,
            "categoria_desc":  self.ctx.categoria_desc,
            "gruppo":          gruppo,
            "gruppo_desc":     self.ctx.gruppo_desc,
            "voce":            self.ctx.voce,
            "voce_desc":       clean(" ".join(self.ctx.voce_desc_lines)),
            "sottovoce":       sottovoce,
            "descrizione":     clean(" ".join(self.sv_desc_lines)),
            "unita_codice":    self.cur_unita_codice,
            "unita_label":     self.cur_unita_label,
            "tipo_valore":     "EURO",
            "valore_euro":     self.cur_importo,
            "perc_manodopera": self.cur_manodopera,
            "warnings":        list(self.ctx.voce_warnings) + list(self.sv_warnings),
        })
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
        self.ctx.voce            = ""
        self.ctx.voce_desc_lines = []
        self.ctx.voce_warnings   = []

    def _classify(self, line: str) -> str:
        s = line.strip()
        if not s:
            return "EMPTY"
        if NUMERIC_PAGE_RE.match(s):
            return "NOISE"
        if PAGE_REPEAT_RE.match(s):
            return "PAGE_HEADER"
        if re.match(r"^CATEGORIA\s+[A-Z]{2,3}\s+\S", s, re.IGNORECASE):
            return "CATEGORIA"
        if re.match(r"^GRUPPO\s+[A-Z]\s+\S", s, re.IGNORECASE):
            return "GRUPPO"
        if CATEGORY_HEADER_RE.match(s) and SECTION_WORD_RE.match(s.split()[0]):
            return "CATEGORIA" if s.upper().startswith("CATEGORIA") else "GRUPPO"
        if VOCE_RE.match(s):
            return "VOCE"
        if VOCE_SIMPLE.match(s):
            return "VOCE_SIMPLE"
        if any(p.match(s) for p in self.code_patterns):
            return "SOTTOVOCE"
        if AVVERTENZE_KW_RE.match(s):
            return "AVVERTENZA_KW"
        if AVVERTENZA_ID_RE.match(s) and s[0].isdigit():
            return "AVVERTENZA_ID"
        if UNIT_RE.search(s):
            return "UNITA"
        if IMPORT_RE.search(s):
            return "IMPORTO"
        if MANOD_RE.search(s):
            return "MANODOPERA"
        if SINGLE_LETTER_RE.match(s):
            return "NOISE"
        return "TEXT"

    def process_line(self, raw_line: str):
        line = raw_line.strip()
        if not line:
            return
        kind = self._classify(line)

        if kind == "NOISE":
            return

        if kind == "PAGE_HEADER":
            # FIX: chiude avvertenza aperta a cavallo di pagina —
            # evita che il corpo di un'avvertenza contamini la sottovoce successiva
            if self.state in (State.IN_AVVERTENZA_HDR, State.IN_AVVERTENZA_BODY):
                self._flush_warning()
                self.state = State.IDLE
            mc = re.search(r"CATEGORIA\s+([A-Z]{2})\s+(.*)", line, re.IGNORECASE)
            mg = re.search(r"GRUPPO\s+([A-Z])\s+(.*)",       line, re.IGNORECASE)
            if mc:
                self.ctx.categoria      = mc.group(1)
                self.ctx.categoria_desc = clean(mc.group(2))
            if mg:
                self.ctx.gruppo      = mg.group(1)
                self.ctx.gruppo_desc = clean(mg.group(2))
            return

        if kind == "CATEGORIA":
            self._flush_warning()
            self._flush_sottovoce()
            self._reset_voce()
            m = re.match(r"CATEGORIA\s+([A-Z]{2,3})\s*(.*)", line, re.IGNORECASE)
            if m:
                self.ctx.categoria      = m.group(1)
                self.ctx.categoria_desc = clean(m.group(2))
            self.state = State.IN_CATEGORIA
            return

        if kind == "GRUPPO":
            self._flush_warning()
            self._flush_sottovoce()
            self._reset_voce()
            m = re.match(r"GRUPPO\s+([A-Z])\s*(.*)", line, re.IGNORECASE)
            if m:
                self.ctx.gruppo      = m.group(1)
                self.ctx.gruppo_desc = clean(m.group(2))
            self.state = State.IN_GRUPPO
            return

        if kind in ("VOCE", "VOCE_SIMPLE"):
            self._flush_warning()
            self._flush_sottovoce()
            self._reset_voce()
            mv = VOCE_RE.match(line) or VOCE_SIMPLE.match(line)
            if mv:
                self.ctx.voce = " ".join(g for g in mv.groups() if g)
            self.state = State.IN_VOCE_DESC
            return

        if kind == "SOTTOVOCE":
            self._flush_warning()
            self._flush_sottovoce()
            m = self._match_code(line)
            self.cur_code = m.group(1) if m else line.split()[0]
            rest = line[len(self.cur_code):].strip()
            if rest and not UNIT_RE.search(rest) and not IMPORT_RE.search(rest):
                self.sv_desc_lines.append(rest)
            self.state = State.IN_SOTTOVOCE_DESC
            return

        if kind == "AVVERTENZA_KW":
            self._flush_warning()
            self.state = State.IN_AVVERTENZA_HDR
            return

        if kind == "AVVERTENZA_ID":
            self._flush_warning()
            m = AVVERTENZA_ID_RE.match(line)
            self.warning_acc = WarningAcc(id=m.group(1), title=clean(m.group(2)))
            self.state = State.IN_AVVERTENZA_BODY
            return

        if kind == "UNITA":
            mu = UNIT_RE.search(line)
            if mu:
                self.cur_unita_codice = mu.group(1).strip()
                self.cur_unita_label  = mu.group(2).strip()
            mi = IMPORT_RE.search(line)
            if mi:
                self.cur_importo = it_float(mi.group(1))
            self.state = State.IN_UNITA_PREZZO
            return

        if kind == "IMPORTO":
            mi = IMPORT_RE.search(line)
            if mi:
                self.cur_importo = it_float(mi.group(1))
            self.state = State.IN_UNITA_PREZZO
            return

        if kind == "MANODOPERA":
            mm = MANOD_RE.search(line)
            if mm:
                self.cur_manodopera = it_float(mm.group(1))
            self.state = State.IN_SOTTOVOCE_DESC
            return

        if kind == "TEXT":
            # FIX: is_avvertenza_title ora esclude righe con minuscole e
            # frasi lunghe con punto finale (= corpo avvertenza, non titolo)
            if is_avvertenza_title(line):
                self._flush_warning()
                self.warning_acc = WarningAcc(title=line)
                self.state = State.IN_AVVERTENZA_BODY
                return

            if self.state == State.IN_VOCE_DESC:
                self.ctx.voce_desc_lines.append(line)

            elif self.state == State.IN_SOTTOVOCE_DESC:
                if self.cur_importo is not None:
                    if self.warning_acc is None:
                        self.warning_acc = WarningAcc()
                    self.warning_acc.lines.append(line)
                    self.state = State.IN_AVVERTENZA_BODY
                else:
                    self.sv_desc_lines.append(line)

            elif self.state in (State.IN_AVVERTENZA_HDR, State.IN_AVVERTENZA_BODY):
                if self.warning_acc is None:
                    self.warning_acc = WarningAcc(lines=[line])
                else:
                    self.warning_acc.lines.append(line)
                self.state = State.IN_AVVERTENZA_BODY

    def finalize(self):
        self._flush_warning()
        self._flush_sottovoce()

# ─────────────────────────────────────────────────────────────────────────────
# Post-processing
# ─────────────────────────────────────────────────────────────────────────────

def merge_duplicate_records(records: list) -> list:
    merged: list = []
    for rec in records:
        code = rec["codice"].strip()
        if not code:
            merged.append(rec)
            continue
        existing = next(
            (r for r in merged if r["codice"].strip().lower() == code.lower()), None
        )
        if existing is None:
            merged.append(rec)
            continue
        new_desc = rec["descrizione"].strip()
        cur_desc = existing["descrizione"].strip()
        if new_desc and new_desc.lower() not in cur_desc.lower():
            existing["descrizione"] = new_desc if not cur_desc else f"{cur_desc}\n{new_desc}"
        for w in rec.get("warnings", []):
            already = any(ew["id"] == w["id"] and ew["title"] == w["title"] for ew in existing["warnings"])
            if not already:
                existing["warnings"].append(w)
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
        return {"records": data, "pages_total": 0, "pages_parsed": 0}

    if ext != ".pdf":
        raise ValueError(f"Formato non supportato: {ext}. Usa .pdf o .json")

    raw_lines, page_count = extract_text_with_page_count(str(path))
    lines         = preprocess_lines(raw_lines)
    code_patterns = detect_code_re(lines)

    parser = RfiParser(code_patterns)
    for line in lines:
        parser.process_line(line)
    parser.finalize()

    records = merge_duplicate_records(parser.records)

    if debug:
        code_matches = sum(1 for l in lines if any(p.match(l.strip()) for p in code_patterns))
        print(json.dumps({
            "debug":         True,
            "raw_lines":     len(raw_lines),
            "clean_lines":   len(lines),
            "code_patterns": [p.pattern for p in code_patterns],
            "code_matches":  code_matches,
            "page_count":    page_count,
            "records_count": len(records),
            "first_5_codes": [r["codice"] for r in records[:5]],
            "last_5_codes":  [r["codice"] for r in records[-5:]] if len(records) >= 5 else [r["codice"] for r in records],
        }), file=sys.stderr)

    return {
        "records":      records,
        "pages_total":  page_count,
        "pages_parsed": page_count,
    }


def main():
    debug = "--debug" in sys.argv or bool(os.environ.get("QUANTARA_PARSER_DEBUG", ""))
    args  = [a for a in sys.argv[1:] if not a.startswith("--")]

    if not args:
        print(json.dumps({"error": "Uso: rfi_tariffa_parser.py <file.pdf|file.json> [--debug]"}), file=sys.stderr)
        sys.exit(1)

    try:
        result  = parse_pdf(args[0], debug=debug)
        payload = json.dumps(safe_json_value(result), ensure_ascii=False)
        sys.stdout.buffer.write(payload.encode("utf-8"))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()