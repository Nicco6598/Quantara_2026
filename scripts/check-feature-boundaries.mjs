#!/usr/bin/env node
// Checks that feature modules don't import UI from other feature modules.
// Domain logic (domain/) and utilities (utils/) are allowed to be shared.
// Only blocks imports from components/ and top-level feature files.
// Run via: node scripts/check-feature-boundaries.mjs

import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

const FEATURES = [
  "accounting",
  "dashboard",
  "materials",
  "project-detail",
  "projects",
  "sal",
  "settings",
  "tariffs",
  "team",
];

const _ALLOWED_IMPORT_PREFIXES = [
  "@/components/",
  "@/hooks/",
  "@/lib/",
  "@/store/",
  "@/generated/",
  "@/routes/",
  "@/theme/",
  "@/app/",
  "@/services/",
  "@quantara/",
  "@/features/",
];

// Only block imports from these directories within other features
const BLOCKED_SUBPATHS = ["components/"];
// Always allow these subpaths (pure types, domain logic)
const ALLOWED_SUBPATHS = ["types", "domain/", "utils/"];

const files = globSync("apps/desktop/src/features/**/*.{ts,tsx}", {
  ignore: ["**/node_modules/**"],
});

let errors = 0;

for (const file of files) {
  const content = readFileSync(file, "utf-8");
  const relativePath = file.replace(/\\/g, "/");
  const match = relativePath.match(/\/features\/([^/]+)\//);
  if (!match) continue;
  const currentFeature = match[1];
  if (!FEATURES.includes(currentFeature)) continue;

  const importLines = content.matchAll(/from\s+["'](@\/[^"']+)["']/g);

  for (const [, importPath] of importLines) {
    if (!importPath.startsWith("@/features/")) continue;

    const targetFeature = importPath.replace("@/features/", "").split("/")[0];
    if (!targetFeature || !FEATURES.includes(targetFeature)) continue;
    if (targetFeature === currentFeature) continue;

    // Self-import within the same feature is fine
    const fileFeaturePrefix = `@/features/${currentFeature}/`;
    if (importPath.startsWith(fileFeaturePrefix)) continue;

    // Only block imports from components/ directories (UI coupling)
    // and top-level feature files (screens)
    const suffix = importPath.replace(`@/features/${targetFeature}/`, "");
    const isAllowed = ALLOWED_SUBPATHS.some((prefix) => suffix.startsWith(prefix));
    const isBlocked =
      !isAllowed &&
      (BLOCKED_SUBPATHS.some((prefix) => suffix.startsWith(prefix)) || !suffix.includes("/"));
    if (!isBlocked) continue;

    console.error(`❌ Feature boundary violation: ${relativePath}`);
    console.error(`   imports from "${importPath}" (different feature: ${targetFeature})`);
    errors++;
  }
}

if (errors > 0) {
  console.error(
    `\n${errors} feature boundary violation(s) found. Fix by extracting shared UI into components/shared/.`,
  );
  process.exit(1);
}

console.log("✅ Feature boundaries clean — no cross-feature UI imports detected.");
