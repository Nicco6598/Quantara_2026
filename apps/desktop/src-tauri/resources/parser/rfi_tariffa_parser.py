#!/usr/bin/env python3
import json
import os
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

IMPORT_RE = re.compile(r"IMPORTO EURO[:\s]+([\d.,]+)")
PERC_RE = re.compile(r"PERCENTUALE[:\s]+([\d.,]+)")
MANOD_RE = re.compile(r"%\s*Manodopera[:\s]+([\d.,]+)")
UNIT_RE = re.compile(r"UNITA['\u2019]?\s*DI\s*MISURA[:\s]+([\w%²³]+)\s*\(([^)]+)\)")
PAGE_HEADER_RE = re.compile(
    r"^(?:\d+\s+)?TARIFFA\s+[A-Z]{2}\s+CATEGORIA\s+[A-Z]{2}|^(?:\d+\s+)?Il presente volume",
    re.IGNORECASE,
)
CATEGORY_HEADER_RE = re.compile(r"^(?:CATEGORIA|GRUPPO)\s+[A-Z]\w*\b", re.IGNORECASE)
WARNING_RE = re.compile(r"^(?:AVVERTENZE|AVVERTENZA|\d{6,}\s+AVVERTENZA)\b", re.IGNORECASE)

CODE_CANDIDATES = [
    re.compile(r"\b([A-Z]{2}\.[A-Z]{2,}\.[A-Z]\.\d{3,4}\.[A-Z])\b"),
    re.compile(r"\b([A-Z]{2}\.[A-Z]{2,}\.[A-Z]\.\d+\s+\d+\.[A-Z])\b"),
    re.compile(r"\b([A-Z]{2}\.[A-Z]{2,}\.[A-Z]\.\d+\.[A-Z])\b"),
    re.compile(r"\b([A-Z]{2,}\.[A-Z]{2,}\.[A-Z]\.\d+[\s\d]*\.[A-Z]+)\b"),
]

VOCE_CANDIDATES = [
    re.compile(r"^VOCE\s+(\d+)$"),
    re.compile(r"^VOCE\s+(\d+)\s+(\d+)$"),
    re.compile(r"^VOCE\s+(\d+)\s+[A-Z]$"),
]

TARIFFA_RE = re.compile(
    r"\s+\d+\s+TARIFFA\s+[A-Z]{2}\s+CATEGORIA\s+[A-Z]{2}\b"
)
NUMERIC_PAGE_RE = re.compile(r"^\d{1,3}$")
SECTION_WORD_RE = re.compile(r"^(GRUPPO|CATEGORIA)$", re.IGNORECASE)
SINGLE_LETTER_RE = re.compile(r"^[A-Z]$")
VOCE_BOUNDARY_RE = re.compile(r"^VOCE\s+\d+")
GRUPPO_DESC_RE = re.compile(
    r"^(?:GRUPPO|CATEGORIA)\s+[A-Z]\w*\b\s*(.*)", re.IGNORECASE
)
TARIFFA_CAT_RE = re.compile(r"CATEGORIA\s+([A-Z]\w*)", re.IGNORECASE)
AVVERTENZA_ID_RE = re.compile(r"^(\d{4,})\s+AVVERTENZA", re.IGNORECASE)
AVVERTENZE_SECTION_RE = re.compile(r"^(?:AVVERTENZE|AVVERTENZA)$", re.IGNORECASE)


def clean(value):
    if value.isascii():
        return " ".join(value.split())
    safe_value = "".join(" " if 0xD800 <= ord(char) <= 0xDFFF else char for char in value)
    return unicodedata.normalize("NFC", " ".join(safe_value.split()))


def it_float(value):
    try:
        return float(value.replace(".", "").replace(",", "."))
    except Exception:
        return None


def safe_json_value(value):
    if isinstance(value, str):
        if value.isascii():
            return value
        return "".join("" if 0xD800 <= ord(char) <= 0xDFFF else char for char in value)
    if isinstance(value, list):
        return [safe_json_value(item) for item in value]
    if isinstance(value, dict):
        return {key: safe_json_value(item) for key, item in value.items()}
    return value


