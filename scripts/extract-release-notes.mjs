import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const version = process.argv[2] ?? process.env.npm_package_version;

if (!version) {
  throw new Error("Missing release version. Pass it as first argument or run through npm.");
}

const changelog = await readFile(resolve(rootDir, "CHANGELOG.md"), "utf8");
const versionHeading = new RegExp(`^##\\s+${escapeRegExp(version)}\\s+[-—]\\s+.+$`, "m");
const headingMatch = changelog.match(versionHeading);

if (!headingMatch || headingMatch.index === undefined) {
  throw new Error(`CHANGELOG.md has no section for version ${version}.`);
}

const sectionStart = headingMatch.index + headingMatch[0].length;
const nextHeadingMatch = changelog.slice(sectionStart).match(/^##\s+/m);
const sectionEnd =
  nextHeadingMatch?.index === undefined ? changelog.length : sectionStart + nextHeadingMatch.index;
const notes = changelog.slice(sectionStart, sectionEnd).trim();

if (!notes) {
  throw new Error(`CHANGELOG.md section for version ${version} is empty.`);
}

if (process.env.GITHUB_OUTPUT) {
  const output = ["body<<QUANTARA_RELEASE_NOTES", notes, "QUANTARA_RELEASE_NOTES"].join("\n");

  await import("node:fs/promises").then(({ appendFile }) =>
    appendFile(process.env.GITHUB_OUTPUT, `${output}\n`, "utf8"),
  );
} else {
  console.log(notes);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
