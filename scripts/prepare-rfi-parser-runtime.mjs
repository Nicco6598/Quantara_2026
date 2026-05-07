import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const parserDir = join(repoRoot, "apps", "desktop", "src-tauri", "resources", "parser");
const parserScript = join(parserDir, "rfi_tariffa_parser.py");
const buildDir = join(repoRoot, "apps", "desktop", "src-tauri", "target", "rfi-parser-build");
const venvDir = join(buildDir, ".venv");
const isWindows = process.platform === "win32";
const parserBinary = join(parserDir, isWindows ? "rfi_tariffa_parser.exe" : "rfi_tariffa_parser");
const pythonExecutable = join(
  venvDir,
  isWindows ? "Scripts" : "bin",
  isWindows ? "python.exe" : "python",
);

if (!existsSync(parserScript)) {
  throw new Error(`Parser script not found: ${parserScript}`);
}

mkdirSync(parserDir, { recursive: true });
mkdirSync(buildDir, { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

if (!existsSync(pythonExecutable)) {
  const basePython = process.env.PYTHON ?? (isWindows ? "py" : "python3");
  const basePythonArgs = process.env.PYTHON ? [] : isWindows ? ["-3"] : [];
  run(basePython, [...basePythonArgs, "-m", "venv", venvDir]);
}

run(pythonExecutable, ["-m", "pip", "install", "--upgrade", "pip"]);
run(pythonExecutable, [
  "-m",
  "pip",
  "install",
  "--upgrade",
  "pyinstaller",
  "pypdfium2",
  "pdfplumber",
  "pypdf",
]);

rmSync(parserBinary, { force: true });

run(pythonExecutable, [
  "-m",
  "PyInstaller",
  "--onefile",
  "--clean",
  "--name",
  "rfi_tariffa_parser",
  "--distpath",
  parserDir,
  "--workpath",
  join(buildDir, "work"),
  "--specpath",
  buildDir,
  parserScript,
]);

if (!existsSync(parserBinary)) {
  throw new Error(`PyInstaller did not create ${parserBinary}`);
}

console.log(`Bundled RFI parser prepared: ${parserBinary}`);
