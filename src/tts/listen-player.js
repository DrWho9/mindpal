import { unwrapListenInput } from "./audio.js";
import { resolveListenAudioUrl } from "./maddy-listen.js";
import { TTS_PITCH, TTS_RATE, loadSavedVoiceURI, pickVoice } from "./voices.js";

export const LISTEN_SKIP_SEC = 8;
export const SPEECH_CHARS_PER_SEC = 12;

let activeListen = null;

function claimListen(ctrl) {
  if (activeListen && activeListen !== ctrl) {
    const prev = activeListen;
    activeListen = ctrl;
    try {
      prev.stop();
    } catch {
      /* ignore */
    }
  } else {
    activeListen = ctrl;
  }
}

function releaseListen(ctrl) {
  if (activeListen === ctrl) activeListen = null;
}

export function formatListenClock(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatListenRemaining(seconds) {
  return `-${formatListenClock(seconds)}`;
}

export function listenTimes(current, duration) {
  const total = Math.max(0, Math.round(Number(duration) || 0));
  const now = Math.min(total, Math.max(0, Math.round(Number(current) || 0)));
  return {
    current: formatListenClock(now),
    remaining: formatListenRemaining(total - now),
  };
}

export function clampListenTime(time, duration) {
  const t = Number(time) || 0;
  const d = Math.max(0, Number(duration) || 0);
  if (!d) return Math.max(0, t);
  return Math.min(d, Math.max(0, t));
}

export function listenPointerRatio(clientX, rect) {
  const width = Number(rect?.width) || 0;
  if (width <= 0) return 0;
  const x = Number(clientX) - Number(rect?.left || 0);
  return Math.min(1, Math.max(0, x / width));
}

/**
 * Short spoken pieces. Each piece is a seek point and stays under the
 * length where some browsers drop a single utterance.
 */
export function buildSpeechTimeline(text, charsPerSec = SPEECH_CHARS_PER_SEC) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const rate = charsPerSec > 0 ? charsPerSec : SPEECH_CHARS_PER_SEC;
  const maxChars = Math.max(24, Math.round(rate * 4));
  const sentences = normalized.match(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g) || [normalized];
  const pieces = [];
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    let buf = [];
    let chars = 0;
    const flush = () => {
      if (!buf.length) return;
      pieces.push(buf.join(" "));
      buf = [];
      chars = 0;
    };
    for (const word of words) {
      if (buf.length && chars + word.length + 1 > maxChars) flush();
      buf.push(word);
      chars += word.length + 1;
    }
    flush();
  }
  let start = 0;
  return pieces.map((piece) => {
    const dur = Math.max(0.8, piece.length / rate);
    const chunk = { text: piece, start, end: start + dur };
    start += dur;
    return chunk;
  });
}

export function chunkIndexAt(chunks, time) {
  if (!chunks?.length) return 0;
  const t = Math.max(0, Number(time) || 0);
  const idx = chunks.findIndex((chunk) => t < chunk.end - 0.05);
  return idx === -1 ? chunks.length - 1 : idx;
}

function snapshotFrom(kind, seekMode, playing, current, duration, status) {
  const times = listenTimes(current, duration);
  return {
    kind,
    seekMode,
    seekable: duration > 0,
    playing: Boolean(playing),
    current: Number(current) || 0,
    duration: Number(duration) || 0,
    remaining: Math.max(0, (Number(duration) || 0) - (Number(current) || 0)),
    currentLabel: times.current,
    remainingLabel: times.remaining,
    status: status || "",
  };
}

export function createAudioListenController(audio, deps = {}) {
  const skipSec = deps.skipSec ?? LISTEN_SKIP_SEC;
  const listeners = new Set();
  let playing = Boolean(audio && !audio.paused);
  let disposed = false;

  function duration() {
    const d = Number(audio?.duration);
    return Number.isFinite(d) && d > 0 ? d : 0;
  }

  function snapshot() {
    const d = duration();
    const current = clampListenTime(audio?.currentTime || 0, d || audio?.currentTime || 0);
    return snapshotFrom("audio", "element", playing, current, d, "");
  }

  function emit() {
    const snap = snapshot();
    for (const fn of listeners) fn(snap);
  }

  const onPlay = () => {
    playing = true;
    emit();
  };
  const onPause = () => {
    playing = false;
    emit();
  };
  const onTime = () => emit();
  const onEnd = () => {
    playing = false;
    emit();
    deps.onEnd?.();
  };

  audio?.addEventListener?.("play", onPlay);
  audio?.addEventListener?.("pause", onPause);
  audio?.addEventListener?.("timeupdate", onTime);
  audio?.addEventListener?.("durationchange", onTime);
  audio?.addEventListener?.("ended", onEnd);

  const api = {
    kind: "audio",
    seekable: true,
    audio,
    subscribe(fn) {
      listeners.add(fn);
      fn(snapshot());
      return () => listeners.delete(fn);
    },
    snapshot,
    play() {
      if (!audio?.play) return false;
      try {
        const result = audio.play();
        const ok = () => {
          if (disposed) return false;
          playing = true;
          claimListen(api);
          emit();
          return true;
        };
        if (result && typeof result.then === "function") {
          return result.then(ok).catch(() => {
            playing = false;
            emit();
            return false;
          });
        }
        return ok();
      } catch {
        playing = false;
        emit();
        return false;
      }
    },
    pause() {
      try {
        audio?.pause?.();
      } catch {
        /* ignore */
      }
      playing = false;
      emit();
    },
    toggle() {
      if (playing) {
        this.pause();
        return false;
      }
      return this.play();
    },
    seek(time) {
      const d = duration();
      const next = d ? clampListenTime(time, d) : Math.max(0, Number(time) || 0);
      try {
        audio.currentTime = next;
      } catch {
        /* ignore until metadata */
      }
      emit();
    },
    skip(delta = skipSec) {
      this.seek((Number(audio?.currentTime) || 0) + delta);
    },
    stop() {
      if (disposed) return;
      disposed = true;
      playing = false;
      try {
        audio?.pause?.();
        if (audio) audio.currentTime = 0;
      } catch {
        /* ignore */
      }
      audio?.removeEventListener?.("play", onPlay);
      audio?.removeEventListener?.("pause", onPause);
      audio?.removeEventListener?.("timeupdate", onTime);
      audio?.removeEventListener?.("durationchange", onTime);
      audio?.removeEventListener?.("ended", onEnd);
      releaseListen(api);
      emit();
    },
  };
  return api;
}

