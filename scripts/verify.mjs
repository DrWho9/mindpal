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
  [jsName !== "index-3cb5ea74.js" && !html.includes("index-3cb5ea74.js") && !sw.includes("index-3cb5ea74.js"), "index.html/sw do not still load the pre-chat index-3cb5ea74.js hash"],
  [jsName !== "index-293ac69a.js" && !html.includes("index-293ac69a.js") && !sw.includes("index-293ac69a.js"), "index.html/sw do not still load the pre-fix #31 hash index-293ac69a.js"],
  [sw.includes('prefix:"mindpal-shell-v3"'), "service worker cache prefix was bumped so stale tip shells drop"],
  [readFileSync(join(root, "registerSW.js"), "utf8").includes("reg.update()"), "registerSW forces an update so old hashed bundles are not kept"],
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
  [((js.match(/publicEligible:!1/g) || []).length >= 11), "remaining catalog drafts stay publicEligible false"],
  [js.includes(`"id": "V02"`) && js.includes("/mindpal/videos/v02/MP-V02-en-AU-v1.1b-web.mp4"), "V02 catalog points at the Pages MP4"],
  [js.includes(`"publicationStatus": "PUBLISHED"`) && js.includes(`"rightsStatus": "CLEARED"`), "V02 publication gates are cleared"],
  [!sw.includes("videos/v02"), "service worker does not precache the V02 MP4"],
  [js.includes("Watch with Maddy"), "Watch with Maddy section is in the bundle"],
  [js.includes("/videos/maddy/welcome.mp4") && js.includes("/videos/maddy/tip.mp4") && js.includes("/videos/maddy/timed-breath.mp4"), "Maddy MP4 srcs are in the bundle"],
  [js.includes("playsInline:!0"), "Maddy cards use native playsInline video"],
  [js.includes(`"heygenDraftGate": false`), "Maddy catalog skips the HeyGen draft gate"],
  [!sw.includes("videos/maddy"), "service worker does not precache Maddy MP4s"],
  [sw.includes("denylist:[/\\/videos\\//") && sw.includes("mp4|webm"), "service worker does not treat MP4 navigations as the app shell"],
  [!/sk-[A-Za-z0-9]{20,}/.test(html) && !/sk-[A-Za-z0-9]{20,}/.test(js), "no leaked secret prefixes"],
  [js.includes("Do this next"), "numbered day-steps are present"],
  [js.includes("Start with Individual Growth") && js.includes("four personal steps"), "Today hub flow copy is present"],
  [js.includes("Settle / breathe") && js.includes("One win / intention"), "Individual Growth steps are present"],
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
  [js.includes("globalThis.mpOwnerReadings=mpOwnerReadings"), "owner readings catalog is on globalThis for kit lookup"],
  [js.includes("globalThis.mpMaddy=mpMaddy") && js.includes("globalThis.mpMeditationCatalog=mpMeditationCatalog"), "Maddy and meditation catalogs are on globalThis for kit videos"],
  [js.includes("function mpKitTagFilter({tags:") || js.includes("function mpKitTagFilter({tags:e"), "kit tag filter reads React props"],
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
  [js.includes("globalThis.mpMensHealth=mpMensHealth"), "Men's Health catalog is attached to globalThis"],
  [js.includes("not detox") || js.includes("Not detox"), "AOD detox disclaimer is present"],
  [js.includes("not a replacement for alcohol and other drug treatment") || js.includes("not a replacement for AOD treatment"), "AOD treatment disclaimer is present"],
  [js.includes("mpAccountFooter"), "Settings account footer is present"],
  [js.includes("mpAccountProfileCard") && js.includes("Age and gender:"), "Settings local account can edit age and gender"],
  [js.includes("MINDPAL FACTS") && js.includes("not a diagnosis and not medical advice"), "sign-up MindPal facts card is present"],
  [js.includes("ageBand:``,gender:``"), "new local profiles start without age or gender"],
  [js.includes("mpNeedsFaithSetup()||mpNeedsProfileSetup()"), "first-run gate waits for age and gender"],
  [!js.includes("(0,A.jsx)(Nt,{})"), "mid-page LOCAL ACCOUNT card is unmounted"],
  [js.includes("theme_tags"), "Pack A theme tags are in the bundle"],
  [js.includes("Wins, photos and friends stay on this device"), "Settings notes future backend for wins/photos/friends"],
  [js.includes("Before you sleep"), "evening step is present"],
  [js.includes("function mpNightBand(") && js.includes("Open Journal"), "Today Night journal band is present"],
  [js.includes("function mpBookReader(") && js.includes("mpHubOpenableReadings"), "reusable book reader is present"],
  [js.includes("Open the book reader") && js.includes("openReading"), "peaceful reading opens the book reader"],
  [js.includes("{name:`My diary`,icon:rn}"), "sidebar Journal item is present"],
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
  [js.includes("mp-feeling-kit") && js.includes("Start here"), "Feelings hubs render a curated kit accordion"],
  [js.includes("Evidence & guidance") && js.includes("MindPal literacy notes"), "heavy hubs include evidence and guidance"],
  [js.includes("panda.org.au") && js.includes("beyondblue.org.au") && js.includes("healthdirect.gov.au"), "mothers evidence cites real AU orgs"],
  [!js.includes("matching Pack A reading"), "Feelings no longer dumps matching Pack A day lists"],
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
  [js.includes("mpIndividualGrowthCard") && js.includes("MINDPAL · INDIVIDUAL GROWTH") && js.includes("Settle / breathe"), "Individual Growth 4-step accordion is present"],
  [js.includes("TEAM GROWTH") && js.includes("mp-band-team"), "Team Growth sits in its own band"],
  [js.indexOf("mpIndividualGrowthCard") < js.indexOf("mpProblemHubList,{variant:`today`") && js.indexOf("mpProblemHubList,{variant:`today`") < js.indexOf("mp-band-team"), "Today order is Individual, then Support chips, then Team"],
  [!js.includes("See the two steps"), "stale two-step copy is gone"],
  [js.includes("mpTeamRitualPage") && js.includes("t===`Team morning`"), "team morning ritual page is routed"],
  [js.includes("MindPal is glad you’re here") && js.includes("mp-team-ritual-open"), "team ritual opens with a MindPal line"],
  [js.includes("mp-team-breath-count") && js.includes("MindPal counts down each phase"), "team ritual breath cue counts down in-phase"],
  [js.includes("I’m done") && js.includes("Skip this breath") && !/onClick:\(\)=>E\(`breathe`,`done`\),children:`That’s enough`/.test(js), "team ritual breath done button says I’m done"],
  [js.includes("Breathe (~3 min)") && js.includes("Verse of the day") && js.includes("Peaceful reading") && js.includes("TEAM_RITUAL_FLOW"), "team ritual is breathe then verse then reading"],
  [js.includes("Read the whole chapter — tap to expand") && js.includes("mp-team-step-body"), "team ritual accordion keeps chapter expand inside one step"],
  [js.includes("mpFoldSection") && js.includes("mp-lane-mothers") && js.includes("mp-fold-head"), "mothers hub sections are accordion folds"],
  [js.includes("maddy-timed-breath") && js.includes("/videos/maddy/timed-breath.mp4"), "team ritual reuses Maddy timed breath"],
  [js.includes("does not mark a Pack A") && js.includes("mindpal.teamMorningRitual.v1"), "team ritual reading stays off the Pack A Done gate"],
  [js.includes("onOpenTeamRitual:()=>I(`Team morning`)"), "Today Morning card opens the team ritual"],
  [js.includes("I have a faith / religion") && js.includes("No religion / prefer secular"), "sign-in faith stance choices are present"],
  [js.includes("So we can relate to you — what’s your religion?"), "religion follow-up copy is present"],
  [js.includes("mpFaithPrefQuestions") && js.includes("mpAccountFaithCard"), "faith setup and Account edit are present"],
  [js.includes("pickMorningVerse") && js.includes("function mpMorningVerse("), "tradition-targeted morning verse is present"],
  [js.includes("t===`verse`&&(0,A.jsx)(mpMorningVerse,{})"), "Explore verse uses the targeted card"],
  [js.includes("faithStance:``,tradition:``,traditionId:``"), "new local profiles do not default to Christianity"],
  [js.includes("A quiet, honest moment is enough"), "universal scripture fallback is present"],
  [js.includes("filterDirectoryEntries") && js.includes("directoryOpenUrl"), "YouTube directory search/open helpers are present"],
  [js.includes("mp-yt-dir-search") && js.includes("youtube-speaker-filter"), "YouTube directory has Search + speaker filter"],
  [js.includes("type:`submit`") && js.includes("children:`Search`"), "YouTube directory Search submits on button/Enter"],
  [js.includes("mpReadings.isDirectoryOpenable(e)"), "directory open gate uses the URL helper"],
  [!js.includes("This draft preview has no videos cleared for ordinary release"), "empty draft-preview directory copy is gone"],
  [js.includes("function mpNeedsFaithSetup(") && js.includes("mpShowSignInGate()"), "first-setup faith gate holds the sign-in shell"],
  [js.includes("setFaithAsk(mpNeedsFaithSetup())") && js.includes("if(faithAsk)"), "Today shows faith questions when preference is missing"],
  [js.includes("mpSetGateTick(e=>e+1)"), "faith-change re-renders the sign-in gate"],
  [js.includes("function mpProfilePage(") && js.includes("function mpProfileButton("), "profile page and chrome button are present"],
  [js.includes("t===`Profile`&&(0,A.jsx)(mpProfilePage,{})"), "Profile hash route is mounted"],
  [js.includes("className:`mp-brand-row`") && js.includes("onOpen:()=>I(`Profile`)"), "profile control sits beside the brand"],
  [js.includes("mindpal.profile.v1") && js.includes("mp-profile-acc"), "profile persists and uses accordions"],
  [js.includes("Your MindPal profile") && js.includes("Plans and goals"), "profile page uses MindPal chrome copy"],
  [!js.includes("className:`brand`,onClick:()=>I(`Profile`)"), "MindPal brand does not open Profile"],
  [js.includes("function ti(props){return mpReflectPage(props)}") && js.includes("function mpReflectPage("), "Reflect mounts the MindPal chat page"],
  [!js.includes("function mpReflectLegacy") && !js.includes("This page cannot understand your words") && !js.includes("Self-guided preview · no live listener"), "dead-end Reflect preview is excised from the tip bundle"],
  [js.includes("function mpTodayTalkRow(") && js.includes("Talk about my day") && js.includes("Appointment Questions"), "Today opens Reflect and Appointment Questions"],
  [js.includes("onOpenReflect:()=>I(`Reflect`)") && js.includes("onOpenAppointment:()=>I(`Appointment Questions`)"), "Today talk buttons route to Reflect and Appointment Questions"],
  [js.includes("t===`Body, food and wellbeing`||t===`Appointment Questions`"), "Appointment Questions hash aliases the medical chat page"],
  [js.includes("Talk with MindPal") && js.includes("Enter sends"), "Reflect chat is named Talk with MindPal and documents Enter"],
  [js.includes('"route.reflect":`Talk with MindPal`'), "Reflect breadcrumb names Talk with MindPal"],
  [js.includes("api/companion/") && js.includes("COMPANION_POLICY_VERSION") && js.includes("/mindpal/"), "Reflect uses the existing companion API path"],
  [js.includes("not a psychologist") && js.includes("Lifeline 13 11 14"), "Reflect prompt and crisis copy stay non-clinical"],
  [js.includes("Clear reflection & finish") && js.includes("mindpal.reflect.thread.v1"), "Reflect thread can be cleared and persisted"],
  [js.includes("GitHub Pages cannot host the live proxy") && js.includes("MINDPAL_COMPANION_BASE"), "Demo state documents the companion API base"],
  [js.includes("function mpAppointmentChat(") && js.includes("`h1`,{children:`Body, food and wellbeing`}),(0,A.jsx)(mpAppointmentChat,{onHelp:t})"), "Appointment Questions page mounts medical companion chat at the top"],
  [js.includes("appointment_health_literacy") && js.includes("mindpal.appointment.thread.v1"), "Appointment chat uses the health-literacy lane and persists a day thread"],
  [js.includes("Clear appointment chat") && js.includes("mp-appoint-input"), "Appointment chat has Send/Enter composer and a clear control"],
  [js.includes("function mpCompanionBaseCard(") && js.includes("persistCompanionBase"), "Companion base can be pasted into localStorage"],
  [!/\btrycloudflare\.com\b/.test(js) && !js.includes("127.0.0.1:8787"), "companion base is not hard-coded to a tunnel or local port"],
  [html.includes("http://127.0.0.1:*") && html.includes("http://localhost:*") && html.includes("http://[::1]:*"), "CSP allows a pasted loopback companion"],
  [!html.includes("trycloudflare.com") && !html.includes("127.0.0.1:8787"), "index.html does not bake a Live URL"],
];

