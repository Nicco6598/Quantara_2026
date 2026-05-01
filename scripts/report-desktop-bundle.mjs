import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const assetsDir = join(process.cwd(), "apps", "desktop", "dist", "assets");
const rows = [];

for (const fileName of await readdir(assetsDir)) {
  const filePath = join(assetsDir, fileName);
  const fileStat = await stat(filePath);

  if (fileStat.isFile()) {
    rows.push({
      file: fileName,
      kb: Number((fileStat.size / 1024).toFixed(2)),
    });
  }
}

rows.sort((left, right) => right.kb - left.kb);

console.table(rows.slice(0, 20));
