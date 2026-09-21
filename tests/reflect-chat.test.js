import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASE_STORAGE_KEY,
  COMPANION_POLICY_VERSION,
  DEFAULT_PAGES_BASE,
  DEMO_LABEL,
  LIVE_LABEL,
  UNAVAILABLE_NOTE,
  buildChatRequest,
  companionUrl,
  fetchCompanionStatus,
  parseCompanionReply,
  parseCompanionStatus,
  persistCompanionBase,
  resolveCompanionBase,
  sendCompanionChat,
  storedCompanionBase,
} from "../src/companion/client.js";
import {
  canSendText,
  shouldSendOnKey,
} from "../src/reflect/composer.js";
import {
  CLINICAL_DISCLAIMER,
  CRISIS_COPY,
  REFLECT_SYSTEM_PROMPT,
  detectCrisisIntent,
  safetyStateForText,
} from "../src/reflect/prompt.js";
import {
  THREAD_STORAGE_KEY,
  appendMessage,
  clearThread,
  downloadableTranscript,
  emptyThread,
  loadThread,
  normalizeThread,
  saveThread,
} from "../src/reflect/thread.js";
import { civilDateKey } from "../src/calendar/civil.js";

const root = dirname(fileURLToPath(import.meta.url));
const inject = readFileSync(join(root, "../src/patches/reflect-chat.inject.js"), "utf8");
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

describe("companion client", () => {
  it("uses the existing /mindpal/api/companion path", () => {
    assert.equal(companionUrl("status"), "/mindpal/api/companion/status");
    assert.equal(companionUrl("chat"), "/mindpal/api/companion/chat");
    assert.equal(companionUrl("chat", "https://proxy.example/mindpal/"), "https://proxy.example/mindpal/api/companion/chat");
    assert.equal(COMPANION_POLICY_VERSION, "companion-ai-v1");
  });

  it("resolves a Pages-overridable companion base", () => {
    assert.equal(resolveCompanionBase({}), "/mindpal/");
    assert.equal(
      resolveCompanionBase({ MINDPAL_COMPANION_BASE: "https://api.example.com/mindpal" }),
      "https://api.example.com/mindpal/",
    );
    assert.equal(
      resolveCompanionBase({ location: { search: "?companionBase=https://from-query.example/mindpal" } }),
      "https://from-query.example/mindpal/",
    );
    const storage = memoryStorage({ [BASE_STORAGE_KEY]: "https://live.example/" });
    assert.equal(resolveCompanionBase({ localStorage: storage }), "https://live.example/");
    assert.equal(
      resolveCompanionBase({
        location: { search: "?companionBase=https://q.example" },
        localStorage: storage,
      }),
      "https://q.example/",
    );
    assert.equal(resolveCompanionBase({}), DEFAULT_PAGES_BASE);
    assert.doesNotMatch(DEFAULT_PAGES_BASE, /8787|trycloudflare/);
    const blank = memoryStorage();
    assert.equal(persistCompanionBase("https://proxy.example/mindpal", { localStorage: blank }), "https://proxy.example/mindpal/");
    assert.equal(storedCompanionBase({ localStorage: blank }), "https://proxy.example/mindpal/");
    assert.equal(persistCompanionBase("  ", { localStorage: blank }), "");
    assert.equal(storedCompanionBase({ localStorage: blank }), "");
  });

  it("treats only available:true as Live", () => {
    assert.deepEqual(parseCompanionStatus({ available: true, model: "grok" }), {
      available: true,
      model: "grok",
      medicalKey: false,
    });
    assert.equal(parseCompanionStatus({ available: true, medicalKey: true }).medicalKey, true);
    assert.equal(parseCompanionStatus({ available: "yes" }).available, false);
    assert.equal(parseCompanionStatus(null).available, false);
    assert.equal(LIVE_LABEL, "Live");
    assert.match(DEMO_LABEL, /Demo/);
  });

  it("reports Demo when status is missing or offline", async () => {
    const failed = await fetchCompanionStatus({
      fetchImpl: async () => ({ ok: false }),
      base: "/mindpal/",
    });
    assert.equal(failed.available, false);

    const live = await fetchCompanionStatus({
      fetchImpl: async (url) => {
        assert.equal(url, "/mindpal/api/companion/status");
        return {
          ok: true,
          json: async () => ({ available: true, model: "xAI Grok" }),
        };
      },
      base: "/mindpal/",
    });
    assert.equal(live.available, true);
    assert.equal(live.model, "xAI Grok");
  });

  it("sends the Reflect system prompt on the companion chat contract and does not invent replies", async () => {
    const requestId = "req-1";
    const calls = [];
    const result = await sendCompanionChat({
      message: "i had a tough argument with my wife",
      system: REFLECT_SYSTEM_PROMPT,
      lane: "reflect",
      requestId,
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return {
          ok: true,
          headers: { get: () => "application/json" },
          text: async () =>
            JSON.stringify({
              requestId,
              policyVersion: COMPANION_POLICY_VERSION,
              kind: "reply",
              reply: "That sounds raw. A fight with someone you love can leave you shaken.",
              modelDisclosure: "xAI Grok via MindPal companion proxy",
            }),
        };
      },
    });
    assert.equal(calls[0].url, "/mindpal/api/companion/chat");
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.lane, "reflect");
    assert.match(body.system, /not a psychologist/);
    assert.equal(body.message, "i had a tough argument with my wife");
    assert.equal(result.kind, "reply");
    assert.match(result.value.reply, /shaken/);

    const missing = await sendCompanionChat({
      message: "hello",
      requestId: "req-2",
      fetchImpl: async () => ({
        ok: false,
        headers: { get: () => "text/html" },
        text: async () => "<html>404</html>",
      }),
    });
    assert.equal(missing.kind, "unavailable");
    assert.match(UNAVAILABLE_NOTE, /not live/);
    assert.equal(parseCompanionReply({ reply: "invented" }, { requestId: "x", policyVersion: COMPANION_POLICY_VERSION }), null);
  });

  it("keeps the vendor request shape so an existing proxy can answer", () => {
    const request = buildChatRequest({
      message: "today was hard",
      system: REFLECT_SYSTEM_PROMPT,
      messages: [{ role: "user", text: "today was hard" }],
    });
    assert.equal(request.policyVersion, "companion-ai-v1");
    assert.equal(request.safetyState, "ordinary");
    assert.ok(request.requestId);
    assert.equal(request.message, "today was hard");
  });
});

