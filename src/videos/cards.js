import { isVideoPlayable, videoCardAriaLabel, videoCardCta } from "./playback.js";
import { isMaddyCompanionPlayable, maddyPublishedSrc } from "./maddy.js";

export const LIBRARY_OPEN_EVENT = "mindpal-open-library-video";

function titleOf(video) {
  return video?.cardTitle || video?.title || "MindPal video";
}

/**
 * One model for every video card. Cards are always activatable:
 * Maddy / real media → player; HeyGen drafts → script modal.
 */
export function libraryCardModel(video, now = new Date()) {
  if (!video || typeof video !== "object") {
    return {
      kind: "invalid",
      cta: "Open draft",
      ariaLabel: "MindPal video",
      playable: false,
      opens: null,
      src: "",
      id: "",
      title: "MindPal video",
    };
  }

  if (isMaddyCompanionPlayable(video)) {
    const src = video.publishedSrc || maddyPublishedSrc(video.src || video.videoUrl);
    return {
      kind: "maddy-play",
      cta: "Play",
      ariaLabel: `${titleOf(video)} · Play`,
      playable: true,
      opens: "player",
      src,
      id: video.id || "",
      title: titleOf(video),
    };
  }

  const playable = isVideoPlayable(video, now);
  const src = playable && typeof video.videoUrl === "string" ? video.videoUrl.trim() : "";
  return {
    kind: playable ? "library-play" : "open-draft",
    cta: videoCardCta(video, now),
    ariaLabel: videoCardAriaLabel(video, now),
    playable,
    opens: playable ? "player" : "script",
    src,
    id: video.id || "",
    title: titleOf(video),
  };
}

export function dispatchLibraryVideo(video, model = libraryCardModel(video)) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return false;
  }
  try {
    window.dispatchEvent(
      new CustomEvent(LIBRARY_OPEN_EVENT, { detail: { video, model } }),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Click / keyboard activation. Always fires for a catalog row.
 * Opens our script/player host when mounted; otherwise falls back to the
 * vendor openVideo(id) setter so the existing modal still appears.
 */
export function activateLibraryVideo(video, openVideo, deps = {}) {
  const model = libraryCardModel(video);
  const dispatched = (deps.dispatch || dispatchLibraryVideo)(video, model);
  const hostMounted =
    typeof globalThis !== "undefined" && globalThis.__mpLibraryHostMounted === true;
  if (!hostMounted && typeof openVideo === "function" && video?.id) {
    openVideo(video.id);
  }
  return {
    fired: model.kind !== "invalid",
    dispatched,
    hostMounted,
    ...model,
  };
}

export function activateCoachCard(look, openLook) {
  if (look && typeof openLook === "function") openLook(look);
  return {
    fired: Boolean(look && typeof look === "object"),
    opens: "coach-sheet",
    person: look?.person || "",
    slug: look?.slug || "",
  };
}
