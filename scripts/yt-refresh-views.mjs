import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = join(root, "src/data/yt-directory-views.json");
const candidatesPath = join(root, "src/data/yt-directory-candidates.json");
const vendorPath = join(root, "vendor/daystart-8f78bb0/index-BiA2yEms.js");
const WATCH_ID = /^[A-Za-z0-9_-]{11}$/;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Exact integer from a public watch page. Abbreviated labels such as "2.3M"
 * are ignored so a rounded display is never expanded into a fake count.
 */
export function parseWatchPageViewCount(html) {
  if (typeof html !== "string" || !html) return null;
  const patterns = [
    /"videoViewCountRenderer":\{"viewCount":\{"simpleText":"([0-9][0-9,]*) views"/,
    /"label":\{"simpleText":"Views"\},"accessibilityText":"([0-9][0-9,]*) views"/,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    const digits = match[1].replace(/,/g, "");
    if (!/^\d+$/.test(digits)) continue;
    const count = Number(digits);
    if (Number.isSafeInteger(count) && count >= 0) return count;
  }
  return null;
}

export function watchIdFromUrl(url) {
  if (typeof url !== "string") return "";
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "");
      return WATCH_ID.test(id) ? id : "";
    }
    if (host !== "youtube.com" || parsed.pathname !== "/watch") return "";
    const id = parsed.searchParams.get("v") || "";
    return WATCH_ID.test(id) ? id : "";
  } catch {
    return "";
  }
}

function sliceBalanced(source, start) {
  let depth = 0;
  let inStr = null;
  let esc = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "`" || ch === '"' || ch === "'") {
      inStr = ch;
      continue;
    }
    if (ch === "[" || ch === "{") depth++;
    else if (ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("YouTube directory catalog array did not close");
}

export function directoryVideoIdsFromVendor(source) {
  const marker = source.indexOf("[{id:`YT01`");
  if (marker < 0) throw new Error("YouTube directory starter catalog missing");
  const starter = Function(`return ${sliceBalanced(source, marker)}`)();
  const jsonMarker = source.indexOf("b=JSON.parse(`");
  if (jsonMarker < 0) throw new Error("YouTube directory JSON catalog missing");
  let end = jsonMarker + "b=JSON.parse(`".length;
  while (end < source.length) {
    if (source[end] === "\\") {
      end += 2;
      continue;
    }
    if (source[end] === "`") break;
    end++;
  }
  const extended = JSON.parse(source.slice(jsonMarker + "b=JSON.parse(`".length, end));
  const ids = [];
  for (const entry of [...starter, ...extended]) {
    const id = watchIdFromUrl(entry?.url || entry?.evidenceUrl || "");
    if (id && !ids.includes(id)) ids.push(id);
  }
  if (ids.length < 16) throw new Error(`expected the directory catalog, found ${ids.length} watch ids`);
  return ids;
}

function candidateVideoIds() {
  const data = JSON.parse(readFileSync(candidatesPath, "utf8"));
  const ids = [];
  for (const entry of data.entries || []) {
    const id = watchIdFromUrl(entry.url);
    if (!id) throw new Error(`candidate ${entry.id || "?"} has no watch id`);
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

function checkedDate() {
  return new Date().toISOString().slice(0, 10);
}

function apiKey() {
  return process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY || "";
}

function ytDlpReady() {
  const result = spawnSync("yt-dlp", ["--version"], { encoding: "utf8" });
  return result.status === 0;
}

async function fetchViaApi(ids, key) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "statistics");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", key);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`YouTube Data API ${response.status}`);
    }
    const data = await response.json();
    const found = new Set();
    for (const item of data.items || []) {
      found.add(item.id);
      const raw = item.statistics?.viewCount;
      if (typeof raw === "string" && /^\d+$/.test(raw)) {
        const count = Number(raw);
        out.set(item.id, Number.isSafeInteger(count) ? count : null);
      } else {
        out.set(item.id, null);
      }
    }
    for (const id of chunk) {
      if (!found.has(id)) out.set(id, null);
    }
  }
  return out;
}

function fetchViaYtDlp(videoId) {
  const result = spawnSync(
    "yt-dlp",
    ["--no-download", "--no-warnings", "--print", "view_count", `https://www.youtube.com/watch?v=${videoId}`],
    { encoding: "utf8", timeout: 45000 },
  );
  const text = String(result.stdout || "").trim();
  if (result.status !== 0 || !/^\d+$/.test(text)) return null;
  const count = Number(text);
  return Number.isSafeInteger(count) ? count : null;
}

async function fetchViaWatchPage(videoId) {
  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en&gl=US`, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  });
  if (!response.ok) return null;
  return parseWatchPageViewCount(await response.text());
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

async function main() {
  const vendorIds = directoryVideoIdsFromVendor(readFileSync(vendorPath, "utf8"));
  const extraIds = candidateVideoIds();
  const ids = [...new Set([...vendorIds, ...extraIds])];
  const when = checkedDate();
  const key = apiKey();
  let method = "youtube-watch-page";
  const counts = new Map();

  if (key) {
    method = "youtube-data-api";
    const fetched = await fetchViaApi(ids, key);
    for (const [id, count] of fetched) counts.set(id, count);
  } else if (ytDlpReady()) {
    method = "yt-dlp";
    const rows = await mapPool(ids, 3, async (id) => [id, fetchViaYtDlp(id)]);
    for (const [id, count] of rows) counts.set(id, count);
  } else {
    const rows = await mapPool(ids, 4, async (id) => {
      try {
        return [id, await fetchViaWatchPage(id)];
      } catch {
        return [id, null];
      }
    });
    for (const [id, count] of rows) counts.set(id, count);
  }

  const videos = {};
  let ok = 0;
  let missing = 0;
  for (const id of ids) {
    const count = counts.get(id);
    if (Number.isInteger(count) && count >= 0) {
      videos[id] = { viewCount: count, viewsCheckedAt: when, status: "ok" };
      ok += 1;
    } else {
      videos[id] = { viewCount: null, viewsCheckedAt: when, status: "unavailable" };
      missing += 1;
    }
  }
  const snapshot = {
    version: 1,
    method,
    viewsCheckedAt: when,
    note: "Public YouTube view counts captured offline. null means the count could not be read. Do not invent a number.",
    videos,
  };
  writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`yt:refresh-views ${method}: ${ok} counts, ${missing} unavailable, ${ids.length} videos → ${snapshotPath}`);
  if (missing) process.exitCode = 1;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
