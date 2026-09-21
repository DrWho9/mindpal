import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPOINTMENT_DISCLAIMER,
  APPOINTMENT_LANE,
  APPOINTMENT_SYSTEM_PROMPT,
  APPOINTMENT_THREAD_STORAGE_KEY,
} from "../src/appointment/prompt.js";
import { buildChatRequest } from "../src/companion/client.js";
import { appendMessage, loadThread } from "../src/reflect/thread.js";
import { civilDateKey } from "../src/calendar/civil.js";

const root = dirname(fileURLToPath(import.meta.url));
const inject = readFileSync(join(root, "../src/patches/appointment-chat.inject.js"), "utf8");
const build = readFileSync(join(root, "../scripts/build.mjs"), "utf8");

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    store,
  };
}

describe("appointment medical companion", () => {
  it("uses the appointment_health_literacy lane and does not claim to be a clinician", () => {
    assert.equal(APPOINTMENT_LANE, "appointment_health_literacy");
    assert.match(APPOINTMENT_SYSTEM_PROMPT, /not a doctor/i);
    assert.match(APPOINTMENT_SYSTEM_PROMPT, /never diagnose/i);
    assert.match(APPOINTMENT_SYSTEM_PROMPT, /cannot read results/i);
    assert.match(APPOINTMENT_DISCLAIMER, /not a doctor/);
    const request = buildChatRequest({
      message: "What does this blood test mean?",
      system: APPOINTMENT_SYSTEM_PROMPT,
      lane: APPOINTMENT_LANE,
    });
    assert.equal(request.lane, "appointment_health_literacy");
    assert.match(request.system, /health-literacy/);
  });

  it("persists the appointment thread separately from Reflect", () => {
    const storage = memoryStorage();
    const today = new Date("2026-09-21T12:00:00+10:00");
    appendMessage(
      loadThread(storage, today, APPOINTMENT_THREAD_STORAGE_KEY),
      { role: "user", text: "How do I ask about iron?", at: today.toISOString() },
      storage,
      today,
      APPOINTMENT_THREAD_STORAGE_KEY,
    );
    const loaded = loadThread(storage, today, APPOINTMENT_THREAD_STORAGE_KEY);
    assert.equal(loaded.date, civilDateKey(today));
    assert.equal(loaded.messages[0].text, "How do I ask about iron?");
    assert.equal(storage.getItem("mindpal.reflect.thread.v1"), null);
    assert.ok(storage.getItem(APPOINTMENT_THREAD_STORAGE_KEY));
  });

  it("mounts a Send/Enter chat on the Questions page, not a list-only notebook", () => {
    assert.match(inject, /function mpAppointmentChat/);
    assert.match(inject, /id:`mp-appoint-input`/);
    assert.match(inject, /shouldSendOnKey/);
    assert.match(inject, /children:l\?`Sending…`:`Send`/);
    assert.match(inject, /appointment_health_literacy|APPOINTMENT_LANE/);
    assert.match(inject, /mpCompanionBaseCard/);
    assert.doesNotMatch(inject, /trycloudflare\.com|127\.0\.0\.1:8787/);
    assert.match(build, /appointment-questions-chat/);
    assert.match(build, /mpAppointmentChat,\{onHelp:t\}/);
  });
});
