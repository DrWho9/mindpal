import { civilDateKey } from "../calendar/civil.js";
import {
  WIN_PHOTO_CHANNEL,
  WIN_PHOTO_CHECKING_LABEL,
  WIN_PHOTO_DB,
  WIN_PHOTO_MISSING_LABEL,
  WIN_PHOTO_NOT_SAVED_LABEL,
  WIN_PHOTO_ON_DEVICE_LABEL,
  WIN_PHOTO_PENDING_MS,
  WIN_PHOTO_REF,
  WIN_PHOTO_STORE,
  WIN_PHOTO_UNAVAILABLE_LABEL,
  WIN_SAMPLE_CHOICES,
  WIN_SAMPLE_NONE,
  WIN_SAMPLE_ON_DEVICE_LABEL,
  WIN_SAMPLE_PROTOTYPE_LABEL,
  WIN_SAMPLES,
  deleteAllWinPhotos,
  deleteUnreferencedWinPhotos,
  deleteWinPhotos,
  handleWinPhotoMessage,
  placeholderPhotoBlob,
  postWinPhotoChange,
  putWinPhoto,
  readWinPhoto,
  releaseWinPhotoUrl,
  winPhotoAllowlistId,
  winPhotoChoiceForPath,
  winPhotoChoiceFromBlob,
  winPhotoDatabaseReady,
  winPhotoObjectUrl,
  winSampleBlob,
  winSamplePath,
} from "./win-photos.js";

export {
  WIN_PHOTO_CHANNEL,
  WIN_PHOTO_CHECKING_LABEL,
  WIN_PHOTO_DB,
  WIN_PHOTO_MISSING_LABEL,
  WIN_PHOTO_NOT_SAVED_LABEL,
  WIN_PHOTO_ON_DEVICE_LABEL,
  WIN_PHOTO_REF,
  WIN_PHOTO_STORE,
  WIN_PHOTO_UNAVAILABLE_LABEL,
  WIN_SAMPLE_CHOICES,
  WIN_SAMPLE_NONE,
  WIN_SAMPLE_ON_DEVICE_LABEL,
  WIN_SAMPLE_PROTOTYPE_LABEL,
  WIN_SAMPLES,
  handleWinPhotoMessage,
  readWinPhoto,
  releaseWinPhotoUrl,
  winPhotoChoiceForPath,
  winPhotoChoiceFromBlob,
  winPhotoObjectUrl,
  winSampleBlob,
  winSamplePath,
};

/** Legacy key. Read for migration only. Never overwritten or deleted. */
export const WINS_STORAGE_KEY_V1 = "mindpal.dailyWins.v1";
export const WINS_STORAGE_KEY = "mindpal.dailyWins.v2";
/**
 * Prefix for a copy of an unreadable v2 payload.
 * A save reuses a copy that already holds the same text.
 * Timestamped copies stop at MAX_CORRUPT_BACKUPS.
 * A plain load does not write a copy.
 * When a save cannot keep another copy, saving stays blocked until the person resets.
 * Reset copies that unreadable text into a timestamped backup, then clears the v2 key.
 * The newest three timestamped copies stay. Backup names that are not timestamps are kept.
 */
export const WINS_STORAGE_KEY_V2_BACKUP = "mindpal.dailyWins.v2.backup";
/** Timestamped copies only. The unsuffixed backup key is left alone. */
export const MAX_CORRUPT_BACKUPS = 3;
export const WINS_STORE_VERSION = 2;
export const WIN_SAVED_LABEL = "Saved on this device for today.";
export const WIN_NOT_SAVED_LABEL = "Not saved. This win was not stored on this device.";
/** Removal failed. The win is still in the stored record. */
export const WIN_NOT_REMOVED_LABEL = "Not removed. This win is still saved on this device.";
/** A sample change did not stick. The words on the win stay as they were. */
export const WIN_IMAGE_NOT_CHANGED_LABEL = "Image not changed. The win text is still saved on this device.";
export const WIN_IMAGE_UPDATED_LABEL = "Sample image updated on this device.";
export const WIN_IMAGE_REMOVED_LABEL = "Sample image removed on this device.";
/** Shown on Win of the day only while a save cannot be stored. */
export const WIN_RESET_LABEL = "Reset wins on this device";
const WIN_PHOTO_PENDING_SECONDS = Math.round(WIN_PHOTO_PENDING_MS / 1000);
export const WIN_RESET_NOTE =
  "Saving is blocked. Reset keeps the unreadable wins record as a backup on this device, then clears it so a new win can be saved. Placeholder images stored for wins on this device are removed. One saved in the last " +
  WIN_PHOTO_PENDING_SECONDS +
  " seconds can stay. Older backup copies are dropped only to keep the newest three. This is a prototype, not real private storage.";
export const WIN_RESET_CONFIRM = "Confirm reset on this device";
export const WIN_RESET_CANCEL = "Keep the record";
export const WIN_RESET_DONE =
  "Reset on this device. The unreadable record was kept as a backup. Placeholder images stored for wins on this device were removed. One saved in the last " +
  WIN_PHOTO_PENDING_SECONDS +
  " seconds can stay. A new win can be saved on this device.";
export const WIN_RESET_IMAGES_LEFT =
  "Reset on this device. The unreadable record was kept as a backup. Placeholder images could not be removed from this device. A new win can be saved on this device.";
export const WIN_RESET_UNNEEDED =
  "Reset was not needed. The wins record on this device can already be read.";
export const WIN_RESET_FAILED =
  "Reset did not happen. The unreadable record is still on this device.";

/**
 * The done line after a reset that cleared the wins record.
 * WIN_RESET_DONE only when image cleanup finished.
 * A missing cleanup, a skipped database, or a failed list says the images could not be removed.
 */
export function winResetDoneLabel(cleanup) {
  if (!cleanup || cleanup.failed === true || cleanup.unavailable === true) return WIN_RESET_IMAGES_LEFT;
  return WIN_RESET_DONE;
}
/**
 * Stored when a win has no time of its own.
 * This is not the moment the record was read. The card says so.
 */
export const WIN_UNKNOWN_TIME = "1970-01-01T00:00:00.000Z";
export const WIN_UNKNOWN_TIME_LABEL = "Time not recorded";
const WRITE_PROBE_KEY = "mindpal.dailyWins.v2.writeprobe";
/** Same-tab panels listen for this. Other tabs use the storage event instead. */
export const WINS_CHANGE_EVENT = "mindpal-wins-change";
export const WIN_TEXT_MAX = 280;

/**
 * Bundled fake picture served with the app.
 * This is not a user photo and not private photo storage.
 * When IndexedDB is available, the bytes live in mindpal-photos under the win id
 * and this record stores WIN_PHOTO_REF only. When it is not available, the record
 * keeps this path and the card says so.
 */
