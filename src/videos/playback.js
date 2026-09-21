const MEDIA_EXT = /\.(mp4|webm)$/i;

export function hasPlayableMediaUrl(videoUrl) {
  return typeof videoUrl === "string" && MEDIA_EXT.test(videoUrl.trim());
}

/** Pages-hosted clips live under /mindpal/, matching Maddy companion URLs. */
export function publishedLibrarySrc(url, base = "/mindpal/") {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const prefix = base.endsWith("/") ? base : `${base}/`;
  if (raw.startsWith(prefix)) return raw;
  return `${prefix}${raw.replace(/^\.\//, "").replace(/^\/+/, "")}`;
}

export function overlayCatalogVideo(video, catalog) {
  if (!video || typeof video !== "object") return video;
  const list = catalog?.videos;
  if (!Array.isArray(list)) return video;
  const match = list.find((item) => item && item.id === video.id);
  return match ? { ...video, ...match } : video;
}

export function mergedLibraryVideos(base, catalog) {
  const fallback = Array.isArray(base) ? base : [];
  const overlay = Array.isArray(catalog?.videos) ? catalog.videos : [];
  if (!overlay.length) return fallback;
  if (!fallback.length) return overlay;
  const byId = new Map(overlay.map((item) => [item.id, item]));
  return fallback.map((item) =>
    item?.id && byId.has(item.id) ? { ...item, ...byId.get(item.id) } : item,
  );
}

/**
 * Play is allowed only when real media exists and publication gates pass.
 * Drafts stay Open-draft; publicEligible must never be forced true here.
 * Captions are not part of this gate — do not invent a .vtt to unlock Play.
 */
export function isVideoPlayable(video, now = new Date()) {
  if (!video || typeof video !== "object") return false;
  if (video.withdrawn) return false;
  if (video.publicEligible !== true) return false;
  if (video.clinicalStatus !== "APPROVED") return false;
  if (video.publicationStatus !== "PUBLISHED") return false;
  if (video.rightsStatus !== "CLEARED") return false;
  if (!hasPlayableMediaUrl(video.videoUrl || video.src)) return false;
  return true;
}

export function videoDisplayTitle(video) {
  const title = String(video?.cardTitle || video?.title || "").trim();
  return title || "MindPal video";
}

export function videoPresenterName(video) {
  const name = String(video?.presenter || video?.person || "").trim();
  if (!name) return "";
  if (/^maddy$/i.test(name)) return "Maddy";
  return name;
}

export function videoDurationLabel(video) {
  if (typeof video?.durationLabel === "string" && video.durationLabel.trim()) {
    return video.durationLabel.trim();
  }
  const seconds = Number(video?.actualDurationSeconds || video?.targetDurationSeconds || 0);
  if (!seconds) return "";
  if (seconds < 90) return `About ${Math.round(seconds)} seconds`;
  const mins = Math.round(seconds / 30) / 2;
  return `${mins} min`;
}

export function captionsAvailable(video) {
  return typeof video?.captionUrl === "string" && /\.(vtt|srt)$/i.test(video.captionUrl.trim());
}

export function captionsDisclosure(video) {
  if (typeof video?.captionsDisclosure === "string" && video.captionsDisclosure.trim()) {
    return video.captionsDisclosure.trim();
  }
  if (captionsAvailable(video)) {
    return "Captions are on this clip. Turn them on from the player if you want them.";
  }
  if (isVideoPlayable(video)) {
    return "Captions are not on this clip yet. The words are underneath the player.";
  }
  return "";
}

export function featuredPlayableVideo(catalog) {
  const list = Array.isArray(catalog?.videos) ? catalog.videos : [];
  return list.find((item) => item?.id === "V02" && isVideoPlayable(item)) || null;
}

export function videoCardCta(video, now = new Date()) {
  return isVideoPlayable(video, now) ? "Play" : "Open draft";
}

export function videoCardAriaLabel(video, now = new Date()) {
  return `${videoDisplayTitle(video)} · ${videoCardCta(video, now)}`;
}
