export const TTS_VOICE_KEY = "mindpal.tts.voice.v1";
export const TTS_RATE = 0.89;
export const TTS_PITCH = 1;
export const TTS_PARAGRAPH_PAUSE_MS = 420;

function norm(value) {
  return String(value || "").toLowerCase();
}

export function isEnglishVoice(voice) {
  const lang = norm(voice?.lang);
  const name = norm(voice?.name);
  return /^en([-_]|$)/.test(lang) || /(english|en-au|en-gb|en-us|en-uk)/.test(name);
}

export function isHighQualityVoice(voice) {
  return /neural|natural|google|enhanced|premium|wavenet|studio|neural2/.test(
    norm(voice?.name),
  );
}

export function isLowQualityVoice(voice) {
  return /compact|espeak|robot|dummy/.test(
    `${norm(voice?.name)} ${norm(voice?.voiceURI)}`,
  );
}

export function localeTier(voice) {
  const lang = norm(voice?.lang);
  const name = norm(voice?.name);
  if (/en-au/.test(lang) || /australian/.test(name)) return 3;
  if (/en-gb|en-uk/.test(lang) || /british|uk english/.test(name)) return 2;
  if (/en-us/.test(lang) || /american|us english/.test(name)) return 1;
  if (isEnglishVoice(voice)) return 0;
  return -1;
}

export function voiceScore(voice) {
  if (!voice) return Number.NEGATIVE_INFINITY;
  const loc = localeTier(voice);
  if (loc < 0) return -1000;
  let score = loc * 100;
  if (isHighQualityVoice(voice)) score += 80;
  if (isLowQualityVoice(voice)) score -= 200;
  if (/warm|soft|calm/.test(norm(voice.name))) score += 5;
  return score;
}

export function loadSavedVoiceURI(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(TTS_VOICE_KEY);
    return typeof raw === "string" ? raw : "";
  } catch {
    return "";
  }
}

export function saveVoiceURI(uri, storage = globalThis.localStorage) {
  try {
    if (!storage) return "";
    const next = typeof uri === "string" ? uri : "";
    if (next) storage.setItem(TTS_VOICE_KEY, next);
    else storage.removeItem(TTS_VOICE_KEY);
    return next;
  } catch {
    return "";
  }
}

export function listPickerVoices(voices = []) {
  return (Array.isArray(voices) ? voices : [])
    .filter(isEnglishVoice)
    .map((voice) => ({
      voiceURI: String(voice.voiceURI || voice.name || ""),
      name: String(voice.name || "English"),
      lang: String(voice.lang || "en"),
      label: `${voice.name || "English"} · ${voice.lang || "en"}`,
      score: voiceScore(voice),
    }))
    .filter((row) => row.voiceURI)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

/**
 * Prefer high-quality en-AU, then warm en-GB/US Neural/Natural/Google/Enhanced.
 * Never fall through to voices[0] when a better English neural/natural/google voice exists.
 */
export function pickVoice(voices = [], preferredURI = loadSavedVoiceURI()) {
  const list = Array.isArray(voices) ? voices.filter(Boolean) : [];
  if (!list.length) return null;

  if (preferredURI) {
    const saved = list.find(
      (voice) => voice.voiceURI === preferredURI || voice.name === preferredURI,
    );
    if (saved) return saved;
  }

  const english = list.filter(isEnglishVoice);
  const hqEnglish = english.filter(isHighQualityVoice);
  const ranked = (hqEnglish.length ? hqEnglish : english)
    .filter((voice) => hqEnglish.length || !isLowQualityVoice(voice))
    .sort((a, b) => voiceScore(b) - voiceScore(a));

  if (ranked.length) return ranked[0];
  if (english.length) {
    return english.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0];
  }
  return null;
}

export function pickBrowserVoice(voices) {
  return pickVoice(voices);
}

export function splitSpeakChunks(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function speakBrowser(text, onEnd, deps = {}) {
  const synth =
    deps.speechSynthesis ||
    (typeof window !== "undefined" ? window.speechSynthesis : null);
  const Utterance =
    deps.Utterance ||
    (typeof SpeechSynthesisUtterance !== "undefined"
      ? SpeechSynthesisUtterance
      : null);
  const chunks = splitSpeakChunks(text);
  if (!chunks.length || !synth || !Utterance) {
    onEnd?.();
    return () => {};
  }
  try {
    synth.cancel();
  } catch {
    /* ignore */
  }
  let cancelled = false;
  let timer = 0;
  let index = 0;

  const finish = () => {
    if (!cancelled) onEnd?.();
  };

  const speakNext = () => {
    if (cancelled) return;
    if (index >= chunks.length) {
      finish();
      return;
    }
    const utterance = new Utterance(chunks[index++]);
    utterance.rate = deps.rate ?? TTS_RATE;
    utterance.pitch = deps.pitch ?? TTS_PITCH;
    const voice = pickVoice(synth.getVoices?.() || []);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "en-AU";
    } else {
      utterance.lang = "en-AU";
    }
    utterance.onend = () => {
      if (cancelled) return;
      if (index < chunks.length) {
        timer = setTimeout(speakNext, deps.pauseMs ?? TTS_PARAGRAPH_PAUSE_MS);
      } else {
        finish();
      }
    };
    utterance.onerror = () => finish();
    synth.speak(utterance);
  };

  const start = () => {
    if (cancelled) return;
    if ((synth.getVoices?.() || []).length) speakNext();
    else if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", speakNext, { once: true });
    } else {
      synth.onvoiceschanged = speakNext;
    }
  };
  start();

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    try {
      synth.cancel();
    } catch {
      /* ignore */
    }
  };
}
