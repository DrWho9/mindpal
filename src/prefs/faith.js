export const COPTIC_PREF_KEY = "mindpal.prefs.copticDate.v1";
export const WELCOME_IMAGE_PREF_KEY = "mindpal.prefs.welcomeImage.v1";
export const ACCOUNTS_KEY = "mindpal.localAccounts.v1";
export const SESSION_KEY = "mindpal.sessionUser.v1";
export const FAITH_CHANGE_EVENT = "mindpal-faith-change";

export const FAITH_STANCE_RELIGIOUS = "religious";
export const FAITH_STANCE_SECULAR = "secular";

export const PRIMARY_TRADITIONS = [
  { id: "christianity", label: "Christianity" },
  { id: "islam", label: "Islam" },
  { id: "buddhism", label: "Buddhism" },
  { id: "hinduism", label: "Hinduism" },
];

export const OTHER_TRADITIONS = [
  { id: "judaism", label: "Judaism" },
  { id: "sikhism", label: "Sikhism" },
  { id: "bahai", label: "Bahá’í" },
  { id: "orthodox", label: "Orthodox Christianity" },
  { id: "coptic", label: "Coptic Orthodox" },
  { id: "aboriginal", label: "Aboriginal and Torres Strait Islander spirituality" },
  { id: "jainism", label: "Jainism" },
  { id: "spiritual", label: "Spiritual but not listed" },
  { id: "prefer_not", label: "Prefer not to say" },
];

export const ALL_TRADITIONS = [...PRIMARY_TRADITIONS, ...OTHER_TRADITIONS];

export const TRADITION_LANES = {
  christianity: ["christian"],
  islam: ["islamic"],
  buddhism: ["buddhist"],
  hinduism: [],
  judaism: ["jewish"],
  sikhism: [],
  bahai: [],
  orthodox: ["christian"],
  coptic: ["christian"],
  aboriginal: [],
  jainism: [],
  spiritual: [],
  prefer_not: [],
};

export const UNIVERSAL_FALLBACK = {
  id: "universal-reflection",
  date: null,
  lane: "universal",
  fallback: true,
  verse: {
    text: "A quiet, honest moment is enough. You do not need a perfect day to take one kind next step.",
    reference: "A gentle reflection",
    source_note:
      "A MindPal reflection — not a sacred text. When a tradition’s own words are thin here, we do not invent scripture or borrow another faith’s.",
    url: null,
  },
  reflection:
    "Rest here without needing a verse from another tradition. The diary, a short reading, or a pause are still available.",
  practice: {
    minutes: 1,
    text: "Sit for one minute. Notice one ordinary thing already holding you up.",
  },
};

