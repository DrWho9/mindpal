export const PROFILE_STORAGE_KEY = "mindpal.profile.v1";
export const PROFILE_CHANGE_EVENT = "mindpal-profile-change";
export const PROFILE_ROUTE = "Profile";

export const LIKE_LABEL_MAX = 40;
export const BOOK_TITLE_MAX = 120;
export const BOOK_AUTHOR_MAX = 80;
export const GOAL_TITLE_MAX = 140;
export const GOAL_NOTE_MAX = 280;

export const AVATAR_COLORS = [
  { id: "sage", label: "Sage", bg: "#2f5a3d", fg: "#f7f8f2" },
  { id: "clay", label: "Clay", bg: "#a05a32", fg: "#fff8f2" },
  { id: "dusk", label: "Dusk", bg: "#2a4d6e", fg: "#eef4f8" },
  { id: "sand", label: "Sand", bg: "#8a5a28", fg: "#fff8ee" },
  { id: "sea", label: "Sea", bg: "#3d5470", fg: "#eef3f8" },
  { id: "plum", label: "Plum", bg: "#5a4a72", fg: "#f4eef8" },
];

export const AVATAR_SHAPES = [
  { id: "circle", label: "Circle" },
  { id: "rounded", label: "Rounded" },
  { id: "hex", label: "Hex" },
];

export const AVATAR_EMOJIS = ["🌿", "☀️", "🌙", "🌊", "🍃", "🌸", "⭐", "☕", "📖", "🕊️", "🙂", "🌈"];

export const STARTER_LIKES = [
  { id: "morning-walks", label: "Morning walks" },
  { id: "tea", label: "Quiet cups of tea" },
  { id: "gardens", label: "Gardens" },
  { id: "music", label: "Music" },
  { id: "reading", label: "Reading" },
  { id: "cooking", label: "Cooking" },
  { id: "swimming", label: "Swimming" },
  { id: "journaling", label: "Journaling" },
  { id: "family-time", label: "Time with family" },
  { id: "outdoors", label: "Time outdoors" },
  { id: "slow-mornings", label: "Slow mornings" },
  { id: "dogs", label: "Dogs" },
  { id: "cats", label: "Cats" },
  { id: "faith", label: "Faith" },
  { id: "making-things", label: "Making things" },
  { id: "rest", label: "Rest" },
  { id: "podcasts", label: "Podcasts" },
  { id: "beach", label: "The beach" },
];

export const GOAL_TIMEFRAMES = [
  { id: "this-week", label: "This week" },
  { id: "this-month", label: "This month" },
  { id: "this-year", label: "This year" },
  { id: "someday", label: "Someday" },
];

export const SIGNED_COACHES = [
  { id: "coach-denyse", name: "Denyse", role: "Signed MindPal coach", kind: "coach" },
  { id: "coach-chloe", name: "Chloe", role: "Signed MindPal coach", kind: "coach" },
  { id: "coach-callum", name: "Callum", role: "Signed MindPal coach", kind: "coach" },
];

export const PROFILE_SECTIONS = ["avatar", "likes", "speakers", "books", "goals"];

function uniqueStrings(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const value = typeof item === "string" ? item.trim() : "";
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function newId(prefix, now = new Date()) {
  return `${prefix}-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyAvatar() {
  return { color: "sage", shape: "circle", emoji: "" };
}

export function emptyProfile() {
  return {
    version: 1,
    avatar: emptyAvatar(),
    likes: [],
    customLikes: [],
    speakers: [],
    books: [],
    goals: [],
  };
}

export function profileInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) {
    const word = parts[0].replace(/[^\p{L}\p{N}]/gu, "");
    return word.slice(0, 2).toUpperCase();
  }
  const first = parts[0].replace(/[^\p{L}\p{N}]/gu, "");
  const last = parts[parts.length - 1].replace(/[^\p{L}\p{N}]/gu, "");
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function findAvatarColor(id) {
  return AVATAR_COLORS.find((item) => item.id === id) || AVATAR_COLORS[0];
}

export function findAvatarShape(id) {
  return AVATAR_SHAPES.find((item) => item.id === id) || AVATAR_SHAPES[0];
}

export function normalizeAvatar(raw) {
  const next = emptyAvatar();
  if (!raw || typeof raw !== "object") return next;
  if (AVATAR_COLORS.some((item) => item.id === raw.color)) next.color = raw.color;
  if (AVATAR_SHAPES.some((item) => item.id === raw.shape)) next.shape = raw.shape;
  if (typeof raw.emoji === "string" && AVATAR_EMOJIS.includes(raw.emoji)) {
    next.emoji = raw.emoji;
  }
  return next;
}

export function avatarStyle(avatar) {
  const color = findAvatarColor(avatar?.color);
  return { background: color.bg, color: color.fg };
}

export function avatarFace(profile, name) {
  const emoji = profile?.avatar?.emoji || "";
  if (emoji) return { kind: "emoji", text: emoji };
  const initials = profileInitials(name);
  return { kind: "initials", text: initials || "•" };
}

export function normalizeLikeLabel(raw) {
  return String(raw || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LIKE_LABEL_MAX);
}

export function normalizeCustomLike(raw) {
  if (!raw || typeof raw !== "object") return null;
  const label = normalizeLikeLabel(raw.label);
  if (!label) return null;
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim().slice(0, 64)
      : `like-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  return { id, label };
}

export function listLikeOptions(profile) {
  const custom = Array.isArray(profile?.customLikes) ? profile.customLikes : [];
  const seen = new Set(STARTER_LIKES.map((item) => item.id));
  const extras = [];
  for (const item of custom) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    extras.push(item);
  }
  return [...STARTER_LIKES, ...extras];
}

