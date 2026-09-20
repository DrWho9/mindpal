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
  [sw.includes("denylist:[/\\/videos\\//") && sw.includes("mp4|webm"), "service worker does not treat MP4 navigations as the app shell"],
  [!/sk-[A-Za-z0-9]{20,}/.test(html) && !/sk-[A-Za-z0-9]{20,}/.test(js), "no leaked secret prefixes"],
  [js.includes("Do this next"), "numbered day-steps are present"],
  [js.includes("Before you sleep"), "evening step is present"],
  [js.includes("mindpal.todaySteps.v1"), "day-steps storage key is present"],
  [js.includes("mindpal.dailyWins.v1"), "daily wins storage key is present"],
  [js.includes("Show Coptic calendar date"), "Coptic settings toggle is present"],
  [js.includes("mpSignInPage"), "sign-in page is present"],
  [js.includes("mp-lane-readings"), "Readings lane chrome is present"],
  [!js.includes("Hide welcome image"), "welcome-image clutter removed"],
  [!js.includes("Explore the longer small-steps pathway"), "Today small-steps dump removed"],
  [!js.includes("Optional faith content. Skip anytime."), "Prayer WEB footer removed"],
  [js.includes(`type:\`button\`,className:\`coach-card\``), "coach cards are buttons"],
  [js.includes("This is a signed DayStart coach look."), "signed look note is present"],
  [js.includes("Related Explore videos"), "coach modal lists related videos"],
  [!js.includes("look_id ·") && !js.includes("className:`coach-look-id`"), "look_id hex is not shown"],
  [!js.includes("Preview stills load from"), "technical preview path is not in UI copy"],
  [!js.includes("No BFL or HeyGen spend from this section."), "spend language is not in the coach footer"],
  [js.includes("More coaches are on hold for now."), "short hold line is present"],
  [js.includes("x=[{id:`tony-robbins`"), "Speakers you enjoy starts with Tony Robbins"],
  [js.includes("Voice-guided meditations on YouTube"), "YouTube meditation reference is present"],
  [js.includes("Sleep / insomnia talk-down"), "sleep category is present"],
  [js.includes("Anxiety / worry"), "anxiety category is present"],
  [js.includes("This category is filling."), "filling category stubs are present"],
  [js.includes("How these lists are ranked"), "ranking rule help is present"],
  [js.includes("views TBD"), "views TBD fallback is present"],
  [js.includes("mindpal-yt-chips"), "category chips are present"],
  [js.includes("className:`brand-quote`"), "sidebar quote card remains"],
  [js.includes('"brand.quote":`The happiness of your life depends on the quality of your thoughts.`'), "Marcus Aurelius quote text remains without quote marks"],
  [js.includes('"brand.author":`— Marcus Aurelius`'), "Marcus Aurelius attribution remains"],
  [!js.includes("“The happiness of your life") && !js.includes('"The happiness of your life'), "decorative quotation marks removed from sidebar quote"],
  [js.includes("mpSidebarShare") && js.includes("Share MindPal"), "sidebar Share button is present"],
  [js.includes("pickBrowserVoice") && js.includes("mpVoicePicker"), "Listen voice picker is present"],
  [js.includes("mindpal.tts.voice.v1"), "Listen voice choice is persisted"],
  [js.includes("speakBrowser") && !js.includes("n.rate=.92"), "softer browser speech replaces 0.92 rate"],
  [js.includes("prerenderedAudioUrl") && js.includes("mpTtsAudio"), "Phase-1 Neural audio is wired first"],
  [!js.includes("||e[0]||null"), "voices[0] fallthrough is gone"],
  [!/\nexport (async )?function |\nexport const /.test(js), "Pages bundle has no leftover ESM exports"],
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

const css = readFileSync(join(root, "assets", cssName), "utf8");
if (!css.includes(".brand-quote") || !css.includes("quotes:none")) {
  throw new Error("sidebar quote CSS must neutralize decorative quote glyphs");
}

const extra = readdirSync(join(root, "assets")).filter(
  (name) => /^index-/.test(name) && name !== jsName && name !== cssName,
);
if (extra.length) {
  throw new Error(`stale hashed assets remain: ${extra.join(", ")}`);
}

console.log("verify ok", { jsName, cssName });
