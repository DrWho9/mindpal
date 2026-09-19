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
    .replace(/^export const /gm, "const ")
    .replace(/^export function /gm, "function ");
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

function wrapRuntime() {
  const progress = stripExports(
    readFileSync(join(root, "src/readings/progress.js"), "utf8"),
  );
  const playback = stripExports(
    readFileSync(join(root, "src/videos/playback.js"), "utf8"),
  );
  const packA = readFileSync(join(root, "src/data/pack-a.json"), "utf8");
  const packB = readFileSync(join(root, "src/data/pack-b.json"), "utf8");
  return `var mpPackA=${packA.trim()};var mpPackB=${packB.trim()};var mpReadings=(function(){${progress}\n${playback}\nreturn{PACK_A_ID,PACK_B_ID,PACK_A_TOTAL,PACK_A_CREDIT,PACK_A_PROGRESS_LINE,STORAGE_KEY,emptyProgress,normalizeProgress,parseProgressJson,orderedReadings,isDayUnlocked,nextIncomplete,canMarkDone,markReadingDone,packAComplete,dailyDefaultPackId,loadProgress,saveProgress,pickRandom,hasPlayableMediaUrl,isVideoPlayable,videoCardCta,videoCardAriaLabel}})();`;
}

function patchJs(source) {
  const runtime = wrapRuntime();
  const bt = readFileSync(join(root, "src/patches/daily-reading.inject.js"), "utf8").trim();

  let next = source;
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

  next = replaceOnce(
    next,
    "Draw a short, original MindPal reading and a small practice.",
    "Pack A sequential mornings. Mark Done to unlock the next day — open is not Done.",
    "reading-card-copy",
  );
  next = replaceOnce(
    next,
    "Meet the signed MindPal coaches and browse the script library.",
    "Signed coaches plus V01–V12. Open draft shows the script until HeyGen is rendered.",
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
  const newCard =
    "a.map((t,n)=>{let o=hi(t).available;return(0,A.jsxs)(`button`,{className:`video-card${o?``:` is-draft`}`,\"aria-label\":`${t.id} ${t.title} · ${o?`Play`:`Open draft`}`,onClick:()=>e(t.id),children:[(0,A.jsxs)(`div`,{className:`video-cover tone-${n%3}`,children:[(0,A.jsx)(`span`,{className:`video-number`,children:t.id}),(0,A.jsx)(`img`,{className:`cover-photo`,src:[Ge(`/journal-scene.jpg`),Ge(`/welcome-hike-640.webp`),Ge(`/friends-scene.jpg`),Ge(`/food-scene.jpg`)][n%4],alt:``,loading:`lazy`}),o?(0,A.jsx)(`span`,{className:`play-dot`,children:(0,A.jsx)(rn,{size:18})}):null,(0,A.jsxs)(`span`,{className:`duration`,children:[Math.round(t.targetDurationSeconds/30)/2,` min target`]})]}),(0,A.jsxs)(`div`,{className:`video-copy`,children:[(0,A.jsx)(`span`,{className:`card-type`,children:o?`READY TO PLAY`:t.specialistReviewRequired?`SPECIALIST REVIEW REQUIRED`:`HEYGEN · OPEN DRAFT`}),(0,A.jsx)(`h3`,{children:t.title}),(0,A.jsxs)(`span`,{className:`card-link${o?``:` open-draft`}`,children:[o?`Play`:`Open draft`,` `,(0,A.jsx)(nn,{size:16})]})]})]},t.id)})";
  if (next.includes(newCard)) {
    /* already patched from a previous in-place edit */
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

  if (!next.includes("mindpal-dstss-themes-paraphrase-v1")) {
    throw new Error("Pack A id missing from bundle");
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
  writeFileSync(path, sw);
}

function clearOldHashedAssets(keep) {
  for (const name of readdirSync(assetsDir)) {
    if (/^index-[A-Za-z0-9_-]+\.(js|css)$/.test(name) && !keep.has(name)) {
      unlinkSync(join(assetsDir, name));
    }
  }
}

execFileSync("node", ["--test", "tests/readings-progress.test.js", "tests/videos-playback.test.js"], {
  cwd: root,
  stdio: "inherit",
});

snapshotBaseline();
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
