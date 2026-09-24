const AUDIO_EXT = /\.(mp3|ogg|wav|m4a|webm|mp4)$/i;

function isSafeAudioUrl(url) {
  if (typeof url !== "string" || !url) return false;
  if (!AUDIO_EXT.test(url)) return false;
  return (
    url.startsWith("/mindpal/audio/") ||
    url.startsWith("https://drwho9.github.io/mindpal/audio/") ||
    url.startsWith("/mindpal/videos/maddy/") ||
    url.startsWith("https://drwho9.github.io/mindpal/videos/maddy/")
  );
}

export function mergeTtsAudioCatalog(catalog, discovered = []) {
  const base = catalog && typeof catalog === "object" ? catalog : {};
  const entries = [];
  const seen = new Set();
  for (const row of [...(base.entries || []), ...discovered]) {
    if (!row || !row.id || !isSafeAudioUrl(row.url)) continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    entries.push({ id: String(row.id), url: String(row.url) });
  }
  return {
    version: 1,
    phase: 1,
    kind: "neural_prerendered",
    base: typeof base.base === "string" ? base.base : "/mindpal/audio/phase1/",
    entries,
  };
}

/** Phase-1 Neural / pre-rendered DayStart files only — catalog ids, never guessed 404s. */
export function prerenderedAudioUrl(catalog, id) {
  if (!id || !catalog) return null;
  const hit = (catalog.entries || []).find((row) => row && row.id === id);
  return hit && isSafeAudioUrl(hit.url) ? hit.url : null;
}

export async function playAudioUrl(url, deps = {}) {
  if (!isSafeAudioUrl(url)) return false;
  const Ctor = deps.Audio || (typeof Audio !== "undefined" ? Audio : null);
  if (!Ctor) return false;
  const audio = new Ctor(url);
  const signal = deps.signal;
  if (signal?.aborted) return false;
  const stop = () => {
    try {
      audio.pause();
      audio.removeAttribute?.("src");
    } catch {
      /* ignore */
    }
  };
  if (signal) signal.addEventListener("abort", stop, { once: true });
  try {
    const ended = new Promise((resolve, reject) => {
      audio.addEventListener("ended", () => resolve(true), { once: true });
      audio.addEventListener("error", () => reject(new Error("audio-error")), {
        once: true,
      });
    });
    const played = audio.play?.();
    if (played && typeof played.then === "function") await played;
    if (signal?.aborted) {
      stop();
      return false;
    }
    await ended;
    return true;
  } catch {
    stop();
    return false;
  }
}

export function unwrapListenInput(input) {
  if (input && typeof input === "object") {
    return {
      id: typeof input.id === "string" ? input.id : "",
      text: String(input.text || ""),
    };
  }
  return { id: "", text: String(input || "") };
}
