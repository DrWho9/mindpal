/** Men's Health hub catalog — ABS/AIHW literacy plus outbound refs. */

export const MENS_HEALTH_PROBLEM_ID = "mens-health";
export const MENS_HEALTH_ROUTE = "Mens health";
export const MENS_HEALTH_TITLE = "Men's Health";
export const MENS_HEALTH_READING_LIMIT = 8;
export const MENS_HEALTH_MADDY_IDS = [];
export const MENS_HEALTH_HERO = "There's nothing wrong with being your best self.";

const EMPTY = { stats: [], youtube: [], queuedVideos: [], helplines: [] };

export function mensHealthCatalog(override) {
  if (override && typeof override === "object" && !Array.isArray(override)) return override;
  try {
    if (typeof mpMensHealth !== "undefined" && mpMensHealth) return mpMensHealth;
  } catch {
    /* Node tests use globalThis */
  }
  if (typeof globalThis !== "undefined" && globalThis.mpMensHealth) return globalThis.mpMensHealth;
  return EMPTY;
}

export function mensHealthStats(override) {
  const list = mensHealthCatalog(override).stats;
  return Array.isArray(list) ? list.filter((item) => item && item.id && item.sourceUrl) : [];
}

export function mensHealthYoutube(override) {
  const list = mensHealthCatalog(override).youtube;
  return Array.isArray(list) ? list.filter((item) => item && isMensHealthYoutubeUrl(item.url)) : [];
}

export function mensHealthHelplines(override) {
  const list = mensHealthCatalog(override).helplines;
  return Array.isArray(list) ? list.filter((item) => item && item.phone) : [];
}

export function mensHealthQueuedVideos(override) {
  const list = mensHealthCatalog(override).queuedVideos;
  return Array.isArray(list) ? list.filter((item) => item && item.title) : [];
}

export function featuredMensHelpline(override) {
  return mensHealthHelplines(override).find((item) => item.featured) || mensHealthHelplines(override)[0] || null;
}

export function isMensHealthYoutubeUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com";
  } catch {
    return false;
  }
}

export function isMensHealthProblem(id) {
  return id === MENS_HEALTH_PROBLEM_ID;
}

export function dedicatedProblemRoute(id) {
  if (id === "mothers") return "Struggling mothers";
  if (id === "aod") return "Drugs & alcohol";
  if (id === MENS_HEALTH_PROBLEM_ID) return MENS_HEALTH_ROUTE;
  return "Problem";
}
