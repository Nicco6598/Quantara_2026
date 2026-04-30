import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const rootPackagePath = resolve(rootDir, "package.json");
const rootPackage = JSON.parse(await readFile(rootPackagePath, "utf8"));
const version = rootPackage.version;

if (typeof version !== "string" || version.length === 0) {
  throw new Error("Root package.json is missing a valid version field.");
}

const tagName = `app-v${version}`;

execFileSync("git", ["tag", tagName], {
  cwd: rootDir,
  stdio: "inherit",
});

execFileSync("git", ["push", "origin", tagName], {
  cwd: rootDir,
  stdio: "inherit",
});
