/** Existing Today / home hash route — do not invent a new page. */
export const HOME_ROUTE = "Today";
export const HOME_EVENT = "mindpal-go-home";

export function homeHash() {
  return `#${encodeURIComponent(HOME_ROUTE)}`;
}

/**
 * Take the user to the Today homepage from any screen or sheet.
 * Uses the app's existing navigate(route) setter when provided.
 * Always announces HOME_EVENT so nested chips/modals can close even
 * when already on Today (where setState("Today") is a React no-op).
 */
export function goHome(navigate, deps = {}) {
  const win = deps.window ?? (typeof window !== "undefined" ? window : null);
  if (typeof navigate === "function") {
    navigate(HOME_ROUTE);
  } else if (win?.history?.pushState) {
    try {
      const next = homeHash();
      const current = String(win.location?.hash || "");
      if (current !== next) {
        win.history.pushState(null, "", next);
      }
    } catch {
      /* hash write is best-effort outside the React tree */
    }
    try {
      win.dispatchEvent(new Event("popstate"));
    } catch {
      /* older hosts may lack popstate events */
    }
  }
  try {
    win?.dispatchEvent?.(new Event(HOME_EVENT));
  } catch {
    /* listeners are optional */
  }
  try {
    win?.scrollTo?.({ top: 0, behavior: "instant" });
  } catch {
    /* scroll is a soft extra on home */
  }
  return HOME_ROUTE;
}
