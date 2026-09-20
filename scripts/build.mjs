import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  REQUIRED_SPEAKER_IDS,
  applySpeakerDisplayOrder,
  speakerIdsInCatalog,
} from "../src/speakers/order.js";
import { mergeTtsAudioCatalog } from "../src/tts/audio.js";
import { THEME_LABEL_TO_TAGS } from "../src/problems/theme-map.js";

const root = dirname(fileURLToPath(new URL(".", import.meta.url)));
const vendorDir = join(root, "vendor", "daystart-8f78bb0");
const assetsDir = join(root, "assets");

function shortHash(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 8);
}

function md5(text) {
  return createHash("md5").update(text).digest("hex");
}

function stripExports(source) {
  return source
    .replace(/^import[\s\S]*? from ["'][^"']+["'];?\s*$/gm, "")
    .replace(/^import .*$/gm, "")
    .replace(/^export const /gm, "const ")
    .replace(/^export async function /gm, "async function ")
    .replace(/^export function /gm, "function ")
    .replace(/^export \{[\s\S]*?\};?\s*$/gm, "");
}

function moduleSource(rel) {
  return stripExports(readFileSync(join(root, rel), "utf8"));
}

function replaceOnce(haystack, needle, replacement, label) {
  const count = haystack.split(needle).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected 1 occurrence, found ${count}`);
  }
  return haystack.replace(needle, replacement);
}

function replaceMarkedOrOnce(haystack, start, end, replacement, fallbackNeedle, label) {
  const marked = `${start}${haystack.split(start)[1] || ""}${end}`;
  if (haystack.includes(start) && haystack.includes(end)) {
    const inner = haystack.slice(
      haystack.indexOf(start),
      haystack.indexOf(end) + end.length,
    );
    return haystack.replace(inner, `${start}${replacement}${end}`);
  }
  return replaceOnce(haystack, fallbackNeedle, `${start}${replacement}${end}`, label);
}

function snapshotBaseline() {
  mkdirSync(vendorDir, { recursive: true });
  const jsName = "index-BiA2yEms.js";
  const cssName = "index-CLdVgkKd.css";
  const jsSrc = join(assetsDir, jsName);
  const cssSrc = join(assetsDir, cssName);
  if (!existsSync(join(vendorDir, jsName))) {
    if (!existsSync(jsSrc)) throw new Error(`Missing baseline JS ${jsSrc}`);
    copyFileSync(jsSrc, join(vendorDir, jsName));
  }
  if (!existsSync(join(vendorDir, cssName))) {
    if (!existsSync(cssSrc)) throw new Error(`Missing baseline CSS ${cssSrc}`);
    copyFileSync(cssSrc, join(vendorDir, cssName));
  }
}

function discoverPhase1Audio() {
  const found = [];
  const dirs = [
    ["audio/phase1", "/mindpal/audio/phase1"],
    ["audio", "/mindpal/audio"],
    ["public/audio/phase1", "/mindpal/audio/phase1"],
    ["public/audio", "/mindpal/audio"],
  ];
  for (const [rel, urlBase] of dirs) {
    const dir = join(root, rel);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!/\.(mp3|ogg|wav|m4a|webm)$/i.test(name)) continue;
      found.push({
        id: name.replace(/\.[^.]+$/, ""),
        url: `${urlBase}/${name}`,
      });
    }
  }
  return found;
}

function wrapRuntime() {
  const progress = stripExports(
    readFileSync(join(root, "src/readings/progress.js"), "utf8"),
  );
  const tags = stripExports(
    readFileSync(join(root, "src/readings/tags.js"), "utf8"),
  );
  const playback = stripExports(
    readFileSync(join(root, "src/videos/playback.js"), "utf8"),
  );
  const maddy = stripExports(
    readFileSync(join(root, "src/videos/maddy.js"), "utf8"),
  );
  const cards = stripExports(
    readFileSync(join(root, "src/videos/cards.js"), "utf8"),
  );
  const coaches = stripExports(
    readFileSync(join(root, "src/coaches/related.js"), "utf8"),
  );
  const meditations = stripExports(
    readFileSync(join(root, "src/videos/yt-meditations.js"), "utf8"),
  );
  const emotions = stripExports(
    readFileSync(join(root, "src/videos/emotions.js"), "utf8"),
  );
  const feelingMedia = stripExports(
    readFileSync(join(root, "src/videos/feeling-media.js"), "utf8"),
  );
  const share = stripExports(
    readFileSync(join(root, "src/share/app.js"), "utf8"),
  );
  const ttsVoices = stripExports(
    readFileSync(join(root, "src/tts/voices.js"), "utf8"),
  );
  const ttsAudio = stripExports(
    readFileSync(join(root, "src/tts/audio.js"), "utf8"),
  );
  const themeMap = stripExports(
    readFileSync(join(root, "src/problems/theme-map.js"), "utf8"),
  );
  const problems = stripExports(
    readFileSync(join(root, "src/problems/hubs.js"), "utf8"),
  );
  const maddyListen = stripExports(
    readFileSync(join(root, "src/tts/maddy-listen.js"), "utf8"),
  );
  const ytSection = readFileSync(
    join(root, "src/patches/yt-meditations.inject.js"),
    "utf8",
  ).trim();
  const sidebarShare = readFileSync(
    join(root, "src/patches/sidebar-share.inject.js"),
    "utf8",
  ).trim();
  const voicePicker = readFileSync(
    join(root, "src/patches/voice-picker.inject.js"),
    "utf8",
  ).trim();
  const feelingsUi = readFileSync(
    join(root, "src/patches/feelings-readings.inject.js"),
    "utf8",
  ).trim();
  const packA = readFileSync(join(root, "src/data/pack-a.json"), "utf8");
  const packB = readFileSync(join(root, "src/data/pack-b.json"), "utf8");
  const maddyCatalog = readFileSync(join(root, "src/data/maddy-companion.json"), "utf8");
  const videoCatalog = readFileSync(join(root, "src/data/videos-catalog.json"), "utf8");
  const meditationCatalog = readFileSync(
    join(root, "src/data/yt-meditations.json"),
    "utf8",
  );
  const ttsCatalog = JSON.stringify(
    mergeTtsAudioCatalog(
      JSON.parse(readFileSync(join(root, "src/data/tts-audio.json"), "utf8")),
      discoverPhase1Audio(),
    ),
  );
  const problemHubs = readFileSync(join(root, "src/data/problem-hubs.json"), "utf8");
  const ux = [
    moduleSource("src/calendar/civil.js"),
    moduleSource("src/calendar/coptic.js"),
    moduleSource("src/prefs/faith.js"),
    moduleSource("src/today/steps.js"),
    moduleSource("src/today/wins.js"),
  ].join("\n");
  return `var mpPackA=${packA.trim()};var mpPackB=${packB.trim()};var mpMaddy=${maddyCatalog.trim()};var mpVideoCatalog=${videoCatalog.trim()};var mpMeditationCatalog=${meditationCatalog.trim()};var mpTtsAudio=${ttsCatalog};var mpProblemHubs=${problemHubs.trim()};var mpReadings=(function(){${progress}\n${tags}\n${playback}\n${maddy}\n${cards}\n${coaches}\n${meditations}\n${emotions}\n${feelingMedia}\n${share}\n${ttsVoices}\n${ttsAudio}\n${maddyListen}\nreturn{PACK_A_ID,PACK_B_ID,PACK_A_TOTAL,PACK_A_CREDIT,PACK_A_PROGRESS_LINE,STORAGE_KEY,emptyProgress,normalizeProgress,parseProgressJson,orderedReadings,isDayUnlocked,nextIncomplete,canMarkDone,markReadingDone,packAComplete,dailyDefaultPackId,loadProgress,saveProgress,pickRandom,hasPlayableMediaUrl,isVideoPlayable,videoCardCta,videoCardAriaLabel,libraryCardModel,activateLibraryVideo,activateCoachCard,dispatchLibraryVideo,LIBRARY_OPEN_EVENT,MADDY_PACK_ID,MADDY_CORE_IDS,hasMaddyMediaUrl,isMaddyCompanionPlayable,maddyPublishedSrc,maddyDurationLabel,maddyCompanionVideos,videosForCoach,coachKeys,visibleCoachFields,isYoutubeOutboundUrl,isMeditationOpenable,meditationOpenUrl,meditationCtaLabel,MEDITATION_CATEGORY_IDS,meditationCategories,entriesForCategory,formatMeditationViews,categoryFillNote,EMOTION_IDS,FEELING_EMOTIONS,FEELING_SUPPORT,EMOTION_ALIASES,BROWSE_SPEAKERS_LABEL,CURATED_VIDEO_LIMIT,normalizeEmotionId,emotionLabel,normalizeEmotionList,entryEmotions,entryMatchesEmotion,curatedVideosForEmotion,emotionBreadcrumb,emotionVideoCta,TAG_VOCAB,TAG_LABELS,TAG_ALIASES,PROBLEM_HUB_TAGS,FEELING_TO_TAGS,THEME_LABEL_TO_TAGS,SUPPORT_DISCLAIMER,formatTag,canonicalizeTag,normalizeTags,tagsForThemeLabel,tagsForFeeling,readingTags,readingHasAnyTag,readingsForTags,usedTags,supportUnlockMessage,applyControlledTags,VIDEO_DIRECTORY_LIMIT,itemTags,mediaForTags,mediaForFeeling,mediaSourceLabel,collectFeelingMedia,mindpalShareUrl,shareMindPalApp,MINDPAL_PAGES_URL,pickVoice,pickBrowserVoice,listPickerVoices,loadSavedVoiceURI,saveVoiceURI,speakBrowser,splitSpeakChunks,prerenderedAudioUrl,playAudioUrl,unwrapListenInput,resolveListenAudioUrl,playMaddyClip,companionLinkedClip,effectiveListenPref,isMaddyVoicePref,MADDY_PREF_URI,MADDY_PREF_LABEL,TTS_RATE,TTS_PITCH}})();var mpCalendar,mpFaith,mpTodaySteps,mpWins,mpProblems;(function(){${ux}\n${themeMap}\n${problems}
mpCalendar={civilDateKey,formatCivilDate,partOfDay,isGregorianLeap,gregorianToCoptic,formatCopticDate,formatCopticLabel,COPTIC_MONTHS};
mpFaith={COPTIC_PREF_KEY,WELCOME_IMAGE_PREF_KEY,ACCOUNTS_KEY,SESSION_KEY,sessionPreferences,isCopticDateEnabled,setCopticDateEnabled,isWelcomeImageEnabled,setWelcomeImageEnabled};
mpTodaySteps={STEPS_STORAGE_KEY,STEP_IDS,STEP_META,HUB_FLOW_LINE,BANDS,emptyDay,normalizeDay,parseDayJson,loadDay,saveDay,markStep,nextStepId,stepStatus,stepRowLabel,hubStepCaption,bandForStep};
mpWins={WINS_STORAGE_KEY,WIN_TEXT_MAX,emptyWinsDay,normalizeWin,emptyWinsStore,normalizeWinsStore,parseWinsJson,loadWinsStore,saveWinsStore,winsForDate,addWin,removeWin};
mpProblems={PROBLEM_TAG_IDS,THEME_LABEL_TO_TAGS,normalizeProblemTags,feelingTagsToProblemTags,readingProblemTags,listProblems,findProblem,readingsForProblem,videoProblemTags,videosForProblem,maddyForProblem,takeCompanionPrompt,saveCompanionPrompt,selectedProblemId,selectProblem,COMPANION_PROMPT_KEY,SELECTED_PROBLEM_KEY};
})();${ytSection}${sidebarShare}${voicePicker}${feelingsUi}`;
}

function patchJs(source) {
  const runtime = wrapRuntime();
  const bt = readFileSync(join(root, "src/patches/daily-reading.inject.js"), "utf8").trim();
  const gt = readFileSync(join(root, "src/patches/signed-coaches.inject.js"), "utf8").trim();
  const maddyUi = readFileSync(join(root, "src/patches/watch-with-maddy.inject.js"), "utf8").trim();
  const feelingsUi = readFileSync(join(root, "src/patches/feelings-videos.inject.js"), "utf8").trim();

  let next = applySpeakerDisplayOrder(source);
  if (next.includes("/*mp-readings-runtime-start*/")) {
    next = replaceMarkedOrOnce(
      next,
      "/*mp-readings-runtime-start*/",
      "/*mp-readings-runtime-end*/",
      runtime,
      "",
      "runtime",
    );
  } else {
    next = replaceOnce(
      next,
      "function bt({mode:e=`random`,tag:t})",
      `/*mp-readings-runtime-start*/${runtime}/*mp-readings-runtime-end*/function bt({mode:e=\`random\`,tag:t})`,
      "runtime-anchor",
    );
  }

  const btStart = next.indexOf("function bt({mode:e=`random`,tag:t})");
  if (btStart < 0) throw new Error("reading component anchor missing");
  const xt = next.indexOf("var xt={version:1,note:", btStart);
  if (xt < 0) throw new Error("reading component end anchor missing");
  next = `${next.slice(0, btStart)}/*mp-bt-start*/${bt}/*mp-bt-end*/${next.slice(xt)}`;

  if (next.includes("/*mp-gt-start*/")) {
    next = replaceMarkedOrOnce(
      next,
      "/*mp-gt-start*/",
      "/*mp-gt-end*/",
      gt,
      "",
      "gt",
    );
  } else {
    const gtStart = next.indexOf("function Gt()");
    const gtEnd = next.indexOf("var Kt=", gtStart);
    if (gtStart < 0 || gtEnd < 0) throw new Error("signed coaches anchor missing");
    next = `${next.slice(0, gtStart)}/*mp-gt-start*/${gt}/*mp-gt-end*/${next.slice(gtEnd)}`;
  }

  next = replaceOnce(
    next,
    "t===`verse`&&(0,A.jsx)(Rt,{}),t===`reading`&&(0,A.jsx)(bt,{}),t===`videos`&&",
    "(0,A.jsx)(mpYtMeditationsSection,{}),t===`verse`&&(0,A.jsx)(Rt,{}),t===`reading`&&(0,A.jsx)(bt,{}),t===`videos`&&",
    "explore-yt-meditations",
  );

  next = replaceOnce(
    next,
    '"brand.quote":`“The happiness of your life depends on the quality of your thoughts.”`',
    '"brand.quote":`The happiness of your life depends on the quality of your thoughts.`',
    "sidebar-quote-marks",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)(`figcaption`,{children:e(`brand.author`)})]}),(0,A.jsx)(`div`,{className:`nav-label`,children:e(`navigation.label`)})",
    "(0,A.jsx)(`figcaption`,{children:e(`brand.author`)})]}),(0,A.jsx)(mpSidebarShare,{}),(0,A.jsx)(`div`,{className:`nav-label`,children:e(`navigation.label`)})",
    "sidebar-share",
  );

  next = replaceOnce(
    next,
    "function st(){if(typeof window>`u`||!window.speechSynthesis)return null;let e=window.speechSynthesis.getVoices()||[],t=t=>e.find(e=>t.test(e.name)||t.test(e.lang));return t(/google/i)||t(/natural|neural|enhanced/i)||t(/en-AU/i)||t(/^en[-_]/i)||e[0]||null}",
    "function st(){return mpReadings.pickBrowserVoice(typeof window<`u`&&window.speechSynthesis?window.speechSynthesis.getVoices()||[]:[])}",
    "tts-voice-pick",
  );
  next = replaceOnce(
    next,
    "function ct(e,t){if(!e||typeof window>`u`||!window.speechSynthesis)return t?.(),()=>{};window.speechSynthesis.cancel();let n=new SpeechSynthesisUtterance(e);n.rate=.92,n.pitch=1.02;let r=st();r?(n.voice=r,n.lang=r.lang||`en-AU`):n.lang=`en-AU`,n.onend=()=>t?.(),n.onerror=()=>t?.();let i=()=>window.speechSynthesis.speak(n);return window.speechSynthesis.getVoices().length?i():window.speechSynthesis.onvoiceschanged=()=>{let e=st();e&&(n.voice=e,n.lang=e.lang||`en-AU`),i()},()=>{try{window.speechSynthesis.cancel()}catch{}}}",
    "function ct(e,t){return mpReadings.speakBrowser(e,t)}",
    "tts-speak-browser",
  );
  next = replaceOnce(
    next,
    "function dt(e,t){if(ut(),!e?.trim())return t?.(),()=>{};let n=!1,r=()=>{},i=new AbortController,a=()=>{if(!n){if(n=!0,i.abort(),r(),typeof window<`u`&&window.speechSynthesis)try{window.speechSynthesis.cancel()}catch{}lt===a&&(lt=null)}};return lt=a,(async()=>{let o=await it();if(!n){if(o)try{let o=await at(e,{signal:i.signal});if(n)return;let s=ot(o);r=s.stop,await s.play(),await s.ended,n||(lt===a&&(lt=null),t?.());return}catch{if(n)return}n||(r=ct(e,()=>{n||(lt===a&&(lt=null),t?.())}))}})(),a}",
    "function dt(e,t){let x=mpReadings.unwrapListenInput(e),u=x.text,d=x.id;if(ut(),!u.trim())return t?.(),()=>{};let n=!1,r=()=>{},i=new AbortController,a=()=>{if(!n){if(n=!0,i.abort(),r(),typeof window<`u`&&window.speechSynthesis)try{window.speechSynthesis.cancel()}catch{}lt===a&&(lt=null)}};return lt=a,(async()=>{if(n)return;let p=mpReadings.resolveListenAudioUrl(x,typeof mpTtsAudio<`u`?mpTtsAudio:null);if(p){try{if(await mpReadings.playAudioUrl(p,{signal:i.signal})){n||(lt===a&&(lt=null),t?.());return}}catch{if(n)return}}let o=await it();if(!n){if(o)try{let o=await at(u,{signal:i.signal});if(n)return;let s=ot(o);r=s.stop,await s.play(),await s.ended,n||(lt===a&&(lt=null),t?.());return}catch{if(n)return}n||(r=ct(u,()=>{n||(lt===a&&(lt=null),t?.())}))}})(),a}",
    "tts-listen-order",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>s(c),children:a?`Pause`:`Listen`})",
    "(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>s(c),children:a?`Pause`:`Listen`}),(0,A.jsx)(mpVoicePicker,{}),(0,A.jsx)(mpMaddyListenButtons,{})",
    "verse-voice-picker",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)(`button`,{className:`secondary`,onClick:()=>E(e.weeklyFocus.text),children:w?`Pause`:`Listen`})",
    "(0,A.jsx)(`button`,{className:`secondary`,onClick:()=>E(e.weeklyFocus.text),children:w?`Pause`:`Listen`}),(0,A.jsx)(mpVoicePicker,{}),(0,A.jsx)(mpMaddyListenButtons,{})",
    "focus-voice-picker",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)(`button`,{className:`primary`,type:`button`,disabled:!e.trim()||n,onClick:()=>i(e),children:`Speak`})",
    "(0,A.jsx)(`button`,{className:`primary`,type:`button`,disabled:!e.trim()||n,onClick:()=>i(e),children:`Speak`}),(0,A.jsx)(mpVoicePicker,{}),(0,A.jsx)(mpMaddyListenButtons,{})",
    "ttspad-voice-picker",
  );

  next = replaceOnce(
    next,
    "Draw a short, original MindPal reading and a small practice.",
    "Pack A sequential mornings. Mark Done to unlock the next day — open is not Done.",
    "reading-card-copy",
  );
  next = replaceOnce(
    next,
    "Meet the signed MindPal coaches and browse the script library.",
    "Signed coaches plus V01–V12 drafts. Play finished Maddy clips in Watch with Maddy.",
    "videos-card-copy",
  );
  next = replaceOnce(
    next,
    "These cards open script previews. Finished-video review and integration are managed separately; illustrations are not video stills.",
    "Open draft shows the script. Play appears only when an mp4/webm file exists and publication gates pass. Illustrations are not video stills.",
    "videos-library-copy",
  );

  const oldCard =
    "a.map((t,n)=>(0,A.jsxs)(`button`,{className:`video-card`,\"aria-label\":`${t.id} ${t.title} · Draft script preview`,onClick:()=>e(t.id),children:[(0,A.jsxs)(`div`,{className:`video-cover tone-${n%3}`,children:[(0,A.jsx)(`span`,{className:`video-number`,children:t.id}),(0,A.jsx)(`img`,{className:`cover-photo`,src:[Ge(`/journal-scene.jpg`),Ge(`/welcome-hike-640.webp`),Ge(`/friends-scene.jpg`),Ge(`/food-scene.jpg`)][n%4],alt:``,loading:`lazy`}),(0,A.jsx)(`span`,{className:`play-dot`,children:(0,A.jsx)(rn,{size:18})}),(0,A.jsxs)(`span`,{className:`duration`,children:[Math.round(t.targetDurationSeconds/30)/2,` min target`]})]}),(0,A.jsxs)(`div`,{className:`video-copy`,children:[(0,A.jsx)(`span`,{className:`card-type`,children:t.specialistReviewRequired?`SPECIALIST REVIEW REQUIRED`:`HEYGEN · DRAFT SCRIPT`}),(0,A.jsx)(`h3`,{children:t.title}),(0,A.jsxs)(`span`,{className:`card-link`,children:[t.transcriptText?`Read transcript`:`View production outline`,` `,(0,A.jsx)(nn,{size:16})]})]})]},t.id))";
  const midCard =
    "a.map((t,n)=>{let o=hi(t).available;return(0,A.jsxs)(`button`,{className:`video-card${o?``:` is-draft`}`,\"aria-label\":`${t.id} ${t.title} · ${o?`Play`:`Open draft`}`,onClick:()=>e(t.id),children:[(0,A.jsxs)(`div`,{className:`video-cover tone-${n%3}`,children:[(0,A.jsx)(`span`,{className:`video-number`,children:t.id}),(0,A.jsx)(`img`,{className:`cover-photo`,src:[Ge(`/journal-scene.jpg`),Ge(`/welcome-hike-640.webp`),Ge(`/friends-scene.jpg`),Ge(`/food-scene.jpg`)][n%4],alt:``,loading:`lazy`}),o?(0,A.jsx)(`span`,{className:`play-dot`,children:(0,A.jsx)(rn,{size:18})}):null,(0,A.jsxs)(`span`,{className:`duration`,children:[Math.round(t.targetDurationSeconds/30)/2,` min target`]})]}),(0,A.jsxs)(`div`,{className:`video-copy`,children:[(0,A.jsx)(`span`,{className:`card-type`,children:o?`READY TO PLAY`:t.specialistReviewRequired?`SPECIALIST REVIEW REQUIRED`:`HEYGEN · OPEN DRAFT`}),(0,A.jsx)(`h3`,{children:t.title}),(0,A.jsxs)(`span`,{className:`card-link${o?``:` open-draft`}`,children:[o?`Play`:`Open draft`,` `,(0,A.jsx)(nn,{size:16})]})]})]},t.id)})";
  const newCard =
    "a.map((t,n)=>{let o=mpReadings.libraryCardModel(t);return(0,A.jsxs)(`button`,{type:`button`,className:`video-card${o.playable?``:` is-draft`}`,\"aria-label\":o.ariaLabel,onClick:()=>mpReadings.activateLibraryVideo(t,e),onKeyDown:n=>{(n.key===`Enter`||n.key===` `)&&(n.preventDefault(),mpReadings.activateLibraryVideo(t,e))},children:[(0,A.jsxs)(`div`,{className:`video-cover tone-${n%3}`,children:[(0,A.jsx)(`span`,{className:`video-number`,children:t.id}),(0,A.jsx)(`img`,{className:`cover-photo`,src:[Ge(`/journal-scene.jpg`),Ge(`/welcome-hike-640.webp`),Ge(`/friends-scene.jpg`),Ge(`/food-scene.jpg`)][n%4],alt:``,loading:`lazy`}),o.playable?(0,A.jsx)(`span`,{className:`play-dot`,children:(0,A.jsx)(rn,{size:18})}):null,(0,A.jsxs)(`span`,{className:`duration`,children:[Math.round(t.targetDurationSeconds/30)/2,` min target`]})]}),(0,A.jsxs)(`div`,{className:`video-copy`,children:[(0,A.jsx)(`span`,{className:`card-type`,children:o.playable?`READY TO PLAY`:t.specialistReviewRequired?`SPECIALIST REVIEW REQUIRED`:`HEYGEN · OPEN DRAFT`}),(0,A.jsx)(`h3`,{children:t.title}),(0,A.jsxs)(`span`,{className:`card-link${o.playable?``:` open-draft`}`,children:[o.cta,` `,(0,A.jsx)(nn,{size:16})]})]})]},t.id)})";
  if (next.includes(newCard)) {
    /* already patched from a previous in-place edit */
  } else if (next.includes(midCard)) {
    next = replaceOnce(next, midCard, newCard, "video-card-activate");
  } else {
    next = replaceOnce(next, oldCard, newCard, "video-card");
  }

  next = next.replaceAll("HeyGen production planned", "HeyGen not rendered yet");
  next = replaceOnce(
    next,
    "function hi(e,t=new Date){if(e.withdrawn)return{available:!1,reason:`This video has been withdrawn.`};",
    "function hi(e,t=new Date){if(e.withdrawn)return{available:!1,reason:`This video has been withdrawn.`};if(e.publicEligible!==!0||!mi(e.videoUrl)||!/\\.(mp4|webm)$/.test(e.videoUrl))return{available:!1,reason:`HeyGen not rendered yet`};",
    "video-hi-gate",
  );

  if (next.includes("/*mp-maddy-ui-start*/")) {
    next = replaceMarkedOrOnce(
      next,
      "/*mp-maddy-ui-start*/",
      "/*mp-maddy-ui-end*/",
      maddyUi,
      "",
      "maddy-ui",
    );
  } else {
    next = replaceOnce(
      next,
      "function Ki({openVideo:e})",
      `/*mp-maddy-ui-start*/${maddyUi}/*mp-maddy-ui-end*/function Ki({openVideo:e})`,
      "maddy-ui-anchor",
    );
  }

  next = replaceOnce(
    next,
    "(0,A.jsx)(`p`,{className:`lede`,children:`Three quiet places to look: a verse, a short reading, or a video. Looking for your diary? That’s moved to the Journal tab.`}),",
    "(0,A.jsx)(`p`,{className:`lede`,children:`Three quiet places to look: a verse, a short reading, or a video. Looking for your diary? That’s moved to the Journal tab.`}),(0,A.jsx)(mpExploreFeelingChoice,{onSpeakers:()=>n(`videos`)}),(0,A.jsx)(MpWatchWithMaddy,{}),",
    "explore-maddy-section",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)(`h3`,{children:`Meet the MindPal video library`}),(0,A.jsxs)(`p`,{children:[`Gentle exercises and helpful ideas.`,(0,A.jsx)(`br`,{}),`Read the first drafts while films are prepared.`]}),(0,A.jsxs)(`button`,{className:`text-button`,onClick:()=>{I(`Explore`)},children:[`Browse the library `,(0,A.jsx)(vn,{size:15})]}),(0,A.jsx)(`span`,{className:`tiny-label`,children:`12 HeyGen films planned · transcripts available`})",
    "(0,A.jsx)(`h3`,{children:`Watch with Maddy`}),(0,A.jsxs)(`p`,{children:[`Play Welcome, Daily tip and Timed breath.`,(0,A.jsx)(`br`,{}),`Finished companion clips — no draft gate.`]}),(0,A.jsxs)(`button`,{className:`text-button`,onClick:()=>{I(`Explore`)},children:[`Open Watch with Maddy `,(0,A.jsx)(vn,{size:15})]}),(0,A.jsx)(`span`,{className:`tiny-label`,children:`Native MP4 · Welcome · Daily tip · Timed breath`})",
    "today-video-teaser",
  );
  next = patchFeelingsVideos(next, feelingsUi);
  next = patchOwnerUx(next);

  if (!next.includes("mindpal-dstss-themes-paraphrase-v1")) {
    throw new Error("Pack A id missing from bundle");
  }
  const packAData = JSON.parse(readFileSync(join(root, "src/data/pack-a.json"), "utf8"));
  const untagged = (packAData.readings || []).filter(
    (item) => !Array.isArray(item.theme_tags) || !item.theme_tags.length,
  );
  if (untagged.length) {
    throw new Error(`Pack A readings missing theme_tags: ${untagged.map((item) => item.id).join(",")}`);
  }
  const unknownTheme = (packAData.readings || []).find(
    (item) => item.theme_label && !THEME_LABEL_TO_TAGS[item.theme_label],
  );
  if (unknownTheme) {
    throw new Error(`Pack A theme_label not mapped: ${unknownTheme.theme_label}`);
  }
  if (!next.includes("Open draft")) {
    throw new Error("Open draft CTA missing from bundle");
  }
  if (!next.includes("HeyGen not rendered yet")) {
    throw new Error("HeyGen draft copy missing from bundle");
  }
  if (!next.includes("mindpal.readings.v1")) {
    throw new Error("progress storage key missing from bundle");
  }
  if (!next.includes("Watch with Maddy")) {
    throw new Error("Watch with Maddy section missing from bundle");
  }
  if (!next.includes("/videos/maddy/welcome.mp4")) {
    throw new Error("Maddy welcome src missing from bundle");
  }
  if (!next.includes("playsInline:!0")) {
    throw new Error("native video playsInline missing from bundle");
  }
  if (!next.includes(`type:\`button\`,className:\`coach-card\``)) {
    throw new Error("coach cards are not activatable buttons");
  }
  if (next.includes("look_id ·") || next.includes("className:`coach-look-id`")) {
    throw new Error("look_id must stay out of visible coach UI");
  }
  if (
    next.includes("Preview stills load from") ||
    next.includes("No BFL or HeyGen spend from this section.")
  ) {
    throw new Error("technical coach catalog copy leaked into the UI");
  }
  if (!next.includes("This is a signed DayStart coach look.")) {
    throw new Error("signed coach look note missing");
  }
  const speakerIds = speakerIdsInCatalog(next);
  if (speakerIds.join(",") !== REQUIRED_SPEAKER_IDS.join(",")) {
    throw new Error(`speaker order mismatch: ${speakerIds.join(",")}`);
  }
  if (!next.includes("Voice-guided meditations on YouTube")) {
    throw new Error("YouTube meditation reference section missing");
  }
  if (!next.includes("Sleep / insomnia talk-down") || !next.includes("Faith-friendly / Christian contemplative")) {
    throw new Error("meditation category structure missing");
  }
  if (!next.includes("This category is filling.")) {
    throw new Error("filling stubs missing");
  }
  if (!next.includes("mpYtMeditationsSection")) {
    throw new Error("meditation section not mounted in Explore");
  }
  if (!next.includes("Readings for this feeling") || !next.includes("Videos for this feeling")) {
    throw new Error("feeling directory headings missing");
  }
  if (!next.includes("mpSupportVideos") || !next.includes("Browse signed coaches (optional)")) {
    throw new Error("tagged video directory or secondary speaker browse missing");
  }
  if (!next.includes("function mpFeelingsPage(") || !next.includes("return mpFeelingsPage(props)")) {
    throw new Error("Feelings page delegate missing");
  }
  if (next.includes("Video tagging by topic is not built yet")) {
    throw new Error("Focus still bounces videos to the generic library");
  }
  const ytInject = readFileSync(join(root, "src/patches/yt-meditations.inject.js"), "utf8");
  if (ytInject.includes("<iframe") || ytInject.includes("<video")) {
    throw new Error("meditation section must not embed or host media");
  }
  const quoteI18n = next.match(/"brand\.quote":`([^`]*)`/);
  if (
    !quoteI18n ||
    quoteI18n[1] !==
      "The happiness of your life depends on the quality of your thoughts."
  ) {
    throw new Error("Marcus Aurelius quote must remain, without decorative quotation marks");
  }
  if (/[“”"]/.test(quoteI18n[1])) {
    throw new Error("decorative quotation marks remain on the sidebar quote");
  }
  if (!next.includes('"brand.author":`— Marcus Aurelius`')) {
    throw new Error("Marcus Aurelius attribution missing");
  }
  if (!next.includes("mpSidebarShare") || !next.includes("Share MindPal")) {
    throw new Error("sidebar Share button missing");
  }
  if (next.includes("||e[0]||null") || next.includes("n.rate=.92")) {
    throw new Error("old sick-robot voice pick or rate remains");
  }
  if (!next.includes("pickBrowserVoice") || !next.includes("mpVoicePicker")) {
    throw new Error("Listen voice picker missing");
  }
  if (!next.includes("speakBrowser") || !next.includes("prerenderedAudioUrl")) {
    throw new Error("Listen playback helpers missing");
  }
  if (!next.includes("mpTtsAudio") || !next.includes("mindpal.tts.voice.v1")) {
    throw new Error("TTS catalog or voice persistence missing");
  }
  if (!next.includes("activateLibraryVideo") || !next.includes("MpLibraryHost")) {
    throw new Error("video card activation host missing");
  }
  if (!next.includes("type:`button`,className:`maddy-video-card`")) {
    throw new Error("Maddy cards must be activatable buttons");
  }
  if (!next.includes("Play Maddy’s welcome") || !next.includes("Play Maddy’s tip")) {
    throw new Error("Play Maddy listen controls missing");
  }
  if (!next.includes("Maddy (when available)") || !next.includes("resolveListenAudioUrl")) {
    throw new Error("Maddy listen preference missing");
  }
  if (/\nexport (async )?function |\nexport const /.test(next)) {
    throw new Error("unstripped ESM export remains in the Pages bundle");
  }
  if (!next.includes("curatedVideosForEmotion") || !next.includes("MpEmotionVideos")) {
    throw new Error("emotion-scoped Feelings video directory missing");
  }
  if (!next.includes("Browse all videos by speaker")) {
    throw new Error("secondary speaker browse link missing");
  }
  if (next.includes("Browse the whole video directory")) {
    throw new Error("Feelings still promotes the generic speaker directory");
  }
  if (next.includes("(0,A.jsx)(ge,{initialTopic:")) {
    throw new Error("Feelings Videos still mounts the speaker picker");
  }
  return next;
}

function patchFeelingsVideos(source, feelingsUi) {
  let next = source;
  if (next.includes("/*mp-ve-start*/")) {
    return replaceMarkedOrOnce(
      next,
      "/*mp-ve-start*/",
      "/*mp-ve-end*/",
      feelingsUi,
      "",
      "feelings-videos",
    );
  }
  const start = next.indexOf("function ve({onDiary:e,onPractice:t,onLeave:n,onDirectory:r})");
  const end = next.indexOf("var ye={version:`0.1-draft`", start);
  if (start < 0 || end < 0) {
    throw new Error("Feelings page anchor missing");
  }
  return `${next.slice(0, start)}/*mp-ve-start*/${feelingsUi}/*mp-ve-end*/${next.slice(end)}`;
}

function patchOwnerUx(source) {
  const ux = readFileSync(join(root, "src/patches/owner-ux.inject.js"), "utf8").trim();
  const oldRr =
    "function Rr({name:e,onOpenVerse:t,onOpenFocus:n,onWriteJournal:r}){let i=Lr();return(0,A.jsxs)(`section`,{className:`today-shortcuts`,\"aria-label\":`Today shortcuts`,children:[(0,A.jsxs)(`div`,{className:`today-greeting`,children:[(0,A.jsx)(`p`,{className:`eyebrow`,children:`TODAY`}),(0,A.jsx)(`h1`,{children:e?`Good ${i}, ${e}.`:`Good ${i}.`}),e&&(0,A.jsxs)(`span`,{className:`tag device-tag`,children:[e,` · on this device`]})]}),(0,A.jsxs)(`div`,{className:`today-shortcut-grid`,children:[(0,A.jsxs)(`button`,{className:`shortcut-card`,onClick:t,children:[(0,A.jsx)(Sn,{size:20,\"aria-hidden\":`true`}),(0,A.jsx)(`span`,{className:`card-type`,children:`TODAY’S VERSE`}),(0,A.jsx)(`strong`,{children:`Read today’s verse`}),(0,A.jsxs)(`span`,{className:`card-link`,children:[`Open `,(0,A.jsx)(nn,{size:16})]})]}),(0,A.jsxs)(`button`,{className:`shortcut-card`,onClick:n,children:[(0,A.jsx)(sn,{size:20,\"aria-hidden\":`true`}),(0,A.jsx)(`span`,{className:`card-type`,children:`FOCUS`}),(0,A.jsx)(`strong`,{children:`What’s on your mind today?`}),(0,A.jsxs)(`span`,{className:`card-link`,children:[`Open Focus `,(0,A.jsx)(nn,{size:16})]})]}),(0,A.jsxs)(`button`,{className:`shortcut-card`,onClick:r,children:[(0,A.jsx)(rn,{size:20,\"aria-hidden\":`true`}),(0,A.jsx)(`span`,{className:`card-type`,children:`JOURNAL`}),(0,A.jsx)(`strong`,{children:`Write a quick note`}),(0,A.jsxs)(`span`,{className:`card-link`,children:[`Open Journal `,(0,A.jsx)(nn,{size:16})]})]})]})]})}";

  let next = source;
  if (next.includes("function mpSignInPage(")) {
    const start = next.indexOf("function mpNotifySession()");
    const end = next.indexOf("function Lr(e=new Date)");
    if (start >= 0 && end > start) {
      next = `${next.slice(0, start)}${ux}\n${next.slice(end)}`;
    }
  } else {
    next = replaceOnce(next, oldRr, "", "remove-old-today-hub");
    next = replaceOnce(
      next,
      "function Lr(e=new Date)",
      `${ux}\nfunction Lr(e=new Date)`,
      "owner-ux-inject",
    );
  }

  next = replaceOnce(
    next,
    "function Ot(){localStorage.removeItem(Ct)}",
    "function Ot(){localStorage.removeItem(Ct);try{window.dispatchEvent(new Event(`mindpal-session-change`))}catch{}}",
    "signout-event",
  );
  next = replaceOnce(
    next,
    "return r.push(a),Et(r),localStorage.setItem(Ct,a.username),a}async function jt",
    "return r.push(a),Et(r),localStorage.setItem(Ct,a.username),window.dispatchEvent(new Event(`mindpal-session-change`)),a}async function jt",
    "create-session-event",
  );
  next = replaceOnce(
    next,
    "return localStorage.setItem(Ct,n.username),n}function Mt",
    "return localStorage.setItem(Ct,n.username),window.dispatchEvent(new Event(`mindpal-session-change`)),n}function Mt",
    "signin-session-event",
  );

  next = replaceOnce(
    next,
    `"route.today":\`Today\`,"route.explore":\`Explore\``,
    `"route.today":\`Today\`,"route.readings":\`Readings\`,"route.later":\`Later\`,"route.evening":\`Before you sleep\`,"route.problem":\`Help with this\`,"route.explore":\`Explore\``,
    "i18n-routes",
  );
  next = replaceOnce(
    next,
    "Ii=[`Feelings`,`YouTube directory`,`Today`,`Explore`,`My diary`,`Focus`,`Companion`,",
    "Ii=[`Feelings`,`YouTube directory`,`Today`,`Readings`,`Later`,`Evening`,`Problem`,`Explore`,`My diary`,`Focus`,`Companion`,",
    "hash-routes",
  );
  next = replaceOnce(
    next,
    "Li={Today:`route.today`,Explore:`route.explore`,",
    "Li={Today:`route.today`,Readings:`route.readings`,Later:`route.later`,Evening:`route.evening`,Problem:`route.problem`,Explore:`route.explore`,",
    "breadcrumb-routes",
  );

  next = replaceOnce(
    next,
    "onOpenVerse:()=>requestAnimationFrame(()=>document.getElementById(`today-verse`)?.scrollIntoView({behavior:`smooth`,block:`start`})),onOpenFocus:()=>I(`Focus`),onWriteJournal:()=>{C(`What’s on my mind right now…`),I(`My diary`)}",
    "onOpenVerse:()=>I(`Readings`),onOpenFocus:()=>I(`Focus`),onWriteJournal:()=>{C(`What’s on my mind right now…`),I(`My diary`)},onOpenLater:()=>I(`Later`),onOpenEvening:()=>I(`Evening`),onAddWin:()=>{C(`A small win today: `),I(`My diary`)},onOpenMaddy:()=>I(`Explore`),onOpenProblem:()=>I(`Problem`)",
    "today-hub-links",
  );
  next = replaceOnce(
    next,
    "a===`adult`&&t===`Today`&&(0,A.jsx)(`button`,{className:`secondary`,onClick:()=>I(`Feelings`),children:`Help with how I’m feeling`}),",
    "!1&&t===`Today`&&(0,A.jsx)(`button`,{className:`secondary`,onClick:()=>I(`Feelings`),children:`Help with how I’m feeling`}),",
    "hide-today-feelings",
  );
  next = replaceOnce(
    next,
    "(t===`Today`||ne)&&(0,A.jsx)(Te,{open:()=>I(`Youth preview`)})",
    "ne&&(0,A.jsx)(Te,{open:()=>I(`Youth preview`)})",
    "hide-today-youth-teaser",
  );

  next = replaceOnce(
    next,
    "function ve({onDiary:e,onPractice:t,onLeave:n,onDirectory:r}){",
    "function ve(props){return mpFeelingsPage(props)}function mpFeelingsLegacy({onDiary:e,onPractice:t,onLeave:n,onDirectory:r}){",
    "feelings-page-delegate",
  );

  next = replaceOnce(
    next,
    "a===`adult`&&t===`Feelings`&&(0,A.jsx)(ve,{onDiary:()=>I(`My diary`),onPractice:()=>y(`E01`),onLeave:()=>I(`Today`),onDirectory:()=>I(`YouTube directory`)})",
    "a===`adult`&&t===`Feelings`&&(0,A.jsx)(ve,{onDiary:()=>I(`My diary`),onPractice:()=>y(`E01`),onLeave:()=>I(`Today`),onDirectory:()=>I(`YouTube directory`),onSpeakers:()=>I(`Explore`)})",
    "feelings-speakers-secondary",
  );

  next = replaceOnce(
    next,
    "(0,A.jsx)(`h2`,{children:`Videos`}),(0,A.jsx)(`p`,{children:`Video tagging by topic is not built yet — no MindPal video is claimed to match this topic. You can browse the full coach and script library from Explore.`})",
    "(0,A.jsx)(mpSupportVideos,{initialTag:b.readingTag,heading:`Videos for this feeling`,showChips:!1})",
    "focus-tagged-videos",
  );

  next = replaceOnce(
    next,
    "a===`adult`&&t===`Today`&&(0,A.jsx)(kr,{",
    "!1&&t===`Today`&&(0,A.jsx)(kr,{",
    "hide-today-dump",
  );
  next = replaceOnce(
    next,
    "a===`adult`&&(0,A.jsx)(ii,{active:t===`Today`,onHelp:()=>I(`Get support`)})",
    "!1&&(0,A.jsx)(ii,{active:t===`Today`,onHelp:()=>I(`Get support`)})",
    "hide-today-reminders-dump",
  );
  next = replaceOnce(
    next,
    "t===`Today`&&(0,A.jsxs)(A.Fragment,{children:[(0,A.jsxs)(`section`,{className:`hero`",
    "!1&&(0,A.jsxs)(A.Fragment,{children:[(0,A.jsxs)(`section`,{className:`hero`",
    "hide-today-hero",
  );

  next = replaceOnce(
    next,
    "t===`Focus`&&(0,A.jsx)(Hr,{onExercise:y,onDiary:e=>{C(e),I(`My diary`)},onHelp:()=>I(`Get support`),onCompanion:()=>I(`Companion`)}),t===`My diary`&&(0,A.jsx)(Yi,{",
    "t===`Readings`&&(0,A.jsx)(mpReadingsPage,{}),t===`Later`&&(0,A.jsx)(mpLaterPage,{onExercise:y,onFocus:()=>I(`Focus`)}),t===`Evening`&&(0,A.jsx)(mpEveningPage,{onJournal:()=>{C(`Before sleep, I noticed…`),I(`My diary`)}}),t===`Focus`&&(0,A.jsx)(`div`,{className:`mp-lane mp-lane-focus`,children:(0,A.jsx)(Hr,{onExercise:y,onDiary:e=>{C(e),I(`My diary`)},onHelp:()=>I(`Get support`),onCompanion:()=>I(`Companion`)})}),t===`My diary`&&(0,A.jsxs)(`div`,{className:`mp-lane mp-lane-journal`,children:[(0,A.jsx)(mpWinsPanel,{variant:`journal`}),(0,A.jsx)(Yi,{",
    "lane-pages",
  );
  next = replaceOnce(
    next,
    "initialPrompt:S,onHelp:()=>I(`Get support`)}),t===`Companion`&&",
    "initialPrompt:S,onHelp:()=>I(`Get support`)})]}),t===`Problem`&&(0,A.jsx)(mpProblemHubPage,{onOpenVideo:x,onCompanion:()=>I(`Companion`),onJournal:e=>{C(e),I(`My diary`)},onExplore:()=>I(`Readings`),onSpeakers:()=>I(`Explore`),onAddWin:()=>{C(`A small win today: `),I(`My diary`)}}),t===`Companion`&&",
    "journal-lane-close",
  );

  next = replaceOnce(
    next,
    "(0,A.jsx)(`p`,{className:`lede`,children:`Practices to help you reflect and cope — not a diagnosis, and not a course of treatment.`}),(0,A.jsx)(`div`,{className:`three-grid topic-grid`",
    "(0,A.jsx)(`p`,{className:`lede`,children:`Practices to help you reflect and cope — not a diagnosis, and not a course of treatment.`}),(0,A.jsx)(mpMoreStepsCard,{}),(0,A.jsx)(`div`,{className:`three-grid topic-grid`",
    "focus-more-steps",
  );

  next = replaceOnce(
    next,
    "(0,A.jsx)(`button`,{className:`text-button`,onClick:()=>f(!d),children:d?`Hide welcome image`:`Show welcome image`}),",
    "",
    "hide-welcome-toggle",
  );
  next = replaceOnce(
    next,
    "(0,A.jsxs)(`details`,{children:[(0,A.jsx)(`summary`,{children:`Explore the longer small-steps pathway`}),(0,A.jsx)(We,{})]}),",
    "",
    "remove-small-steps-dump",
  );
  next = replaceOnce(
    next,
    ",(0,A.jsx)(`p`,{children:`Optional faith content. Skip anytime. Not a clinical intervention. WEB = World English Bible (public domain).`})",
    "",
    "prayer-footer",
  );

  next = replaceOnce(
    next,
    "(0,A.jsx)(`h3`,{children:`Verse`}),(0,A.jsx)(`p`,{children:`A short verse and reflection for today, with an optional prayer.`})",
    "(0,A.jsx)(`h3`,{children:`Readings`}),(0,A.jsx)(`p`,{children:`A verse, prayer and today’s pack reading.`})",
    "explore-readings-label",
  );
  next = replaceOnce(
    next,
    "children:`TODAY’S VERSE`}),(0,A.jsx)(`h3`,{children:`Readings`})",
    "children:`READINGS`}),(0,A.jsx)(`h3`,{children:`Readings`})",
    "explore-readings-type",
  );

  next = replaceOnce(
    next,
    "(0,A.jsx)(`p`,{className:`lede`,children:o(`preferences.introduction`)}),(0,A.jsxs)(`div`,{className:`two-grid`",
    "(0,A.jsx)(`p`,{className:`lede`,children:o(`preferences.introduction`)}),(0,A.jsx)(mpFaithSettings,{}),(0,A.jsxs)(`div`,{className:`two-grid`",
    "settings-calendar",
  );
  next = replaceOnce(
    next,
    "Hosting, live AI, HeyGen rendering and public release remain separate steps.`})]})]})]})}",
    "Hosting, live AI, HeyGen rendering and public release remain separate steps.`})]})]}),(0,A.jsx)(mpAccountFooter,{})]})}",
    "settings-account-footer",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)(Nt,{}),",
    "",
    "hide-midpage-login-card",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)(`p`,{className:`lede`,children:`Three quiet places to look: a verse, a short reading, or a video. Looking for your diary? That’s moved to the Journal tab.`}),(0,A.jsx)(mpExploreFeelingChoice,{onSpeakers:()=>n(`videos`)}),(0,A.jsx)(MpWatchWithMaddy,{}),",
    "(0,A.jsx)(`p`,{className:`lede`,children:`Three quiet places to look: a verse, a short reading, or a video. Looking for your diary? That’s moved to the Journal tab.`}),(0,A.jsx)(mpExploreFeelingChoice,{onSpeakers:()=>n(`videos`)}),(0,A.jsx)(mpProblemHubList,{onOpen:()=>I(`Problem`)}),(0,A.jsx)(MpWatchWithMaddy,{}),",
    "explore-problem-hubs",
  );
  next = replaceOnce(
    next,
    "[n,r]=(0,_.useState)(!1),[i,a]=(0,_.useState)(`ordinary`),[o,s]=(0,_.useState)(``),[c,l]=(0,_.useState)(0)",
    "[n,r]=(0,_.useState)(!1),[i,a]=(0,_.useState)(`ordinary`),[o,s]=(0,_.useState)(()=>mpProblems.takeCompanionPrompt()),[c,l]=(0,_.useState)(0)",
    "companion-prefill",
  );

  next = replaceOnce(
    next,
    "F=(0,_.useRef)(null);(0,_.useEffect)(()=>{let e=()=>c(navigator.onLine);",
    "F=(0,_.useRef)(null);let[mpAuthed,mpSetAuthed]=(0,_.useState)(()=>!!Dt());(0,_.useEffect)(()=>{function e(){mpSetAuthed(!!Dt())}return window.addEventListener(`mindpal-session-change`,e),()=>window.removeEventListener(`mindpal-session-change`,e)},[]);(0,_.useEffect)(()=>{let e=()=>c(navigator.onLine);",
    "session-state",
  );
  next = replaceOnce(
    next,
    "className:`app`,children:[(0,A.jsx)(`a`,{className:`skip`",
    "className:`app${a===`adult`&&!mpAuthed?` mp-signin-shell`:``}`,children:[(0,A.jsx)(`a`,{className:`skip`",
    "signin-shell-class",
  );
  next = replaceOnce(
    next,
    "try`)})]}):(0,A.jsxs)(A.Fragment,{children:[a===`adult`&&(0,A.jsxs)(A.Fragment,{children:[(0,A.jsx)($r,{active:t===`Body, food and wellbeing`",
    "try`)})]}):a===`adult`&&!mpAuthed?(0,A.jsx)(mpSignInPage,{onSignedIn:()=>{mpSetAuthed(!0),I(`Today`)}}):(0,A.jsxs)(A.Fragment,{children:[a===`adult`&&(0,A.jsxs)(A.Fragment,{children:[(0,A.jsx)($r,{active:t===`Body, food and wellbeing`",
    "signin-gate",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)(Ir,{items:Bi,active:t,onSelect:I})",
    "mpAuthed||a!==`adult`?(0,A.jsx)(Ir,{items:Bi,active:t,onSelect:I}):null",
    "hide-tabs-until-signin",
  );

  if (!next.includes("Do this next")) {
    throw new Error("day-steps chrome missing from bundle");
  }
  if (!next.includes("Follow today’s steps — Morning, Day, then Night.")) {
    throw new Error("hub flow copy missing from bundle");
  }
  if (!next.includes("Today’s verse — tap to expand")) {
    throw new Error("collapsed Morning verse missing from bundle");
  }
  if (!next.includes("mp-day-band") || !next.includes("mp-band-${e.id}")) {
    throw new Error("Morning/Day/Night bands missing from bundle");
  }
  if (!next.includes("Readings — Verse of the day")) {
    throw new Error("compact readings row missing from bundle");
  }
  if (!next.includes("Open Watch with Maddy")) {
    throw new Error("Maddy teaser link-out missing from bundle");
  }
  if (next.includes("A short pathway for this day")) {
    throw new Error("old hub lede still in bundle");
  }
  if (!next.includes("Before you sleep")) {
    throw new Error("evening step missing from bundle");
  }
  if (!next.includes("Show Coptic calendar date")) {
    throw new Error("Coptic settings toggle missing from bundle");
  }
  if (!next.includes("!1&&t===`Today`&&(0,A.jsx)(`button`,{className:`secondary`,onClick:()=>I(`Feelings`)")) {
    throw new Error("Today feelings button still live");
  }
  if (next.includes("Hide welcome image")) {
    throw new Error("welcome-image clutter still in bundle");
  }
  if (next.includes("Explore the longer small-steps pathway")) {
    throw new Error("small-steps dump still in bundle");
  }
  if (next.includes("Optional faith content. Skip anytime.")) {
    throw new Error("prayer WEB footer still in bundle");
  }
  if (!next.includes("Follow today’s steps")) {
    throw new Error("Morning/Day/Night flow line missing from bundle");
  }
  if (!next.includes("What do you need help with?")) {
    throw new Error("problem hub list missing from bundle");
  }
  if (!next.includes("mp-problem-chip") || !next.includes("Tap a chip to expand")) {
    throw new Error("Today problem chips missing from the front page");
  }
  if (!next.includes("mpProblemHubPage") || !next.includes("Talk this through with Companion")) {
    throw new Error("problem hub page missing from bundle");
  }
  if (!next.includes("mp-account-footer") || !next.includes("mpAccountFooter")) {
    throw new Error("Settings account footer missing from bundle");
  }
  if (next.includes("(0,A.jsx)(Nt,{})")) {
    throw new Error("mid-page LOCAL ACCOUNT login card still mounted");
  }
  if (next.includes("a===`adult`&&t===`Today`&&(0,A.jsx)(`button`,{className:`secondary`,onClick:()=>I(`Feelings`)")) {
    throw new Error("Today feelings dump button still live");
  }
  if (!next.includes("Today’s verse — tap to expand")) {
    throw new Error("collapsed verse control missing from Today");
  }
  if (!next.includes("takeCompanionPrompt")) {
    throw new Error("Companion prefill helper missing from bundle");
  }
  return next;
}