export const WIN_PLACEHOLDER_PHOTO = "/mindpal/win-placeholder.svg";
export const WIN_PHOTO_PROTOTYPE_LABEL =
  "Prototype: placeholder image, not real private storage.";

/** Always-on Today control. Not a numbered step and not a STEP_IDS entry. */
export const WIN_OF_THE_DAY_TITLE = "Win of the day";
export const WIN_OF_THE_DAY_EYEBROW = "WIN OF THE DAY";
export const WIN_OF_THE_DAY_LEDE =
  "See today’s wins, or add one now — morning included. Small ones count. You’ll meet them again before sleep.";
export const WIN_OF_THE_DAY_EMPTY =
  "Nothing saved yet today. Add one whenever you like.";
/** How many past days the Win of the day card shows before Show more. */
export const PAST_WINS_PAGE_DAYS = 7;
export const PAST_WINS_TITLE = "Past wins";
export const PAST_WINS_EMPTY =
  "No earlier wins saved on this device. This prototype keeps wins on this device only.";
export const PAST_WINS_SHOW_MORE = "Show more";
export const PAST_WINS_REMOVE = "Remove";
export const PAST_WINS_REMOVE_CONFIRM = "Confirm remove";
export const PAST_WINS_REMOVE_KEEP = "Keep this win";
/** Group heading for wins stored under a day after today. */
export const PAST_WINS_LATER = "Later dates";
/** Group heading for saved days before today, when later dates are also shown. */
export const PAST_WINS_EARLIER = "Earlier days";
/** Small note on a day key that is after today. */
export const PAST_WINS_FUTURE_NOTE = "Future date";

function pastWinNameParts(text, dayLabel, timeLabel) {
  const words = typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
  const day = typeof dayLabel === "string" ? dayLabel.replace(/\s+/g, " ").trim() : "";
  const time = typeof timeLabel === "string" ? timeLabel.replace(/\s+/g, " ").trim() : "";
  const clipped = words.length > 80 ? `${words.slice(0, 77).trimEnd()}...` : words;
  return { clipped, day, time };
}

