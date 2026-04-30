#!/usr/bin/env python3
import json
import re
import sys
import unicodedata
from pathlib import Path

pdfplumber = None
pypdf = None
try:
    import pdfplumber
except Exception:
    try:
        import pypdf
    except Exception as exc:
        print(
            f"missing pdf parser dependency: install pdfplumber or pypdf ({exc})",
            file=sys.stderr,
        )
        sys.exit(2)

CODE_RE = re.compile(r"\b([A-Z]{2}\.[A-Z]{2,}\.[A-Z]\.\d{3,4}\.[A-Z])\b")
IMPORT_RE = re.compile(r"IMPORTO EURO[:\s]+([\d.,]+)")
PERC_RE = re.compile(r"PERCENTUALE[:\s]+([\d.,]+)")
MANOD_RE = re.compile(r"%\s*Manodopera[:\s]+([\d.,]+)")
UNIT_RE = re.compile(r"UNITA['\u2019]?\s*DI\s*MISURA[:\s]+([A-Z%]+)\s*\(([^)]+)\)")
PAGE_HEADER_RE = re.compile(
    r"^(?:\d+\s+)?TARIFFA\s+[A-Z]{2}\s+CATEGORIA\s+[A-Z]{2}|^(?:\d+\s+)?Il presente volume",
    re.IGNORECASE,
)
CATEGORY_HEADER_RE = re.compile(r"^(?:CATEGORIA|GRUPPO)\s+[A-Z]\w*\b", re.IGNORECASE)
WARNING_RE = re.compile(r"^(?:AVVERTENZE|AVVERTENZA|\d{6,}\s+AVVERTENZA)\b", re.IGNORECASE)


def clean(value):
    safe_value = "".join(" " if 0xD800 <= ord(char) <= 0xDFFF else char for char in value)
    return unicodedata.normalize("NFC", " ".join(safe_value.split()))


def it_float(value):
    try:
        return float(value.replace(".", "").replace(",", "."))
    except Exception:
        return None


def safe_json_value(value):
    if isinstance(value, str):
        return "".join("" if 0xD800 <= ord(char) <= 0xDFFF else char for char in value)
    if isinstance(value, list):
        return [safe_json_value(item) for item in value]
    if isinstance(value, dict):
        return {key: safe_json_value(item) for key, item in value.items()}
    return value


def is_record_boundary(line):
    return bool(CODE_RE.match(line) or re.match(r"^VOCE\s+\d+", line))


def is_section_noise(line):
    value = clean(line)
    return bool(PAGE_HEADER_RE.match(value) or CATEGORY_HEADER_RE.match(value) or WARNING_RE.match(value))


def is_metadata_line(line):
    return bool(UNIT_RE.search(line) or IMPORT_RE.search(line) or PERC_RE.search(line) or MANOD_RE.search(line))


def description_text(line):
    value = UNIT_RE.sub(" ", line)
    value = IMPORT_RE.sub(" ", value)
    value = PERC_RE.sub(" ", value)
    value = MANOD_RE.sub(" ", value)
    value = re.split(r"\s+\d+\s+TARIFFA\s+[A-Z]{2}\s+CATEGORIA\s+[A-Z]{2}\b", value, maxsplit=1)[0]
    value = re.split(r"\s+[A-Z]{2}\.[A-Z]{2,}\.[A-Z]\.\d{3,4}\.[A-Z]\b", value, maxsplit=1)[0]
    value = clean(value)
    return "" if is_section_noise(value) else value


def strip_code_prefix(line, code):
    return clean(line[len(code) :]) if line.startswith(code) else line


def extract_text(pdf_path):
    lines = []
    if pdfplumber is not None:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                lines.extend(text.splitlines())
    else:
        reader = pypdf.PdfReader(str(pdf_path))
        for page in reader.pages:
            text = page.extract_text() or ""
            lines.extend(text.splitlines())
    return lines


def parse(lines):
    records = []
    ctx = {"voce_num": "", "voce_desc": ""}

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        match = re.match(r"^VOCE\s+(\d+)$", line)
        if match:
            ctx["voce_num"] = match.group(1)
            j, desc_lines = i + 1, []
            while j < len(lines) and len(desc_lines) < 3:
                next_line = lines[j].strip()
                if (
                    next_line
                    and not CODE_RE.match(next_line)
                    and not next_line.startswith("AVVERTENZE")
                    and not next_line.startswith("VOCE")
                ):
                    desc_lines.append(next_line)
                elif desc_lines:
                    break
                j += 1
            ctx["voce_desc"] = clean(" ".join(desc_lines))

        match = CODE_RE.match(line)
        if match:
            code = match.group(1)
            parts = code.split(".")
            block_lines, j = [strip_code_prefix(line, code)], i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                if not next_line:
                    j += 1
                    continue
                if is_record_boundary(next_line):
                    break
                if is_section_noise(next_line):
                    j += 1
                    continue
                block_lines.append(next_line)
                j += 1

            block = " ".join(block_lines)
            unit_code = unit_label = value_type = ""
            value = manodopera = None

            unit_match = UNIT_RE.search(block)
            if unit_match:
                unit_code = unit_match.group(1).strip()
                unit_label = unit_match.group(2).strip()

            amount_match = IMPORT_RE.search(block)
            if amount_match:
                value, value_type = it_float(amount_match.group(1)), "EURO"
            else:
                percent_match = PERC_RE.search(block)
                if percent_match:
                    value, value_type = it_float(percent_match.group(1)), "PERCENTUALE"

            labor_match = MANOD_RE.search(block)
            if labor_match:
                manodopera = it_float(labor_match.group(1))

            desc_lines = [description_text(item) for item in block_lines]
            desc_lines = [item for item in desc_lines if item]

            records.append(
                {
                    "codice": code,
                    "tariffa": parts[0] if len(parts) > 0 else "",
                    "categoria": parts[1] if len(parts) > 1 else "",
                    "gruppo": parts[2] if len(parts) > 2 else "",
                    "voce": ctx["voce_num"],
                    "voce_desc": ctx["voce_desc"],
                    "sottovoce": parts[4] if len(parts) > 4 else "",
                    "descrizione": clean(" ".join(desc_lines)),
                    "unita_codice": unit_code,
                    "unita_label": unit_label,
                    "tipo_valore": value_type,
                    "valore_euro": value,
                    "perc_manodopera": manodopera,
                }
            )
        i += 1
    return records


if __name__ == "__main__":
    payload = json.dumps(
        safe_json_value(parse(extract_text(Path(sys.argv[1])))),
        ensure_ascii=False,
    )
    sys.stdout.buffer.write(payload.encode("utf-8"))