describe("Reflect prompt and crisis", () => {
  it("is psych-informed without claiming to be a psychologist", () => {
    assert.match(REFLECT_SYSTEM_PROMPT, /CBT/);
    assert.match(REFLECT_SYSTEM_PROMPT, /ACT/);
    assert.match(REFLECT_SYSTEM_PROMPT, /Reflective listening/);
    assert.match(REFLECT_SYSTEM_PROMPT, /not a psychologist/);
    assert.match(REFLECT_SYSTEM_PROMPT, /Never diagnose/);
    assert.match(REFLECT_SYSTEM_PROMPT, /13 11 14/);
    assert.match(REFLECT_SYSTEM_PROMPT, /000/);
    assert.match(CLINICAL_DISCLAIMER, /not a psychologist/);
    assert.match(CLINICAL_DISCLAIMER, /13 11 14/);
  });

  it("stops for self-harm or harm-to-others intent, not an everyday argument", () => {
    assert.equal(detectCrisisIntent("i had a tough argument with my wife").crisis, false);
    assert.equal(detectCrisisIntent("I want to kill this presentation").crisis, false);
    assert.equal(detectCrisisIntent("I want to kill myself").crisis, true);
    assert.equal(detectCrisisIntent("I'm going to hurt them").crisis, true);
    assert.equal(safetyStateForText("I want to die"), "urgent");
    assert.match(CRISIS_COPY.body, /000/);
    assert.match(CRISIS_COPY.body, /13 11 14/);
    assert.equal(CRISIS_COPY.lifelineHref, "tel:131114");
  });
});

