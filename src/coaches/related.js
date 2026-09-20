/**
 * Signed DayStart coach looks (Denyse / Chloe / Callum) relate to Explore
 * catalog drafts by slug. look_id / group_id / Drive URLs stay in catalog
 * data only — never treat them as end-user copy.
 *
 * Callum’s signed look is also used as Markham in Videos.
 */
export const COACH_ALIASES = {
  denyse: ["denyse"],
  chloe: ["chloe"],
  callum: ["callum", "markham"],
};

/** Fallback when a catalog row has no coachSlugs / presenter field. */
export const RELATED_VIDEO_IDS_BY_SLUG = {
  denyse: ["V02", "V03", "V05", "V10", "V11", "V12"],
  chloe: ["V01", "V06", "V07", "V09", "V11", "V12"],
  callum: ["V01", "V04", "V08", "V09"],
};

export const INTERNAL_COACH_FIELDS = [
  "look_id",
  "group_id",
  "drive_jpg",
  "drive_preview",
  "drive_url",
];

function asLowerList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim().toLowerCase());
}

export function coachKeys(look) {
  const slug = String(look?.slug || "")
    .trim()
    .toLowerCase();
  const person = String(look?.person || "")
    .trim()
    .toLowerCase();
  const extras = COACH_ALIASES[slug] || [];
  return [...new Set([slug, person, ...extras].filter(Boolean))];
}

export function videosForCoach(look, videos = []) {
  const keys = coachKeys(look);
  const slug = String(look?.slug || "")
    .trim()
    .toLowerCase();
  const fallback = RELATED_VIDEO_IDS_BY_SLUG[slug] || [];
  const list = Array.isArray(videos) ? videos : [];
  return list.filter((video) => {
    if (!video || typeof video !== "object") return false;
    const explicit = asLowerList(video.coachSlugs).concat(
      asLowerList(video.presenterSlugs),
    );
    if (explicit.length) return explicit.some((item) => keys.includes(item));
    const hay = [
      video.presenter,
      video.person,
      video.slug,
      video.title,
      video.outline,
      video.note,
    ]
      .filter((item) => typeof item === "string" && item.trim())
      .join(" ")
      .toLowerCase();
    if (keys.some((key) => key.length > 2 && hay.includes(key))) return true;
    return fallback.includes(video.id);
  });
}

export function visibleCoachFields(look) {
  if (!look || typeof look !== "object") return {};
  return {
    person: look.person || "",
    slug: look.slug || "",
    kind: look.kind || "PRO",
    blurb: look.blurb || "",
  };
}

export function textLeaksInternalCoachData(text, look) {
  const raw = String(text ?? "");
  if (/look_id\s*·/i.test(raw)) return true;
  if (/coach-look-id/i.test(raw)) return true;
  if (/drive\.google\.com/i.test(raw)) return true;
  if (/group_id/i.test(raw)) return true;
  if (look?.look_id && raw.includes(String(look.look_id))) return true;
  if (look?.group_id && raw.includes(String(look.group_id))) return true;
  return false;
}
