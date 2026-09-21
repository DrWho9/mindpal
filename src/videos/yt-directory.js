import { isYoutubeOutboundUrl } from "./yt-meditations.js";

const DIRECTORY_WATCH_ID = /^[A-Za-z0-9_-]{11}$/;

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/**
 * Sanitised outbound watch/channel URL, or a bare 11-char watch id.
 * Human-review / draft flags are ignored — a URL is enough to link out.
 */
export function directoryWatchUrl(entry) {
  if (!entry || typeof entry !== "object") return null;
  const fromUrl = isYoutubeOutboundUrl(
    firstString(entry.url, entry.watchUrl, entry.youtubeUrl, entry.externalUrl, entry.evidenceUrl),
  );
  if (fromUrl) return fromUrl;
  const id = firstString(entry.watchId, entry.youtubeId, entry.videoId);
  if (DIRECTORY_WATCH_ID.test(id)) return `https://www.youtube.com/watch?v=${id}`;
  return null;
}

export function directoryOpenUrl(entry) {
  return directoryWatchUrl(entry);
}

export function isDirectoryOpenable(entry) {
  return Boolean(directoryWatchUrl(entry));
}

export function directoryCtaLabel(entry) {
  return isDirectoryOpenable(entry)
    ? "Open on YouTube"
    : "This entry is not available to open here.";
}

export function isDirectoryHeld(entry) {
  if (!entry || typeof entry !== "object") return false;
  return (
    entry.reviewStatus === "withheld" ||
    entry.editorialHold === true ||
    entry.selection?.state === "hold"
  );
}

export function directorySpeakerIds(entry) {
  if (!entry || typeof entry !== "object") return [];
  return [...new Set([...(entry.speakerIds || []), ...(entry.hostSpeakerIds || [])].filter(Boolean))];
}

export function directorySpeakerNames(entry, speakers = []) {
  const names = [];
  for (const id of directorySpeakerIds(entry)) {
    const person = speakers.find((item) => item && item.id === id);
    if (person?.name) names.push(person.name);
    if (Array.isArray(person?.aliases)) names.push(...person.aliases.filter(Boolean));
  }
  if (entry?.creator) names.push(entry.creator);
  return names;
}

export function directoryTags(entry) {
  if (!entry || typeof entry !== "object") return [];
  return [
    ...(entry.topics || []),
    ...(entry.tags || []),
    ...(entry.proposedRelevance?.feelingIds || []),
    ...(entry.proposedRelevance?.topics || []),
    ...(entry.selection?.topics || []),
  ]
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean);
}

export function directoryHaystack(entry, speakers = []) {
  return [
    entry?.id,
    entry?.title,
    entry?.synopsis,
    entry?.creator,
    ...directorySpeakerNames(entry, speakers),
    ...directorySpeakerIds(entry),
    ...directoryTags(entry),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function directoryDurationBand(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "any";
  if (seconds <= 5 * 60) return "short";
  if (seconds <= 10 * 60) return "medium";
  if (seconds <= 15 * 60) return "long";
  return "more";
}

export function directorySpeakerOptions(entries, speakers = []) {
  const list = Array.isArray(entries) ? entries : [];
  const catalog = Array.isArray(speakers) ? speakers : [];
  const seen = new Set();
  const options = [];
  for (const person of catalog) {
    if (!person?.id || !person.name || seen.has(person.id)) continue;
    const hasVideo = list.some(
      (entry) => directoryWatchUrl(entry) && directorySpeakerIds(entry).includes(person.id),
    );
    if (!hasVideo) continue;
    seen.add(person.id);
    options.push({ id: person.id, name: person.name });
  }
  return options;
}

/**
 * Browse/search the YouTube directory.
 * Default browse: URL-bearing rows that are not on editorial hold.
 * Query or speaker filter: any catalog row with a URL (held included).
 * Rows with no URL never appear as playable cards.
 */
export function filterDirectoryEntries(entries, options = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const query = String(options.query || "").trim().toLowerCase();
  const speakerId = String(options.speakerId || "").trim();
  const speakerIds = speakerId
    ? [speakerId]
    : (Array.isArray(options.speakerIds) ? options.speakerIds : []).filter(Boolean);
  const speakers = options.speakers || [];
  const topic = String(options.topic || "").trim().toLowerCase();
  const time = options.time || "any";
  const searching = Boolean(query) || speakerIds.length > 0;

  return list.filter((entry) => {
    if (!entry || typeof entry !== "object") return false;
    if (!directoryWatchUrl(entry)) return false;
    if (!searching && isDirectoryHeld(entry)) return false;
    if (speakerIds.length) {
      const ids = directorySpeakerIds(entry);
      const hay = directoryHaystack(entry, speakers);
      const hit = speakerIds.some((id) => {
        if (ids.includes(id)) return true;
        const person = speakers.find((item) => item && item.id === id);
        if (!person?.name) return false;
        const name = person.name.toLowerCase();
        if (hay.includes(name)) return true;
        return (person.aliases || []).some(
          (alias) => typeof alias === "string" && hay.includes(alias.toLowerCase()),
        );
      });
      if (!hit) return false;
    }
    if (query && !directoryHaystack(entry, speakers).includes(query)) return false;
    if (topic) {
      const tags = directoryTags(entry).map((tag) => tag.toLowerCase());
      const hay = directoryHaystack(entry, speakers);
      if (!tags.includes(topic) && !hay.includes(topic)) return false;
    }
    if (time && time !== "any") {
      const seconds = Number(entry.fullDurationSeconds ?? entry.durationSeconds);
      if (directoryDurationBand(seconds) !== time) return false;
    }
    return true;
  });
}

export function directoryEmptyCopy({ query = "", speakerId = "", speakerIds = [] } = {}) {
  if (query || speakerId || speakerIds.length) {
    return "No matching video references. Try another title, creator, speaker or tag.";
  }
  return "No openable YouTube links in this directory yet.";
}
