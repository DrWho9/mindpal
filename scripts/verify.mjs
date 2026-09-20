import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL(".", import.meta.url)));
const html = readFileSync(join(root, "index.html"), "utf8");
const sw = readFileSync(join(root, "sw.js"), "utf8");
const jsName = html.match(/assets\/(index-[^"]+\.js)/)?.[1];
const cssName = html.match(/assets\/(index-[^"]+\.css)/)?.[1];
if (!jsName || !cssName) throw new Error("index.html missing hashed assets");
const jsPath = join(root, "assets", jsName);
execFileSync("node", ["--check", jsPath], { cwd: root });
const js = readFileSync(jsPath, "utf8");
const checks = [
  [html.includes('src="/mindpal/assets/'), "index.html keeps /mindpal/ JS path"],
  [html.includes('href="/mindpal/assets/'), "index.html keeps /mindpal/ CSS path"],
  [html.includes("/mindpal/registerSW.js") || html.includes("vite-plugin-pwa"), "PWA register path unchanged"],
  [sw.includes(`assets/${jsName}`), "service worker lists new JS"],
  [sw.includes(`assets/${cssName}`), "service worker lists new CSS"],
  [js.includes("mindpal-dstss-themes-paraphrase-v1"), "Pack A id is in the bundle"],
  [js.includes("mindpal-daily-soften-v1"), "Pack B id is in the bundle"],
  [js.includes("mindpal.readings.v1"), "progress key is in the bundle"],
  [js.includes("Done for today"), "Mark Done chrome is present"],
  [js.includes("Open draft"), "Open draft CTA is present"],
  [js.includes("HeyGen not rendered yet"), "draft modal copy is present"],
  [!js.includes("HeyGen production planned"), "old HeyGen placeholder copy removed"],
  [((js.match(/publicEligible:!1/g) || []).length >= 12), "catalog drafts stay publicEligible false"],
  [js.includes("Watch with Maddy"), "Watch with Maddy section is in the bundle"],
  [js.includes("/videos/maddy/welcome.mp4") && js.includes("/videos/maddy/tip.mp4") && js.includes("/videos/maddy/timed-breath.mp4"), "Maddy MP4 srcs are in the bundle"],
  [js.includes("playsInline:!0"), "Maddy cards use native playsInline video"],
  [js.includes(`"heygenDraftGate": false`), "Maddy catalog skips the HeyGen draft gate"],
  [!sw.includes("videos/maddy"), "service worker does not precache Maddy MP4s"],
  [!/sk-[A-Za-z0-9]{20,}/.test(html) && !/sk-[A-Za-z0-9]{20,}/.test(js), "no leaked secret prefixes"],
];

const maddyFiles = [
  ["videos/maddy/welcome.mp4", 2163855],
  ["videos/maddy/tip.mp4", 1946389],
  ["videos/maddy/timed-breath.mp4", 6126749],
];
for (const [rel, size] of maddyFiles) {
  const path = join(root, rel);
  checks.push([existsSync(path) && statSync(path).size === size, `published ${rel}`]);
}

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  throw new Error(`verify failed:\n${failed.map(([, msg]) => `- ${msg}`).join("\n")}`);
}

const extra = readdirSync(join(root, "assets")).filter(
  (name) => /^index-/.test(name) && name !== jsName && name !== cssName,
);
if (extra.length) {
  throw new Error(`stale hashed assets remain: ${extra.join(", ")}`);
}

console.log("verify ok", { jsName, cssName });
