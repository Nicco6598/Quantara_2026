import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET = {
  initialJsGzip: 350 * 1024,
  otherJsGzip: 250 * 1024,
  cssGzip: 90 * 1024,
};

const ROOT = process.cwd();
const distDir = join(ROOT, "apps", "desktop", "dist");
const assetsDir = join(distDir, "assets");

function getGzipSize(buffer) {
  return gzipSync(buffer).length;
}

function isEntryPoint(name, manifest) {
  if (!manifest) {
    return /^index-/i.test(name) || /^main-/i.test(name);
  }
  return Object.values(manifest).some((entry) => entry.isEntry && entry.file === name);
}

async function loadManifest() {
  try {
    const content = await readFile(join(distDir, ".vite", "manifest.json"), "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

const results = [];
let failed = false;

const manifest = await loadManifest();

let entries;
try {
  entries = await readdir(assetsDir);
} catch {
  console.error("dist/assets directory not found. Build the project first.");
  process.exit(1);
}

for (const name of entries) {
  const filePath = join(assetsDir, name);
  const fileStat = await stat(filePath);

  if (!fileStat.isFile()) continue;

  const raw = await readFile(filePath);
  const gzipped = getGzipSize(raw);
  const rawKb = (raw.length / 1024).toFixed(1);
  const gzipKb = (gzipped / 1024).toFixed(1);

  let budget = null;
  let label = null;

  if (name.endsWith(".js") || name.endsWith(".mjs")) {
    const isEntry = isEntryPoint(name, manifest);
    label = isEntry ? "entry JS" : "chunk JS";
    budget = isEntry ? BUDGET.initialJsGzip : BUDGET.otherJsGzip;
  } else if (name.endsWith(".css")) {
    label = "CSS";
    budget = BUDGET.cssGzip;
  }

  if (budget) {
    const pass = gzipped <= budget;
    if (!pass) failed = true;
    results.push({
      pass,
      name,
      label,
      rawKb,
      gzipKb,
      budgetKb: (budget / 1024).toFixed(0),
    });
  }
}

results.sort((a, b) => b.gzipKb - a.gzipKb);

for (const r of results) {
  const icon = r.pass ? "\u2705" : "\u274C";
  console.log(
    `${icon} ${r.name}  (${r.label})  raw=${r.rawKb}KB  gzip=${r.gzipKb}KB / ${r.budgetKb}KB`,
  );
}

if (failed) {
  console.error("\n\u274C Bundle size budget exceeded!");
  process.exit(1);
} else {
  console.log("\n\u2705 All bundle sizes within budget");
}
