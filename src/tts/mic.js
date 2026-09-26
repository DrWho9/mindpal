/** Browser speech-to-text for the Companion composer. Fails closed to typing. */

export function speechRecognitionConstructor(root = globalThis) {
  if (!root) return null;
  return root.SpeechRecognition || root.webkitSpeechRecognition || null;
}

export function micSupported(root = globalThis) {
  return typeof speechRecognitionConstructor(root) === "function";
}

export function micUnsupportedCopy() {
  return "This phone can't use the microphone in the browser. Type your message instead.";
}

export function micErrorCopy(code) {
  const key = String(code || "").toLowerCase();
  if (key === "not-allowed" || key === "service-not-allowed") {
    return "Microphone permission is off. Allow the mic for this site, or type instead.";
  }
  if (key === "no-speech") {
    return "No speech was heard. Move a little closer and try again, or type instead.";
  }
  if (key === "audio-capture") {
    return "No microphone was found on this phone. Type your message instead.";
  }
  if (key === "network") {
    return "Speech recognition needs a connection. Type your message, or try again in a moment.";
  }
  if (key === "aborted") return "";
  if (key === "start-failed" || key === "unsupported") return micUnsupportedCopy();
  return "The microphone didn't catch that. Type your message, or try again.";
}

export function transcriptFromResult(event) {
  const results = event?.results;
  if (!results || typeof results.length !== "number") return { text: "", isFinal: false };
  const start = Number(event.resultIndex) || 0;
  let text = "";
  let isFinal = false;
  for (let i = start; i < results.length; i += 1) {
    text += results[i]?.[0]?.transcript || "";
    if (results[i]?.isFinal) isFinal = true;
  }
  return { text: text.trim(), isFinal };
}

/**
 * One-shot capture. start() must run from a tap. stop() always clears listening,
 * including when the browser ends the session itself.
 */
export function createMicCapture(handlers = {}, deps = {}) {
  const Ctor = deps.Ctor !== undefined ? deps.Ctor : speechRecognitionConstructor(deps.root);
  let recognition = null;
  let listening = false;

  function fail(code) {
    listening = false;
    handlers.onError?.(code);
  }

  return {
    supported: typeof Ctor === "function",
    isListening: () => listening,
    start() {
      if (typeof Ctor !== "function") {
        fail("unsupported");
        return false;
      }
      if (listening) return true;
      let rec;
      try {
        rec = new Ctor();
      } catch {
        fail("start-failed");
        return false;
      }
      recognition = rec;
      rec.lang = deps.lang || "en-AU";
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      rec.onresult = (event) => {
        const heard = transcriptFromResult(event);
        if (!heard.text) return;
        if (heard.isFinal) handlers.onFinal?.(heard.text);
        else handlers.onPartial?.(heard.text);
      };
      rec.onerror = (event) => {
        const code = event?.error || "error";
        if (code === "aborted") return;
        fail(code);
      };
      rec.onend = () => {
        const was = listening;
        listening = false;
        if (was) handlers.onEnd?.();
      };
      try {
        listening = true;
        handlers.onStart?.();
        rec.start();
        return true;
      } catch {
        fail("start-failed");
        return false;
      }
    },
    stop() {
      const was = listening;
      listening = false;
      try {
        recognition?.stop?.();
      } catch {
        /* already stopped */
      }
      if (was) handlers.onEnd?.();
    },
  };
}