def detect_pattern(lines, candidates):
    sample_size = min(200, len(lines))
    step = max(1, len(lines) // sample_size) if len(lines) > sample_size else 1
    stripped_lines = [lines[i].strip() for i in range(0, len(lines), step)][:sample_size]
    best, best_count = candidates[0], 0
    for candidate in candidates:
        count = sum(1 for line in stripped_lines if candidate.match(line))
        if count > best_count:
            best_count = count
            best = candidate
    return best


def is_record_boundary(line, code_re):
    return bool(code_re.match(line) or VOCE_BOUNDARY_RE.match(line))


def is_section_noise(line):
    return is_section_noise_value(clean(line))


def is_section_noise_value(value):
    if NUMERIC_PAGE_RE.match(value):
        return True
    if SECTION_WORD_RE.match(value):
        return True
    if SINGLE_LETTER_RE.match(value):
        return True
    return bool(
        PAGE_HEADER_RE.match(value)
        or CATEGORY_HEADER_RE.match(value)
        or WARNING_RE.match(value)
    )


def description_text(line, code_tail_re):
    value = UNIT_RE.sub(" ", line)
    value = IMPORT_RE.sub(" ", value)
    value = PERC_RE.sub(" ", value)
    value = MANOD_RE.sub(" ", value)
    value = TARIFFA_RE.split(value, maxsplit=1)[0]
    value = code_tail_re.sub(" ", value)
    value = clean(value)
    return "" if is_section_noise_value(value) else value


def strip_code_prefix(line, code):
    return clean(line[len(code) :]) if line.startswith(code) else line


def extract_text(pdf_path):
    lines = []
    if pdfplumber is not None:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
                lines.extend(text.splitlines())
    else:
        reader = pypdf.PdfReader(str(pdf_path))
        for page in reader.pages:
            text = page.extract_text() or ""
            lines.extend(text.splitlines())
    return lines


def extract_text_with_page_count(pdf_path):
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


def count_pages(pdf_path):
    if pdfplumber is not None:
        with pdfplumber.open(pdf_path) as pdf:
            return len(pdf.pages)
    reader = pypdf.PdfReader(str(pdf_path))
    return len(reader.pages)


CODE_PREFIX_RE = re.compile(r"^[A-Z]{2}\.[A-Z]{2,}\.[A-Z]\.\d+$")
CODE_CONT_RE = re.compile(r"^(\d+[\s\d]*\.[A-Z]+)")
VOCE_SPLIT_RE = re.compile(r"^VOCE\s+(\d{1,2})$")
VOCE_CONT_RE = re.compile(r"^\d{1,2}$")


def preprocess_lines(lines):
    result = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue

        # Join split VOCE: "VOCE 1" + "01" → "VOCE 1 01"
        voce_match = VOCE_SPLIT_RE.match(line)
        if voce_match and i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            if VOCE_CONT_RE.match(next_line):
                result.append(f"{line} {next_line}")
                i += 2
                continue

        # Join split codes: "SB.AB.A.1" + "01.A text" → "SB.AB.A.1 01.A text"
        if CODE_PREFIX_RE.match(line) and i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            cont_match = CODE_CONT_RE.match(next_line)
            if cont_match:
                continuation = cont_match.group(1)
                rest = next_line[len(continuation):].strip()
                result.append(f"{line} {continuation} {rest}".rstrip())
                i += 2
                continue

        result.append(line)
        i += 1
    return result


def parse(lines, code_re, voce_re):
    records = []
    code_tail_re = re.compile(r"\s+" + code_re.pattern.replace("(", "(?:", 1) + r"\b")
    ctx = {
        "voce_num": "", "voce_desc": "",
        "categoria_desc": "", "gruppo_desc": "",
        "pending_warnings": [],
    }

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        voce_match = voce_re.match(line)
        if voce_match:
            ctx["voce_num"] = (
                f"{voce_match.group(1)} {voce_match.group(2)}"
                if voce_match.lastindex and voce_match.lastindex > 1
                else voce_match.group(1)
            )
            j, desc_lines = i + 1, []
            while j < len(lines) and len(desc_lines) < 3:
                next_line = lines[j].strip()
                if (
                    next_line
                    and not code_re.match(next_line)
                    and not next_line.startswith("AVVERTENZE")
                    and not next_line.startswith("AVVERTENZA")
                    and not next_line.startswith("VOCE")
                ):
                    desc_lines.append(next_line)
                elif desc_lines:
                    break
                j += 1
            ctx["voce_desc"] = clean(" ".join(desc_lines))

        group_header_match = CATEGORY_HEADER_RE.match(line)
        if group_header_match:
            desc_match = GRUPPO_DESC_RE.match(line)
            if desc_match and desc_match.group(1).strip():
                ctx["gruppo_desc"] = clean(desc_match.group(1))
            i += 1
            continue

        cat_check = TARIFFA_CAT_RE.search(line)
        if cat_check and PAGE_HEADER_RE.match(line):
            ctx["categoria_desc"] = ""

        if SINGLE_LETTER_RE.match(line):
            i += 1
            continue

        if AVVERTENZE_SECTION_RE.match(line):
            i += 1
            continue

        avv_match = AVVERTENZA_ID_RE.match(line)
        if avv_match:
            avv_id = avv_match.group(1)
            title_raw = line[len(avv_id):].strip()
            body_lines = []
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                if not next_line:
                    j += 1
                    continue
                if (
                    next_line.startswith("VOCE")
                    or code_re.match(next_line)
                    or CATEGORY_HEADER_RE.match(next_line)
                    or PAGE_HEADER_RE.match(next_line)
                    or AVVERTENZA_ID_RE.match(next_line)
                    or SINGLE_LETTER_RE.match(next_line)
                    or next_line.startswith("AVVERTENZE")
                    or next_line.startswith("AVVERTENZA")
                ):
                    break
                body_lines.append(next_line)
                j += 1
            ctx["pending_warnings"].append({
                "id": avv_id,
                "title": clean(title_raw),
                "body": clean(" ".join(body_lines)),
            })
            i = j
            continue

        code_match = code_re.match(line)
        if code_match:
            code = code_match.group(1)
            parts = code.split(".")
            block_lines, j = [strip_code_prefix(line, code)], i + 1
            block_has_meta = (
                len(block_lines[0]) > 5
                and (
                    UNIT_RE.search(block_lines[0])
                    or IMPORT_RE.search(block_lines[0])
                    or MANOD_RE.search(block_lines[0])
                )
            )
            while j < len(lines):
                next_line = lines[j].strip()
                if not next_line:
                    j += 1
                    continue
                if is_record_boundary(next_line, code_re):
                    if block_has_meta:
                        break
                if is_section_noise(next_line):
                    j += 1
                    continue
                block_lines.append(next_line)
                if len(next_line) > 5 and (
                    UNIT_RE.search(next_line)
                    or IMPORT_RE.search(next_line)
                    or MANOD_RE.search(next_line)
                ):
                    block_has_meta = True
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

            sottovoce_parts = parts[3].split() if len(parts) > 3 else []
            sottovoce = (
                f"{sottovoce_parts[1]}.{parts[4]}"
                if len(parts) > 4 and len(sottovoce_parts) > 1
                else parts[4] if len(parts) > 4 else ""
            )

            desc_lines = []
            for item in block_lines:
                desc = description_text(item, code_tail_re)
                if desc:
                    desc_lines.append(desc)

            records.append(
                {
                    "codice": code,
                    "tariffa": parts[0] if len(parts) > 0 else "",
                    "categoria": parts[1] if len(parts) > 1 else "",
                    "gruppo": parts[2] if len(parts) > 2 else "",
                    "voce": ctx["voce_num"],
                    "voce_desc": ctx["voce_desc"],
                    "categoria_desc": ctx["categoria_desc"],
                    "gruppo_desc": ctx["gruppo_desc"],
                    "sottovoce": sottovoce,
                    "descrizione": clean(" ".join(desc_lines)),
                    "unita_codice": unit_code,
                    "unita_label": unit_label,
                    "tipo_valore": value_type,
                    "valore_euro": value,
                    "perc_manodopera": manodopera,
                    "warnings": list(ctx["pending_warnings"]),
                }
            )
        i += 1

    seen = set()
    deduped = []
    for record in records:
        key = (record["codice"], record["valore_euro"])
        if key not in seen:
            seen.add(key)
            deduped.append(record)
    return deduped


if __name__ == "__main__":
    debug = "--debug" in sys.argv or bool(os.environ.get("QUANTARA_PARSER_DEBUG", ""))
    path = Path(sys.argv[1])
    raw_lines, page_count = extract_text_with_page_count(path)
    lines = preprocess_lines(raw_lines)
    code_re = detect_pattern(lines, CODE_CANDIDATES)
    voce_re = detect_pattern(lines, VOCE_CANDIDATES)
    records = parse(lines, code_re, voce_re)

    if debug:
        code_matches = sum(1 for line in lines if code_re.match(line.strip()))
        voce_matches = sum(1 for line in lines if voce_re.match(line.strip()))
        raw_lines_count = len(raw_lines)
        clean_lines_count = len(lines)
        print(
            json.dumps({
                "debug": True,
                "raw_lines": raw_lines_count,
                "clean_lines": clean_lines_count,
                "code_pattern": code_re.pattern,
                "code_matches": code_matches,
                "voce_pattern": voce_re.pattern,
                "voce_matches": voce_matches,
                "page_count": page_count,
                "records_count": len(records),
                "first_5_codes": [r["codice"] for r in records[:5]],
                "last_5_codes": [r["codice"] for r in records[-5:]] if len(records) >= 5 else [r["codice"] for r in records],
            }),
            file=sys.stderr,
        )

    output = {
        "records": safe_json_value(records),
        "pages_total": page_count,
    }
    payload = json.dumps(output, ensure_ascii=False)
    sys.stdout.buffer.write(payload.encode("utf-8"))
