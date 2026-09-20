import { loadSavedVoiceURI } from "./voices.js";
import { playAudioUrl, prerenderedAudioUrl, unwrapListenInput } from "./audio.js";

export const MADDY_PREF_URI = "maddy";
export const MADDY_PREF_LABEL = "Maddy (when available)";

export const MADDY_LISTEN_CLIPS = {
  welcome: {
    id: "maddy-welcome",
    key: "welcome",
    label: "Play Maddy’s welcome",
    playingLabel: "Playing welcome…",
    url: "/mindpal/videos/maddy/welcome.mp4",
  },
  tip: {
    id: "maddy-tip",
    key: "tip",
    label: "Play Maddy’s tip",
    playingLabel: "Playing tip…",
    url: "/mindpal/videos/maddy/tip.mp4",
  },
  breath: {
    id: "maddy-timed-breath",
    key: "breath",
    label: "Play Maddy’s timed breath",
    playingLabel: "Playing timed breath…",
    url: "/mindpal/videos/maddy/timed-breath.mp4",
  },
};

export function isMaddyVoicePref(uri) {
  const value = String(uri || "").trim().toLowerCase();
  return value === MADDY_PREF_URI || value === MADDY_PREF_LABEL.toLowerCase();
}

export function effectiveListenPref(uri = loadSavedVoiceURI()) {
  const value = typeof uri === "string" ? uri.trim() : "";
  return value || MADDY_PREF_URI;
}

export function maddyClipByKey(key) {
  return MADDY_LISTEN_CLIPS[key] || null;
}

/**
 * Companion-linked Listen targets reuse Maddy’s recorded MP4 audio.
 * Arbitrary reading / verse ids do not invent a cloned voice.
 */
export function companionLinkedClip(input) {
  const { id } = unwrapListenInput(input);
  const key = String(id || "").toLowerCase();
  if (!key) return null;
  if (key === "maddy-welcome" || /(^|[-_])welcome$/.test(key)) {
    return MADDY_LISTEN_CLIPS.welcome;
  }
  if (key === "maddy-tip" || /(^|[-_])tip$/.test(key)) {
    return MADDY_LISTEN_CLIPS.tip;
  }
  if (
    key === "maddy-timed-breath" ||
    key.includes("timed-breath") ||
    /(^|[-_])breath$/.test(key)
  ) {
    return MADDY_LISTEN_CLIPS.breath;
  }
  return null;
}

export function resolveListenAudioUrl(input, catalog, pref = effectiveListenPref()) {
  const { id } = unwrapListenInput(input);
  const prerendered = prerenderedAudioUrl(catalog, id);
  if (prerendered) return prerendered;
  if (!isMaddyVoicePref(pref)) return null;
  return companionLinkedClip(input)?.url || null;
}

export async function playMaddyClip(key, deps = {}) {
  const clip = maddyClipByKey(key);
  if (!clip) return false;
  return playAudioUrl(clip.url, deps);
}
