/** Device-locale civil date helpers. AU-friendly when the device is en-AU. */

export function civilDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatCivilDate(date = new Date(), locales) {
  const locale = locales ?? (typeof navigator !== "undefined" && navigator.language
    ? navigator.language
    : "en-AU");
  return date.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function partOfDay(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
