import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createMicCapture,
  micErrorCopy,
  micUnsupportedCopy,
  transcriptFromResult,
} from "../src/tts/mic.js";

describe("Companion microphone", () => {
  it("explains a missing mic in plain language", () => {
    assert.match(micUnsupportedCopy(), /Type your message/);
    assert.match(micErrorCopy("not-allowed"), /permission/i);
    assert.match(micErrorCopy("no-speech"), /closer/);
    assert.equal(micErrorCopy("aborted"), "");
  });

  it("reads a final browser transcript", () => {
    const heard = transcriptFromResult({
      resultIndex: 1,
      results: [{ 0: { transcript: "ignore " }, isFinal: true }, { 0: { transcript: "hello there" }, isFinal: true }],
    });
    assert.deepEqual(heard, { text: "hello there", isFinal: true });
  });

  it("puts the final line in the box and always clears listening", () => {
    const events = [];
    class FakeRecognition {
      start() {
        this.onresult?.({
          resultIndex: 0,
          results: [{ 0: { transcript: "a small next step" }, isFinal: true }],
        });
        this.onend?.();
      }
      stop() {
        this.onend?.();
      }
    }
    const mic = createMicCapture(
      {
        onStart: () => events.push("start"),
        onFinal: (text) => events.push(text),
        onEnd: () => events.push("end"),
        onError: (code) => events.push(code),
      },
      { Ctor: FakeRecognition },
    );
    assert.equal(mic.supported, true);
    assert.equal(mic.start(), true);
    assert.equal(mic.isListening(), false);
    assert.deepEqual(events, ["start", "a small next step", "end"]);
  });

  it("tells the owner to type when the mic cannot start", () => {
    class Broken {
      start() {
        throw new Error("blocked");
      }
    }
    const notes = [];
    const mic = createMicCapture({ onError: (code) => notes.push(micErrorCopy(code)) }, { Ctor: Broken });
    assert.equal(mic.start(), false);
    assert.match(notes[0], /Type your message/);
    assert.equal(mic.isListening(), false);
  });
});
