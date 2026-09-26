import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TTS_PITCH,
  TTS_RATE,
  TTS_VOICE_KEY,
  isNeuralOrNatural,
  listPickerVoices,
  loadSavedVoiceURI,
  pickVoice,
  saveVoiceURI,
  prepareSpeakChunks,
  speakBrowser,
  splitSpeakChunks,
} from "../src/tts/voices.js";
import {
  mergeTtsAudioCatalog,
  playAudioUrl,
  prerenderedAudioUrl,
  unwrapListenInput,
} from "../src/tts/audio.js";
import {
  MADDY_PREF_LABEL,
  MADDY_PREF_URI,
  companionLinkedClip,
  effectiveListenPref,
  isMaddyVoicePref,
  resolveListenAudioUrl,
} from "../src/tts/maddy-listen.js";

const root = dirname(fileURLToPath(import.meta.url));
const picker = readFileSync(
  join(root, "../src/patches/voice-picker.inject.js"),
  "utf8",
);
const daily = readFileSync(
  join(root, "../src/patches/daily-reading.inject.js"),
  "utf8",
);

function voice(name, lang, voiceURI = name) {
  return { name, lang, voiceURI };
}

describe("Listen voice pick", () => {
  it("prefers high-quality en-AU over Google US and never uses voices[0] when a better EN neural exists", () => {
    const voices = [
      voice("Compact", "en-US", "compact-0"),
      voice("Google US English", "en-US", "google-us"),
      voice("Microsoft Natasha Online (Natural) - English (Australia)", "en-AU", "natasha"),
    ];
    const picked = pickVoice(voices, "");
    assert.equal(picked.voiceURI, "natasha");
    assert.notEqual(picked.voiceURI, voices[0].voiceURI);
    assert.equal(isNeuralOrNatural(picked), true);
  });

  it("never keeps a generic Google voice as the silent default when a Natural voice exists", () => {
    const voices = [
      voice("Google US English", "en-US", "google-us"),
      voice("Microsoft Sonia Online (Natural) - English (United Kingdom)", "en-GB", "sonia"),
    ];
    assert.equal(pickVoice(voices, "").voiceURI, "sonia");
    assert.equal(pickVoice(voices, "auto").voiceURI, "sonia");
  });

  it("does not pick a non-English Google voice ahead of English neural/natural", () => {
    const voices = [
      voice("Google Deutsch", "de-DE", "de"),
      voice("Google UK English Female", "en-GB", "guk"),
    ];
    assert.equal(pickVoice(voices, "").voiceURI, "guk");
  });

  it("does not treat the Maddy preference as a missing browser voice", () => {
    const voices = [
      voice("Compact", "en-US", "compact-0"),
      voice("Microsoft Natasha Online (Natural) - English (Australia)", "en-AU", "natasha"),
    ];
    assert.equal(pickVoice(voices, "maddy").voiceURI, "natasha");
  });

  it("uses a saved URI when present", () => {
    const voices = [
      voice("Karen", "en-AU", "karen"),
      voice("Google UK English Female", "en-GB", "guk"),
    ];
    assert.equal(pickVoice(voices, "guk").voiceURI, "guk");
  });

  it("lists English picker rows and persists the choice", () => {
    const store = new Map();
    const storage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    };
    assert.equal(loadSavedVoiceURI(storage), "");
    saveVoiceURI("karen", storage);
    assert.equal(store.get(TTS_VOICE_KEY), "karen");
    const rows = listPickerVoices([
      voice("Google Deutsch", "de-DE", "de"),
      voice("Karen", "en-AU", "karen"),
    ]);
    assert.equal(rows[0].voiceURI, "karen");
    assert.equal(rows.length, 1);
  });
});

