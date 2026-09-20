import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyControlledTags, tagsForThemeLabel } from "../src/readings/tags.js";
import {
  CATALOG_VIDEO_TAGS,
  MADDY_VIDEO_TAGS,
  YT_CATEGORY_TAGS,
  YT_ENTRY_TAGS,
  applyItemTags,
} from "../src/videos/feeling-media.js";

const root = dirname(fileURLToPath(new URL(".", import.meta.url)));

function writeJson(rel, data) {
  writeFileSync(join(root, rel), `${JSON.stringify(data, null, 2)}\n`);
}

const packPath = "src/data/pack-a.json";
const pack = JSON.parse(readFileSync(join(root, packPath), "utf8"));
if (!Array.isArray(pack.readings) || pack.readings.length !== 100) {
  throw new Error(`expected 100 Pack A readings, found ${pack.readings?.length}`);
}
pack.readings = pack.readings.map((reading) => {
  const next = applyControlledTags(reading);
  if (!next.tags.length) {
    throw new Error(`no tags for day ${reading.day} (${reading.theme_label})`);
  }
  if (!tagsForThemeLabel(reading.theme_label).length) {
    throw new Error(`unmapped theme_label: ${reading.theme_label}`);
  }
  return next;
});
writeJson(packPath, pack);

const catalogPath = "src/data/videos-catalog.json";
const catalog = JSON.parse(readFileSync(join(root, catalogPath), "utf8"));
catalog.videos = catalog.videos.map((video) => {
  const tags = CATALOG_VIDEO_TAGS[video.id];
  if (!tags) throw new Error(`no catalog tags for ${video.id}`);
  return applyItemTags(video, tags);
});
writeJson(catalogPath, catalog);

const maddyPath = "src/data/maddy-companion.json";
const maddy = JSON.parse(readFileSync(join(root, maddyPath), "utf8"));
maddy.videos = maddy.videos.map((video) => {
  const tags = MADDY_VIDEO_TAGS[video.id];
  if (!tags) throw new Error(`no Maddy tags for ${video.id}`);
  return applyItemTags(video, tags);
});
writeJson(maddyPath, maddy);

const publishedPath = "content/videos.json";
const published = JSON.parse(readFileSync(join(root, publishedPath), "utf8"));
published.videos = published.videos.map((video) => {
  const tags = MADDY_VIDEO_TAGS[video.id];
  if (!tags) throw new Error(`no published Maddy tags for ${video.id}`);
  return applyItemTags(video, tags);
});
writeJson(publishedPath, published);

const ytPath = "src/data/yt-meditations.json";
const yt = JSON.parse(readFileSync(join(root, ytPath), "utf8"));
yt.categories = yt.categories.map((category) => ({
  ...category,
  tags: YT_CATEGORY_TAGS[category.id] || [],
  entries: (category.entries || []).map((entry) => {
    const tags = YT_ENTRY_TAGS[entry.id] || YT_CATEGORY_TAGS[category.id];
    if (!tags?.length) throw new Error(`no YT tags for ${entry.id}`);
    return applyItemTags(entry, tags);
  }),
}));
writeJson(ytPath, yt);

console.log(
  `tagged Pack A ${pack.readings.length}, catalog ${catalog.videos.length}, Maddy ${maddy.videos.length}, YT entries ${yt.categories.reduce((n, c) => n + c.entries.length, 0)}`,
);
