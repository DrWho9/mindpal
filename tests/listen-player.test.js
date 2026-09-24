import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LISTEN_SKIP_SEC,
  buildSpeechTimeline,
  chunkIndexAt,
  createAudioListenController,
  createListenController,
  createSpeechListenController,
  formatListenClock,
  formatListenRemaining,
  listenPointerRatio,
  listenTimes,
  upgradeSpeechToBlob,
} from "../src/tts/listen-player.js";

const root = dirname(fileURLToPath(import.meta.url));
const owner = readFileSync(join(root, "../src/patches/owner-ux.inject.js"), "utf8");
const daily = readFileSync(join(root, "../src/patches/daily-reading.inject.js"), "utf8");
const ui = readFileSync(join(root, "../src/patches/listen-player.inject.js"), "utf8");
const css = readFileSync(join(root, "../src/patches/styles.css"), "utf8");

function utteranceClass() {
  return class {
    constructor(text) {
      this.text = text;
    }
  };
}

function fakeSynth() {
  let current = null;
  const spoken = [];
  const synth = {
    speaking: false,
    pending: false,
    spoken,
    getVoices: () => [{ name: "Karen", lang: "en-AU", voiceURI: "karen" }],
    resume() {},
    cancel() {
      this.speaking = false;
      const utterance = current;
      current = null;
      utterance?.onerror?.({ error: "interrupted" });
    },
    speak(utterance) {
      spoken.push(utterance.text);
      this.speaking = true;
      current = utterance;
    },
    finish() {
      this.speaking = false;
      const utterance = current;
      current = null;
      utterance?.onend?.();
    },
  };
  return synth;
}

function speechHarness(text) {
  const synth = fakeSynth();
  let clock = 0;
  const ctrl = createSpeechListenController(text, {
    speechSynthesis: synth,
    Utterance: utteranceClass(),
    now: () => clock,
    later: (fn) => fn(),
    pickVoice: () => synth.getVoices()[0],
  });
  return {
    ctrl,
    synth,
    advance(ms) {
      clock += ms;
    },
  };
}

function fakeAudio(duration = 100) {
  const listeners = {};
  return {
    duration,
    currentTime: 0,
    paused: true,
    preload: "",
    addEventListener(name, fn) {
      (listeners[name] ||= []).push(fn);
    },
    removeEventListener(name, fn) {
      listeners[name] = (listeners[name] || []).filter((item) => item !== fn);
    },
    play() {
      this.paused = false;
      (listeners.play || []).forEach((fn) => fn());
      return Promise.resolve();
    },
    pause() {
      this.paused = true;
      (listeners.pause || []).forEach((fn) => fn());
    },
  };
}

describe("Listen clock and scrub math", () => {
  it("formats current and remaining like a media player", () => {
    assert.equal(formatListenClock(61), "01:01");
    assert.equal(formatListenRemaining(270), "-04:30");
    assert.deepEqual(listenTimes(61, 331), { current: "01:01", remaining: "-04:30" });
    assert.equal(LISTEN_SKIP_SEC, 8);
  });

  it("maps a drag on the track into a 0–1 ratio", () => {
    assert.equal(listenPointerRatio(25, { left: 0, width: 100 }), 0.25);
    assert.equal(listenPointerRatio(-5, { left: 10, width: 100 }), 0);
    assert.equal(listenPointerRatio(200, { left: 0, width: 50 }), 1);
    assert.equal(listenPointerRatio(10, { left: 0, width: 0 }), 0);
  });

  it("splits a reading into seekable chunks", () => {
    const chunks = buildSpeechTimeline(
      "One calm sentence. Two calm sentence. Three calm sentence about the morning and the breath.",
    );
    assert.ok(chunks.length >= 2);
    assert.equal(chunks[0].start, 0);
    assert.ok(chunks[1].start >= chunks[0].end - 0.001);
    assert.equal(chunkIndexAt(chunks, 0), 0);
    assert.equal(chunkIndexAt(chunks, chunks[0].end + 0.2), 1);
  });
});

describe("speech Listen starts in the click and can be scrubbed", () => {
  const reading = Array.from({ length: 30 }, (_, index) => `Calm sentence ${index + 1} for the morning.`).join(
    " ",
  );

  it("speaks during play() without waiting for a network round trip", () => {
    const { ctrl, synth } = speechHarness(reading);
    const ok = ctrl.play();
    assert.equal(ok, true);
    assert.equal(synth.speaking, true);
    assert.equal(synth.spoken.length, 1);
    assert.match(synth.spoken[0], /Calm sentence 1/);
    assert.equal(ctrl.snapshot().playing, true);
    assert.equal(ctrl.snapshot().seekable, true);
    assert.ok(ctrl.snapshot().duration > 8);
  });

  it("skip and seek jump to a later chunk instead of restarting the opening", () => {
    const { ctrl, synth } = speechHarness(reading);
    ctrl.play();
    const opening = synth.spoken[0];
    ctrl.skip(LISTEN_SKIP_SEC);
    assert.ok(synth.spoken.length >= 2);
    assert.notEqual(synth.spoken.at(-1), opening);
    assert.ok(ctrl.snapshot().current > 0);
    const mid = ctrl.snapshot().current;
    ctrl.seek(ctrl.snapshot().duration);
    assert.equal(ctrl.snapshot().playing, false);
    assert.ok(ctrl.snapshot().current >= mid);
  });

  it("pause cancels speech and a second player takes over", () => {
    const first = speechHarness("First peaceful reading for this morning practice.");
    const second = speechHarness("Second peaceful reading takes over the speaker.");
    first.ctrl.play();
    assert.equal(first.synth.speaking, true);
    first.ctrl.pause();
    assert.equal(first.synth.speaking, false);
    assert.equal(first.ctrl.snapshot().playing, false);
    second.ctrl.play();
    assert.equal(first.ctrl.snapshot().playing, false);
    assert.equal(second.synth.speaking, true);
    assert.match(second.synth.spoken[0], /Second peaceful/);
  });
});