export function createSpeechListenController(text, deps = {}) {
  const chunks = buildSpeechTimeline(text, deps.charsPerSec);
  const duration = chunks.length ? chunks[chunks.length - 1].end : 0;
  const listeners = new Set();
  const synth =
    deps.speechSynthesis !== undefined
      ? deps.speechSynthesis
      : typeof window !== "undefined"
        ? window.speechSynthesis
        : null;
  const Utterance =
    deps.Utterance !== undefined
      ? deps.Utterance
      : typeof SpeechSynthesisUtterance !== "undefined"
        ? SpeechSynthesisUtterance
        : null;
  const later = deps.later || ((fn) => setTimeout(fn, 150));
  const now = deps.now || (() => Date.now());
  const keepAliveMs =
    deps.keepAliveMs !== undefined ? deps.keepAliveMs : typeof window !== "undefined" ? 8000 : 0;
  let playing = false;
  let offset = 0;
  let startedAt = 0;
  let token = 0;
  let disposed = false;
  let fault = "";
  let awake = 0;

  function stopAwake() {
    if (awake) clearInterval(awake);
    awake = 0;
  }

  function startAwake() {
    if (!keepAliveMs || awake) return;
    awake = setInterval(() => {
      if (!playing || disposed) {
        stopAwake();
        return;
      }
      try {
        synth?.resume?.();
      } catch {
        /* ignore */
      }
    }, keepAliveMs);
  }

  function elapsed() {
    if (!playing) return offset;
    return offset + Math.max(0, (now() - startedAt) / 1000);
  }

  function snapshot() {
    const current = clampListenTime(elapsed(), duration);
    const unavailable = !chunks.length
      ? ""
      : !synth || !Utterance
        ? "Listen isn’t available in this browser. You can still read the words."
        : fault;
    return snapshotFrom("speech", "chunks", playing, current, duration, unavailable);
  }

  function emit() {
    const snap = snapshot();
    for (const fn of listeners) fn(snap);
  }

  function speakFrom(index) {
    if (disposed || !chunks.length || !synth || !Utterance) {
      playing = false;
      emit();
      return false;
    }
    const chunk = chunks[Math.min(chunks.length - 1, Math.max(0, index))];
    const my = ++token;
    offset = chunk.start;
    startedAt = now();
    playing = true;
    const utterance = new Utterance(chunk.text);
    utterance.rate = deps.rate ?? TTS_RATE;
    utterance.pitch = deps.pitch ?? TTS_PITCH;
    let voice = null;
    try {
      const choose = deps.pickVoice || ((voices) => pickVoice(voices, loadSavedVoiceURI()));
      voice = choose(synth.getVoices?.() || []);
    } catch {
      voice = null;
    }
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "en-AU";
    } else {
      utterance.lang = "en-AU";
    }
    utterance.onend = () => {
      if (my !== token || !playing) return;
      const next = index + 1;
      if (next < chunks.length) speakFrom(next);
      else {
        playing = false;
        offset = duration;
        emit();
        deps.onEnd?.();
      }
    };
    utterance.onerror = (event) => {
      if (my !== token) return;
      const reason = event?.error || event?.message || "";
      if (reason === "interrupted" || reason === "canceled" || reason === "cancelled") return;
      playing = false;
      fault = "Speech stopped on this phone. Tap play to try again.";
      stopAwake();
      emit();
    };
    const fire = () => {
      if (my !== token || disposed) return;
      try {
        synth.resume?.();
      } catch {
        /* ignore */
      }
      try {
        synth.speak(utterance);
      } catch {
        playing = false;
        fault = "Speech stopped on this phone. Tap play to try again.";
        stopAwake();
      }
      emit();
    };
    try {
      synth.resume?.();
    } catch {
      /* ignore */
    }
    startAwake();
    if (synth.speaking || synth.pending) {
      try {
        synth.cancel();
      } catch {
        /* ignore */
      }
      later(() => fire());
    } else {
      fire();
    }
    return true;
  }

  const api = {
    kind: "speech",
    seekable: duration > 0 && Boolean(synth && Utterance),
    chunks,
    subscribe(fn) {
      listeners.add(fn);
      fn(snapshot());
      return () => listeners.delete(fn);
    },
    snapshot,
    play() {
      fault = "";
      if (disposed || !chunks.length || !synth || !Utterance) {
        emit();
        return false;
      }
      if (playing) return true;
      claimListen(api);
      if (offset >= duration - 0.05) offset = 0;
      return speakFrom(chunkIndexAt(chunks, offset));
    },
    pause() {
      offset = clampListenTime(elapsed(), duration);
      playing = false;
      token += 1;
      stopAwake();
      try {
        synth?.cancel?.();
      } catch {
        /* ignore */
      }
      emit();
    },
    toggle() {
      if (playing) {
        this.pause();
        return false;
      }
      return this.play();
    },
    seek(time) {
      const was = playing;
      const next = clampListenTime(time, duration);
      const atEnd = duration > 0 && next >= duration - 0.001;
      const idx = atEnd ? chunks.length - 1 : chunkIndexAt(chunks, next);
      offset = atEnd || !chunks[idx] ? duration : chunks[idx].start;
      token += 1;
      playing = false;
      if (synth?.speaking || synth?.pending) {
        try {
          synth.cancel();
        } catch {
          /* ignore */
        }
      }
      if (was && !atEnd) return speakFrom(idx);
      emit();
      return true;
    },
    skip(delta = LISTEN_SKIP_SEC) {
      return this.seek(elapsed() + delta);
    },
    stop() {
      if (disposed) return;
      disposed = true;
      playing = false;
      token += 1;
      offset = 0;
      stopAwake();
      try {
        synth?.cancel?.();
      } catch {
        /* ignore */
      }
      releaseListen(api);
      emit();
    },
  };
  try {
    synth?.getVoices?.();
  } catch {
    /* ignore */
  }
  return api;
}