function patchCss(source) {
  const extra = readFileSync(join(root, "src/patches/styles.css"), "utf8").trim();
  const block = `/*mp-styles-start*/${extra}/*mp-styles-end*/`;
  if (source.includes("/*mp-styles-start*/")) {
    return replaceMarkedOrOnce(
      source,
      "/*mp-styles-start*/",
      "/*mp-styles-end*/",
      extra,
      "",
      "css",
    );
  }
  return `${source}\n${block}\n`;
}

function updateIndexHtml(jsFile, cssFile) {
  const path = join(root, "index.html");
  let html = readFileSync(path, "utf8");
  html = html.replace(
    /src="\/mindpal\/assets\/index-[^"]+\.js"/,
    `src="/mindpal/assets/${jsFile}"`,
  );
  html = html.replace(
    /href="\/mindpal\/assets\/index-[^"]+\.css"/,
    `href="/mindpal/assets/${cssFile}"`,
  );
  if (!html.includes("/mindpal/assets/") || html.includes("src=\"/assets/")) {
    throw new Error("GH Pages /mindpal/ path was changed");
  }
  writeFileSync(path, html);
}

function updateServiceWorker(jsFile, cssFile, html, js, css) {
  const path = join(root, "sw.js");
  let sw = readFileSync(path, "utf8");
  sw = sw.replace(/assets\/index-[A-Za-z0-9_-]+\.js/g, `assets/${jsFile}`);
  sw = sw.replace(/assets\/index-[A-Za-z0-9_-]+\.css/g, `assets/${cssFile}`);
  sw = sw.replace(
    /\{url:"index.html",revision:"[a-f0-9]+"\}/,
    `{url:"index.html",revision:"${md5(html)}"}`,
  );
  const nav = 'e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html")))';
  const navDeny =
    'e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html"),{denylist:[/\\/videos\\//,/\\.(?:mp4|webm)$/i]}))';
  if (sw.includes(nav)) {
    sw = sw.replace(nav, navDeny);
  } else if (!sw.includes("denylist:[/\\/videos\\//")) {
    throw new Error("service worker navigation route missing");
  }
  writeFileSync(path, sw);
}