describe("Reflect thread", () => {
  it("persists for today and clears on finish", () => {
    const storage = memoryStorage();
    const today = new Date("2026-09-21T10:00:00");
    const saved = appendMessage(
      emptyThread(today),
      { role: "user", text: "i had a tough argument with my wife", at: today.toISOString() },
      storage,
      today,
    );
    assert.equal(saved.messages.length, 1);
    assert.equal(loadThread(storage, today).messages[0].text, "i had a tough argument with my wife");
    assert.equal(storage.getItem(THREAD_STORAGE_KEY).includes("argument"), true);

    const yesterday = loadThread(storage, new Date("2026-09-22T09:00:00"));
    assert.equal(yesterday.messages.length, 0);
    assert.equal(yesterday.date, "2026-09-22");

    const cleared = clearThread(storage, today);
    assert.equal(cleared.messages.length, 0);
    assert.equal(storage.getItem(THREAD_STORAGE_KEY), null);
  });

  it("drops a stale stored day instead of carrying it over", () => {
    const stale = {
      version: 1,
      date: "2026-09-20",
      messages: [{ id: "old", role: "user", text: "yesterday", at: "2026-09-20T12:00:00.000Z" }],
    };
    const next = normalizeThread(stale, new Date("2026-09-21T08:00:00"));
    assert.deepEqual(next.messages, []);
    assert.equal(next.date, civilDateKey(new Date("2026-09-21T08:00:00")));
  });

  it("can export a local transcript without claiming assessment", () => {
    const thread = saveThread(
      {
        date: "2026-09-21",
        messages: [
          { id: "1", role: "user", text: "tired", at: "2026-09-21T01:00:00.000Z" },
          { id: "2", role: "assistant", text: "That sounds heavy.", at: "2026-09-21T01:00:01.000Z" },
        ],
      },
      memoryStorage(),
      new Date("2026-09-21T12:00:00"),
    );
    const text = downloadableTranscript(thread);
    assert.match(text, /not assessed/);
    assert.match(text, /You: tired/);
    assert.match(text, /MindPal: That sounds heavy/);
  });
});

describe("composer keys", () => {
  it("sends on Enter and keeps Shift+Enter as a newline", () => {
    assert.equal(shouldSendOnKey({ key: "Enter", shiftKey: false }), true);
    assert.equal(shouldSendOnKey({ key: "Enter", shiftKey: true }), false);
    assert.equal(shouldSendOnKey({ key: "Enter", ctrlKey: true }), false);
    assert.equal(shouldSendOnKey({ key: "a" }), false);
    assert.equal(canSendText("  hello  "), true);
    assert.equal(canSendText("   "), false);
  });
});

describe("Reflect chat inject", () => {
  it("replaces the preview with a named MindPal conversation", () => {
    assert.match(inject, /Talk with MindPal/);
    assert.match(inject, /children:l\?`Sending…`:`Send`/);
    assert.match(inject, /shouldSendOnKey/);
    assert.match(inject, /fetchCompanionStatus/);
    assert.match(inject, /sendCompanionChat/);
    assert.match(inject, /REFLECT_SYSTEM_PROMPT/);
    assert.match(inject, /Clear reflection & finish/);
    assert.match(inject, /Help me now/);
    assert.doesNotMatch(inject, /This page cannot understand your words/);
    assert.doesNotMatch(inject, /Self-guided preview/);
    assert.match(inject, /mpCompanionBaseCard/);
    assert.doesNotMatch(inject, /127\.0\.0\.1:8787|trycloudflare\.com/);
    assert.match(build, /function ti\(props\)\{return mpReflectPage\(props\)\}/);
    assert.match(build, /function exciseVendorReflectPreview/);
    assert.doesNotMatch(build, /function mpReflectLegacy\(\{/);
    assert.match(build, /onOpenReflect:\(\)=>I\(`Reflect`\)/);
  });
});

describe("Pages tip hash", () => {
  it("does not keep Hands’ failed pre-chat index-3cb5ea74.js", () => {
    const html = readFileSync(join(root, "../index.html"), "utf8");
    const verify = readFileSync(join(root, "../scripts/verify.mjs"), "utf8");
    assert.doesNotMatch(html, /index-3cb5ea74\.js/);
    assert.doesNotMatch(html, /index-293ac69a\.js/);
    assert.match(html, /assets\/index-[a-z0-9]+\.js/);
    assert.match(html, /http:\/\/127\.0\.0\.1:\*/);
    assert.doesNotMatch(html, /trycloudflare\.com|127\.0\.0\.1:8787/);
    assert.match(verify, /index-3cb5ea74/);
  });
});