export function createListenController(input, deps = {}) {
  const payload = unwrapListenInput(input);
  const catalog =
    deps.catalog !== undefined
      ? deps.catalog
      : typeof globalThis !== "undefined" && globalThis.mpTtsAudio
        ? globalThis.mpTtsAudio
        : null;
  const url = deps.url !== undefined ? deps.url : resolveListenAudioUrl(payload, catalog, deps.pref);
  if (url) {
    const Ctor = deps.Audio || (typeof Audio !== "undefined" ? Audio : null);
    if (Ctor) {
      try {
        const audio = new Ctor(url);
        if (audio) {
          audio.preload = "auto";
          return createAudioListenController(audio, deps);
        }
      } catch {
        /* fall through to speech */
      }
    }
  }
  return createSpeechListenController(payload.text, deps);
}

export async function upgradeSpeechToBlob(speechCtrl, blob, deps = {}) {
  if (!speechCtrl || speechCtrl.kind !== "speech" || !blob) return null;
  if (!speechCtrl.snapshot().playing) return null;
  const Ctor = deps.Audio || (typeof Audio !== "undefined" ? Audio : null);
  if (!Ctor || typeof blob !== "object") return null;
  const createUrl = deps.createObjectURL || URL.createObjectURL.bind(URL);
  const revokeUrl = deps.revokeObjectURL || URL.revokeObjectURL.bind(URL);
  let url = "";
  try {
    url = createUrl(blob);
    const audio = new Ctor(url);
    audio.preload = "auto";
    const started = audio.play?.();
    if (started && typeof started.then === "function") await started;
    if (!speechCtrl.snapshot().playing) {
      try {
        audio.pause?.();
      } catch {
        /* ignore */
      }
      try {
        revokeUrl(url);
      } catch {
        /* ignore */
      }
      return null;
    }
    const snap = speechCtrl.snapshot();
    const ratio = snap.duration ? snap.current / snap.duration : 0;
    speechCtrl.stop();
    const ctrl = createAudioListenController(audio, deps);
    claimListen(ctrl);
    const apply = () => {
      if (ratio > 0 && audio.duration) ctrl.seek(ratio * audio.duration);
    };
    if (audio.duration) apply();
    else audio.addEventListener?.("loadedmetadata", apply, { once: true });
    const baseStop = ctrl.stop.bind(ctrl);
    ctrl.stop = () => {
      baseStop();
      try {
        revokeUrl(url);
      } catch {
        /* ignore */
      }
    };
    return ctrl;
  } catch {
    if (url) {
      try {
        revokeUrl(url);
      } catch {
        /* ignore */
      }
    }
    return null;
  }
}
