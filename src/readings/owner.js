/** MindPal original support readings — not Pack A sequential days. */

export const AOD_FEATURED_READING_ID = "dna-dopamine-loop-v1";

export function ownerReadingsCatalog(override) {
  if (Array.isArray(override?.readings)) return override;
  if (Array.isArray(override)) return { readings: override };
  if (typeof globalThis.mpOwnerReadings !== "undefined" && globalThis.mpOwnerReadings) {
    return globalThis.mpOwnerReadings;
  }
  // Pages bundle is type=module: top-level var is module-scoped, not on globalThis.
  if (typeof mpOwnerReadings !== "undefined" && mpOwnerReadings) {
    return mpOwnerReadings;
  }
  return { readings: [] };
}

export function isOwnerReading(reading) {
  if (!reading || typeof reading !== "object") return false;
  return (
    reading.gate === false ||
    reading.pack === "owner" ||
    reading.source === "mindpal_original_owner"
  );
}

export function listOwnerReadings(override) {
  const readings = ownerReadingsCatalog(override).readings;
  return readings.filter((item) => item && typeof item.id === "string" && item.id.trim());
}

export function findOwnerReading(id, override) {
  if (typeof id !== "string" || !id.trim()) return null;
  return listOwnerReadings(override).find((item) => item.id === id) || null;
}

export function featuredOwnerReadings(problemId, override) {
  if (typeof problemId !== "string" || !problemId.trim()) return [];
  return listOwnerReadings(override).filter((item) => {
    if (item.featured === false) return false;
    if (item.featuredProblem === problemId) return true;
    const tags = Array.isArray(item.theme_tags) ? item.theme_tags : [];
    return item.featured === true && tags.includes(problemId);
  });
}

export function mergeOwnerReadings(pack, override) {
  const packList = Array.isArray(pack?.readings) ? pack.readings.slice() : [];
  const seen = new Set(packList.map((item) => item.id));
  const owner = listOwnerReadings(override).filter((item) => !seen.has(item.id));
  return [...owner, ...packList];
}

export function ownerCompanionOpener(problemId, fallback, override) {
  const featured = featuredOwnerReadings(problemId, override)[0];
  const opener = typeof featured?.companionOpener === "string" ? featured.companionOpener.trim() : "";
  if (opener) return opener;
  return typeof fallback === "string" ? fallback : "";
}
