import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const rootPackagePath = resolve(rootDir, "package.json");
const checkOnly = process.argv.includes("--check");

const rootPackage = JSON.parse(await readFile(rootPackagePath, "utf8"));
const rootVersion = rootPackage.version;

if (typeof rootVersion !== "string" || rootVersion.length === 0) {
  throw new Error("Root package.json is missing a valid version field.");
}

const updates = [];
const workspacePackageFiles = await collectWorkspacePackageFiles();

for (const relativePath of workspacePackageFiles) {
  await syncJsonVersion(relativePath);
}

await syncTextVersion({
  path: "apps/desktop/src-tauri/Cargo.toml",
  replacer: (content) =>
    replaceFirstMatch(
      content,
      /(\[package\][\s\S]*?^version = ")([^"]+)(")/m,
      rootVersion,
      "Cargo.toml [package].version",
    ),
});

await syncJsonVersion("apps/desktop/src-tauri/tauri.conf.json");

await syncTextVersion({
  path: "apps/desktop/src/generated/appVersion.ts",
  replacer: (content) =>
    replaceFirstMatch(
      content,
      /(export const APP_VERSION = ")([^"]+)(")/,
      rootVersion,
      "appVersion.ts APP_VERSION",
    ),
});

await syncTextVersion({
  path: "apps/desktop/src-tauri/Cargo.lock",
  replacer: (content) =>
    replaceFirstMatch(
      content,
      /(\[\[package\]\]\r?\nname = "quantara_desktop"\r?\nversion = ")([^"]+)(")/m,
      rootVersion,
      'Cargo.lock package "quantara_desktop"',
    ),
});

if (updates.length === 0) {
  console.log(`Versions already aligned on ${rootVersion}.`);
  process.exit(0);
}

if (checkOnly) {
  console.error(`Version drift detected against root package.json (${rootVersion}):`);
  for (const update of updates) {
    console.error(`- ${update.path}: ${update.from} -> ${update.to}`);
  }
  console.error("Run `pnpm version:sync` and commit the updated files.");
  process.exit(1);
}

for (const update of updates) {
  console.log(`Updated ${update.path}: ${update.from} -> ${update.to}`);
}

async function collectWorkspacePackageFiles() {
  const results = [];

  for (const baseDir of ["apps", "packages"]) {
    await walk(resolve(rootDir, baseDir), results);
  }

  return results.sort();
}

async function walk(directory, results) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "target") {
      continue;
    }

    const absolutePath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      await walk(absolutePath, results);
      continue;
    }

    if (entry.isFile() && entry.name === "package.json") {
      results.push(toRelativePath(absolutePath));
    }
  }
}

async function syncJsonVersion(relativePath) {
  const absolutePath = resolve(rootDir, relativePath);
  const content = await readFile(absolutePath, "utf8");
  const json = JSON.parse(content);
  const currentVersion = json.version;

  if (currentVersion === rootVersion) {
    return;
  }

  updates.push({
    from: currentVersion ?? "<missing>",
    path: relativePath,
    to: rootVersion,
  });

  if (checkOnly) {
    return;
  }

  json.version = rootVersion;
  await writeFile(absolutePath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
}

async function syncTextVersion({ path, replacer }) {
  const absolutePath = resolve(rootDir, path);
  const content = await readFile(absolutePath, "utf8");
  const nextContent = replacer(content);

  if (nextContent === content) {
    return;
  }

  if (!checkOnly) {
    await writeFile(absolutePath, nextContent, "utf8");
  }
}

function replaceFirstMatch(content, pattern, nextVersion, label) {
  const match = content.match(pattern);

  if (!match) {
    throw new Error(`Unable to locate version field for ${label}.`);
  }

  const currentVersion = match[2];

  if (currentVersion === nextVersion) {
    return content;
  }

  updates.push({
    from: currentVersion,
    path: label,
    to: nextVersion,
  });

  return content.replace(pattern, `$1${nextVersion}$3`);
}

function toRelativePath(absolutePath) {
  return relative(rootDir, absolutePath).replaceAll("\\", "/");
}