const maddyFiles = [
  ["videos/maddy/welcome.mp4", 2163855],
  ["videos/maddy/tip.mp4", 1946389],
  ["videos/maddy/timed-breath.mp4", 6126749],
  ["videos/v02/MP-V02-en-AU-v1.1b-web.mp4", 2050995],
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
if (!css.includes("mp-night-journal") || !css.includes("mp-peaceful-peek") || !css.includes("mp-book-reader")) {
  throw new Error("Night journal and book-reader styles missing");
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
if (!css.includes(".mp-team-ritual-card") || !css.includes(".mp-team-breath-clock") || !css.includes(".mp-team-breath-count") || !css.includes(".mp-fold-head")) {
  throw new Error("team morning ritual styles missing");
}
if (!css.includes(".mp-lane-mens") || !css.includes(".mp-hub-acc-toggle") || !css.includes(".mp-mens-compare")) {
  throw new Error("Men's Health hub styles missing");
}
if (!css.includes(".mp-individual-growth") || !css.includes(".mp-band-team")) {
  throw new Error("Individual Growth / Team Growth band styles missing");
}
if (!css.includes(".mp-faith-chip") || !css.includes(".mp-account-faith")) {
  throw new Error("faith preference chip styles missing");
}
if (!css.includes(".mp-yt-dir-search") || !css.includes(".mp-yt-dir-results")) {
  throw new Error("YouTube directory search styles missing");
}
if (!css.includes(".mp-reflect-thread") || !css.includes(".mp-reflect-composer") || !css.includes(".mp-reflect-pill")) {
  throw new Error("Reflect chat conversation styles missing");
}
if (!css.includes(".mp-appoint-chat") || !css.includes(".mp-companion-base")) {
  throw new Error("appointment chat or companion-base paste field styles missing");
}
if (!css.includes(".mp-top-brand") || !css.includes(".sidebar{z-index:50}")) {
  throw new Error("MindPal brand must stay clickable above sheets");
}
if (!css.includes(".mp-brand-row") || !css.includes(".mp-profile-btn") || !css.includes(".mp-profile-acc")) {
  throw new Error("profile chrome and accordion styles missing");
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