function clearOldHashedAssets(keep) {
  for (const name of readdirSync(assetsDir)) {
    if (/^index-[A-Za-z0-9_-]+\.(js|css)$/.test(name) && !keep.has(name)) {
      unlinkSync(join(assetsDir, name));
    }
  }
}

execFileSync("node", ["--test", ...readdirSync(join(root, "tests")).filter((name) => name.endsWith(".test.js")).map((name) => join("tests", name))], {
  cwd: root,
  stdio: "inherit",
});

snapshotBaseline();
mkdirSync(assetsDir, { recursive: true });
const js = patchJs(readFileSync(join(vendorDir, "index-BiA2yEms.js"), "utf8"));
const css = patchCss(readFileSync(join(vendorDir, "index-CLdVgkKd.css"), "utf8"));
const jsFile = `index-${shortHash(js)}.js`;
const cssFile = `index-${shortHash(css)}.css`;
writeFileSync(join(assetsDir, jsFile), js);
writeFileSync(join(assetsDir, cssFile), css);
clearOldHashedAssets(new Set([jsFile, cssFile]));
updateIndexHtml(jsFile, cssFile);
const html = readFileSync(join(root, "index.html"), "utf8");
updateServiceWorker(jsFile, cssFile, html, js, css);
writeFileSync(join(root, "scripts", ".last-build.json"), `${JSON.stringify({ jsFile, cssFile }, null, 2)}\n`);
console.log(`built /mindpal/assets/${jsFile} and /mindpal/assets/${cssFile}`);
execFileSync("node", [join(root, "scripts/verify.mjs")], { cwd: root, stdio: "inherit" });
