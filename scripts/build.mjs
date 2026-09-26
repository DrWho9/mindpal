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

function exciseVendorReflectPreview(source) {
  const startNeedle = "function ti({active:e,onHelp:t,onDiary:n}){";
  const endNeedle = "var ni=Ue,ri=[`Put away one item`";
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);
  if (start < 0 || end <= start) {
    throw new Error("vendor Reflect preview function is missing");
  }
  if (!source.slice(start, end).includes("This page cannot understand your words")) {
    throw new Error("vendor Reflect preview copy was not at the expected anchor");
  }
  const next = `${source.slice(0, start)}function ti(props){return mpReflectPage(props)}${source.slice(end)}`;
  if (
    next.includes("function mpReflectLegacy") ||
    next.includes("This page cannot understand your words") ||
    next.includes("Self-guided preview · no live listener")
  ) {
    throw new Error("dead-end Reflect preview was not excised");
  }
  return next;
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
  const openReadingSrc = stripExports(
    readFileSync(join(root, "src/readings/open.js"), "utf8"),
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
  const ytDirectory = stripExports(
    readFileSync(join(root, "src/videos/yt-directory.js"), "utf8"),
  );
  const emotions = stripExports(
    readFileSync(join(root, "src/videos/emotions.js"), "utf8"),
  );
  const feelingMedia = stripExports(
    readFileSync(join(root, "src/videos/feeling-media.js"), "utf8"),
  );
  const feelingKits = stripExports(
    readFileSync(join(root, "src/feelings/kits.js"), "utf8"),
  );
  const feelingKitsJson = readFileSync(join(root, "src/data/feeling-kits.json"), "utf8");
  const share = stripExports(
    readFileSync(join(root, "src/share/app.js"), "utf8"),
  );
  const ttsVoices = stripExports(
    readFileSync(join(root, "src/tts/voices.js"), "utf8"),
  );
  const ttsMic = stripExports(
    readFileSync(join(root, "src/tts/mic.js"), "utf8"),
  );
  const ttsAudio = stripExports(
    readFileSync(join(root, "src/tts/audio.js"), "utf8"),
  );
  const themeMap = stripExports(
    readFileSync(join(root, "src/problems/theme-map.js"), "utf8"),
  );
  const evidenceGuidance = stripExports(
    readFileSync(join(root, "src/problems/evidence-guidance.js"), "utf8"),
  );
  const problems = stripExports(
    readFileSync(join(root, "src/problems/hubs.js"), "utf8"),
  );
  const maddyListen = stripExports(
    readFileSync(join(root, "src/tts/maddy-listen.js"), "utf8"),
  );
  const listenPlayer = stripExports(
    readFileSync(join(root, "src/tts/listen-player.js"), "utf8"),
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
  const listenUi = readFileSync(
    join(root, "src/patches/listen-player.inject.js"),
    "utf8",
  ).trim();
  const feelingsUi = readFileSync(
    join(root, "src/patches/feelings-readings.inject.js"),
    "utf8",
  ).trim();
  const packA = readFileSync(join(root, "src/data/pack-a.json"), "utf8");
  const packB = readFileSync(join(root, "src/data/pack-b.json"), "utf8");
  const ownerReadings = readFileSync(join(root, "src/data/owner-readings.json"), "utf8");
  const ownerHelpers = stripExports(
    readFileSync(join(root, "src/readings/owner.js"), "utf8"),
  );
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
  const mensHealthCatalog = readFileSync(join(root, "src/data/mens-health.json"), "utf8");
  const mensHealth = stripExports(
    readFileSync(join(root, "src/problems/mens-health.js"), "utf8"),
  );
    const evidenceGuidanceCatalog = readFileSync(
    join(root, "src/data/evidence-guidance.json"),
    "utf8",
  );
  const ux = [
    moduleSource("src/calendar/civil.js"),
    moduleSource("src/calendar/coptic.js"),
    moduleSource("src/prefs/faith.js"),
    moduleSource("src/prefs/profile.js"),
    moduleSource("src/today/steps.js"),
    moduleSource("src/today/wins.js"),
    moduleSource("src/today/team-ritual.js"),
    moduleSource("src/today/individual-growth.js"),
    moduleSource("src/nav/home.js"),
    moduleSource("src/profile/store.js"),
    moduleSource("src/companion/client.js"),
    moduleSource("src/reflect/prompt.js"),
    moduleSource("src/reflect/thread.js"),
    moduleSource("src/reflect/composer.js"),
    moduleSource("src/appointment/prompt.js"),
  ].join("\n");
  const speakersCatalog = readFileSync(join(root, "src/data/speakers-catalog.json"), "utf8");
  const reflectUi = readFileSync(
    join(root, "src/patches/reflect-chat.inject.js"),
    "utf8",
  ).trim();
  const appointmentUi = readFileSync(
    join(root, "src/patches/appointment-chat.inject.js"),
    "utf8",
  ).trim();
  const companionBaseUi = readFileSync(
    join(root, "src/patches/companion-base.inject.js"),
    "utf8",
  ).trim();
  const companionDemo = stripExports(
    readFileSync(join(root, "src/companion/demo.js"), "utf8"),
  );
  const companionDemoUi = readFileSync(
    join(root, "src/patches/companion-demo.inject.js"),
    "utf8",
  ).trim();
  if (!existsSync(join(root, "vendor/pdfjs/pdf.min.js")) || !existsSync(join(root, "vendor/pdfjs/pdf.worker.min.js"))) {
    throw new Error("vendored pdf.js missing from vendor/pdfjs");
  }
  const bookSources = [
    "src/book/chapters.js",
    "src/book/design.js",
    "src/book/persist.js",
    "src/book/ambient.js",
    "src/book/sample.js",
    "src/book/pdf.js",
  ].map((rel) => moduleSource(rel)).join("\n");
  const bookUi = readFileSync(join(root, "src/patches/book.inject.js"), "utf8").trim();
  const bookRuntime = `var mpBook=(function(){\n${bookSources}\nreturn{CHUNK_CHARS,isHeadingLine,normalizeWhitespace,chaptersFromHeadings,buildChunks,uniqueChapters,filterChapters,chunkIndexForChapter,chapterProgressPct,clampChunkIndex,pageTurnDelta,BOOK_DESIGN_KEY,DESIGN_THEMES,BOOK_FONTS,TEXT_SIZES,defaultDesign,normalizeDesign,designWithTheme,designCssVars,loadDesign,saveDesign,BOOK_IDB,BOOK_STORE,LEGACY_PDF_STORE,LEGACY_PDF_KEY,BOOK_POS_KEY,BOOK_NOTES_KEY,BOOK_BM_KEY,bookIdForName,createMemoryBookLibrary,createIdbBookLibrary,listBooks,getBook,putBook,deleteBook,readPositions,positionFor,lastOpenId,rememberOpen,clearLastOpen,noteFor,writeNote,readBookmark,writeBookmark,BOOK_AMBIENT_KEY,AMBIENT_DUCK_GAIN,AMBIENT_GAIN_CEILING,AMBIENT_MODES,normalizeAmbientPrefs,loadAmbientPrefs,saveAmbientPrefs,ambientUserGain,applyAmbientMasterGain,setAmbientDuck,startAmbientMode,stopAmbientAudio,setAmbientMode,setAmbientVolume,resumeAmbientIfNeeded,SAMPLE_BOOK_ID,SAMPLE_BOOK_NAME,sampleReadingCount,sampleBookFromPacks,PDFJS_SCRIPT,PDFJS_WORKER,loadPdfjs,extractOutlineChapters,extractPagesText,bookFromPdf};\n})();if(typeof globalThis<\`u\`)globalThis.mpBook=mpBook;\n${bookUi}`;
  return `var mpPackA=${packA.trim()};var mpPackB=${packB.trim()};var mpOwnerReadings=${ownerReadings.trim()};var mpMaddy=${maddyCatalog.trim()};var mpVideoCatalog=${videoCatalog.trim()};globalThis.mpVideoCatalog=mpVideoCatalog;var mpMeditationCatalog=${meditationCatalog.trim()};var mpTtsAudio=${ttsCatalog};var mpProblemHubs=${problemHubs.trim()};var mpMensHealth=${mensHealthCatalog.trim()};var mpEvidenceGuidance=${evidenceGuidanceCatalog.trim()};var mpSpeakersCatalog=${speakersCatalog.trim()};var mpFeelingKits=${feelingKitsJson.trim()};if(typeof globalThis<\`u\`){globalThis.mpMensHealth=mpMensHealth;globalThis.mpEvidenceGuidance=mpEvidenceGuidance;globalThis.mpOwnerReadings=mpOwnerReadings;globalThis.mpProblemHubs=mpProblemHubs;globalThis.mpPackA=mpPackA;globalThis.mpFeelingKits=mpFeelingKits;globalThis.mpMaddy=mpMaddy;globalThis.mpMeditationCatalog=mpMeditationCatalog;}var mpReadings=(function(){${progress}\n${ownerHelpers}\n${openReadingSrc}\n${tags}\n${playback}\n${maddy}\n${cards}\n${coaches}\n${meditations}\n${ytDirectory}\n${emotions}\n${feelingMedia}\n${feelingKits}\n${share}\n${ttsVoices}\n${ttsMic}\n${ttsAudio}\n${maddyListen}\n${listenPlayer}\nreturn{PACK_A_ID,PACK_B_ID,PACK_A_TOTAL,PACK_A_CREDIT,PACK_A_PROGRESS_LINE,STORAGE_KEY,emptyProgress,normalizeProgress,parseProgressJson,orderedReadings,isDayUnlocked,nextIncomplete,canMarkDone,markReadingDone,packAComplete,dailyDefaultPackId,loadProgress,saveProgress,pickRandom,hasPlayableMediaUrl,isVideoPlayable,publishedLibrarySrc,overlayCatalogVideo,mergedLibraryVideos,videoCardCta,videoCardAriaLabel,videoDisplayTitle,videoDurationLabel,videoPresenterName,captionsDisclosure,captionsAvailable,featuredPlayableVideo,libraryCardModel,activateLibraryVideo,activateCoachCard,dispatchLibraryVideo,LIBRARY_OPEN_EVENT,MADDY_PACK_ID,MADDY_CORE_IDS,hasMaddyMediaUrl,isMaddyCompanionPlayable,maddyPublishedSrc,maddyDurationLabel,maddyCompanionVideos,videosForCoach,coachKeys,visibleCoachFields,isYoutubeOutboundUrl,isMeditationOpenable,meditationOpenUrl,meditationCtaLabel,MEDITATION_CATEGORY_IDS,meditationCategories,entriesForCategory,formatMeditationViews,categoryFillNote,directoryWatchUrl,directoryOpenUrl,isDirectoryOpenable,directoryCtaLabel,isDirectoryHeld,directorySpeakerIds,directorySpeakerNames,directoryTags,directoryHaystack,directoryDurationBand,directorySpeakerOptions,filterDirectoryEntries,directoryEmptyCopy,EMOTION_IDS,FEELING_EMOTIONS,FEELING_SUPPORT,EMOTION_ALIASES,BROWSE_SPEAKERS_LABEL,CURATED_VIDEO_LIMIT,normalizeEmotionId,emotionLabel,normalizeEmotionList,entryEmotions,entryMatchesEmotion,curatedVideosForEmotion,videosForIds,emotionBreadcrumb,emotionVideoCta,TAG_VOCAB,TAG_LABELS,TAG_ALIASES,PROBLEM_HUB_TAGS,AOD_FEELING_TAGS,FEELING_TO_TAGS,THEME_LABEL_TO_TAGS,SUPPORT_DISCLAIMER,formatTag,canonicalizeTag,normalizeTags,tagsForThemeLabel,tagsForFeeling,readingTags,readingHasAnyTag,readingsForTags,usedTags,supportUnlockMessage,applyControlledTags,VIDEO_DIRECTORY_LIMIT,itemTags,mediaForTags,mediaForFeeling,mediaSourceLabel,collectFeelingMedia,mindpalShareUrl,shareMindPalApp,MINDPAL_PAGES_URL,pickVoice,pickBrowserVoice,listPickerVoices,loadSavedVoiceURI,saveVoiceURI,speakBrowser,splitSpeakChunks,prepareSpeakChunks,micSupported,micUnsupportedCopy,micErrorCopy,createMicCapture,transcriptFromResult,isNeuralOrNatural,warmSpeechVoices,prerenderedAudioUrl,playAudioUrl,unwrapListenInput,createListenController,createAudioListenController,createSpeechListenController,buildSpeechTimeline,formatListenClock,formatListenRemaining,listenTimes,listenPointerRatio,chunkIndexAt,LISTEN_SKIP_SEC,upgradeSpeechToBlob,resolveListenAudioUrl,playMaddyClip,companionLinkedClip,effectiveListenPref,isMaddyVoicePref,MADDY_PREF_URI,MADDY_PREF_LABEL,TTS_RATE,TTS_PITCH,AOD_FEATURED_READING_ID,ownerReadingsCatalog,isOwnerReading,listOwnerReadings,findOwnerReading,featuredOwnerReadings,mergeOwnerReadings,ownerCompanionOpener,KIT_READING_LIMIT,KIT_BROWSE_TAG_LIMIT,KIT_SECTION_IDS,feelingKitsCatalog,canonicalizeFeelingKitId,findFeelingKitSpec,curatedReadingIdsForHub,chapterTags,chapterTagChips,resolveKitReadings,feelingKit,OPEN_READING_KEY,OPEN_READING_EVENT,openReading,findReadingById,peekOpenReadingId,takeOpenReadingId}})();var mpCalendar,mpFaith,mpProfile,mpTodaySteps,mpWins,mpProblems,mpNav,mpTeamRitual,mpIndividualGrowth,mpCompanion,mpReflect,mpAppointment;(function(){${ux}\n${themeMap}\n${ownerHelpers}\n${mensHealth}\n${evidenceGuidance}\n${problems}
mpCalendar={civilDateKey,formatCivilDate,partOfDay,isGregorianLeap,gregorianToCoptic,formatCopticDate,formatCopticLabel,COPTIC_MONTHS};
mpFaith={COPTIC_PREF_KEY,WELCOME_IMAGE_PREF_KEY,ACCOUNTS_KEY,SESSION_KEY,FAITH_CHANGE_EVENT,FAITH_STANCE_RELIGIOUS,FAITH_STANCE_SECULAR,PRIMARY_TRADITIONS,OTHER_TRADITIONS,ALL_TRADITIONS,TRADITION_LANES,UNIVERSAL_FALLBACK,sessionPreferences,findTradition,traditionIdFromPrefs,traditionLabel,isChristianTradition,hasFaithPreference,isSecularPrefs,shouldShowFaithModules,shouldShowMorningPrayer,prefsFromChoice,faithSummary,updateSessionPreferences,setSessionFaithPrefs,lanesForTradition,verseEyebrow,pickMorningVerse,isCopticDateEnabled,setCopticDateEnabled,isWelcomeImageEnabled,setWelcomeImageEnabled};
mpProfile={AGE_BANDS,GENDERS,FACTS_DISCLAIMER,normalizeAgeBand,normalizeGender,isYouthBand,ageBandLabel,genderLabel,hasProfileDemographics,profileSummary,prefsFromProfileChoice,factsForProfile,factsAreYouthSafe,setSessionProfilePrefs,sessionProfilePreferences,PROFILE_STORAGE_KEY,PROFILE_CHANGE_EVENT,PROFILE_ROUTE,LIKE_LABEL_MAX,BOOK_TITLE_MAX,BOOK_AUTHOR_MAX,GOAL_TITLE_MAX,GOAL_NOTE_MAX,AVATAR_COLORS,AVATAR_SHAPES,AVATAR_EMOJIS,STARTER_LIKES,GOAL_TIMEFRAMES,SIGNED_COACHES,PROFILE_SECTIONS,emptyAvatar,emptyProfile,profileInitials,findAvatarColor,findAvatarShape,normalizeAvatar,avatarStyle,avatarFace,normalizeLikeLabel,normalizeCustomLike,listLikeOptions,likeLabel,normalizeBook,timeframeLabel,normalizeGoal,listProfileSpeakers,speakerIdsAllowed,normalizeProfile,parseProfileJson,loadProfile,saveProfile,notifyProfileChange,persistProfile,setAvatar,toggleLike,addCustomLike,toggleSpeaker,addBook,removeBook,addGoal,setGoalDone,removeGoal,sectionSummary};
mpTodaySteps={STEPS_STORAGE_KEY,STEP_IDS,STEP_META,HUB_FLOW_LINE,BANDS,emptyDay,normalizeDay,parseDayJson,loadDay,saveDay,markStep,nextStepId,stepStatus,stepRowLabel,hubStepCaption,bandForStep};
mpWins={WINS_STORAGE_KEY,WIN_TEXT_MAX,WIN_OF_THE_DAY_TITLE,WIN_OF_THE_DAY_EYEBROW,WIN_OF_THE_DAY_LEDE,WIN_OF_THE_DAY_EMPTY,emptyWinsDay,normalizeWin,emptyWinsStore,normalizeWinsStore,parseWinsJson,loadWinsStore,saveWinsStore,winsForDate,addWin,removeWin};
mpProblems={PROBLEM_TAG_IDS,THEME_LABEL_TO_TAGS,MOTHER_SUPPORT_TAGS,AOD_SUPPORT_TAGS,MENS_SUPPORT_TAGS,GROWTH_THEME_TAGS,PROBLEM_GROUPS,normalizeProblemTags,feelingTagsToProblemTags,readingProblemTags,listProblems,listProblemGroups,problemGroupId,isGrowthProblem,findProblem,readingsForProblem,motherSupportTags,aodSupportTags,mensSupportTags,growthThemeTags,videoTagForProblem,PROBLEM_VIDEO_TAGS,videoProblemTags,videosForProblem,maddyForProblem,takeCompanionPrompt,saveCompanionPrompt,selectedProblemId,selectProblem,COMPANION_PROMPT_KEY,SELECTED_PROBLEM_KEY,MOTHERS_PROBLEM_ID,MOTHERS_ROUTE,MOTHERS_READING_LIMIT,MOTHERS_MADDY_IDS,MOTHERS_MEDITATION_IDS,isMothersProblem,AOD_PROBLEM_ID,AOD_ROUTE,AOD_READING_LIMIT,AOD_MADDY_IDS,AOD_MEDITATION_IDS,isAodProblem,MENS_HEALTH_PROBLEM_ID,MENS_HEALTH_ROUTE,MENS_HEALTH_READING_LIMIT,MENS_HEALTH_MADDY_IDS,isMensHealthProblem,dedicatedProblemRoute,mensHealthStats,mensHealthYoutube,mensHealthHelplines,mensHealthQueuedVideos,featuredMensHelpline,isMensHealthYoutubeUrl,AOD_FEATURED_READING_ID,isOwnerReading,featuredOwnerReadings,ownerCompanionOpener,listOwnerReadings,HUB_ACCORDION_ORDER,EVIDENCE_GUIDANCE_DISCLAIMER,EVIDENCE_GUIDANCE_TEMPLATE,TRUSTED_EVIDENCE_HOSTS,emptyEvidenceGuidance,evidenceCatalog,evidenceDisclaimer,evidenceGuidanceFor,listEvidenceNotes,listGuidanceBooks,isTrustedEvidenceUrl,guidanceCountsOk,evidenceNoteSourcesTrusted,APPOINTMENT_COMPANION_PROMPT,appointmentCompanionPrompt};
mpNav={HOME_ROUTE,HOME_EVENT,homeHash,goHome};
mpTeamRitual={TEAM_RITUAL_STORAGE_KEY,TEAM_RITUAL_CHANGE_EVENT,TEAM_RITUAL_TITLE,TEAM_RITUAL_SHORT,TEAM_RITUAL_EYEBROW,TEAM_RITUAL_OPEN,TEAM_RITUAL_LEDE,TEAM_RITUAL_HINT,TEAM_RITUAL_BREATH_HERO,TEAM_RITUAL_FLOW,TEAM_RITUAL_VERSE_HERO,TEAM_RITUAL_CHAPTER_SUMMARY,TEAM_RITUAL_BREATH_ID,TEAM_RITUAL_BREATH_SRC,RITUAL_STEP_IDS,RITUAL_STEPS,PEACEFUL_THEME_LABELS,HEAVY_RITUAL_TAGS,SECULAR_VERSE_LANES,SECULAR_TRADITIONS,TRADITION_TO_LANE,BREATH_DURATION_SEC,BREATH_COUNT_SEC,BREATH_INHALE_COUNTS,BREATH_HOLD_COUNTS,BREATH_EXHALE_COUNTS,BREATH_SETTLE_SEC,BREATH_CYCLE_SEC,stableIndex,peacefulReadings,pickPeacefulReading,verseLaneForTradition,verseEntriesForLane,pickRitualVerse,ritualTradition,ritualChapterTarget,breathClip,breathClipSrc,formatBreathClock,breathCueAt,emptyRitual,normalizeRitual,parseRitualJson,loadRitual,saveRitual,ritualStepStatus,canOpenVerse,canOpenReading,canOpenRitualStep,markRitual,nextRitualStep,ritualReading,notifyRitualChange};
mpIndividualGrowth={GROWTH_STORAGE_KEY,GROWTH_CHANGE_EVENT,GROWTH_TITLE,GROWTH_SHORT,GROWTH_EYEBROW,GROWTH_OPEN,GROWTH_LEDE,GROWTH_HINT,GROWTH_FLOW,GROWTH_BREATH_HERO,GROWTH_VERSE_HERO,GROWTH_READING_HERO,GROWTH_WIN_HERO,GROWTH_CHAPTER_SUMMARY,GROWTH_STEP_IDS,GROWTH_STEPS,emptyGrowth,normalizeGrowth,parseGrowthJson,loadGrowth,saveGrowth,growthStepStatus,canOpenGrowthVerse,canOpenGrowthReading,canOpenGrowthWin,canOpenGrowthStep,markGrowth,nextGrowthStep,growthReading,notifyGrowthChange};
mpCompanion={COMPANION_POLICY_VERSION,DEFAULT_PAGES_BASE,BASE_STORAGE_KEY,BASE_WINDOW_KEY,SAFETY_STATES,LIVE_LABEL,DEMO_LABEL,SUGGESTED_COMPANION_BASE,DEMO_HOLD_NOTE,UNAVAILABLE_NOTE,companionFailureCopy,companionStatusCopy,normalizeCompanionBase,storedCompanionBase,persistCompanionBase,joinCompanionUrl,companionBaseFromSearch,resolveCompanionBase,companionUrl,parseCompanionStatus,fetchCompanionStatus,parseCompanionReply,buildChatRequest,sendCompanionChat};
mpReflect={REFLECT_LANE,CLINICAL_DISCLAIMER,REFLECT_SYSTEM_PROMPT,CRISIS_COPY,detectCrisisIntent,safetyStateForText,THREAD_STORAGE_KEY,MESSAGE_TEXT_MAX,emptyThread,normalizeMessage,normalizeThread,parseThreadJson,loadThread,saveThread,clearThread,appendMessage,downloadableTranscript,canSendText,shouldSendOnKey};
mpAppointment={APPOINTMENT_LANE,APPOINTMENT_THREAD_STORAGE_KEY,APPOINTMENT_DISCLAIMER,APPOINTMENT_SYSTEM_PROMPT};
})();var mpCompanionDemo=(function(){${companionDemo}
return{COMPANION_BASE_KEY,DEFAULT_COMPANION_BASE,COMPANION_POLICY_VERSION,HELP_ROUTE,REFLECT_ROUTE,BREATH_EXERCISE_ID,DEMO_BANNER,LIVE_BANNER,CHECKING_BANNER,THINKING_LABEL,LIVE_BADGE_NOTE,PRACTICE_BADGE_NOTE,CHOICES,INTENT_PANELS,CRISIS_LINES,PRACTICE_CARDS,choiceById,isCrisisChoice,practiceCardById,emptyCompanionState,companionBanner,noteLiveReply,setCompanionLive,applyChoice,revealPractices,activatePracticeCard,openLiveChat,primaryCtaLabel,normalizeCompanionBase,companionBaseLookup,resolveCompanionBaseUrl,saveCompanionBase,companionStatusUrl,companionChatUrl,parseCompanionStatus,probeCompanionStatus,companionChatPayload,parseCompanionReply};
})();${ytSection}${sidebarShare}${voicePicker}${listenUi}${feelingsUi}${companionBaseUi}${reflectUi}${appointmentUi}${companionDemoUi}${bookRuntime}`;
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

  next = patchYtDirectory(next);

  next = replaceOnce(
    next,
    "t===`verse`&&(0,A.jsx)(Rt,{}),t===`reading`&&(0,A.jsx)(bt,{}),t===`videos`&&",
    "(0,A.jsx)(mpYtMeditationsSection,{}),t===`verse`&&(0,A.jsx)(mpMorningVerse,{}),t===`reading`&&(0,A.jsx)(bt,{}),t===`videos`&&",
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
    "function dt(e,t){let x=mpReadings.unwrapListenInput(e);if(!String(x.text||``).trim())return t?.(),()=>{};if(lt){let p=lt;lt=null;p()}let n=!1,ctrl,a=()=>{if(!n){n=!0;try{ctrl.stop()}catch{}if(lt===a)lt=null}};ctrl=mpReadings.createListenController(x,{onEnd:()=>{if(!n){n=!0;if(lt===a)lt=null;t?.()}}});lt=a;Promise.resolve(ctrl.play()).then(ok=>{if(ok===!1){a();t?.()}}).catch(()=>{a();t?.()});return a}",
    "tts-listen-order",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>s(c),children:a?`Pause`:`Listen`})",
    "(0,A.jsx)(mpListenPlayer,{text:c,label:`Verse`}),(0,A.jsx)(mpVoicePicker,{}),(0,A.jsx)(mpMaddyListenButtons,{})",
    "verse-voice-picker",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)(`button`,{className:`secondary`,onClick:()=>E(e.weeklyFocus.text),children:w?`Pause`:`Listen`})",
    "(0,A.jsx)(mpListenPlayer,{text:e.weeklyFocus.text,label:`Focus`}),(0,A.jsx)(mpVoicePicker,{}),(0,A.jsx)(mpMaddyListenButtons,{})",
    "focus-voice-picker",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)(`button`,{className:`primary`,type:`button`,disabled:!e.trim()||n,onClick:()=>i(e),children:`Speak`}),(0,A.jsx)(`button`,{className:`secondary`,type:`button`,disabled:!n,onClick:a,children:`Stop`})",
    "(0,A.jsx)(mpListenPlayer,{text:e,label:`Note`}),(0,A.jsx)(mpVoicePicker,{}),(0,A.jsx)(mpMaddyListenButtons,{})",
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
    "a.map((t,n)=>{let o=mpReadings.libraryCardModel(t);return(0,A.jsxs)(`button`,{type:`button`,className:`video-card${o.playable?``:` is-draft`}`,\"aria-label\":o.ariaLabel,onClick:()=>mpReadings.activateLibraryVideo(t,e),onKeyDown:n=>{(n.key===`Enter`||n.key===` `)&&(n.preventDefault(),mpReadings.activateLibraryVideo(t,e))},children:[(0,A.jsxs)(`div`,{className:`video-cover tone-${n%3}`,children:[o.playable?null:(0,A.jsx)(`span`,{className:`video-number`,children:t.id}),(0,A.jsx)(`img`,{className:`cover-photo`,src:[Ge(`/journal-scene.jpg`),Ge(`/welcome-hike-640.webp`),Ge(`/friends-scene.jpg`),Ge(`/food-scene.jpg`)][n%4],alt:``,loading:`lazy`}),o.playable?(0,A.jsx)(`span`,{className:`play-dot`,children:(0,A.jsx)(rn,{size:18})}):null,(0,A.jsx)(`span`,{className:`duration`,children:o.durationLabel||`${Math.round(t.targetDurationSeconds/30)/2} min target`})]}),(0,A.jsxs)(`div`,{className:`video-copy`,children:[(0,A.jsx)(`span`,{className:`card-type`,children:o.cardType||(o.playable?`READY TO PLAY`:t.specialistReviewRequired?`SPECIALIST REVIEW REQUIRED`:`OPEN DRAFT`)}),(0,A.jsx)(`h3`,{children:o.title}),(0,A.jsxs)(`span`,{className:`card-link${o.playable?``:` open-draft`}`,children:[o.cta,` `,(0,A.jsx)(nn,{size:16})]})]})]},t.id)})";
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

  next = replaceOnce(
    next,
    "{id:`V02`,assetIdentifier:`MP-V02-en-AU-v1.1`,title:`A gentle start to a difficult morning`,language:`en-AU`,scriptVersion:`1.1`,targetDurationSeconds:60,actualDurationSeconds:null,clinicalStatus:`DRAFT`,reviewer:null,approvedAt:null,reviewDue:`2026-12-05`,rightsStatus:`PENDING`,presenterRightsRef:null,publicationStatus:`UNPRODUCED`,sourceAssetId:null,scriptHash:`ea5a12ded6601da7179043b43c944cf9591af641433819671f80839b1e8de607`,assetHash:null,videoUrl:null,captionUrl:null",
    "{id:`V02`,assetIdentifier:`MP-V02-en-AU-v1.1b`,title:`A gentle start to a difficult morning`,language:`en-AU`,scriptVersion:`1.1`,targetDurationSeconds:45,actualDurationSeconds:45,clinicalStatus:`APPROVED`,reviewer:null,approvedAt:null,reviewDue:`2026-12-05`,rightsStatus:`CLEARED`,presenterRightsRef:null,publicationStatus:`PUBLISHED`,sourceAssetId:null,scriptHash:`ea5a12ded6601da7179043b43c944cf9591af641433819671f80839b1e8de607`,assetHash:null,videoUrl:`/mindpal/videos/v02/MP-V02-en-AU-v1.1b-web.mp4`,captionUrl:null",
    "vendor-v02-playable",
  );
  next = replaceOnce(
    next,
    "placeholderLabel:`Media placeholder — no HeyGen video generated`,fallbackContentId:null,publicEligible:!1,outline:`Make room for a difficult morning.",
    "placeholderLabel:`Ready to play`,presenter:`Denyse`,fallbackContentId:null,publicEligible:!0,outline:`Make room for a difficult morning.",
    "vendor-v02-public-eligible",
  );
  next = replaceOnce(
    next,
    "a=li.videos.filter(e=>e.title.toLowerCase().includes(r.toLowerCase()))",
    "a=mpReadings.mergedLibraryVideos(li.videos,typeof mpVideoCatalog<`u`?mpVideoCatalog:null).filter(e=>e.title.toLowerCase().includes(r.toLowerCase()))",
    "explore-merge-catalog",
  );
  next = replaceOnce(
    next,
    "video:li.videos.find(e=>e.id===b)",
    "video:mpReadings.mergedLibraryVideos(li.videos,typeof mpVideoCatalog<`u`?mpVideoCatalog:null).find(e=>e.id===b)",
    "vendor-modal-merge-catalog",
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
  if (!next.includes("/mindpal/videos/v02/MP-V02-en-AU-v1.1b-web.mp4")) {
    throw new Error("V02 playable src missing from bundle");
  }
  if (!next.includes("playsInline:!0")) {
    throw new Error("native video playsInline missing from bundle");
  }
  if (!next.includes(`type:\`button\`,className:\`coach-card\``)) {
    throw new Error("coach cards are not activatable buttons");
  }
  if (
    next.includes("look_id ·") ||
    next.includes("className:`coach-look-id`") ||
    next.includes(`"data-look-id"`)
  ) {
    throw new Error("look_id must stay out of visible coach UI");
  }
  if (!next.includes("Related drafts")) {
    throw new Error("coach sheet must list related drafts");
  }
  if (!next.includes("Captions are not on this clip yet")) {
    throw new Error("V02 captions disclosure missing");
  }
  if (!next.includes("mpV02Teaser") || !next.includes("Words from this clip")) {
    throw new Error("V02 Today teaser or player words heading missing");
  }
  if (!next.includes("isNeuralOrNatural") || !next.includes("Auto (warmest English)")) {
    throw new Error("Neural/Natural Listen pick or Voice picker missing");
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
  if (!next.includes("feelingKit") || !next.includes("mpFeelingKitAccordion") || !next.includes("Evidence & guidance")) {
    throw new Error("curated feeling kit accordion missing");
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
  if (!next.includes("function mpListenPlayer(") || !next.includes("Skip back 8 seconds") || !next.includes("mp-listen-handle")) {
    throw new Error("Listen scrubber missing");
  }
  if (next.includes("()=>{m&&m()}")) {
    throw new Error("Peaceful reading Listen is still cancelled on re-render");
  }
  if (!next.includes("label:`Peaceful reading`")) {
    throw new Error("Peaceful reading Listen player missing");
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
  if (!next.includes("filterDirectoryEntries") || !next.includes("directoryOpenUrl")) {
    throw new Error("YouTube directory search/open helpers missing");
  }
  if (!next.includes("mp-yt-dir-search") || !next.includes("youtube-speaker-filter")) {
    throw new Error("YouTube directory search form missing");
  }
  if (!next.includes("type:`submit`") || !next.includes("children:`Search`")) {
    throw new Error("YouTube directory Search button missing");
  }
  if (next.includes("This draft preview has no videos cleared for ordinary release")) {
    throw new Error("empty draft-preview directory copy must not remain");
  }
  return next;
}

function patchYtDirectory(source) {
  const inject = readFileSync(join(root, "src/patches/yt-directory.inject.js"), "utf8").trim();
  let next = source;
  const oldGate =
    "function ue(e,t,n=[],r=Date.now()){return!n.includes(e.id)&&e.reviewStatus!==`withheld`&&!e.editorialHold&&e.selection?.state!==`hold`&&e.availability===`checked`&&ce(e.checkedAt)&&Date.parse(e.checkedAt)<=r&&!!e.evidenceUrl&&!!w(e.url)&&(le(e,r)||t===`draft-review`)}";
  const newGate =
    "function ue(e,t,n=[],r=Date.now()){return mpReadings.isDirectoryOpenable(e)}";
  if (next.includes(oldGate)) {
    next = replaceOnce(next, oldGate, newGate, "yt-directory-open-gate");
  } else if (!next.includes(newGate) && !next.includes("mpReadings.isDirectoryOpenable(e)")) {
    throw new Error("YouTube directory open-gate anchor missing");
  }
  if (next.includes("/*mp-yt-dir-start*/")) {
    return replaceMarkedOrOnce(
      next,
      "/*mp-yt-dir-start*/",
      "/*mp-yt-dir-end*/",
      inject,
      "",
      "yt-directory",
    );
  }
  const start = next.indexOf(
    "function _e({initialTopic:e=``,entries:t=T,onPractice:n,onDiary:r,onHelp:i})",
  );
  const end = next.indexOf(
    "function ve({onDiary:e,onPractice:t,onLeave:n,onDirectory:r})",
  );
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("YouTube directory page anchor missing");
  }
  return `${next.slice(0, start)}/*mp-yt-dir-start*/${inject}/*mp-yt-dir-end*/${next.slice(end)}`;
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
  const ux = [
    readFileSync(join(root, "src/patches/owner-ux.inject.js"), "utf8").trim(),
    readFileSync(join(root, "src/patches/profile.inject.js"), "utf8").trim(),
  ].join("\n");
  const oldRr =
    "function Rr({name:e,onOpenVerse:t,onOpenFocus:n,onWriteJournal:r}){let i=Lr();return(0,A.jsxs)(`section`,{className:`today-shortcuts`,\"aria-label\":`Today shortcuts`,children:[(0,A.jsxs)(`div`,{className:`today-greeting`,children:[(0,A.jsx)(`p`,{className:`eyebrow`,children:`TODAY`}),(0,A.jsx)(`h1`,{children:e?`Good ${i}, ${e}.`:`Good ${i}.`}),e&&(0,A.jsxs)(`span`,{className:`tag device-tag`,children:[e,` · on this device`]})]}),(0,A.jsxs)(`div`,{className:`today-shortcut-grid`,children:[(0,A.jsxs)(`button`,{className:`shortcut-card`,onClick:t,children:[(0,A.jsx)(Sn,{size:20,\"aria-hidden\":`true`}),(0,A.jsx)(`span`,{className:`card-type`,children:`TODAY’S VERSE`}),(0,A.jsx)(`strong`,{children:`Read today’s verse`}),(0,A.jsxs)(`span`,{className:`card-link`,children:[`Open `,(0,A.jsx)(nn,{size:16})]})]}),(0,A.jsxs)(`button`,{className:`shortcut-card`,onClick:n,children:[(0,A.jsx)(sn,{size:20,\"aria-hidden\":`true`}),(0,A.jsx)(`span`,{className:`card-type`,children:`FOCUS`}),(0,A.jsx)(`strong`,{children:`What’s on your mind today?`}),(0,A.jsxs)(`span`,{className:`card-link`,children:[`Open Focus `,(0,A.jsx)(nn,{size:16})]})]}),(0,A.jsxs)(`button`,{className:`shortcut-card`,onClick:r,children:[(0,A.jsx)(rn,{size:20,\"aria-hidden\":`true`}),(0,A.jsx)(`span`,{className:`card-type`,children:`JOURNAL`}),(0,A.jsx)(`strong`,{children:`Write a quick note`}),(0,A.jsxs)(`span`,{className:`card-link`,children:[`Open Journal `,(0,A.jsx)(nn,{size:16})]})]})]})]})}";

  let next = source;
  if (next.includes("function mpSignInPage(")) {
    const startGoHome = next.indexOf("function mpGoHome(");
    const startNotify = next.indexOf("function mpNotifySession()");
    const start = startGoHome >= 0 ? startGoHome : startNotify;
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
    "createdAt:new Date().toISOString(),preferences:{morningVerseEnabled:!0,morningPrayerEnabled:!0,tradition:`Christianity`}",
    "createdAt:new Date().toISOString(),preferences:{morningVerseEnabled:!1,morningPrayerEnabled:!1,faithStance:``,tradition:``,traditionId:``,ageBand:``,gender:``}",
    "create-empty-faith-prefs",
  );
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
    `"route.today":\`Today\`,"route.profile":\`Profile\`,"route.readings":\`Readings\`,"route.teamMorning":\`Team morning settle\`,"route.later":\`Later\`,"route.evening":\`Before you sleep\`,"route.problem":\`Help with this\`,"route.mothers":\`Struggling mothers\`,"route.aod":\`Drugs & alcohol\`,"route.mensHealth":\`Men's Health\`,"route.appointment":\`Appointment Questions\`,"route.explore":\`Explore\`,"route.book":\`Book\``,
    "i18n-routes",
  );
  next = replaceOnce(
    next,
    `"route.reflect":\`Reflect\``,
    `"route.reflect":\`Talk with MindPal\``,
    "i18n-reflect-name",
  );
  next = replaceOnce(
    next,
    "Ii=[`Feelings`,`YouTube directory`,`Today`,`Explore`,`My diary`,`Focus`,`Companion`,",
    "Ii=[`Feelings`,`YouTube directory`,`Today`,`Profile`,`Readings`,`Team morning`,`Later`,`Evening`,`Problem`,`Struggling mothers`,`Drugs & alcohol`,`Mens health`,`Explore`,`My diary`,`Focus`,`Companion`,`Appointment Questions`,`Book`,",
    "hash-routes",
  );
  next = replaceOnce(
    next,
    "Li={Today:`route.today`,Explore:`route.explore`,",
    "Li={Today:`route.today`,Profile:`route.profile`,Readings:`route.readings`,\"Team morning\":`route.teamMorning`,Later:`route.later`,Evening:`route.evening`,Problem:`route.problem`,\"Struggling mothers\":`route.mothers`,\"Drugs & alcohol\":`route.aod`,\"Mens health\":`route.mensHealth`,\"Appointment Questions\":`route.appointment`,Explore:`route.explore`,Book:`route.book`,",
    "breadcrumb-routes",
  );

  next = replaceOnce(
    next,
    "onOpenVerse:()=>requestAnimationFrame(()=>document.getElementById(`today-verse`)?.scrollIntoView({behavior:`smooth`,block:`start`})),onOpenFocus:()=>I(`Focus`),onWriteJournal:()=>{C(`What’s on my mind right now…`),I(`My diary`)}",
    "onOpenVerse:()=>I(`Readings`),onOpenFocus:()=>I(`Focus`),onWriteJournal:()=>{C(`What’s on my mind right now…`),I(`My diary`)},onOpenLater:()=>I(`Later`),onOpenEvening:()=>I(`Evening`),onAddWin:()=>{C(`A small win today: `),I(`My diary`)},onOpenMaddy:()=>I(`Explore`),onOpenProblem:e=>I(mpDedicatedProblemRoute(e)),onOpenTeamRitual:()=>I(`Team morning`),onOpenReflect:()=>I(`Reflect`),onOpenAppointment:()=>I(`Appointment Questions`)",
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
  next = exciseVendorReflectPreview(next);

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
    "t===`Profile`&&(0,A.jsx)(mpProfilePage,{}),t===`Book`&&(0,A.jsx)(mpYourBooksPage,{}),t===`Readings`&&(0,A.jsx)(mpReadingsPage,{}),t===`Team morning`&&(0,A.jsx)(mpTeamRitualPage,{onToday:()=>I(`Today`),onReadings:()=>I(`Readings`)}),t===`Later`&&(0,A.jsx)(mpLaterPage,{onExercise:y,onFocus:()=>I(`Focus`)}),t===`Evening`&&(0,A.jsx)(mpEveningPage,{onJournal:()=>{C(`Before sleep, I noticed…`),I(`My diary`)}}),t===`Focus`&&(0,A.jsx)(`div`,{className:`mp-lane mp-lane-focus`,children:(0,A.jsx)(Hr,{onExercise:y,onDiary:e=>{C(e),I(`My diary`)},onHelp:()=>I(`Get support`),onCompanion:()=>I(`Companion`)})}),t===`My diary`&&(0,A.jsxs)(`div`,{className:`mp-lane mp-lane-journal`,children:[(0,A.jsx)(mpWinsPanel,{variant:`journal`}),(0,A.jsx)(Yi,{",
    "lane-pages",
  );
  next = replaceOnce(
    next,
    "initialPrompt:S,onHelp:()=>I(`Get support`)}),t===`Companion`&&",
    "initialPrompt:S,onHelp:()=>I(`Get support`)})]}),t===`Problem`&&(0,A.jsx)(mpProblemHubPage,{onOpenVideo:x,onCompanion:()=>I(`Companion`),onJournal:e=>{C(e),I(`My diary`)},onExplore:()=>I(`Readings`),onSpeakers:()=>I(`Explore`),onAddWin:()=>{C(`A small win today: `),I(`My diary`)},onHelp:()=>I(`Get support`),onWomen:()=>I(`Women’s wellbeing`)}),t===`Struggling mothers`&&(0,A.jsx)(mpMothersHubPage,{onCompanion:()=>I(`Companion`),onJournal:e=>{C(e),I(`My diary`)},onExplore:()=>I(`Readings`),onAddWin:()=>{C(`A small win amid caring for others: `),I(`My diary`)},onHelp:()=>I(`Get support`),onWomen:()=>I(`Women’s wellbeing`)}),t===`Drugs & alcohol`&&(0,A.jsx)(mpAodHubPage,{onCompanion:()=>I(`Companion`),onJournal:e=>{C(e),I(`My diary`)},onExplore:()=>I(`Readings`),onAddWin:()=>{C(`A small, honest win today: `),I(`My diary`)},onHelp:()=>I(`Get support`)}),t===`Mens health`&&(0,A.jsx)(mpMensHealthHubPage,{onCompanion:()=>I(`Companion`),onJournal:e=>{C(e),I(`My diary`)},onExplore:()=>I(`Readings`),onAddWin:()=>{C(`A way I showed up today: `),I(`My diary`)},onHelp:()=>I(`Get support`)}),t===`Companion`&&",
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
    "(0,A.jsx)(`p`,{className:`lede`,children:`Three quiet places to look: a verse, a short reading, or a video. Looking for your diary? That’s moved to the Journal tab.`}),(0,A.jsx)(mpYourBooksCard,{}),(0,A.jsx)(mpExploreFeelingChoice,{onSpeakers:()=>n(`videos`)}),(0,A.jsx)(mpProblemHubList,{onOpen:e=>I(mpDedicatedProblemRoute(e))}),(0,A.jsx)(MpWatchWithMaddy,{}),",
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
    "t===`Companion`&&(0,A.jsx)(Xi,{onHelp:()=>I(`Get support`),onExercise:y})",
    "t===`Companion`&&(0,A.jsx)(mpCompanionPage,{onHelp:()=>I(`Get support`),onExercise:y,onReflect:()=>I(`Reflect`)})",
    "companion-interactive-page",
  );
  next = replaceOnce(
    next,
    "C=[[`sad`,`Sad or low`],[`anxious`,`Anxious or worried`],[`angry`,`Angry or frustrated`],[`overwhelmed`,`Overwhelmed or stressed`],[`lonely`,`Lonely or disconnected`],[`guilty`,`Guilty or ashamed`],[`numb`,`Numb or flat`],[`unsure`,`Not sure`]]",
    "C=[[`sad`,`Sad or low`],[`anxious`,`Anxious or worried`],[`angry`,`Angry or frustrated`],[`overwhelmed`,`Overwhelmed or stressed`],[`lonely`,`Lonely or disconnected`],[`guilty`,`Guilty or ashamed`],[`numb`,`Numb or flat`],[`unsure`,`Not sure`],[`mothers`,`Struggling mothers`],[`aod`,`Drugs & alcohol`],[`mens-health`,`Men's Health`]]",
    "feelings-mothers-option",
  );
  next = replaceOnce(
    next,
    'unsure:`Not knowing how to describe this is an acceptable answer.`',
    "unsure:`Not knowing how to describe this is an acceptable answer.`,mothers:`You can be a loving mother and still need a quiet corner. This is not a diagnosis.`,aod:`Craving or shame around drink or other substances can sit here. This is not detox and not a diagnosis.`,\"mens-health\":`There's nothing wrong with being your best self. This is optional company, not a diagnosis.`",
    "feelings-mothers-quote",
  );
  next = replaceOnce(
    next,
    "a===`adult`&&t===`Feelings`&&(0,A.jsx)(ve,{onDiary:()=>I(`My diary`),onPractice:()=>y(`E01`),onLeave:()=>I(`Today`),onDirectory:()=>I(`YouTube directory`),onSpeakers:()=>I(`Explore`)})",
    "a===`adult`&&t===`Feelings`&&(0,A.jsxs)(A.Fragment,{children:[(0,A.jsx)(mpMothersFeelingsChip,{onOpen:()=>{mpOpenProblem(`mothers`),I(`Struggling mothers`)}}),(0,A.jsx)(mpAodFeelingsChip,{onOpen:()=>{mpOpenProblem(`aod`),I(`Drugs & alcohol`)}}),(0,A.jsx)(mpMensHealthFeelingsChip,{onOpen:()=>{mpOpenProblem(`mens-health`),I(`Mens health`)}}),(0,A.jsx)(ve,{onDiary:()=>I(`My diary`),onPractice:()=>y(`E01`),onLeave:()=>I(`Today`),onDirectory:()=>I(`YouTube directory`),onSpeakers:()=>I(`Explore`),onCompanion:()=>I(`Companion`),onHelp:()=>I(`Get support`),onJournal:e=>{C(e),I(`My diary`)}})]})",
    "feelings-mothers-chip",
  );
  next = replaceOnce(
    next,
    "t===`Women’s wellbeing`&&(0,A.jsx)(Zi,{onDiary:e=>{C(e),I(`My diary`)},onExercise:y})",
    "t===`Women’s wellbeing`&&(0,A.jsxs)(A.Fragment,{children:[(0,A.jsx)(Zi,{onDiary:e=>{C(e),I(`My diary`)},onExercise:y}),(0,A.jsx)(mpMothersWomenCard,{onOpen:()=>{mpOpenProblem(`mothers`),I(`Struggling mothers`)}})]})",
    "women-mothers-card",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)($r,{active:t===`Body, food and wellbeing`,onHelp:()=>I(`Get support`)}),(0,A.jsx)(ti,{active:t===`Reflect`,onHelp:()=>I(`Get support`),onDiary:()=>I(`My diary`)})",
    "(0,A.jsx)($r,{active:t===`Body, food and wellbeing`,onHelp:()=>I(`Get support`)}),t===`Body, food and wellbeing`&&(0,A.jsx)(mpAppointmentCompanionCard,{onCompanion:()=>I(`Companion`)}),(0,A.jsx)(ti,{active:t===`Reflect`,onHelp:()=>I(`Get support`),onDiary:()=>I(`My diary`)})",
    "appointment-companion-entry",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)(`textarea`,{id:`companion-message`,value:o,maxLength:2e3,onChange:e=>s(e.target.value),placeholder:x?`Type a message for the AI companion, or leave blank for the demo…`:`Use sample text only…`})",
    "(0,A.jsx)(`textarea`,{id:`companion-message`,\"data-mp-cta\":`companion-message`,value:o,maxLength:2e3,onChange:e=>s(e.target.value),onKeyDown:e=>{(e.key===`Enter`&&(e.metaKey||e.ctrlKey))&&(e.preventDefault(),D())},placeholder:x?`Type a message for the AI companion, or leave blank for the demo…`:`Use sample text only…`})",
    "companion-send-enter",
  );
  next = replaceOnce(
    next,
    "(0,A.jsxs)(`button`,{className:`primary`,disabled:g,onClick:D,children:[g?x&&o.trim()?`Sending to the AI companion…`:`Preparing fixed choices…`:x&&o.trim()?`Send to AI companion`:`Show practice choices`",
    "(0,A.jsxs)(`button`,{className:`primary`,type:`button`,disabled:g,onClick:D,\"data-mp-cta\":`companion-send`,children:[g?x&&o.trim()?`Sending to the AI companion…`:`Preparing fixed choices…`:x&&o.trim()?`Send to AI companion`:`Show practice choices`",
    "companion-send-cta",
  );
  next = replaceOnce(
    next,
    "{name:`Women’s wellbeing`,icon:fn}]",
    "{name:`Women’s wellbeing`,icon:fn},{name:`Struggling mothers`,icon:fn},{name:`Drugs & alcohol`,icon:fn},{name:`Mens health`,icon:fn},{name:`Appointment Questions`,icon:fn}]",
    "sidebar-mothers-nav",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)($r,{active:t===`Body, food and wellbeing`,onHelp:()=>I(`Get support`)})",
    "(0,A.jsx)($r,{active:t===`Body, food and wellbeing`||t===`Appointment Questions`,onHelp:()=>I(`Get support`)})",
    "appointment-route-alias",
  );
  next = replaceOnce(
    next,
    "zi=[{name:`Feelings`,icon:fn},{name:`YouTube directory`,icon:vn}",
    "zi=[{name:`Feelings`,icon:fn},{name:`My diary`,icon:rn},{name:`YouTube directory`,icon:vn}",
    "sidebar-journal-nav",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)(`h1`,{children:`Body, food and wellbeing`}),(0,A.jsx)(`p`,{className:`lede`,children:`Struggling is not a personal failure.",
    "(0,A.jsx)(`h1`,{children:`Body, food and wellbeing`}),(0,A.jsx)(mpAppointmentChat,{onHelp:t}),(0,A.jsx)(`p`,{className:`lede`,children:`Struggling is not a personal failure.",
    "appointment-chat-top",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)(`h2`,{children:`Questions for my appointment`}),(0,A.jsx)(`p`,{children:`You can prepare questions without storing any report. Your own text is user-entered and not medically verified. Notes stay in page memory; reload/close clears them. Use sample notes in this local preview.`}),",
    "(0,A.jsx)(`h2`,{children:`Questions for my appointment`}),(0,A.jsx)(`p`,{children:`You can also keep a list of questions under the medical companion chat. Your own text is user-entered and not medically verified. Notes stay in page memory; reload/close clears them. Use sample notes in this local preview.`}),",
    "appointment-questions-list",
  );

  next = replaceOnce(
    next,
    "F=(0,_.useRef)(null);(0,_.useEffect)(()=>{let e=()=>c(navigator.onLine);",
    "F=(0,_.useRef)(null);let[mpAuthed,mpSetAuthed]=(0,_.useState)(()=>!!Dt());let[mpGateTick,mpSetGateTick]=(0,_.useState)(0);(0,_.useEffect)(()=>{function e(){mpSetAuthed(!!Dt());mpSetGateTick(e=>e+1)}return window.addEventListener(`mindpal-session-change`,e),window.addEventListener(mpFaith.FAITH_CHANGE_EVENT,e),()=>{window.removeEventListener(`mindpal-session-change`,e);window.removeEventListener(mpFaith.FAITH_CHANGE_EVENT,e)}},[]);(0,_.useEffect)(()=>{let e=()=>c(navigator.onLine);",
    "session-state",
  );
  next = replaceOnce(
    next,
    "className:`app`,children:[(0,A.jsx)(`a`,{className:`skip`",
    "className:`app${a===`adult`&&mpShowSignInGate()?` mp-signin-shell`:``}`,children:[(0,A.jsx)(`a`,{className:`skip`",
    "signin-shell-class",
  );
  next = replaceOnce(
    next,
    "try`)})]}):(0,A.jsxs)(A.Fragment,{children:[a===`adult`&&(0,A.jsxs)(A.Fragment,{children:[(0,A.jsx)($r,{active:t===`Body, food and wellbeing`",
    "try`)})]}):a===`adult`&&mpShowSignInGate()?(0,A.jsx)(mpSignInPage,{onSignedIn:()=>{mpSetAuthed(!0),I(`Today`)}}):(0,A.jsxs)(A.Fragment,{children:[a===`adult`&&(0,A.jsxs)(A.Fragment,{children:[(0,A.jsx)($r,{active:t===`Body, food and wellbeing`",
    "signin-gate",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)(Ir,{items:Bi,active:t,onSelect:I})",
    "!mpShowSignInGate()||a!==`adult`?(0,A.jsx)(Ir,{items:Bi,active:t,onSelect:I}):null",
    "hide-tabs-until-signin",
  );

  next = replaceOnce(
    next,
    "(0,A.jsxs)(`button`,{className:`brand`,onClick:()=>I(`Today`),\"aria-label\":e(`navigation.home`),children:[(0,A.jsx)(`img`,{src:Ge(`/icon.svg`),alt:``}),`mindpal`]})",
    "(0,A.jsxs)(`div`,{className:`mp-brand-row`,children:[(0,A.jsxs)(`button`,{type:`button`,className:`brand`,onClick:()=>mpGoHome(I),\"aria-label\":e(`navigation.home`),children:[(0,A.jsx)(`img`,{src:Ge(`/icon.svg`),alt:``}),`mindpal`]}),(0,A.jsx)(mpProfileButton,{placement:`sidebar`,onOpen:()=>I(`Profile`)})]})",
    "sidebar-brand-home",
  );
  next = replaceOnce(
    next,
    "(0,A.jsx)(`button`,{className:`mobile-menu`,\"aria-expanded\":r,\"aria-controls\":`primary-navigation`,onClick:()=>i(!r),\"aria-label\":e(`navigation.toggle`),children:(0,A.jsx)(hn,{})}),(0,A.jsxs)(`span`,{className:`breadcrumb`",
    "(0,A.jsx)(`button`,{className:`mobile-menu`,\"aria-expanded\":r,\"aria-controls\":`primary-navigation`,onClick:()=>i(!r),\"aria-label\":e(`navigation.toggle`),children:(0,A.jsx)(hn,{})}),(0,A.jsxs)(`button`,{type:`button`,className:`brand mp-top-brand`,onClick:()=>mpGoHome(I),\"aria-label\":e(`navigation.home`),children:[(0,A.jsx)(`img`,{src:Ge(`/icon.svg`),alt:``}),`mindpal`]}),(0,A.jsx)(mpProfileButton,{placement:`topbar`,onOpen:()=>I(`Profile`)}),(0,A.jsxs)(`span`,{className:`breadcrumb`",
    "topbar-brand-home",
  );

  const showModalCount = next.split(".showModal()").length - 1;
  if (showModalCount < 1) {
    throw new Error("expected vendor showModal() dialogs to make modeless");
  }
  next = next.replaceAll(".showModal()", ".show()");

  if (!next.includes("Do this next")) {
    throw new Error("day-steps chrome missing from bundle");
  }
  if (!next.includes("Start with Individual Growth") || !next.includes("four personal steps")) {
    throw new Error("hub flow copy missing from bundle");
  }
  if (!next.includes("Settle / breathe") || !next.includes("One win / intention")) {
    throw new Error("Individual Growth steps missing from bundle");
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
  if (!next.includes("function mpNightBand(") || !next.includes("Open Journal")) {
    throw new Error("Today Night journal band missing from bundle");
  }
  if (!next.includes("function mpBookReader(") || !next.includes("function mpHubOpenableReadings(")) {
    throw new Error("reusable book reader missing from bundle");
  }
  if (!next.includes("Open the book reader") || !next.includes("openReading,findReadingById")) {
    throw new Error("peaceful-reading deep-link into the book reader is missing");
  }
  if (!next.includes("{name:`My diary`,icon:rn}")) {
    throw new Error("sidebar Journal item missing from bundle");
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
  if (!next.includes("Individual Growth") || !next.includes("Support and Team")) {
    throw new Error("Today Individual / Support / Team flow line missing from bundle");
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
  if (!next.includes("Today’s verse — tap to expand") && !next.includes("mpIndividualGrowthCard")) {
    throw new Error("Today verse or Individual Growth path missing");
  }
  if (!next.includes("mpIndividualGrowthCard") || !next.includes("MINDPAL · INDIVIDUAL GROWTH")) {
    throw new Error("Individual Growth accordion missing from Today");
  }
  if (!next.includes("TEAM GROWTH") || !next.includes("mp-band-team")) {
    throw new Error("Team Growth band missing from Today");
  }
  if (next.includes("See the two steps")) {
    throw new Error("stale two-step copy still in Today");
  }
  if (!next.includes("takeCompanionPrompt")) {
    throw new Error("Companion prefill helper missing from bundle");
  }
  if (!next.includes("Struggling mothers") || !next.includes("mpMothersHubPage")) {
    throw new Error("mothers hub route or page missing from bundle");
  }
  if (!next.includes("mpMothersFeelingsChip") || !next.includes("mpMothersWomenCard")) {
    throw new Error("mothers Feelings/Women’s wellbeing entries missing");
  }
  if (!next.includes("One small win amid caring for others")) {
    throw new Error("mothers journal prompt missing from bundle");
  }
  if (!next.includes("mpFoldSection") || !next.includes("mpHubOpenableReadings") || !next.includes("mpEvidenceGuidancePanel")) {
    throw new Error("hub accordion, openable readings, or evidence panel missing");
  }
  if (!next.includes("Evidence & guidance") || !next.includes("panda.org.au") || !next.includes("healthdirect.gov.au")) {
    throw new Error("mothers evidence guidance copy or source links missing");
  }
  if (!next.includes("Drugs & alcohol") || !next.includes("mpAodHubPage")) {
    throw new Error("AOD hub route or page missing from bundle");
  }
  if (!next.includes("Mens health") || !next.includes("mpMensHealthHubPage")) {
    throw new Error("Men's Health hub route or page missing from bundle");
  }
  if (!next.includes("mpMensHealthFeelingsChip") || !next.includes("There's nothing wrong with being your best self.")) {
    throw new Error("Men's Health Feelings chip or hero line missing");
  }
  if (!next.includes("1300 78 99 78") || !next.includes("MensLine")) {
    throw new Error("MensLine featured helpline missing from bundle");
  }
  if (!next.includes("mp-hub-acc-toggle") || !next.includes("The picture in Australia")) {
    throw new Error("Men's Health accordion missing from bundle");
  }
  if (next.includes("toxic masculinity") || next.includes("Toxic masculinity")) {
    throw new Error("Men's Health hub must not use toxic-masculinity framing");
  }
  if (!next.includes("t===`Mens health`")) {
    throw new Error("Mens health hash route is not mounted");
  }
  if (!next.includes("globalThis.mpMensHealth=mpMensHealth")) {
    throw new Error("Men's Health catalog is not attached to globalThis");
  }
  if (!next.includes("mpAodFeelingsChip")) {
    throw new Error("AOD Feelings entry missing");
  }
  if (!next.includes("Work team morning ritual") || !next.includes("mpTeamRitualCard")) {
    throw new Error("team morning ritual card missing from bundle");
  }
  if (!next.includes("mpTeamRitualPage") || !next.includes("t===`Team morning`")) {
    throw new Error("team morning ritual page missing from bundle");
  }
  if (!next.includes("maddy-timed-breath") || !next.includes("Breathe (~3 min)")) {
    throw new Error("team ritual breath step missing from bundle");
  }
  if (!next.includes("Verse of the day") || !next.includes("Peaceful reading") || !next.includes("does not mark a Pack A")) {
    throw new Error("team ritual verse and peaceful reading missing from bundle");
  }
  if (!next.includes("mp-fold-head") || !next.includes("mp-team-step-body")) {
    throw new Error("team ritual / mothers accordion missing from bundle");
  }
  if (!next.includes("mpTeamRitual={TEAM_RITUAL_STORAGE_KEY")) {
    throw new Error("mpTeamRitual runtime missing from bundle");
  }
  if (!next.includes("I have a faith / religion") || !next.includes("No religion / prefer secular")) {
    throw new Error("sign-in faith stance choices missing from bundle");
  }
  if (!next.includes("So we can relate to you — what’s your religion?")) {
    throw new Error("religion follow-up copy missing from bundle");
  }
  if (!next.includes("function mpFaithPrefQuestions(") || !next.includes("mpAccountFaithCard")) {
    throw new Error("faith preference setup or account edit missing");
  }
  if (!next.includes("pickMorningVerse") || !next.includes("function mpMorningVerse(")) {
    throw new Error("tradition-targeted morning verse missing from bundle");
  }
  if (!next.includes("t===`verse`&&(0,A.jsx)(mpMorningVerse,{})")) {
    throw new Error("Explore verse is not using the tradition-targeted card");
  }
  if (!next.includes("faithStance:``,tradition:``,traditionId:``")) {
    throw new Error("new local profiles still default to a religion");
  }
  if (!next.includes("function mpNeedsFaithSetup(") || !next.includes("mpShowSignInGate()")) {
    throw new Error("first-setup faith gate is not holding the sign-in shell");
  }
  if (!next.includes("function mpNeedsProfileSetup(") || !next.includes("mpNeedsFaithSetup()||mpNeedsProfileSetup()")) {
    throw new Error("first-setup age and gender gate is not holding the sign-in shell");
  }
  if (!next.includes("function mpProfilePrefQuestions(") || !next.includes("mpAccountProfileCard") || !next.includes("MINDPAL FACTS")) {
    throw new Error("age and gender setup or account edit missing");
  }
  if (!next.includes("setFaithAsk(mpNeedsFaithSetup())") || !next.includes("if(faithAsk)")) {
    throw new Error("Today first-setup faith overlay is missing");
  }
  if (!next.includes("function ti(props){return mpReflectPage(props)}") || !next.includes("function mpReflectPage(")) {
    throw new Error("Reflect page is not the MindPal chat conversation");
  }
  if (next.includes("function mpReflectLegacy") || next.includes("This page cannot understand your words") || next.includes("Self-guided preview · no live listener")) {
    throw new Error("dead-end Reflect preview must be excised from the tip bundle");
  }
  if (!next.includes("Talk with MindPal") || !next.includes("Enter sends")) {
    throw new Error("Reflect chat chrome is missing");
  }
  if (!next.includes("function mpTodayTalkRow(") || !next.includes("onOpenReflect:()=>I(`Reflect`)") || !next.includes("onOpenAppointment:()=>I(`Appointment Questions`)")) {
    throw new Error("Today is missing Talk about my day / Appointment Questions openers");
  }
  if (!next.includes("t===`Body, food and wellbeing`||t===`Appointment Questions`")) {
    throw new Error("Appointment Questions hash is not aliased to the medical chat page");
  }
  if (!next.includes("api/companion/") || !next.includes("COMPANION_POLICY_VERSION") || !next.includes("DEFAULT_PAGES_BASE")) {
    throw new Error("companion chat path is missing from the runtime");
  }
  if (next.includes("t===`Reflect`") && !next.includes("Talk with MindPal")) {
    throw new Error("Reflect route is not named Talk with MindPal");
  }
  if (!next.includes("setProfileAsk(mpNeedsProfileSetup())") || !next.includes("if(profileAsk)")) {
    throw new Error("Today first-setup age and gender overlay is missing");
  }
  if (!next.includes("ageBand:``,gender:``")) {
    throw new Error("new local profiles still default to an age or gender");
  }
  if (!next.includes("mpSetGateTick(e=>e+1)")) {
    throw new Error("faith-change must re-render the sign-in gate");
  }
  if (!next.includes("mpAppointmentCompanionCard") || !next.includes("Talk this appointment through with Companion")) {
    throw new Error("appointment companion entry is missing");
  }
  if (!next.includes("id:`youtube-search`") || !next.includes("applySearch")) {
    throw new Error("YouTube directory search must be visible and have an apply handler");
  }
  if (!next.includes("onKeyDown:e=>{(e.key===`Enter`&&(e.metaKey||e.ctrlKey))&&(e.preventDefault(),D())}")) {
    throw new Error("Companion Ctrl/Cmd+Enter send is missing");
  }
  if (!next.includes("function mpGoHome(") || !next.includes("onClick:()=>mpGoHome(I)")) {
    throw new Error("MindPal brand is not wired to go home");
  }
  if (!next.includes("className:`brand mp-top-brand`")) {
    throw new Error("mobile topbar MindPal home control missing");
  }
  if (next.includes("className:`brand`,onClick:()=>I(`Today`)")) {
    throw new Error("sidebar brand still uses the raw Today setter");
  }
  if (!next.includes("mpNav={HOME_ROUTE,HOME_EVENT,homeHash,goHome}")) {
    throw new Error("mpNav home helper missing from bundle");
  }
  if (!next.includes("function mpAppointmentChat(") || !next.includes("`h1`,{children:`Body, food and wellbeing`}),(0,A.jsx)(mpAppointmentChat,{onHelp:t})")) {
    throw new Error("appointment Questions page is still list-only");
  }
  if (!next.includes("appointment_health_literacy") || !next.includes("MINDPAL_COMPANION_BASE")) {
    throw new Error("appointment medical companion lane or configurable base missing");
  }
  if (!next.includes("function mpCompanionBaseCard(") || !next.includes("persistCompanionBase")) {
    throw new Error("companion base paste field is missing");
  }
  if (next.includes("127.0.0.1:8787")) {
    throw new Error("do not hard-code the local companion port");
  }
  if (/\btrycloudflare\.com\b/.test(next)) {
    throw new Error("do not hard-code a trycloudflare companion URL");
  }
  if (!next.includes("function mpCompanionPage(") || !next.includes("mp-practice-card")) {
    throw new Error("interactive Companion demo page missing from bundle");
  }
  if (!next.includes("t===`Companion`&&(0,A.jsx)(mpCompanionPage,{onHelp:()=>I(`Get support`),onExercise:y,onReflect:()=>I(`Reflect`)}")) {
    throw new Error("Companion route still mounts the no-op vendor page");
  }
  if (next.includes("t===`Companion`&&(0,A.jsx)(Xi,{onHelp:()=>I(`Get support`),onExercise:y})")) {
    throw new Error("vendor Companion page is still the live route");
  }
  const reviewBanner = "Local preview · wellbeing content is awaiting qualified review. Use sample notes only.";
  const reviewClear = "Content review only · this bar is not Companion chat. Live chat has its own label on that page.";
  if (next.includes(reviewBanner)) next = next.replaceAll(reviewBanner, reviewClear);
  if (!next.includes("Practice guide · live chat is off on this phone") || !next.includes("mpCompanionDemo=")) {
    throw new Error("Companion demo banner or runtime missing");
  }
  if (!next.includes("companion-speak") || !next.includes("Thinking…") || !next.includes("Live chat is on means MindPal can answer")) {
    throw new Error("Companion Speak control or live/practice badge missing");
  }
  if (!next.includes("Lifeline on 13 11 14") || !next.includes("Call 000")) {
    throw new Error("Companion crisis routes missing Lifeline / 000");
  }
  if (!next.includes("does not invent a public tunnel")) {
    throw new Error("Companion demo must not invent a public tunnel");
  }
  if (next.includes("showModal")) {
    throw new Error("showModal remains after brand-home patch");
  }
  if (!next.includes("function mpProfilePage(") || !next.includes("function mpProfileButton(")) {
    throw new Error("profile page or chrome button missing from bundle");
  }
  if (!next.includes("t===`Profile`&&(0,A.jsx)(mpProfilePage,{})")) {
    throw new Error("Profile route is not mounted");
  }
  if (!next.includes("t===`Book`&&(0,A.jsx)(mpYourBooksPage,{})") || !next.includes("function mpYourBooksPage(")) {
    throw new Error("Book route is not mounted");
  }
  if (!next.includes("(0,A.jsx)(mpYourBooksCard,{})") || !next.includes("function mpOpenHash(")) {
    throw new Error("Explore Book card missing");
  }
  if (next.includes("id:`Book`,label:`Book`")) {
    throw new Error("Book must not be added as a bottom tab");
  }
  if (!next.includes("`Book`,") || !next.includes("Book:`route.book`")) {
    throw new Error("Book hash route is missing from the allowlist");
  }
  if (!next.includes("className:`mp-brand-row`") || !next.includes("onOpen:()=>I(`Profile`)")) {
    throw new Error("profile control missing beside the MindPal brand");
  }
  if (!next.includes("mindpal.profile.v1") || !next.includes("mp-profile-acc")) {
    throw new Error("profile persistence or accordion missing from bundle");
  }
  if (!next.includes("mpProfile={AGE_BANDS") || !next.includes("PROFILE_STORAGE_KEY") || !next.includes("mpSpeakersCatalog=")) {
    throw new Error("profile runtime or speaker catalog missing from bundle");
  }
  if (next.includes("className:`brand`,onClick:()=>I(`Profile`)")) {
    throw new Error("MindPal brand must not open Profile");
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
  sw = sw.replace(/prefix:"mindpal-shell-v\d+"/, `prefix:"mindpal-shell-v6"`);
  sw = sw.replace(
    /\{url:"index.html",revision:"[a-f0-9]+"\}/,
    `{url:"index.html",revision:"${md5(html)}"}`,
  );
  const registerSw = readFileSync(join(root, "registerSW.js"), "utf8");
  sw = sw.replace(
    /\{url:"registerSW.js",revision:"[a-f0-9]+"\}/,
    `{url:"registerSW.js",revision:"${md5(registerSw)}"}`,
  );
  const nav = 'e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html")))';
  const navDeny =
    'e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html"),{denylist:[/\\/videos\\//,/\\.(?:mp4|webm)$/i]}))';
  if (sw.includes(nav)) {
    sw = sw.replace(nav, navDeny);
  } else if (!sw.includes("denylist:[/\\/videos\\//")) {
    throw new Error("service worker navigation route missing");
  }
  for (const rel of ["vendor/pdfjs/pdf.min.js", "vendor/pdfjs/pdf.worker.min.js"]) {
    if (sw.includes(rel)) continue;
    const revision = createHash("md5").update(readFileSync(join(root, rel))).digest("hex");
    const needle = "e.precacheAndRoute([";
    if (!sw.includes(needle)) throw new Error("service worker precache missing");
    sw = sw.replace(needle, `${needle}{url:"${rel}",revision:"${revision}"},`);
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
execFileSync("node", ["--test", join(root, "tests/smoke/page-smoke.test.js")], {
  cwd: root,
  stdio: "inherit",
});