function readStorage(storage, key) {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage, key, value) {
  if (!storage) return false;
  try {
    if (value == null) storage.removeItem(key);
    else storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function readAccounts(storage) {
  const raw = readStorage(storage, ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.accounts) ? parsed.accounts : [];
  } catch {
    return [];
  }
}

function writeAccounts(storage, parsed, accounts) {
  return writeStorage(
    storage,
    ACCOUNTS_KEY,
    JSON.stringify({ ...(parsed || { version: 1 }), accounts }),
  );
}

function notifyFaithChange() {
  try {
    globalThis.dispatchEvent?.(new Event(FAITH_CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

export function sessionPreferences(storage = globalThis.localStorage) {
  const username = readStorage(storage, SESSION_KEY);
  if (!username) return null;
  const account = readAccounts(storage).find((item) => item?.username === username);
  return account?.preferences && typeof account.preferences === "object"
    ? account.preferences
    : null;
}

export function findTradition(idOrLabel) {
  const raw = typeof idOrLabel === "string" ? idOrLabel.trim() : "";
  if (!raw) return null;
  const lower = raw.toLowerCase();
  return (
    ALL_TRADITIONS.find(
      (item) =>
        item.id === lower ||
        item.label.toLowerCase() === lower ||
        item.id.replace(/_/g, " ") === lower,
    ) || null
  );
}

export function traditionIdFromPrefs(prefs) {
  if (!prefs || typeof prefs !== "object") return "";
  const fromId = findTradition(prefs.traditionId);
  if (fromId) return fromId.id;
  const fromLabel = findTradition(prefs.tradition);
  if (fromLabel) return fromLabel.id;
  const tradition = typeof prefs.tradition === "string" ? prefs.tradition : "";
  if (/coptic/i.test(tradition)) return "coptic";
  if (/orthodox/i.test(tradition)) return "orthodox";
  if (/christian/i.test(tradition)) return "christianity";
  if (/islam|muslim/i.test(tradition)) return "islam";
  if (/buddh/i.test(tradition)) return "buddhism";
  if (/hindu/i.test(tradition)) return "hinduism";
  if (/jew/i.test(tradition)) return "judaism";
  if (/sikh/i.test(tradition)) return "sikhism";
  if (/bah[aá]['’]?[ií]/i.test(tradition)) return "bahai";
  return "";
}

export function traditionLabel(idOrLabel) {
  return findTradition(idOrLabel)?.label || (typeof idOrLabel === "string" ? idOrLabel.trim() : "");
}

export function isChristianTradition(idOrPrefs) {
  const id =
    idOrPrefs && typeof idOrPrefs === "object"
      ? traditionIdFromPrefs(idOrPrefs)
      : traditionIdFromPrefs({ traditionId: idOrPrefs, tradition: idOrPrefs });
  return id === "christianity" || id === "orthodox" || id === "coptic";
}

export function hasFaithPreference(prefs) {
  if (!prefs || typeof prefs !== "object") return false;
  if (prefs.faithStance === FAITH_STANCE_RELIGIOUS || prefs.faithStance === FAITH_STANCE_SECULAR) {
    return true;
  }
  return typeof prefs.tradition === "string" && prefs.tradition.trim().length > 0;
}

export function isSecularPrefs(prefs) {
  if (!prefs || typeof prefs !== "object") return false;
  if (prefs.faithStance === FAITH_STANCE_SECULAR) return true;
  if (prefs.morningVerseEnabled === false && prefs.faithStance !== FAITH_STANCE_RELIGIOUS) {
    const tradition = typeof prefs.tradition === "string" ? prefs.tradition.trim() : "";
    return !tradition || /no religion|secular|prefer secular/i.test(tradition);
  }
  return false;
}

export function shouldShowFaithModules(prefs) {
  if (!prefs || typeof prefs !== "object") return false;
  if (isSecularPrefs(prefs)) return false;
  if (prefs.morningVerseEnabled === false) return false;
  if (prefs.faithStance === FAITH_STANCE_RELIGIOUS) return true;
  return typeof prefs.tradition === "string" && prefs.tradition.trim().length > 0;
}

export function shouldShowMorningPrayer(prefs) {
  if (!shouldShowFaithModules(prefs)) return false;
  if (prefs?.morningPrayerEnabled === false) return false;
  return isChristianTradition(prefs);
}

export function prefsFromChoice({ stance, traditionId } = {}) {
  if (stance === FAITH_STANCE_SECULAR) {
    return {
      faithStance: FAITH_STANCE_SECULAR,
      tradition: "",
      traditionId: "",
      morningVerseEnabled: false,
      morningPrayerEnabled: false,
    };
  }
  const found = findTradition(traditionId);
  const id = found?.id || "";
  const label = found?.label || "";
  return {
    faithStance: FAITH_STANCE_RELIGIOUS,
    tradition: label,
    traditionId: id,
    morningVerseEnabled: true,
    morningPrayerEnabled: isChristianTradition(id),
  };
}

export function faithSummary(prefs) {
  if (isSecularPrefs(prefs) || prefs?.faithStance === FAITH_STANCE_SECULAR) {
    return "No religion / secular";
  }
  const label = traditionLabel(prefs?.traditionId || prefs?.tradition);
  return label || "Faith preference saved";
}

export function updateSessionPreferences(patch, storage = globalThis.localStorage) {
  const username = readStorage(storage, SESSION_KEY);
  if (!username) return null;
  const raw = readStorage(storage, ACCOUNTS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const accounts = Array.isArray(parsed?.accounts) ? parsed.accounts : [];
    let nextPrefs = null;
    const next = accounts.map((item) => {
      if (item?.username !== username) return item;
      nextPrefs = { ...(item.preferences || {}), ...(patch || {}) };
      return { ...item, preferences: nextPrefs };
    });
    writeAccounts(storage, parsed, next);
    notifyFaithChange();
    return nextPrefs;
  } catch {
    return null;
  }
}

export function setSessionFaithPrefs(choice, storage = globalThis.localStorage) {
  const next = prefsFromChoice(choice);
  return updateSessionPreferences(next, storage) || next;
}

export function lanesForTradition(idOrPrefs) {
  const id =
    idOrPrefs && typeof idOrPrefs === "object"
      ? traditionIdFromPrefs(idOrPrefs)
      : String(idOrPrefs || "").trim();
  return Array.isArray(TRADITION_LANES[id]) ? TRADITION_LANES[id] : [];
}

export function verseEyebrow(entry) {
  if (!entry || entry.fallback || entry.lane === "universal") return "A QUIET REFLECTION";
  if (entry.lane === "christian") return "VERSE FOR THE DAY · WEB";
  if (entry.lane === "jewish") return "FAITH READING · WEB";
  return "FAITH READING";
}

export function pickMorningVerse(catalog, prefs, now = new Date()) {
  if (!shouldShowFaithModules(prefs)) return null;
  const lanes = lanesForTradition(prefs);
  const entries = (catalog?.entries || []).filter(
    (item) => item && lanes.includes(item.lane),
  );
  const dateKey =
    typeof now?.toLocaleDateString === "function" ? now.toLocaleDateString("en-CA") : "";
  const dated = dateKey ? entries.find((item) => item.date === dateKey) : null;
  if (dated) return dated;
  if (entries.length) {
    const seed = Number.isFinite(now?.getTime?.()) ? now.getTime() : Date.now();
    return entries[Math.floor(seed / 864e5) % entries.length];
  }
  if (lanes.includes("christian") && catalog?.default?.lane === "christian") {
    return catalog.default;
  }
  return { ...UNIVERSAL_FALLBACK };
}

function traditionWantsCoptic(prefs) {
  const tradition = typeof prefs?.tradition === "string" ? prefs.tradition : "";
  return /coptic/i.test(tradition);
}

export function isCopticDateEnabled(
  storage = globalThis.localStorage,
  prefs = sessionPreferences(storage),
) {
  if (prefs?.showCopticDate === true) return true;
  if (prefs?.showCopticDate === false && readStorage(storage, COPTIC_PREF_KEY) !== "1") {
    return traditionWantsCoptic(prefs);
  }
  if (traditionWantsCoptic(prefs) && readStorage(storage, COPTIC_PREF_KEY) !== "0") {
    return true;
  }
  return readStorage(storage, COPTIC_PREF_KEY) === "1";
}

export function setCopticDateEnabled(enabled, storage = globalThis.localStorage) {
  writeStorage(storage, COPTIC_PREF_KEY, enabled ? "1" : "0");
  const username = readStorage(storage, SESSION_KEY);
  if (!username) return enabled;
  const raw = readStorage(storage, ACCOUNTS_KEY);
  if (!raw) return enabled;
  try {
    const parsed = JSON.parse(raw);
    const accounts = Array.isArray(parsed?.accounts) ? parsed.accounts : [];
    const next = accounts.map((item) => {
      if (item?.username !== username) return item;
      return {
        ...item,
        preferences: { ...(item.preferences || {}), showCopticDate: enabled === true },
      };
    });
    writeStorage(storage, ACCOUNTS_KEY, JSON.stringify({ ...parsed, accounts: next }));
  } catch {
    /* ignore */
  }
  return enabled;
}

export function isWelcomeImageEnabled(storage = globalThis.localStorage) {
  return readStorage(storage, WELCOME_IMAGE_PREF_KEY) !== "0";
}

export function setWelcomeImageEnabled(enabled, storage = globalThis.localStorage) {
  writeStorage(storage, WELCOME_IMAGE_PREF_KEY, enabled ? "1" : "0");
  return enabled;
}
