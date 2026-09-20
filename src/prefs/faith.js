export const COPTIC_PREF_KEY = "mindpal.prefs.copticDate.v1";
export const WELCOME_IMAGE_PREF_KEY = "mindpal.prefs.welcomeImage.v1";
export const ACCOUNTS_KEY = "mindpal.localAccounts.v1";
export const SESSION_KEY = "mindpal.sessionUser.v1";

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

export function sessionPreferences(storage = globalThis.localStorage) {
  const username = readStorage(storage, SESSION_KEY);
  if (!username) return null;
  const account = readAccounts(storage).find((item) => item?.username === username);
  return account?.preferences && typeof account.preferences === "object"
    ? account.preferences
    : null;
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
