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

export function isNeuralOrNatural(voice) {
  return /neural|natural|online \(natural\)|neural2|wavenet|studio/.test(
    norm(voice?.name),
  );
}

export function isHighQualityVoice(voice) {
  return (
    isNeuralOrNatural(voice) ||
    /google|enhanced|premium/.test(norm(voice?.name))
  );
}

export function isLowQualityVoice(voice) {
  return /compact|espeak|robot|dummy|novelty|whisper|trinoids|zarvox|boing|cellos|bad news|good news|pipe organ|albert|junior|kathy|princess|ralph|fred|bells|hysterical|organ|siri/.test(
    `${norm(voice?.name)} ${norm(voice?.voiceURI)}`,
  );
}

export function isWarmFemaleVoice(voice) {
  return /female|karen|catherine|serena|natasha|sonia|samantha|moira|tessa|fiona|susan|zira|aria|jenny|michelle|salli|ivy|joanna|kendra|kimberly|olivia|emma|libby/.test(
    norm(voice?.name),
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
  if (isNeuralOrNatural(voice)) score += 120;
  else if (isHighQualityVoice(voice)) score += 45;
  if (/premium|studio|neural2|online \(natural\)|wavenet/.test(norm(voice.name))) {
    score += 15;
  }
  if (isLowQualityVoice(voice)) score -= 200;
  if (isWarmFemaleVoice(voice)) score += 25;
  if (/warm|soft|calm/.test(norm(voice.name))) score += 8;
  if (/\bmale\b|david|mark|george|daniel|james|ravi|thomas/.test(norm(voice.name))) {
    score -= 8;
  }
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
 * Prefer warmer Neural/Natural en-AU, then the best Natural, then other
 * English Neural/Google/Enhanced. Never fall through to voices[0] when a
 * Neural/Natural option exists.
 */
export function pickVoice(voices = [], preferredURI = loadSavedVoiceURI()) {
  const list = Array.isArray(voices) ? voices.filter(Boolean) : [];
  if (!list.length) return null;

  if (preferredURI && !/^maddy\b/i.test(preferredURI) && preferredURI !== "auto") {
    const saved = list.find(
      (voice) => voice.voiceURI === preferredURI || voice.name === preferredURI,
    );
    if (saved && !isLowQualityVoice(saved)) return saved;
  }

  const english = list.filter(isEnglishVoice);
  const neural = english.filter(
    (voice) => isNeuralOrNatural(voice) && !isLowQualityVoice(voice),
  );
  const hqEnglish = english.filter(
    (voice) => isHighQualityVoice(voice) && !isLowQualityVoice(voice),
  );
  const pool = neural.length ? neural : hqEnglish.length ? hqEnglish : english;
  const ranked = pool
    .filter((voice) => neural.length || hqEnglish.length || !isLowQualityVoice(voice))
    .sort((a, b) => voiceScore(b) - voiceScore(a));

  if (ranked.length) return ranked[0];
  if (english.length) {
    return english.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0];
  }
  return null;
}

export function warmSpeechVoices(synth = typeof window !== "undefined" ? window.speechSynthesis : null) {
  try {
    synth?.getVoices?.();
  } catch {
    /* ignore */
  }
  return synth;
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

/** Keep each spoken piece short enough that mobile browsers do not drop it. */
export function prepareSpeakChunks(text, maxChars = 140) {
  const limit = maxChars > 40 ? maxChars : 140;
  const pieces = [];
  for (const paragraph of splitSpeakChunks(text)) {
    if (paragraph.length <= limit) {
      pieces.push(paragraph);
      continue;
    }
    const sentences = paragraph.match(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g) || [paragraph];
    let buf = "";
    const flush = () => {
      const next = buf.trim();
      if (next) pieces.push(next);
      buf = "";
    };
    for (const sentence of sentences) {
      const bit = sentence.trim();
      if (!bit) continue;
      if (bit.length > limit) {
        flush();
        let wordBuf = "";
        for (const word of bit.split(/\s+/)) {
          if (wordBuf && wordBuf.length + word.length + 1 > limit) {
            pieces.push(wordBuf);
            wordBuf = word;
          } else {
            wordBuf = wordBuf ? `${wordBuf} ${word}` : word;
          }
        }
        if (wordBuf) pieces.push(wordBuf);
        continue;
      }
      if (buf && buf.length + bit.length + 1 > limit) flush();
      buf = buf ? `${buf} ${bit}` : bit;
    }
    flush();
  }
  return pieces;
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
  const chunks = prepareSpeakChunks(text, deps.maxChars);
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
  let awake = 0;
  const keepAliveMs =
    deps.keepAliveMs !== undefined ? deps.keepAliveMs : typeof window !== "undefined" ? 8000 : 0;

  const stopAwake = () => {
    if (awake) clearInterval(awake);
    awake = 0;
  };

  const finish = () => {
    stopAwake();
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
    utterance.onerror = (event) => {
      if (cancelled) return;
      const reason = event?.error || event?.message || "";
      if (reason === "interrupted" || reason === "canceled" || reason === "cancelled") return;
      cancelled = true;
      if (timer) clearTimeout(timer);
      stopAwake();
      deps.onError?.(reason || "speech-error");
      onEnd?.();
    };
    try {
      synth.resume?.();
    } catch {
      /* ignore */
    }
    try {
      synth.speak(utterance);
    } catch {
      cancelled = true;
      stopAwake();
      deps.onError?.("speech-error");
      onEnd?.();
    }
  };

  const start = () => {
    if (cancelled) return;
    warmSpeechVoices(synth);
    try {
      synth.resume?.();
    } catch {
      /* ignore */
    }
    // Speak in the same tap. Waiting for voiceschanged drops the gesture on iOS
    // and can hang forever when that event never arrives.
    speakNext();
    if (keepAliveMs) {
      awake = setInterval(() => {
        if (cancelled) {
          stopAwake();
          return;
        }
        try {
          synth.resume?.();
        } catch {
          /* ignore */
        }
      }, keepAliveMs);
    }
  };
  start();

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    stopAwake();
    try {
      synth.cancel();
    } catch {
      /* ignore */
    }
  };
}
