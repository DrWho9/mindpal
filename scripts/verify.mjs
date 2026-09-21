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
  [js.includes("Follow today’s steps — Morning, Day, then Night."), "Today hub flow copy is present"],
  [js.includes("Today’s verse — tap to expand"), "Morning verse starts collapsed"],
  [js.includes("mp-day-band") && js.includes("mp-band-${e.id}"), "Morning/Day/Night bands are present"],
  [js.includes("Readings — Verse of the day"), "compact Readings row is present"],
  [js.includes("Open Watch with Maddy"), "Maddy teaser links out from Today"],
  [!js.includes("A short pathway for this day"), "old Today hub lede is gone"],
  [js.includes("!1&&t===`Today`&&(0,A.jsx)(`button`,{className:`secondary`,onClick:()=>I(`Feelings`)"), "Today feelings button is hidden"],
  [js.includes("ne&&(0,A.jsx)(Te,{open:()=>I(`Youth preview`)})"), "Today youth teaser is hidden"],
  [js.includes("What do you need help with?"), "problem hub list is present"],
  [js.includes("mp-problem-chip") && js.includes("Tap a chip to expand"), "Today problem hubs are expandable chips"],
  [js.includes("SUPPORT & GROWTH") && js.includes("When it's heavy") && js.includes("Build strength"), "Today splits Support and Growth"],
  [js.includes("Positive mindset") && js.includes("Rise to a challenge") && js.includes("Gratitude & wins"), "Growth chips are present"],
  [js.includes("mp-problem-group") && js.includes("mp-problem-chip-growth"), "Growth chip groups are styled"],
  [js.includes("mpProblemHubPage"), "problem hub page is present"],
  [js.includes("Struggling mothers") && js.includes("mpMothersHubPage"), "mothers hub is present"],
  [js.includes("mpMothersFeelingsChip") && js.includes("mpMothersWomenCard"), "mothers Feelings and Women’s entries are present"],
  [js.includes("One small win amid caring for others"), "mothers journal prompt is present"],
  [js.includes("No speaker library dump here."), "mothers videos skip the speaker-dump default"],
  [js.includes("Drugs & alcohol") && js.includes("mpAodHubPage"), "AOD hub is present"],
  [js.includes("dna-dopamine-loop-v1") && js.includes("mp-hub-featured"), "AOD featured talk-through is present"],
  [js.includes("puppy-and-treat loop") && js.includes("not genetics"), "AOD talk-through spells DNA as drugs and alcohol, not genetics"],
  [js.includes("mpAodFeelingsChip"), "AOD Feelings entry is present"],
  [js.includes("Mens health") && js.includes("mpMensHealthHubPage"), "Men's Health hub is present"],
  [js.includes("mpMensHealthFeelingsChip") && js.includes("mp-problem-chip-mens"), "Men's Health Feelings chip and Today chip are present"],
  [js.includes("There's nothing wrong with being your best self."), "Men's Health hero line is present"],
  [js.includes("1300 78 99 78") && js.includes("MensLine"), "MensLine is featured"],
  [js.includes("The picture in Australia") && js.includes("mp-hub-acc-toggle"), "Men's Health accordion is present"],
  [js.includes("MindPal videos (soon)") && js.includes("Best self is not a performance"), "queued MindPal video titles are present without HeyGen spend"],
  [!js.includes("toxic masculinity") && !js.includes("Toxic masculinity"), "hub does not use toxic-masculinity framing"],
  [js.includes("t===`Mens health`") && js.includes("\"Mens health\":`route.mensHealth`"), "Mens health hash route is mounted"],
  [js.includes("not detox") || js.includes("Not detox"), "AOD detox disclaimer is present"],
  [js.includes("not a replacement for alcohol and other drug treatment") || js.includes("not a replacement for AOD treatment"), "AOD treatment disclaimer is present"],
  [js.includes("mpAccountFooter"), "Settings account footer is present"],
  [!js.includes("(0,A.jsx)(Nt,{})"), "mid-page LOCAL ACCOUNT card is unmounted"],
  [js.includes("theme_tags"), "Pack A theme tags are in the bundle"],
  [js.includes("Wins, photos and friends stay on this device"), "Settings notes future backend for wins/photos/friends"],
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
  [js.includes("activateLibraryVideo") && js.includes("MpLibraryHost"), "video cards dispatch a live click host"],
  [js.includes("type:`button`,className:`maddy-video-card`"), "Maddy cards are buttons"],
  [js.includes("Play Maddy’s welcome") && js.includes("Play Maddy’s tip"), "Play Maddy listen controls are present"],
  [js.includes("Maddy (when available)") && js.includes("resolveListenAudioUrl"), "Maddy listen preference is wired"],
  [js.includes("/mindpal/videos/maddy/welcome.mp4"), "Maddy listen URLs keep the Pages base path"],
  [js.includes("Readings for this feeling") && js.includes("Videos for this feeling"), "feeling directory lists readings and videos"],
  [js.includes("Readings for drugs & alcohol"), "Feelings Drugs & alcohol readings list is present"],
  [js.includes(`"drugs"`) && js.includes(`"alcohol"`) && js.includes(`"craving"`) && js.includes(`"recovery-shame"`), "AOD controlled tags are in the pack"],
  [js.includes("[`aod`,`Drugs & alcohol`]") || js.includes("value:`aod`"), "Feelings can pick Drugs & alcohol"],
  [js.includes("Browse signed coaches (optional)"), "speaker browse is secondary"],
  [!js.includes("Video tagging by topic is not built yet"), "Focus no longer bounces to the generic video library"],
  [js.includes("not a diagnosis"), "soft diagnosis disclaimer is present"],
  [js.includes(`"tags":["motivation","calm","faith"]`) || js.includes("maddy-welcome"), "tagged video catalogs are in the bundle"],
  [!js.includes("||e[0]||null"), "voices[0] fallthrough is gone"],
  [!/\nexport (async )?function |\nexport const /.test(js), "Pages bundle has no leftover ESM exports"],
  [js.includes("curatedVideosForEmotion") && js.includes("MpEmotionVideos"), "emotion-scoped Feelings videos are present"],
  [js.includes("Browse all videos by speaker"), "secondary speaker browse link is present"],
  [js.includes("mp-emotion-crumb"), "Feelings → emotion → Videos breadcrumb is present"],
  [js.includes(`"low-mood"`) && js.includes(`"overwhelm"`), "video catalog emotions include low-mood and overwhelm"],
  [!js.includes("Browse the whole video directory"), "generic directory is no longer the Feelings Videos default"],
  [!js.includes("(0,A.jsx)(ge,{initialTopic:"), "Feelings Videos does not mount the speaker picker"],
  [js.includes("function mpGoHome(") && js.includes("onClick:()=>mpGoHome(I)"), "MindPal brand goes home via mpGoHome"],
  [js.includes("className:`brand mp-top-brand`"), "mobile topbar exposes a MindPal home control"],
  [js.includes("mpNav={HOME_ROUTE,HOME_EVENT,homeHash,goHome}"), "home helper is in the runtime"],
  [!js.includes("className:`brand`,onClick:()=>I(`Today`)"), "sidebar brand no longer uses the raw Today setter"],
  [!js.includes("showModal"), "native dialogs are modeless so the brand can receive clicks"],
  [js.includes("Work team morning ritual") && js.includes("mpTeamRitualCard"), "optional team morning ritual card is present"],
  [js.includes("mpTeamRitualPage") && js.includes("t===`Team morning`"), "team morning ritual page is routed"],
  [js.includes("Step 1 · Breathe") && js.includes("Step 2 · Peaceful reading"), "team ritual keeps breath before reading"],
  [js.includes("maddy-timed-breath") && js.includes("/videos/maddy/timed-breath.mp4"), "team ritual reuses Maddy timed breath"],
  [js.includes("does not mark a Pack A") && js.includes("mindpal.teamMorningRitual.v1"), "team ritual reading stays off the Pack A Done gate"],
  [js.includes("onOpenTeamRitual:()=>I(`Team morning`)"), "Today Morning card opens the team ritual"],
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
if (!css.includes("mp-band-morning") || !css.includes("mp-band-night") || !css.includes("mp-verse-collapse")) {
  throw new Error("Morning/Day/Night band styles missing");
}
if (!css.includes("mp-emotion-crumb") || !css.includes("mp-emotion-video")) {
  throw new Error("emotion video directory styles missing");
}
if (!css.includes(".mp-problem-chip") || !css.includes(".mp-problem-list-today")) {
  throw new Error("Today problem chip styles missing");
}
if (!css.includes(".mp-problem-group") || !css.includes(".mp-problem-chip-growth")) {
  throw new Error("Support/Growth group styles missing");
}
if (!css.includes(".mp-team-ritual-card") || !css.includes(".mp-team-breath-clock")) {
  throw new Error("team morning ritual styles missing");
}
if (!css.includes(".mp-lane-mens") || !css.includes(".mp-hub-acc-toggle") || !css.includes(".mp-mens-compare")) {
  throw new Error("Men's Health hub styles missing");
}
if (!css.includes(".mp-top-brand") || !css.includes(".sidebar{z-index:50}")) {
  throw new Error("MindPal brand must stay clickable above sheets");
}
if (!css.includes("dialog[open]") || !css.includes(".app:has(dialog[open]) .workspace::before")) {
  throw new Error("modeless dialogs must stay centered and leave the brand undimmed");
}

const extra = readdirSync(join(root, "assets")).filter(
  (name) => /^index-/.test(name) && name !== jsName && name !== cssName,
);
if (extra.length) {
  throw new Error(`stale hashed assets remain: ${extra.join(", ")}`);
}

console.log("verify ok", { jsName, cssName });