describe("audio Listen seeks inside the element", () => {
  it("skip and drag-seek clamp to the audio duration", () => {
    const audio = fakeAudio(100);
    const ctrl = createAudioListenController(audio);
    ctrl.seek(10);
    ctrl.skip(8);
    assert.equal(audio.currentTime, 18);
    ctrl.skip(-100);
    assert.equal(audio.currentTime, 0);
    ctrl.skip(1000);
    assert.equal(audio.currentTime, 100);
    assert.equal(ctrl.snapshot().remainingLabel, "-00:00");
    assert.equal(ctrl.snapshot().currentLabel, "01:40");
  });

  it("calls play() immediately for a catalogued file", async () => {
    let played = 0;
    const ctrl = createListenController(
      { id: "quiet-kindness", text: "A morning reading." },
      {
        url: "/mindpal/audio/phase1/quiet-kindness.mp3",
        Audio: function Audio(url) {
          this.url = url;
          this.duration = 12;
          this.currentTime = 0;
          this.paused = true;
          this.play = () => {
            played += 1;
            this.paused = false;
            return Promise.resolve();
          };
          this.pause = () => {
            this.paused = true;
          };
          this.addEventListener = () => {};
          this.removeEventListener = () => {};
        },
      },
    );
    assert.equal(ctrl.kind, "audio");
    const ok = await ctrl.play();
    assert.equal(ok, true);
    assert.equal(played, 1);
    assert.equal(ctrl.snapshot().playing, true);
  });

  it("keeps browser speech when no neural file exists", () => {
    const synth = fakeSynth();
    const ctrl = createListenController(
      { id: "dstss-day-1", text: "A peaceful reading without a file." },
      {
        catalog: { entries: [] },
        speechSynthesis: synth,
        Utterance: utteranceClass(),
        later: (fn) => fn(),
        now: () => 0,
        pickVoice: () => null,
      },
    );
    assert.equal(ctrl.kind, "speech");
    assert.equal(ctrl.play(), true);
    assert.match(synth.spoken[0], /peaceful reading/i);
  });
});

describe("neural blob replaces speech with a seekable element", () => {
  it("returns null when speech is already paused", async () => {
    const { ctrl } = speechHarness("A short peaceful reading for the upgrade check.");
    ctrl.play();
    ctrl.pause();
    const upgraded = await upgradeSpeechToBlob(ctrl, { size: 4 }, {
      Audio: fakeAudio,
      createObjectURL: () => "blob:paused",
      revokeObjectURL: () => {},
    });
    assert.equal(upgraded, null);
  });

  it("plays the blob and stops the browser voice", async () => {
    const { ctrl, synth } = speechHarness("A short peaceful reading for the upgrade check.");
    ctrl.play();
    let revoked = 0;
    const upgraded = await upgradeSpeechToBlob(
      ctrl,
      { size: 8 },
      {
        Audio: function Audio(url) {
          this.url = url;
          this.duration = 20;
          this.currentTime = 0;
          this.paused = true;
          this.play = () => {
            this.paused = false;
            return Promise.resolve();
          };
          this.pause = () => {
            this.paused = true;
          };
          this.addEventListener = () => {};
          this.removeEventListener = () => {};
        },
        createObjectURL: () => "blob:reading",
        revokeObjectURL: () => {
          revoked += 1;
        },
      },
    );
    assert.equal(upgraded.kind, "audio");
    assert.equal(synth.speaking, false);
    assert.equal(ctrl.snapshot().playing, false);
    upgraded.stop();
    assert.equal(revoked, 1);
  });
});

describe("Peaceful reading Listen UI", () => {
  it("mounts a scrubber on the peaceful reading and does not cancel it on re-render", () => {
    assert.match(owner, /mpListenPlayer,\{id:v\.id,text:yt\(v\),label:`Peaceful reading`\}/);
    assert.doesNotMatch(owner, /m&&m\(\)/);
    assert.match(daily, /mpListenPlayer,\{id:b\.id,text:yt\(b\),label:`Reading`\}/);
    assert.match(ui, /Skip back 8 seconds/);
    assert.match(ui, /Skip forward 8 seconds/);
    assert.match(ui, /role:`slider`/);
    assert.match(ui, /mp-listen-handle/);
    assert.match(css, /\.mp-listen-handle/);
    assert.match(css, /cursor:grab/);
  });
});