/** Clock time for an accessible name. Empty when the win has no recorded time. */
export function pastWinTimeLabel(at) {
  if (!at || at === WIN_UNKNOWN_TIME) return "";
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

/** Accessible name for Remove. The visible button stays short. Day and time keep duplicate text apart. */
export function pastWinRemoveLabel(text, dayLabel, timeLabel) {
  const { clipped, day, time } = pastWinNameParts(text, dayLabel, timeLabel);
  const extra = [day, time].filter(Boolean);
  if (!clipped && extra.length === 0) return "Remove win";
  if (!clipped) return `Remove win, ${extra.join(", ")}`;
  return `Remove win: ${[clipped, ...extra].join(", ")}`;
}

/** Accessible name for the confirm step. */
export function pastWinConfirmLabel(text, dayLabel, timeLabel) {
  const name = pastWinRemoveLabel(text, dayLabel, timeLabel);
  if (name === "Remove win") return "Confirm remove win";
  return `Confirm ${name.charAt(0).toLowerCase()}${name.slice(1)}`;
}

/** Accessible name for Keep. The visible button stays "Keep this win". */
export function pastWinKeepLabel(text, dayLabel, timeLabel) {
  const name = pastWinRemoveLabel(text, dayLabel, timeLabel);
  if (name === "Remove win") return "Keep this win";
  if (name.startsWith("Remove win: ")) return `Keep this win: ${name.slice("Remove win: ".length)}`;
  if (name.startsWith("Remove win, ")) return `Keep this win, ${name.slice("Remove win, ".length)}`;
  return "Keep this win";
}

/**
 * Where focus goes after a past win is removed.
 * The next win in the open list, otherwise the previous one, otherwise the list heading.
 * `fromIndex` picks this occurrence when the same id is stored more than once.
 * `index` is where that target sits after this win is gone.
 */
export function pastWinFocusAfter(days, id, fromIndex) {
  const flat = [];
  const list = Array.isArray(days) ? days : [];
  for (const day of list) {
    const items = day && Array.isArray(day.items) ? day.items : [];
    for (const item of items) {
      if (item && typeof item.id === "string" && item.id) flat.push(item.id);
    }
  }
  const preferred = Number.isInteger(fromIndex) ? fromIndex : -1;
  const index = preferred >= 0 && preferred < flat.length && flat[preferred] === id
    ? preferred
    : flat.indexOf(id);
  if (index >= 0 && flat[index + 1]) return { kind: "win", id: flat[index + 1], index };
  if (index > 0 && flat[index - 1]) return { kind: "win", id: flat[index - 1], index: index - 1 };
  return { kind: "summary" };
}

function pastDayItems(day) {
  return day && Array.isArray(day.items) ? day.items : [];
}

function pastFlatIndex(days, key, pos) {
  let index = 0;
  for (const day of days) {
    const items = pastDayItems(day);
    if (day && day.key === key) return pos >= 0 && pos < items.length ? index + pos : -1;
    index += items.length;
  }
  return -1;
}

function pastFocusAt(days, key, pos) {
  const day = days.find((item) => item && item.key === key);
  const item = pastDayItems(day)[pos];
  const index = pastFlatIndex(days, key, pos);
  if (!item || typeof item.id !== "string" || !item.id || index < 0) return { kind: "summary" };
  return { kind: "win", id: item.id, key, pos, index };
}

/**
 * Whether Confirm remove still points at the win the person picked.
 * The id, the day, and the position on that day must all match.
 * A list shift that puts a different win in that slot clears the confirm step.
 * focus is where to move when the confirm step cannot stay.
 */
export function pastWinHoldAfterRefresh(days, hold) {
  const list = Array.isArray(days) ? days : [];
  const summary = { keep: false, focus: { kind: "summary" } };
  if (!hold || typeof hold.id !== "string" || !hold.id || typeof hold.key !== "string" || !hold.key) return summary;
  if (!Number.isInteger(hold.pos) || hold.pos < 0) return summary;
  const day = list.find((item) => item && item.key === hold.key);
  const items = pastDayItems(day);
  if (items[hold.pos] && items[hold.pos].id === hold.id) {
    return { keep: true, focus: pastFocusAt(list, hold.key, hold.pos) };
  }
  let closest = -1;
  items.forEach((item, index) => {
    if (!item || item.id !== hold.id) return;
    if (closest < 0 || Math.abs(index - hold.pos) < Math.abs(closest - hold.pos)) closest = index;
  });
  if (closest >= 0) return { keep: false, focus: pastFocusAt(list, hold.key, closest) };
  if (items.length > 0) {
    const pos = Math.min(hold.pos, items.length - 1);
    return { keep: false, focus: pastFocusAt(list, hold.key, pos) };
  }
  const newer = list.filter((item) => item && typeof item.key === "string" && item.key > hold.key && pastDayItems(item).length);
  const older = list.filter((item) => item && typeof item.key === "string" && item.key < hold.key && pastDayItems(item).length);
  const neighbor = newer.length ? newer[newer.length - 1] : older[0];
  if (!neighbor) return summary;
  const pos = newer.length ? pastDayItems(neighbor).length - 1 : 0;
  return { keep: false, focus: pastFocusAt(list, neighbor.key, pos) };
}

/**
 * Heading level for one day in Past wins.
 * When Later dates or Earlier days is on the page, that group is an h3 and the day is an h4.
 * When no group is shown, the day stays an h3 under the card title.
 */
export function pastWinDayHeading(days) {
  const list = Array.isArray(days) ? days : [];
  return list.some((day) => day && day.future) ? "h4" : "h3";
}

/**
 * True when focus is inside the confirm row or Past wins.
 * A refresh that clears Confirm uses this so it does not pull focus back from the win input.
 */
export function pastWinFocusMove(active) {
  if (!active || typeof active.closest !== "function") return false;
  try {
    if (active.closest(".mp-past-remove-row")) return true;
    if (active.closest(".mp-past-wins")) return true;
  } catch {
    return false;
  }
  return false;
}

/** Status paragraph id. One per wins panel, so Today does not repeat the same id. */
export function winStatusId(variant) {
  const name = typeof variant === "string" && /^[A-Za-z0-9]+$/.test(variant) ? variant : "win";
  return `mp-win-status-${name}`;
}
/**
 * How long Save waits for a win write. A hung photo database aborts at this point.
 * The words can still be stored. A result that arrives after the watch gives up is ignored.
 */
export const WIN_SAVE_TIMEOUT_MS = 10000;
/** Extra wait after abort so a photo failure can still store the win text. */
export const WIN_SAVE_ABORT_GRACE_MS = 50;

let winSaveTimeoutMs = WIN_SAVE_TIMEOUT_MS;
let winSaveAbortGraceMs = WIN_SAVE_ABORT_GRACE_MS;

export function setWinSaveTimeoutMs(ms) {
  const next = Number(ms);
  winSaveTimeoutMs = Number.isFinite(next) && next >= 0 ? next : WIN_SAVE_TIMEOUT_MS;
}

export function winSaveTimeoutLimit() {
  return winSaveTimeoutMs;
}

export function setWinSaveAbortGraceMs(ms) {
  const next = Number(ms);
  winSaveAbortGraceMs = Number.isFinite(next) && next >= 0 ? next : WIN_SAVE_ABORT_GRACE_MS;
}

export function winSaveAbortGraceLimit() {
  return winSaveAbortGraceMs;
}

const MAX_DAYS = 60;

export function emptyWinsDay(date = new Date()) {
  return [];
}

/**
 * The record may name the bundled placeholder path, or the IndexedDB reference.
 * Image bytes are never stored in this JSON. Any other value is dropped.
 */
function allowedPhoto(raw) {
  if (raw === WIN_PLACEHOLDER_PHOTO || raw === WIN_PHOTO_REF) return raw;
  if (typeof raw === "string" && WIN_SAMPLES.some((item) => item.path === raw)) return raw;
  return undefined;
}

export function normalizeWin(raw, fallbackAt = new Date(WIN_UNKNOWN_TIME)) {
  if (!raw || typeof raw !== "object") return null;
  const text = typeof raw.text === "string" ? raw.text.trim().slice(0, WIN_TEXT_MAX) : "";
  if (!text) return null;
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim()
      : `win-${fallbackAt.getTime()}`;
  const at =
    typeof raw.at === "string" && raw.at
      ? raw.at
      : WIN_UNKNOWN_TIME;
  const win = { id, text, at };
  const photo = allowedPhoto(raw.photo);
  if (photo) win.photo = photo;
  return win;
}

export function emptyWinsStore() {
  return { version: WINS_STORE_VERSION, days: {} };
}

function shortHash(value) {
  let hash = 5381;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Stable id for a win that had none, or that repeated an id already used that day.
 * A short hash of the index, the time, and the text. A missing time uses
 * WIN_UNKNOWN_TIME, not the clock, so a later read matches.
 */
export function stableWinId(index, at, text, salt = 0) {
  const stamp = typeof at === "string" && at ? at : WIN_UNKNOWN_TIME;
  const body = typeof text === "string" ? text : "";
  const saltPart = salt > 0 ? `-${salt}` : "";
  return `win-${index}${saltPart}-${shortHash(`${index}\n${salt}\n${stamp}\n${body}`)}`;
}

function withUniqueIds(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (let index = 0; index < list.length; index += 1) {
    const raw = list[index];
    const win = normalizeWin(raw);
    if (!win) continue;
    const rawId = raw && typeof raw === "object" && typeof raw.id === "string" ? raw.id.trim() : "";
    if (!rawId) win.id = stableWinId(index, win.at, win.text, 0);
    if (seen.has(win.id)) {
      let salt = 0;
      let next = stableWinId(index, win.at, win.text, salt);
      while (seen.has(next)) {
        salt += 1;
        next = stableWinId(index, win.at, win.text, salt);
      }
      win.id = next;
      /*
       * Both copies named one blob. The first id keeps it.
       * This copy uses the bundled placeholder path, so it does not claim that blob.
       * Load does not write. The next save stores the path.
       */
      if (win.photo === WIN_PHOTO_REF) win.photo = WIN_PLACEHOLDER_PHOTO;
    }
    seen.add(win.id);
    out.push(win);
  }
  return out;
}

export function normalizeWinsStore(raw) {
  const store = emptyWinsStore();
  if (!raw || typeof raw !== "object") return store;
  const days = raw.days && typeof raw.days === "object" ? raw.days : {};
  for (const [key, list] of Object.entries(days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(list)) continue;
    store.days[key] = withUniqueIds(list);
  }
  return store;
}

export function parseWinsJson(text) {
  if (!text || typeof text !== "string") return emptyWinsStore();
  try {
    return normalizeWinsStore(JSON.parse(text));
  } catch {
    return emptyWinsStore();
  }
}

/**
 * Copy a v1 store into the v2 shape.
 * Returns null when the text cannot be read, so the caller must not write v2.
 * Wins keep id, text and at. No photo is copied or invented.
 */
export function migrateV1WinsJson(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const daysIn = raw.days;
  if (!daysIn || typeof daysIn !== "object" || Array.isArray(daysIn)) return null;
  const store = emptyWinsStore();
  for (const [key, list] of Object.entries(daysIn)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(list)) continue;
    store.days[key] = withUniqueIds(
      list.map((item) =>
        item && typeof item === "object" ? { id: item.id, text: item.text, at: item.at } : null,
      ),
    );
  }
  return pruneDays(store);
}

/**
 * Pure downgrade of a v2 store into the v1 shape.
 * Returns { version: 1, days } with id and text. at is included only when a time
 * was recorded. WIN_UNKNOWN_TIME is left out, so the export does not invent a time.
 * Photos are left out, including the IndexedDB reference and the placeholder path.
 * This does not read or write storage, and it does not delete or create the v1 key.
 *
 * Migration leaves mindpal.dailyWins.v1 as it is, including when that key is already
 * absent. Deleting it would drop the only record v1 code can read. Writing it during
 * migration would replace an original record, or create one, without a separate decision.
 * A rollback to code that reads the v1 key can take JSON.stringify(exportV1(store))
 * and store that text under the v1 key as its own step.
 */
export function exportV1(store) {
  const normalized = typeof store === "string" ? parseWinsJson(store) : normalizeWinsStore(store);
  const days = {};
  for (const [key, list] of Object.entries(normalized.days)) {
    if (!Array.isArray(list) || list.length === 0) continue;
    days[key] = list.map((item) => {
      const win = { id: item.id, text: item.text };
      if (typeof item.at === "string" && item.at && item.at !== WIN_UNKNOWN_TIME) win.at = item.at;
      return win;
    });
  }
  return { version: 1, days };
}

function readKey(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function readWinsStoreText(text) {
  if (typeof text !== "string" || text.length === 0) return null;
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (Object.prototype.hasOwnProperty.call(raw, "days")) {
    if (!raw.days || typeof raw.days !== "object" || Array.isArray(raw.days)) return null;
  }
  return normalizeWinsStore(raw);
}

function migratedV1(storage) {
  const v1Text = readKey(storage, WINS_STORAGE_KEY_V1);
  if (typeof v1Text !== "string" || v1Text.length === 0) return null;
  return migrateV1WinsJson(v1Text);
}

function namesFromStorage(storage) {
  if (!storage || typeof storage !== "object") return null;
  if (typeof storage.length === "number" && typeof storage.key === "function") {
    const names = [];
    for (let i = 0; i < storage.length; i += 1) names.push(storage.key(i));
    return names;
  }
  const bag = storage.store;
  if (!bag || typeof bag !== "object") return null;
  if (typeof bag.keys === "function") return [...bag.keys()];
  return Object.keys(bag);
}

function backupKeys(storage) {
  const names = namesFromStorage(storage);
  if (!names) return null;
  const prefix = `${WINS_STORAGE_KEY_V2_BACKUP}.`;
  return names.filter(
    (key) => typeof key === "string" && (key === WINS_STORAGE_KEY_V2_BACKUP || key.startsWith(prefix)),
  );
}

function quarantineCorruptWins(storage, v2Text, now = new Date()) {
  let keys;
  try {
    keys = backupKeys(storage);
  } catch {
    return null;
  }
  if (keys == null) return null;
  for (const key of keys) {
    if (readKey(storage, key) === v2Text) return key;
  }
  const prefix = `${WINS_STORAGE_KEY_V2_BACKUP}.`;
  const stamped = keys.filter((key) => isKnownBackupKey(key));
  if (stamped.length >= MAX_CORRUPT_BACKUPS) return null;
  const stamp = now.getTime();
  for (let n = 0; n < 50; n += 1) {
    const key = n === 0 ? `${prefix}${stamp}` : `${prefix}${stamp}.${n}`;
    let existing;
    try {
      existing = storage.getItem(key);
    } catch {
      return null;
    }
    if (existing === v2Text) return key;
    if (typeof existing === "string" && existing.length > 0) continue;
    try {
      storage.setItem(key, v2Text);
      if (storage.getItem(key) === v2Text) return key;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Read the wins record without writing.
 * A cross-tab refresh uses this so a storage event cannot copy v1 into v2.
 */
export function readWinsStore(storage = globalThis.localStorage) {
  if (!storage) return emptyWinsStore();
  const v2Text = readKey(storage, WINS_STORAGE_KEY);
  if (typeof v2Text === "string" && v2Text.length > 0) {
    const parsed = readWinsStoreText(v2Text);
    if (parsed) return parsed;
    return migratedV1(storage) || emptyWinsStore();
  }
  return migratedV1(storage) || emptyWinsStore();
}

export function loadWinsStore(storage = globalThis.localStorage) {
  if (!storage) return emptyWinsStore();
  const v2Text = readKey(storage, WINS_STORAGE_KEY);
  if (typeof v2Text === "string" && v2Text.length > 0) {
    const parsed = readWinsStoreText(v2Text);
    if (parsed) return parsed;
    return migratedV1(storage) || emptyWinsStore();
  }
  const migrated = migratedV1(storage);
  if (!migrated) return emptyWinsStore();
  try {
    storage.setItem(WINS_STORAGE_KEY, JSON.stringify(migrated));
  } catch {
    /* quota or private mode: leave the v1 key untouched */
  }
  return migrated;
}

function referencedPhotoIds(store) {
  const ids = [];
  const days = store && store.days && typeof store.days === "object" ? store.days : {};
  for (const list of Object.values(days)) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (item && item.photo === WIN_PHOTO_REF && typeof item.id === "string" && item.id) ids.push(item.id);
    }
  }
  return ids;
}

function removedPhotoIds(previousStore, nextStore) {
  const keep = new Set(referencedPhotoIds(nextStore));
  return referencedPhotoIds(previousStore).filter((id) => !keep.has(id));
}

function idlePhotoCleanup() {
  return Promise.resolve({ deleted: [] });
}

function pruneDays(store) {
  const keys = Object.keys(store.days).sort();
  if (keys.length <= MAX_DAYS) return store;
  const keep = keys.slice(-MAX_DAYS);
  const days = {};
  for (const key of keep) days[key] = store.days[key];
  return { version: WINS_STORE_VERSION, days };
}

function persistWins(store, storage, now = new Date()) {
  const next = pruneDays(normalizeWinsStore(store));
  const idle = idlePhotoCleanup();
  if (!storage) return { store: next, saved: true, photoCleanup: idle };
  const current = readKey(storage, WINS_STORAGE_KEY);
  const readable = typeof current === "string" && current.length > 0 ? readWinsStoreText(current) : null;
  /*
   * Read the previous record before the write. A later cleanup only deletes placeholder
   * images for ids that readable record named and this save dropped. It does not sweep
   * unknown keys, so an image this tab or another tab has stored but not yet referenced can stay.
   * An unreadable record has no ids. After it is replaced, images the new record
   * does not name are removed, except one stored in the last WIN_PHOTO_PENDING_MS.
   * A plain load never reaches this function.
   */
  if (typeof current === "string" && current.length > 0 && !readable) {
    const backupKey = quarantineCorruptWins(storage, current, now);
    if (!backupKey || readKey(storage, backupKey) !== current) {
      clearProbeMemory();
      return { store: next, saved: false, photoCleanup: idle };
    }
  }
  let serial;
  try {
    serial = JSON.stringify(next);
    storage.setItem(WINS_STORAGE_KEY, serial);
  } catch {
    /* private mode / quota; the v1 key is never written */
    clearProbeMemory();
    return { store: next, saved: false, photoCleanup: idle };
  }
  const saved = readKey(storage, WINS_STORAGE_KEY) === serial;
  if (!saved) {
    clearProbeMemory();
    return { store: next, saved: false, photoCleanup: idle };
  }
  let photoCleanup = idle;
  if (readable) photoCleanup = deleteWinPhotos(removedPhotoIds(readable, next));
  else if (typeof current === "string" && current.length > 0) {
    photoCleanup = deleteUnreferencedWinPhotos(referencedPhotoIds(next));
  }
  return { store: next, saved: true, photoCleanup };
}

export function saveWinsStore(store, storage = globalThis.localStorage, now = new Date()) {
  return persistWins(store, storage, now).store;
}

function backupSuffix(key) {
  const prefix = `${WINS_STORAGE_KEY_V2_BACKUP}.`;
  return key.startsWith(prefix) ? key.slice(prefix.length) : "";
}

/** A timestamped copy is digits, or digits, a dot, and digits. Other names are kept. */
function isKnownBackupKey(key) {
  return /^\d+(?:\.\d+)?$/.test(backupSuffix(key));
}

function knownBackupRank(key) {
  const [stampText, extraText] = backupSuffix(key).split(".");
  const stamp = Number(stampText);
  const extra = extraText == null || extraText === "" ? 0 : Number(extraText);
  return [Number.isFinite(stamp) ? stamp : 0, Number.isFinite(extra) ? extra : 0];
}

function compareKnownBackupAge(a, b) {
  const [aStamp, aExtra] = knownBackupRank(a);
  const [bStamp, bExtra] = knownBackupRank(b);
  if (aStamp !== bStamp) return aStamp - bStamp;
  return aExtra - bExtra;
}

/**
 * Last probe for one storage object and one unreadable text.
 * A later check of that same text does not write again, until a failed save forgets it.
 * Another tab can change the record or free space. That tab's storage event must call
 * clearWinsProbeCache, or this answer stays stale. The event handler only forgets the
 * answer. It does not write a new probe. winsSaveBlockedQuiet is the read-only check
 * a refresh uses so the event itself does not write.
 */
let probeMemory = null;

export function clearWinsProbeCache() {
  probeMemory = null;
}

function clearProbeMemory() {
  clearWinsProbeCache();
}

/**
 * True when a backup of this exact text cannot be stored.
 * The probe value is that text, so a one-byte write cannot hide a larger record.
 * The probe key is not a wins backup. removeItem clears it after the check.
 * If removeItem throws, or the key is still there, the probe can remain and this returns true.
 * The answer is remembered for this storage and this text until a failed save forgets it,
 * or until clearWinsProbeCache runs because another tab changed a wins key.
 */
function freshBackupWriteFails(storage, text) {
  const sample = typeof text === "string" ? text : "";
  if (probeMemory && probeMemory.storage === storage && probeMemory.text === sample) {
    return probeMemory.fails;
  }
  let fails = true;
  try {
    storage.setItem(WRITE_PROBE_KEY, sample);
    fails = storage.getItem(WRITE_PROBE_KEY) !== sample;
  } catch {
    fails = true;
  }
  try {
    if (typeof storage.removeItem === "function") storage.removeItem(WRITE_PROBE_KEY);
  } catch {
    /* the probe key can remain */
  }
  const left = readKey(storage, WRITE_PROBE_KEY);
  if (typeof left === "string" && left.length > 0) fails = true;
  probeMemory = { storage, text: sample, fails };
  return fails;
}

/**
 * True when a save cannot store a new win because the v2 record is unreadable
 * and a backup of that text cannot be reused or written.
 * A matching backup can still be reused, so that case is not blocked.
 * A readable store is not blocked.
 * When the cap is not full, the first check for this text may write and remove a probe
 * the same size as the record. The same text is not probed again on this storage
 * until a failed save forgets that answer. A plain load does not call this.
 */
export function winsSaveBlocked(storage = globalThis.localStorage) {
  if (!storage) return false;
  const current = readKey(storage, WINS_STORAGE_KEY);
  if (typeof current !== "string" || current.length === 0) return false;
  if (readWinsStoreText(current)) return false;
  let keys;
  try {
    keys = backupKeys(storage);
  } catch {
    return true;
  }
  if (keys == null) return true;
  for (const key of keys) {
    if (readKey(storage, key) === current) return false;
  }
  const known = keys.filter(isKnownBackupKey);
  if (known.length >= MAX_CORRUPT_BACKUPS) return true;
  return freshBackupWriteFails(storage, current);
}

/**
 * Read-only blocked check. Never writes a probe and never uses the remembered answer.
 * True when the record is unreadable and a backup cannot be reused or the cap is full.
 * When a probe would be needed to know about quota, this returns false. The next save
 * can probe. A storage event uses this so the refresh does not write.
 */
export function winsSaveBlockedQuiet(storage = globalThis.localStorage) {
  if (!storage) return false;
  const current = readKey(storage, WINS_STORAGE_KEY);
  if (typeof current !== "string" || current.length === 0) return false;
  if (readWinsStoreText(current)) return false;
  let keys;
  try {
    keys = backupKeys(storage);
  } catch {
    return true;
  }
  if (keys == null) return true;
  for (const key of keys) {
    if (readKey(storage, key) === current) return false;
  }
  return keys.filter(isKnownBackupKey).length >= MAX_CORRUPT_BACKUPS;
}

/** True for a wins key, a backup key, the probe key, or a storage.clear() event (null key). */
export function isWinsStorageKey(key) {
  if (key == null) return true;
  if (typeof key !== "string") return false;
  if (
    key === WINS_STORAGE_KEY
    || key === WINS_STORAGE_KEY_V1
    || key === WRITE_PROBE_KEY
    || key === WINS_STORAGE_KEY_V2_BACKUP
  ) {
    return true;
  }
  return key.startsWith(`${WINS_STORAGE_KEY_V2_BACKUP}.`);
}

/**
 * Another tab changed a wins key. Forget the probe answer and tell the caller to refresh.
 * Does not write. Returns false for unrelated keys so the caller does not refresh.
 */
export function handleWinsStorageEvent(event) {
  if (!event || !isWinsStorageKey(event.key)) return false;
  clearWinsProbeCache();
  return true;
}

/**
 * Listen for same-tab saves, other-tab wins keys, and photo blob messages.
 * onSameTab may check the probe, because a save in this tab already wrote.
 * onOtherTab must only read. This function does not write and does not post a
 * photo message, so a received message cannot loop.
 * Returns a function that removes the listeners.
 */
export function listenForWinsChanges(target, onSameTab, onOtherTab) {
  if (!target || typeof target.addEventListener !== "function") return () => {};
  function onSame() {
    if (typeof onSameTab === "function") onSameTab();
  }
  function onStorage(event) {
    if (!handleWinsStorageEvent(event)) return;
    if (typeof onOtherTab === "function") onOtherTab();
  }
  function onPhoto(event) {
    if (!handleWinPhotoMessage(event)) return;
    if (typeof onOtherTab === "function") onOtherTab();
  }
  target.addEventListener(WINS_CHANGE_EVENT, onSame);
  target.addEventListener("storage", onStorage);
  let channel = null;
  try {
    if (typeof BroadcastChannel === "function") {
      channel = new BroadcastChannel(WIN_PHOTO_CHANNEL);
      channel.onmessage = onPhoto;
    }
  } catch {
    channel = null;
  }
  return function stopWinsChangeListener() {
    target.removeEventListener(WINS_CHANGE_EVENT, onSame);
    target.removeEventListener("storage", onStorage);
    if (channel) {
      channel.onmessage = null;
      try {
        channel.close();
      } catch {
        /* already closed */
      }
    }
  };
}

function removeStoredKey(storage, key) {
  if (!storage || typeof storage.removeItem !== "function") return false;
  try {
    storage.removeItem(key);
  } catch {
    return false;
  }
  const left = readKey(storage, key);
  return left == null || left === "";
}

function placeCorruptBackup(storage, text, now) {
  let keys;
  try {
    keys = backupKeys(storage);
  } catch {
    return null;
  }
  if (keys == null) return null;
  for (const key of keys) {
    if (readKey(storage, key) === text) return key;
  }
  const prefix = `${WINS_STORAGE_KEY_V2_BACKUP}.`;
  const stamp = now.getTime();
  for (let n = 0; n < 50; n += 1) {
    const key = n === 0 ? `${prefix}${stamp}` : `${prefix}${stamp}.${n}`;
    let existing;
    try {
      existing = storage.getItem(key);
    } catch {
      return null;
    }
    if (existing === text) return key;
    if (typeof existing === "string" && existing.length > 0) continue;
    try {
      storage.setItem(key, text);
      if (storage.getItem(key) === text) return key;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * User-triggered recovery for a blocked save.
 * Copies the unreadable v2 text into a timestamped backup first.
 * Clears the v2 key only after that copy is in place.
 * Then drops the oldest timestamped copies until MAX_CORRUPT_BACKUPS remain.
 * The copy of the unreadable text is not dropped. Unknown backup names,
 * the unsuffixed backup key, and the v1 key are not removed.
 * If the keys cannot be listed, or the copy cannot be written, nothing is cleared.
 * Does nothing when saving is not blocked, so a readable store stays put.
 * After the v2 key is cleared, stored placeholder images are deleted. The unreadable text
 * cannot name those ids, and the live record no longer references them.
 * An image stored in the last WIN_PHOTO_PENDING_MS stays, so this tab or another tab can finish saving it.
 * If the photo database cannot be listed, the images stay.
 * If the reset does not clear the key, the images stay.
 */
export function resetBlockedWins(storage = globalThis.localStorage, now = new Date()) {
  const idle = { cleared: false, needed: false, kept: [] };
  if (!storage || !winsSaveBlocked(storage)) return idle;
  const current = readKey(storage, WINS_STORAGE_KEY);
  if (typeof current !== "string" || current.length === 0 || readWinsStoreText(current)) return idle;
  let keys;
  try {
    keys = backupKeys(storage);
  } catch {
    keys = null;
  }
  if (keys == null) return { cleared: false, needed: true, kept: [] };
  const placed = placeCorruptBackup(storage, current, now);
  if (!placed || readKey(storage, placed) !== current) {
    return { cleared: false, needed: true, kept: [] };
  }
  let after;
  try {
    after = backupKeys(storage);
  } catch {
    after = null;
  }
  if (after == null || !removeStoredKey(storage, WINS_STORAGE_KEY)) {
    return { cleared: false, needed: true, kept: after || [placed] };
  }
  const prefix = `${WINS_STORAGE_KEY_V2_BACKUP}.`;
  const known = after.filter(isKnownBackupKey).sort(compareKnownBackupAge);
  const unknown = after.filter((key) => key.startsWith(prefix) && !isKnownBackupKey(key));
  const plain = after.filter((key) => key === WINS_STORAGE_KEY_V2_BACKUP);
  const remain = known.slice();
  while (remain.length > MAX_CORRUPT_BACKUPS) {
    const index = remain.findIndex((key) => readKey(storage, key) !== current);
    if (index < 0) break;
    const [dropped] = remain.splice(index, 1);
    removeStoredKey(storage, dropped);
  }
  return {
    cleared: true,
    needed: true,
    kept: remain.concat(unknown, plain),
    photoCleanup: deleteAllWinPhotos(),
  };
}

export function winsForDate(store, date = new Date()) {
  const key = civilDateKey(date);
  const list = store?.days?.[key];
  return Array.isArray(list) ? list.slice() : [];
}

/** Local calendar label for a YYYY-MM-DD key. Uses the device locale, same as the card clock. */
export function formatWinDayLabel(key, locales) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof key === "string" ? key : "");
  if (!match) return "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const locale = locales || (typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-AU");
  try {
    return date.toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return key;
  }
}

/** Noon on that civil day, so removeWin lands on the same local date. */
export function civilDateFromKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof key === "string" ? key : "");
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
}

export function emptyPastWins() {
  return { days: [], totalDays: 0, hasMore: false, shown: PAST_WINS_PAGE_DAYS };
}

/**
 * Days other than `date`, newest first. Today is not included.
 * A future day key is included with its real date, so it is not hidden.
 * Wins inside a day stay in the order they were saved.
 * `shown` is how many days to return. The rest stay behind hasMore.
 * This does not read or write storage.
 */
export function pastWinsPage(store, date = new Date(), shown = PAST_WINS_PAGE_DAYS) {
  const today = civilDateKey(date instanceof Date ? date : new Date());
  const daysIn = store && store.days && typeof store.days === "object" ? store.days : {};
  const keys = Object.keys(daysIn)
    .filter(
      (key) =>
        key !== today
        && /^\d{4}-\d{2}-\d{2}$/.test(key)
        && Array.isArray(daysIn[key])
        && daysIn[key].length > 0,
    )
    .sort()
    .reverse();
  const count = Number.isFinite(shown) && shown > 0 ? Math.floor(shown) : PAST_WINS_PAGE_DAYS;
  return {
    days: keys.slice(0, count).map((key) => ({
      key,
      label: formatWinDayLabel(key),
      future: key > today,
      items: daysIn[key].slice(),
    })),
    totalDays: keys.length,
    hasMore: keys.length > count,
    shown: count,
  };
}

/**
 * The line Save shows for a finished watch.
 * An abandoned watch that did not store the win says it was not saved.
 * A stored win whose placeholder image failed says the photo was not saved.
 * An empty string means the words were blank, so the card asks for a few words.
 */
export function winSaveStatusLabel(result, photoRequested = false) {
  if (!result || result.failed === true || result.abandoned === true) {
    if (result && result.saved === true && (result.photoError === true || photoRequested === true)) {
      return WIN_PHOTO_NOT_SAVED_LABEL;
    }
    return WIN_NOT_SAVED_LABEL;
  }
  if (!result.item) return "";
  if (result.saved !== true) return WIN_NOT_SAVED_LABEL;
  if (result.photoError === true) return WIN_PHOTO_NOT_SAVED_LABEL;
  if (result.photoFallback === true) return WIN_PHOTO_UNAVAILABLE_LABEL;
  return WIN_SAVED_LABEL;
}

/**
 * Run one save and stop waiting after `ms` milliseconds.
 * At the deadline the signal aborts so a hung photo write can fail.
 * If the save finishes during the grace period, that result is used.
 * After the grace, attempt.dropped is set and a late result is ignored.
 * The returned promise settles once. A late write must see attempt.dropped and not store again.
 */
export function watchSave(start, ms = winSaveTimeoutLimit(), graceMs = winSaveAbortGraceLimit()) {
  const limit = Number.isFinite(ms) && ms >= 0 ? ms : winSaveTimeoutLimit();
  const grace = Number.isFinite(graceMs) && graceMs >= 0 ? graceMs : winSaveAbortGraceLimit();
  const attempt = { dropped: false };
  let settled = false;
  let timer = null;
  let graceTimer = null;
  let controller = null;
  try {
    controller = typeof AbortController === "function" ? new AbortController() : null;
  } catch {
    controller = null;
  }
  const signal = controller ? controller.signal : null;
  return new Promise((resolve) => {
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (graceTimer) clearTimeout(graceTimer);
      resolve(value);
    };
    let work;
    try {
      work = start(signal, attempt);
    } catch {
      finish({ saved: false, failed: true });
      return;
    }
    Promise.resolve(work).then(
      (value) => {
        finish(value && typeof value === "object" ? value : { saved: false, failed: true });
      },
      () => {
        finish({ saved: false, failed: true });
      },
    );
    timer = setTimeout(() => {
      if (settled) return;
      try {
        if (controller) controller.abort();
      } catch {
        /* the photo write is already finished */
      }
      graceTimer = setTimeout(() => {
        if (settled) return;
        attempt.dropped = true;
        finish({ timedOut: true, abandoned: true, saved: false });
      }, grace);
    }, limit);
  });
}