describe("softer browser speech", () => {
  it("uses calm rate/pitch and sequential paragraph pauses", async () => {
    const spoken = [];
    const timers = [];
    const realSetTimeout = setTimeout;
    globalThis.setTimeout = (fn, ms) => {
      timers.push(ms);
      return realSetTimeout(fn, 0);
    };
    try {
      await new Promise((resolve) => {
        speakBrowser("First thought.\n\nSecond thought.", resolve, {
          rate: TTS_RATE,
          pitch: TTS_PITCH,
          pauseMs: 420,
          Utterance: class {
            constructor(text) {
              this.text = text;
              this.rate = 1;
              this.pitch = 1;
              this.onend = null;
            }
          },
          speechSynthesis: {
            getVoices: () => [voice("Karen", "en-AU", "karen")],
            cancel() {},
            speak(utterance) {
              spoken.push({
                text: utterance.text,
                rate: utterance.rate,
                pitch: utterance.pitch,
                lang: utterance.lang,
              });
              utterance.onend?.();
            },
          },
        });
      });
    } finally {
      globalThis.setTimeout = realSetTimeout;
    }
    assert.deepEqual(
      spoken.map((row) => row.text),
      ["First thought.", "Second thought."],
    );
    assert.equal(spoken[0].rate, 0.89);
    assert.equal(spoken[0].pitch, 1);
    assert.equal(spoken[0].lang, "en-AU");
    assert.ok(timers.includes(420));
    assert.deepEqual(splitSpeakChunks("One\n\nTwo\n\n"), ["One", "Two"]);
  });

  it("speaks immediately when the voice list is still empty", async () => {
    const spoken = [];
    await new Promise((resolve) => {
      speakBrowser("A short calm line for this phone.", resolve, {
        speechSynthesis: {
          getVoices: () => [],
          addEventListener() {
            throw new Error("must not wait for voiceschanged");
          },
          cancel() {},
          resume() {},
          speak(utterance) {
            spoken.push(utterance.text);
            utterance.onend?.();
          },
        },
        Utterance: class {
          constructor(text) {
            this.text = text;
          }
        },
      });
    });
    assert.deepEqual(spoken, ["A short calm line for this phone."]);
  });

  it("splits a long paragraph so one utterance cannot run on for fifteen seconds", () => {
    const paragraph = Array.from({ length: 40 }, (_, index) => `Calm word ${index + 1}.`).join(" ");
    const chunks = prepareSpeakChunks(paragraph, 140);
    assert.ok(chunks.length >= 3);
    assert.ok(chunks.every((chunk) => chunk.length <= 140));
  });
});

describe("Phase-1 Neural audio", () => {
  it("only returns catalogued /mindpal/audio URLs", () => {
    const catalog = mergeTtsAudioCatalog(
      { entries: [] },
      [{ id: "quiet-kindness", url: "/mindpal/audio/phase1/quiet-kindness.mp3" }],
    );
    assert.equal(
      prerenderedAudioUrl(catalog, "quiet-kindness"),
      "/mindpal/audio/phase1/quiet-kindness.mp3",
    );
    assert.equal(prerenderedAudioUrl(catalog, "missing"), null);
    assert.equal(
      prerenderedAudioUrl(
        { entries: [{ id: "x", url: "https://evil.example/x.mp3" }] },
        "x",
      ),
      null,
    );
  });

  it("plays a safe URL and unwraps Listen payloads", async () => {
    const events = {};
    const played = [];
    const FakeAudio = function FakeAudio(url) {
      this.url = url;
      this.addEventListener = (name, fn) => {
        events[name] = fn;
      };
      this.play = async () => {
        played.push(url);
        queueMicrotask(() => events.ended?.());
      };
      this.pause = () => {};
      this.load = () => {
        events.canplaythrough?.();
      };
    };
    const result = await playAudioUrl("/mindpal/audio/phase1/day-1.mp3", {
      Audio: FakeAudio,
    });
    assert.equal(result, true);
    assert.deepEqual(played, ["/mindpal/audio/phase1/day-1.mp3"]);
    assert.deepEqual(unwrapListenInput({ id: "day-1", text: "Hello" }), {
      id: "day-1",
      text: "Hello",
    });
    assert.deepEqual(unwrapListenInput("Hello"), { id: "", text: "Hello" });
  });
});

describe("Listen UI keeps a Voice picker near Listen", () => {
  it("injects a persisted picker and daily Listen passes reading id", () => {
    assert.match(picker, /Listen voice/);
    assert.match(picker, /Auto \(warmest English\)/);
    assert.match(picker, /saveVoiceURI/);
    assert.match(picker, /MADDY_PREF_LABEL/);
    assert.match(picker, /Play Maddy’s welcome/);
    assert.match(picker, /Play Maddy’s tip/);
    assert.match(daily, /mpVoicePicker/);
    assert.match(daily, /mpMaddyListenButtons/);
    assert.match(daily, /id:b\.id,text:yt\(b\)/);
  });
});

describe("Maddy listen preference", () => {
  it("defaults empty storage to Maddy (when available) and keeps the v1 key", () => {
    assert.equal(MADDY_PREF_URI, "maddy");
    assert.equal(MADDY_PREF_LABEL, "Maddy (when available)");
    assert.equal(isMaddyVoicePref("maddy"), true);
    assert.equal(effectiveListenPref(""), "maddy");
    assert.equal(TTS_VOICE_KEY, "mindpal.tts.voice.v1");
  });

  it("reuses companion MP4 audio only for linked Maddy ids", () => {
    assert.equal(
      companionLinkedClip({ id: "maddy-tip", text: "unused" }).url,
      "/mindpal/videos/maddy/tip.mp4",
    );
    assert.equal(
      resolveListenAudioUrl({ id: "maddy-welcome", text: "Hi" }, { entries: [] }, "maddy"),
      "/mindpal/videos/maddy/welcome.mp4",
    );
    assert.equal(
      resolveListenAudioUrl({ id: "dstss-day-1", text: "A morning reading." }, { entries: [] }, "maddy"),
      null,
    );
  });
});
