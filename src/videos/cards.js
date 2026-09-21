import {
  captionsDisclosure,
  isVideoPlayable,
  overlayCatalogVideo,
  publishedLibrarySrc,
  videoCardAriaLabel,
  videoCardCta,
  videoDisplayTitle,
  videoDurationLabel,
  videoPresenterName,
} from "./playback.js";
import { hasMaddyMediaUrl, isMaddyCompanionPlayable, maddyPublishedSrc } from "./maddy.js";

export const LIBRARY_OPEN_EVENT = "mindpal-open-library-video";

function titleOf(video) {
  return videoDisplayTitle(video);
}

function resolveCatalogVideo(video, catalog) {
  const published =
    catalog ||
    (typeof globalThis !== "undefined" ? globalThis.mpVideoCatalog : null);
  return overlayCatalogVideo(video, published);
}

/**
 * One model for every video card. Cards are always activatable:
 * Maddy / real media → player; HeyGen drafts → script modal.
 */
export function libraryCardModel(video, now = new Date(), catalog) {
  video = resolveCatalogVideo(video, catalog);
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

  if (video.kind === "maddy" && hasMaddyMediaUrl(video.src || video.publishedSrc || video.videoUrl)) {
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
      presenter: "Maddy",
      durationLabel: videoDurationLabel(video),
      captionsNote: "",
      eyebrow: "Watch with Maddy",
      cardType: "WITH MADDY",
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
      presenter: "Maddy",
      durationLabel: videoDurationLabel(video),
      captionsNote: "",
      eyebrow: "Watch with Maddy",
      cardType: "WITH MADDY",
    };
  }

  const playable = isVideoPlayable(video, now);
  const src = playable ? publishedLibrarySrc(video.videoUrl || video.src) : "";
  const presenter = videoPresenterName(video);
  return {
    kind: playable ? "library-play" : "open-draft",
    cta: videoCardCta(video, now),
    ariaLabel: videoCardAriaLabel(video, now),
    playable,
    opens: playable ? "player" : "script",
    src,
    id: video.id || "",
    title: titleOf(video),
    presenter,
    durationLabel: videoDurationLabel(video),
    captionsNote: playable ? captionsDisclosure(video) : "",
    eyebrow: playable
      ? presenter
        ? `With ${presenter}`
        : "Ready to play"
      : "Open draft",
    cardType: playable
      ? presenter
        ? `WITH ${presenter.toUpperCase()}`
        : "READY TO PLAY"
      : video.specialistReviewRequired
        ? "SPECIALIST REVIEW REQUIRED"
        : "OPEN DRAFT",
  };
}

export function dispatchLibraryVideo(video, model = libraryCardModel(video)) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return false;
  }
  try {
    window.dispatchEvent(
      new CustomEvent(LIBRARY_OPEN_EVENT, { detail: { video: resolveCatalogVideo(video), model } }),
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
  const resolved = resolveCatalogVideo(video, deps.catalog);
  const model = libraryCardModel(resolved, undefined, deps.catalog);
  const dispatched = (deps.dispatch || dispatchLibraryVideo)(resolved, model);
  const hostMounted =
    typeof globalThis !== "undefined" && globalThis.__mpLibraryHostMounted === true;
  if (!hostMounted && typeof openVideo === "function" && resolved?.id) {
    openVideo(resolved.id);
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