function newWinId(now) {
  return `win-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addWin(
  text,
  storage = globalThis.localStorage,
  date = new Date(),
  now = new Date(),
  photo,
  presetId,
) {
  const raw = { text, at: now.toISOString(), photo };
  if (typeof presetId === "string" && presetId.trim()) raw.id = presetId.trim();
  const item = normalizeWin(raw, now);
  const store = loadWinsStore(storage);
  if (!item) {
    return {
      store,
      item: null,
      items: winsForDate(store, date),
      saved: false,
      photoCleanup: idlePhotoCleanup(),
    };
  }
  if (!raw.id) item.id = newWinId(now);
  const key = civilDateKey(date);
  const items = [...winsForDate(store, date), item];
  store.days[key] = items;
  const written = persistWins(store, storage, now);
  if (!written.saved) {
    return {
      store: written.store,
      item,
      items: winsForDate(loadWinsStore(storage), date),
      saved: false,
      photoCleanup: written.photoCleanup,
    };
  }
  return {
    store: written.store,
    item,
    items: winsForDate(written.store, date),
    saved: true,
    photoCleanup: written.photoCleanup,
  };
}

function photoResult(added, flags) {
  return {
    ...added,
    photoSaved: flags.photoSaved === true,
    photoFallback: flags.photoFallback === true,
    photoError: flags.photoError === true,
    timedOut: flags.timedOut === true,
  };
}

function winSaveAborted(signal) {
  return Boolean(signal && signal.aborted);
}

function winSaveDropped(options) {
  return Boolean(options && options.attempt && options.attempt.dropped);
}

function droppedWinResult(storage, date) {
  const store = readWinsStore(storage);
  return {
    store,
    item: null,
    items: winsForDate(store, date),
    saved: false,
    photoCleanup: idlePhotoCleanup(),
    photoSaved: false,
    photoFallback: false,
    photoError: false,
    timedOut: true,
    abandoned: true,
  };
}

/**
 * Save a win and, when this browser can store it, the placeholder blob.
 * The local record keeps WIN_PHOTO_REF, not the bytes.
 * IndexedDB unavailable: the record keeps the placeholder path and photoFallback is set.
 * Quota or a rejected blob: the text win still saves when it can, with no photo reference.
 * If the text cannot be saved, a blob that was just written is deleted.
 */
export async function addWinPhoto(
  text,
  storage = globalThis.localStorage,
  date = new Date(),
  now = new Date(),
  blob,
  options = {},
) {
  const signal = options && typeof options === "object" ? options.signal : undefined;
  const draft = normalizeWin({ text, at: now.toISOString() }, now);
  if (!draft) return photoResult(addWin(text, storage, date, now), {});
  if (winSaveDropped(options)) return droppedWinResult(storage, date);
  const id = newWinId(now);
  const body = blob === undefined ? placeholderPhotoBlob() : blob;
  const allowedId = await winPhotoAllowlistId(body);
  if (winSaveDropped(options)) return droppedWinResult(storage, date);
  if (!allowedId) {
    if (winSaveAborted(signal)) return droppedWinResult(storage, date);
    return photoResult(addWin(text, storage, date, now, undefined, id), { photoError: true });
  }
  const ready = winSaveAborted(signal) ? false : await winPhotoDatabaseReady(signal);
  if (winSaveDropped(options)) return droppedWinResult(storage, date);
  if (winSaveAborted(signal)) {
    const added = addWin(text, storage, date, now, undefined, id);
    return photoResult(added, { photoError: added.saved === true, timedOut: true });
  }
  if (!ready) {
    const added = addWin(text, storage, date, now, winSamplePath(allowedId), id);
    return photoResult(added, { photoFallback: added.saved === true });
  }
  const stamp = now instanceof Date ? now.getTime() : Date.now();
  const put = await putWinPhoto(id, body, stamp, { signal });
  if (winSaveDropped(options)) {
    if (put.ok) {
      try {
        await deleteWinPhotos([id], { notify: false });
      } catch {
        /* a dropped save does not keep the blob */
      }
    }
    return droppedWinResult(storage, date);
  }
  if (!put.ok) {
    if (put.reason === "unavailable") {
      const added = addWin(text, storage, date, now, winSamplePath(allowedId), id);
      return photoResult(added, { photoFallback: added.saved === true });
    }
    const added = addWin(text, storage, date, now, undefined, id);
    return photoResult(added, { photoError: added.saved === true, timedOut: put.reason === "timeout" });
  }
  if (winSaveAborted(signal) || winSaveDropped(options)) {
    try {
      await deleteWinPhotos([id], { notify: false });
    } catch {
      /* the words still save when the watch has not given up */
    }
    if (winSaveDropped(options)) return droppedWinResult(storage, date);
    const added = addWin(text, storage, date, now, undefined, id);
    return photoResult(added, { photoError: added.saved === true, timedOut: true });
  }
  const added = addWin(text, storage, date, now, WIN_PHOTO_REF, id);
  if (!added.saved || !added.item || added.item.id !== id || added.item.photo !== WIN_PHOTO_REF) {
    await deleteWinPhotos([id], { notify: false });
    return photoResult(added, { photoError: true });
  }
  postWinPhotoChange("put", id);
  return photoResult(added, { photoSaved: true });
}

export function removeWin(id, storage = globalThis.localStorage, date = new Date()) {
  const store = loadWinsStore(storage);
  const key = civilDateKey(date);
  const items = winsForDate(store, date);
  const index = items.findIndex((item) => item.id === id);
  if (index >= 0) items.splice(index, 1);
  store.days[key] = items;
  const written = persistWins(store, storage, new Date());
  if (!written.saved) {
    return {
      store: written.store,
      items: winsForDate(loadWinsStore(storage), date),
      saved: false,
      photoCleanup: written.photoCleanup,
    };
  }
  return {
    store: written.store,
    items: winsForDate(written.store, date),
    saved: true,
    photoCleanup: written.photoCleanup,
  };
}

function imageKept(storage, item, extra = {}) {
  return {
    saved: false,
    imageChanged: false,
    kept: true,
    item: item || null,
    store: readWinsStore(storage),
    ...extra,
  };
}

/**
 * Change or remove the sample image on one stored win.
 * Writes or deletes the blob in mindpal-photos / winPhotos.
 * The win text is left as it is. A failed write does not change the record.
 * choice "none" removes the image. Any other id must be the placeholder or a bundled sample.
 * Does not run on load.
 */
export async function changeWinImage(
  id,
  choice,
  storage = globalThis.localStorage,
  date = new Date(),
  now = new Date(),
  options = {},
) {
  const signal = options && typeof options === "object" ? options.signal : undefined;
  if (typeof id !== "string" || !id) return imageKept(storage, null, { missing: true });
  if (winSaveDropped(options)) return imageKept(storage, null, { timedOut: true });
  if (winsSaveBlockedQuiet(storage)) return imageKept(storage, null);
  const store = loadWinsStore(storage);
  const key = civilDateKey(date);
  const items = winsForDate(store, date).map((item) => ({ ...item }));
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return imageKept(storage, null, { missing: true, store });
  const current = items[index];
  const wanted = choice === WIN_SAMPLE_NONE || choice == null || choice === "" ? WIN_SAMPLE_NONE : choice;
  const stampNow = now instanceof Date ? now : new Date();
  if (wanted === WIN_SAMPLE_NONE) {
    if (!current.photo) {
      return { saved: true, imageChanged: false, unchanged: true, kept: true, item: current, store };
    }
    const next = { ...current };
    delete next.photo;
    items[index] = next;
    store.days[key] = items;
    const written = persistWins(store, storage, stampNow);
    if (!written.saved) return imageKept(storage, current);
    return {
      saved: true,
      imageChanged: true,
      removed: true,
      item: next,
      items: winsForDate(written.store, date),
      store: written.store,
      photoCleanup: written.photoCleanup,
    };
  }
  const blob = winSampleBlob(wanted);
  const allowedId = blob ? await winPhotoAllowlistId(blob) : "";
  if (!blob || allowedId !== wanted) return imageKept(storage, current, { reason: "blob", store });
  if (current.photo && current.photo !== WIN_PHOTO_REF && current.photo === winSamplePath(wanted)) {
    return { saved: true, imageChanged: false, unchanged: true, kept: true, item: current, store };
  }
  let previous = null;
  if (current.photo === WIN_PHOTO_REF) {
    previous = await readWinPhoto(id);
    const previousId = previous ? await winPhotoAllowlistId(previous) : "";
    if (previousId === wanted) {
      return { saved: true, imageChanged: false, unchanged: true, kept: true, item: current, store };
    }
  }
  if (winSaveDropped(options) || winSaveAborted(signal)) return imageKept(storage, current, { timedOut: true, store });
  const ready = await winPhotoDatabaseReady(signal);
  if (winSaveDropped(options)) return imageKept(storage, current, { timedOut: true, store });
  if (winSaveAborted(signal)) return imageKept(storage, current, { timedOut: true, store });
  if (!ready) {
    const next = { ...current, photo: winSamplePath(wanted) };
    items[index] = next;
    store.days[key] = items;
    const written = persistWins(store, storage, stampNow);
    if (!written.saved) return imageKept(storage, current);
    return {
      saved: true,
      imageChanged: true,
      photoFallback: true,
      item: next,
      items: winsForDate(written.store, date),
      store: written.store,
      photoCleanup: written.photoCleanup,
    };
  }
  const put = await putWinPhoto(id, blob, stampNow.getTime(), {
    signal,
    previousBlob: previous || undefined,
  });
  if (winSaveDropped(options)) {
    const fix = previous
      ? putWinPhoto(id, previous, Date.now(), { leaveOnTimeout: true })
      : deleteWinPhotos([id], { notify: false });
    fix.catch(() => {});
    return imageKept(storage, current, { timedOut: true });
  }
  if (!put.ok) {
    return imageKept(storage, current, { reason: put.reason, timedOut: put.reason === "timeout", store });
  }
  if (winSaveAborted(signal) || winSaveDropped(options)) {
    const fix = previous
      ? putWinPhoto(id, previous, Date.now(), { leaveOnTimeout: true })
      : deleteWinPhotos([id], { notify: false });
    fix.catch(() => {});
    return imageKept(storage, current, { timedOut: true });
  }
  const next = { ...current, photo: WIN_PHOTO_REF };
  items[index] = next;
  store.days[key] = items;
  const written = persistWins(store, storage, stampNow);
  if (!written.saved || winSaveDropped(options)) {
    const fix = previous
      ? putWinPhoto(id, previous, Date.now(), { leaveOnTimeout: true })
      : deleteWinPhotos([id], { notify: false });
    if (winSaveDropped(options)) fix.catch(() => {});
    else {
      try {
        await fix;
      } catch {
        /* the wins record was not updated */
      }
    }
    return imageKept(storage, current, { timedOut: winSaveDropped(options) });
  }
  postWinPhotoChange("put", id);
  return {
    saved: true,
    imageChanged: true,
    item: next,
    items: winsForDate(written.store, date),
    store: written.store,
    photoCleanup: written.photoCleanup,
  };
}
