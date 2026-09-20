export const MINDPAL_PAGES_URL = "https://drwho9.github.io/mindpal/";
export const MINDPAL_SHARE_TITLE = "MindPal";
export const MINDPAL_SHARE_TEXT = "A little space for your thoughts.";

export function mindpalShareUrl(location = globalThis.location) {
  try {
    const origin = String(location?.origin || "");
    if (origin && origin !== "null" && origin !== "undefined") {
      if (/github\.io$/i.test(new URL(origin).hostname)) {
        return `${origin.replace(/\/$/, "")}/mindpal/`;
      }
      return `${origin.replace(/\/$/, "")}/mindpal/`;
    }
  } catch {
    /* ignore */
  }
  return MINDPAL_PAGES_URL;
}

async function copyText(text, clipboardWrite) {
  if (typeof clipboardWrite === "function") {
    await clipboardWrite(text);
    return "copied";
  }
  try {
    if (globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(text);
      return "copied";
    }
  } catch {
    /* fall through */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    return "copied";
  } catch {
    return "failed";
  }
}

/**
 * Share the MindPal app. Web Share API when available; otherwise copy the
 * Pages URL or current origin + /mindpal/ base.
 */
export async function shareMindPalApp({
  share,
  clipboardWrite,
  location,
} = {}) {
  const url = mindpalShareUrl(location || globalThis.location);
  const payload = {
    title: MINDPAL_SHARE_TITLE,
    text: MINDPAL_SHARE_TEXT,
    url,
  };
  const navShare =
    share ||
    (typeof globalThis.navigator?.share === "function"
      ? globalThis.navigator.share.bind(globalThis.navigator)
      : null);
  if (typeof navShare === "function") {
    try {
      await navShare(payload);
      return "shared";
    } catch (error) {
      const name = error && typeof error === "object" ? error.name : "";
      if (name === "AbortError") return "cancelled";
    }
  }
  return copyText(url, clipboardWrite);
}
