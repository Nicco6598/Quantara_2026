param(
  [string]$Python = "py",
  [string[]]$PythonArgs = @("-3")
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$parserDir = Join-Path $repoRoot "apps/desktop/src-tauri/resources/parser"
$parserScript = Join-Path $parserDir "rfi_tariffa_parser.py"
$buildDir = Join-Path $repoRoot "apps/desktop/src-tauri/target/rfi-parser-build"

if (-not (Test-Path -LiteralPath $parserScript)) {
  throw "Parser script not found: $parserScript"
}

New-Item -ItemType Directory -Force -Path $parserDir | Out-Null
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

& $Python @PythonArgs -m pip install --upgrade pip
& $Python @PythonArgs -m pip install --upgrade pyinstaller pdfplumber

& $Python @PythonArgs -m PyInstaller `
  --onefile `
  --clean `
  --name rfi_tariffa_parser `
  --distpath $parserDir `
  --workpath (Join-Path $buildDir "work") `
  --specpath $buildDir `
  $parserScript

$parserExe = Join-Path $parserDir "rfi_tariffa_parser.exe"
if (-not (Test-Path -LiteralPath $parserExe)) {
  throw "PyInstaller did not create $parserExe"
}

Write-Host "Bundled RFI parser prepared: $parserExe"
