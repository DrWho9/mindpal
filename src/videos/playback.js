const MEDIA_EXT = /\.(mp4|webm)$/i;

export function hasPlayableMediaUrl(videoUrl) {
  return typeof videoUrl === "string" && MEDIA_EXT.test(videoUrl.trim());
}

/**
 * Play is allowed only when real media exists and publication gates pass.
 * Drafts stay Open-draft; publicEligible must never be forced true here.
 */
export function isVideoPlayable(video, now = new Date()) {
  if (!video || typeof video !== "object") return false;
  if (video.withdrawn) return false;
  if (video.publicEligible !== true) return false;
  if (video.clinicalStatus !== "APPROVED") return false;
  if (video.publicationStatus !== "PUBLISHED") return false;
  if (video.rightsStatus !== "CLEARED") return false;
  if (!hasPlayableMediaUrl(video.videoUrl)) return false;
  return true;
}

export function videoCardCta(video, now = new Date()) {
  return isVideoPlayable(video, now) ? "Play" : "Open draft";
}

export function videoCardAriaLabel(video, now = new Date()) {
  const title = video?.title || "MindPal video";
  const id = video?.id || "";
  return `${id} ${title} · ${videoCardCta(video, now)}`.trim();
}