export function likeLabel(id, profile) {
  const found = listLikeOptions(profile).find((item) => item.id === id);
  return found?.label || id;
}

export function normalizeBook(raw, fallbackAt = new Date()) {
  if (!raw || typeof raw !== "object") return null;
  const title = String(raw.title || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, BOOK_TITLE_MAX);
  if (!title) return null;
  const author = String(raw.author || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, BOOK_AUTHOR_MAX);
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim()
      : newId("book", fallbackAt);
  return { id, title, author };
}

export function timeframeLabel(id) {
  return GOAL_TIMEFRAMES.find((item) => item.id === id)?.label || "";
}

export function normalizeGoal(raw, fallbackAt = new Date()) {
  if (!raw || typeof raw !== "object") return null;
  const title = String(raw.title || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, GOAL_TITLE_MAX);
  if (!title) return null;
  const note = String(raw.note || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, GOAL_NOTE_MAX);
  const timeframe = GOAL_TIMEFRAMES.some((item) => item.id === raw.timeframe)
    ? raw.timeframe
    : "";
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim()
      : newId("goal", fallbackAt);
  return { id, title, note, timeframe, done: raw.done === true };
}

export function listProfileSpeakers(speakers = []) {
  const fromCatalog = (Array.isArray(speakers) ? speakers : [])
    .map((item) => ({
      id: typeof item?.id === "string" ? item.id : "",
      name: typeof item?.name === "string" ? item.name : "",
      role: typeof item?.role === "string" ? item.role : "",
      kind: "speaker",
    }))
    .filter((item) => item.id && item.name);
  const known = new Set(fromCatalog.map((item) => item.id));
  const coaches = SIGNED_COACHES.filter((item) => !known.has(item.id));
  return [...fromCatalog, ...coaches];
}

export function speakerIdsAllowed(speakers = []) {
  return listProfileSpeakers(speakers).map((item) => item.id);
}

export function normalizeProfile(raw, speakers = []) {
  const profile = emptyProfile();
  if (!raw || typeof raw !== "object") return profile;
  profile.avatar = normalizeAvatar(raw.avatar);
  const catalogSpeakerIds = (Array.isArray(speakers) ? speakers : [])
    .map((item) => (typeof item?.id === "string" ? item.id : ""))
    .filter(Boolean);
  const likeOptions = listLikeOptions({
    customLikes: Array.isArray(raw.customLikes)
      ? raw.customLikes.map(normalizeCustomLike).filter(Boolean)
      : [],
  });
  profile.customLikes = likeOptions.filter((item) => !STARTER_LIKES.some((starter) => starter.id === item.id));
  const allowedLikes = new Set(likeOptions.map((item) => item.id));
  profile.likes = uniqueStrings(Array.isArray(raw.likes) ? raw.likes : []).filter((id) =>
    allowedLikes.has(id),
  );
  const incomingSpeakers = uniqueStrings(Array.isArray(raw.speakers) ? raw.speakers : []).filter((id) =>
    /^[a-z0-9-]+$/i.test(id),
  );
  if (catalogSpeakerIds.length) {
    const allowedSpeakers = new Set([...catalogSpeakerIds, ...SIGNED_COACHES.map((item) => item.id)]);
    profile.speakers = incomingSpeakers.filter((id) => allowedSpeakers.has(id));
  } else {
    profile.speakers = incomingSpeakers.slice(0, 40);
  }
  profile.books = (Array.isArray(raw.books) ? raw.books : [])
    .map((item) => normalizeBook(item))
    .filter(Boolean);
  profile.goals = (Array.isArray(raw.goals) ? raw.goals : [])
    .map((item) => normalizeGoal(item))
    .filter(Boolean);
  return profile;
}

