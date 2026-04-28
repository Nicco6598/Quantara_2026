Place the bundled Python runtime here for production builds.

Expected Windows layout:

- `python.exe`
- `python312.dll` or equivalent runtime DLLs
- `Lib/site-packages/pdfplumber`
- `Lib/site-packages/pdfminer`
- any transitive dependencies required by pdfplumber

The app first looks for `resources/parser/rfi_tariffa_parser.exe`, then
`resources/python/python.exe` plus `resources/parser/rfi_tariffa_parser.py`.
Development builds fall back to `py -3 -c <embedded parser>`.
