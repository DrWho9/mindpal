const WATCH_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Outbound YouTube only: watch, channel, or search.
 * Rejects embed/download hosts. Never used as <video> or iframe src.
 */
export function isYoutubeOutboundUrl(url) {
  if (typeof url !== "string" || !url.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "");
      if (!WATCH_ID.test(id)) return null;
      return `https://www.youtube.com/watch?v=${id}`;
    }
    if (host !== "youtube.com") return null;
    if (parsed.pathname.startsWith("/embed/") || parsed.pathname.startsWith("/shorts/")) {
      return null;
    }
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v");
      if (!id || !WATCH_ID.test(id)) return null;
      return `https://www.youtube.com/watch?v=${id}`;
    }
    if (parsed.pathname.startsWith("/@") && parsed.pathname.length > 2) {
      return `https://www.youtube.com${parsed.pathname}`;
    }
    if (parsed.pathname === "/results") {
      const query = parsed.searchParams.get("search_query");
      if (!query || !query.trim()) return null;
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Feeling-flow style gate: availability-checked, not on editorial hold,
 * dated check, and a sanitised YouTube outbound URL.
 */
export function isMeditationOpenable(entry, now = new Date()) {
  if (!entry || typeof entry !== "object") return false;
  if (entry.editorialHold === true) return false;
  if (entry.availability !== "checked") return false;
  if (!entry.checkedAt || !Number.isFinite(Date.parse(entry.checkedAt))) return false;
  if (Date.parse(entry.checkedAt) > now.getTime()) return false;
  return Boolean(isYoutubeOutboundUrl(entry.url));
}

export function meditationOpenUrl(entry, now = new Date()) {
  if (!isMeditationOpenable(entry, now)) return null;
  return isYoutubeOutboundUrl(entry.url);
}

export function meditationCtaLabel(entry, now = new Date()) {
  return isMeditationOpenable(entry, now)
    ? "Open on YouTube"
    : "This entry is not available to open here.";
}

export const MEDITATION_CATEGORY_IDS = [
  "sleep",
  "anxiety",
  "stress",
  "morning",
  "body-scan",
  "self-compassion",
  "breathing",
  "grief",
  "short",
  "faith",
];

export function meditationCategories(catalog) {
  const list = Array.isArray(catalog?.categories) ? catalog.categories : [];
  return MEDITATION_CATEGORY_IDS.map((id) =>
    list.find((item) => item && item.id === id),
  ).filter(Boolean);
}

export function entriesForCategory(category) {
  const entries = Array.isArray(category?.entries) ? category.entries : [];
  return entries.slice(0, 10);
}

export function formatMeditationViews(entry) {
  if (typeof entry?.views === "string" && entry.views.trim()) {
    return entry.views.trim();
  }
  return "views TBD";
}

export function categoryFillNote(category) {
  const count = entriesForCategory(category).length;
  if (!category) return "This category is filling.";
  if (category.status === "filling" && count === 0) {
    return "This category is filling.";
  }
  if (count < 10) {
    return `${count} of 10 listed · filling`;
  }
  return "";
}