export function parseProfileJson(text, speakers = []) {
  if (!text || typeof text !== "string") return emptyProfile();
  try {
    return normalizeProfile(JSON.parse(text), speakers);
  } catch {
    return emptyProfile();
  }
}

export function loadProfile(storage = globalThis.localStorage, speakers = []) {
  if (!storage) return emptyProfile();
  try {
    return parseProfileJson(storage.getItem(PROFILE_STORAGE_KEY), speakers);
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(profile, storage = globalThis.localStorage, speakers = []) {
  const next = normalizeProfile(profile, speakers);
  if (!storage) return next;
  try {
    storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
  return next;
}

export function notifyProfileChange(win = globalThis.window) {
  try {
    win?.dispatchEvent?.(new Event(PROFILE_CHANGE_EVENT));
  } catch {
    /* listeners are optional */
  }
}

export function persistProfile(profile, storage = globalThis.localStorage, speakers = []) {
  const next = saveProfile(profile, storage, speakers);
  notifyProfileChange();
  return next;
}

export function setAvatar(partial, profile) {
  return {
    ...normalizeProfile(profile),
    avatar: normalizeAvatar({ ...(profile?.avatar || {}), ...(partial || {}) }),
  };
}

export function toggleLike(id, profile) {
  const next = normalizeProfile(profile);
  const key = typeof id === "string" ? id.trim() : "";
  if (!key) return next;
  const allowed = new Set(listLikeOptions(next).map((item) => item.id));
  if (!allowed.has(key)) return next;
  const likes = new Set(next.likes);
  if (likes.has(key)) likes.delete(key);
  else likes.add(key);
  next.likes = [...likes];
  return next;
}

export function addCustomLike(label, profile) {
  const next = normalizeProfile(profile);
  const text = normalizeLikeLabel(label);
  if (!text) return { profile: next, item: null };
  const options = listLikeOptions(next);
  const match = options.find((item) => item.label.toLowerCase() === text.toLowerCase());
  if (match) {
    if (!next.likes.includes(match.id)) next.likes = [...next.likes, match.id];
    return { profile: next, item: match };
  }
  const item = {
    id: `like-${text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "custom"}`,
    label: text,
  };
  next.customLikes = [...next.customLikes, item];
  next.likes = [...next.likes, item.id];
  return { profile: next, item };
}

export function toggleSpeaker(id, profile, speakers = []) {
  const next = normalizeProfile(profile, speakers);
  const key = typeof id === "string" ? id.trim() : "";
  if (!key || !speakerIdsAllowed(speakers).includes(key)) return next;
  const set = new Set(next.speakers);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  next.speakers = [...set];
  return next;
}

export function addBook(title, author, profile, now = new Date()) {
  const next = normalizeProfile(profile);
  const item = normalizeBook({ title, author }, now);
  if (!item) return { profile: next, item: null };
  item.id = newId("book", now);
  next.books = [...next.books, item];
  return { profile: next, item };
}

export function removeBook(id, profile) {
  const next = normalizeProfile(profile);
  next.books = next.books.filter((item) => item.id !== id);
  return next;
}

export function addGoal(fields, profile, now = new Date()) {
  const next = normalizeProfile(profile);
  const item = normalizeGoal(fields, now);
  if (!item) return { profile: next, item: null };
  item.id = newId("goal", now);
  next.goals = [...next.goals, item];
  return { profile: next, item };
}

export function setGoalDone(id, done, profile) {
  const next = normalizeProfile(profile);
  next.goals = next.goals.map((item) => (item.id === id ? { ...item, done: done === true } : item));
  return next;
}

export function removeGoal(id, profile) {
  const next = normalizeProfile(profile);
  next.goals = next.goals.filter((item) => item.id !== id);
  return next;
}

export function sectionSummary(section, profile, extras = {}) {
  const data = normalizeProfile(profile, extras.speakers);
  if (section === "avatar") {
    return data.avatar.emoji ? "Illustration chosen" : extras.name ? "Initials from your name" : "Choose a look";
  }
  if (section === "likes") {
    const n = data.likes.length;
    return n ? `${n} chosen` : "None chosen yet";
  }
  if (section === "speakers") {
    const n = data.speakers.length;
    return n ? `${n} favourite${n === 1 ? "" : "s"}` : "None chosen yet";
  }
  if (section === "books") {
    const n = data.books.length;
    return n ? `${n} book${n === 1 ? "" : "s"}` : "None listed yet";
  }
  if (section === "goals") {
    const open = data.goals.filter((item) => !item.done).length;
    const done = data.goals.filter((item) => item.done).length;
    if (!data.goals.length) return "None listed yet";
    if (done && open) return `${open} open · ${done} done`;
    if (done) return `${done} done`;
    return `${open} open`;
  }
  return "";
}
