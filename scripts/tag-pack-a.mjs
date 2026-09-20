import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tagsForThemeLabel } from "../src/problems/theme-map.js";

const root = dirname(fileURLToPath(new URL(".", import.meta.url)));
const path = join(root, "src/data/pack-a.json");
const pack = JSON.parse(readFileSync(path, "utf8"));
const missing = [];
for (const reading of pack.readings) {
  const tags = tagsForThemeLabel(reading.theme_label);
  if (!tags.length) missing.push(`${reading.day}:${reading.theme_label}`);
  reading.theme_tags = tags;
}
if (missing.length) {
  throw new Error(`unmapped Pack A themes:\n${missing.join("\n")}`);
}
writeFileSync(path, `${JSON.stringify(pack, null, 2)}\n`);
console.log(`tagged ${pack.readings.length} Pack A readings`);
