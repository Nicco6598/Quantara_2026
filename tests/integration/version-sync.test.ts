import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = resolve(".");
const syncScriptPath = resolve(repoRoot, "scripts/sync-version.mjs");
const tempRoots: string[] = [];

afterEach(() => {
  while (tempRoots.length > 0) {
    const tempRoot = tempRoots.pop();

    if (!tempRoot) {
      continue;
    }

    rmSync(tempRoot, { force: true, recursive: true });
  }
});

describe("version sync", () => {
  it("aligns release metadata from root package version", () => {
    const tempRoot = makeFixtureRoot();

    execFileSync("node", [resolve(tempRoot, "scripts/sync-version.mjs")], {
      cwd: tempRoot,
      encoding: "utf8",
    });

    expect(readJson(resolve(tempRoot, "apps/desktop/package.json")).version).toBe("9.8.7");
    expect(readJson(resolve(tempRoot, "packages/shared-types/package.json")).version).toBe("9.8.7");
    expect(
      readFileSync(resolve(tempRoot, "apps/desktop/src/generated/appVersion.ts"), "utf8"),
    ).toBe('export const APP_VERSION = "9.8.7";\n');
    expect(readFileSync(resolve(tempRoot, "apps/desktop/src-tauri/Cargo.toml"), "utf8")).toContain(
      'version = "9.8.7"',
    );
    expect(readFileSync(resolve(tempRoot, "apps/desktop/src-tauri/Cargo.lock"), "utf8")).toContain(
      'version = "9.8.7"',
    );
  });

  it("fails check mode when release metadata drifts", () => {
    const tempRoot = makeFixtureRoot();
    writeFileSync(
      resolve(tempRoot, "apps/desktop/src/generated/appVersion.ts"),
      'export const APP_VERSION = "0.0.1";\n',
    );

    const result = spawnSync("node", [resolve(tempRoot, "scripts/sync-version.mjs"), "--check"], {
      cwd: tempRoot,
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Version drift detected");
  });
});

function makeFixtureRoot() {
  const tempRoot = mkdtempSync(resolve(tmpdir(), "quantara-version-sync-"));
  tempRoots.push(tempRoot);

  mkdirSync(resolve(tempRoot, "apps/desktop/src/generated"), { recursive: true });
  mkdirSync(resolve(tempRoot, "apps/desktop/src-tauri"), { recursive: true });
  mkdirSync(resolve(tempRoot, "packages/shared-types"), { recursive: true });
  mkdirSync(resolve(tempRoot, "scripts"), { recursive: true });

  writeFileSync(
    resolve(tempRoot, "package.json"),
    JSON.stringify({ name: "quantara", private: true, version: "9.8.7" }, null, 2),
  );
  writeFileSync(
    resolve(tempRoot, "apps/desktop/package.json"),
    JSON.stringify({ name: "@quantara/desktop", private: true, version: "0.0.1" }, null, 2),
  );
  writeFileSync(
    resolve(tempRoot, "packages/shared-types/package.json"),
    JSON.stringify({ name: "@quantara/shared-types", private: true, version: "0.0.1" }, null, 2),
  );
  writeFileSync(
    resolve(tempRoot, "apps/desktop/src/generated/appVersion.ts"),
    'export const APP_VERSION = "0.0.1";\n',
  );
  writeFileSync(
    resolve(tempRoot, "apps/desktop/src-tauri/Cargo.toml"),
    ["[package]", 'name = "quantara_desktop"', 'version = "0.0.1"', "", "[dependencies]", ""].join(
      "\n",
    ),
  );
  writeFileSync(
    resolve(tempRoot, "apps/desktop/src-tauri/tauri.conf.json"),
    JSON.stringify({ package: { version: "0.0.1" }, version: "0.0.1" }, null, 2),
  );
  writeFileSync(
    resolve(tempRoot, "apps/desktop/src-tauri/Cargo.lock"),
    [
      "[[package]]",
      'name = "quantara_desktop"',
      'version = "0.0.1"',
      'source = "registry+https://github.com/rust-lang/crates.io-index"',
      "",
    ].join("\n"),
  );
  copyFileSync(syncScriptPath, resolve(tempRoot, "scripts/sync-version.mjs"));

  return tempRoot;
}

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8")) as { version: string };
}
