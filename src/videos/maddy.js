const MEDIA_EXT = /\.(mp4|webm)$/i;

export const MADDY_PACK_ID = "mindpal-videos-maddy-v1";
export const MADDY_CORE_IDS = ["maddy-welcome", "maddy-tip", "maddy-timed-breath"];

export function hasMaddyMediaUrl(url) {
  return typeof url === "string" && MEDIA_EXT.test(url.trim());
}

/**
 * Finished companion MP4s play without the HeyGen / publicEligible draft gate.
 */
export function isMaddyCompanionPlayable(video) {
  if (!video || typeof video !== "object") return false;
  if (video.withdrawn) return false;
  if (video.person !== "Maddy") return false;
  if (video.kind && video.kind !== "companion") return false;
  if (video.heygenDraft === true) return false;
  return hasMaddyMediaUrl(video.src || video.videoUrl);
}

export function maddyPublishedSrc(src, base = "/mindpal/") {
  const path = String(src || "")
    .trim()
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${path}`;
}

export function maddyDurationLabel(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return "short clip";
  if (n < 60) return `${Math.round(n)} sec`;
  const mins = Math.round((n / 60) * 10) / 10;
  return `${mins} min`;
}

export function maddyCompanionVideos(catalog) {
  const videos = catalog?.videos;
  if (!Array.isArray(videos)) return [];
  return videos.filter((item) => isMaddyCompanionPlayable(item)).map((item) => ({
    ...item,
    cardTitle: item.cardTitle || item.title,
    durationLabel: maddyDurationLabel(item.durationSec ?? item.duration_sec),
    publishedSrc: maddyPublishedSrc(item.src || item.videoUrl),
  }));
}
