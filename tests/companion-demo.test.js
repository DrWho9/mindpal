import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_STORAGE_KEY } from "../src/companion/client.js";
import {
  BREATH_EXERCISE_ID,
  CHECKING_BANNER,
  CHOICES,
  COMPANION_BASE_KEY,
  COMPANION_POLICY_VERSION,
  CRISIS_LINES,
  DEFAULT_COMPANION_BASE,
  DEMO_BANNER,
  HELP_ROUTE,
  INTENT_PANELS,
  LIVE_BANNER,
  PRACTICE_CARDS,
  REFLECT_ROUTE,
  activatePracticeCard,
  applyChoice,
  companionBanner,
  companionChatPayload,
  companionChatUrl,
  companionStatusUrl,
  emptyCompanionState,
  isCrisisChoice,
  normalizeCompanionBase,
  openLiveChat,
  parseCompanionReply,
  parseCompanionStatus,
  primaryCtaLabel,
  probeCompanionStatus,
  revealPractices,
  resolveCompanionBaseUrl,
  saveCompanionBase,
  setCompanionLive,
} from "../src/companion/demo.js";

const root = dirname(fileURLToPath(import.meta.url));
const inject = readFileSync(join(root, "../src/patches/companion-demo.inject.js"), "utf8");
const build = readFileSync(join(root, "../scripts/build.mjs"), "utf8");

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    store,
  };
}

describe("companion demo choices", () => {
  it("keeps four CHOICE controls and four practice cards", () => {
    assert.deepEqual(
      CHOICES.map((item) => item.id),
      ["ordinary", "distress", "concern_uncertain", "urgent"],
    );
    assert.equal(CHOICES.filter((item) => item.kind === "crisis").length, 3);
    assert.deepEqual(
      PRACTICE_CARDS.map((item) => item.id),
      ["breath", "reframe", "next-step", "reflect"],
    );
    assert.equal(PRACTICE_CARDS.length >= 2 && PRACTICE_CARDS.length <= 4, true);
    assert.equal(PRACTICE_CARDS[0].action.exerciseId, BREATH_EXERCISE_ID);
    assert.equal(PRACTICE_CARDS[3].action.route, REFLECT_ROUTE);
    assert.ok(PRACTICE_CARDS[1].teaser);
    assert.notEqual(PRACTICE_CARDS[1].teaser, PRACTICE_CARDS[1].body);
  });

  it("lets any mood/intent replace the previous panel, including going back", () => {
    let state = emptyCompanionState();
    state = applyChoice(state, "distress");
    assert.equal(state.choiceId, "distress");
    assert.equal(state.panel, "crisis");
    assert.equal(state.navigate, HELP_ROUTE);
    state = applyChoice(state, "ordinary");
    assert.equal(state.choiceId, "ordinary");
    assert.equal(state.panel, "intent");
    assert.equal(state.navigate, null);
    assert.equal(INTENT_PANELS.ordinary.title.includes("exercise"), true);
  });

  it("routes distress, unsafe, and immediate help to crisis/Help content", () => {
    for (const id of ["distress", "concern_uncertain", "urgent"]) {
      assert.equal(isCrisisChoice(id), true);
      const next = applyChoice(emptyCompanionState(), id);
      assert.equal(next.panel, "crisis");
      assert.equal(next.navigate, HELP_ROUTE);
      assert.equal(next.practicesVisible, false);
      assert.match(INTENT_PANELS[id].body, /Lifeline 13 11 14|000/);
    }
    assert.equal(CRISIS_LINES.emergency.number, "000");
    assert.equal(CRISIS_LINES.lifeline.number, "13 11 14");
    assert.equal(primaryCtaLabel(applyChoice(emptyCompanionState(), "urgent")), "Open Help now");
  });

  it("makes the primary CTA always change the screen", () => {
    let state = emptyCompanionState();
    assert.equal(primaryCtaLabel(state), "Show practice choices");
    const first = revealPractices(state);
    assert.equal(first.practicesVisible, true);
    assert.equal(first.panel, "practices");
    assert.equal(first.expandedCardId, null);
    const second = revealPractices(first);
    assert.equal(second.practicesVisible, true);
    assert.equal(second.expandedCardId, "breath");
    const crisisCta = revealPractices(applyChoice(state, "distress"));
    assert.equal(crisisCta.navigate, HELP_ROUTE);
    assert.equal(crisisCta.panel, "crisis");
  });

  it("expands or navigates from practice cards", () => {
    let state = revealPractices(emptyCompanionState());
    const reframe = activatePracticeCard(state, "reframe");
    assert.equal(reframe.expandedCardId, "reframe");
    assert.equal(reframe.navigate, null);
    const collapsed = activatePracticeCard(reframe, "reframe");
    assert.equal(collapsed.expandedCardId, null);
    const breath = activatePracticeCard(state, "breath");
    assert.equal(breath.exerciseId, "E01");
    const reflect = activatePracticeCard(state, "reflect");
    assert.equal(reflect.navigate, REFLECT_ROUTE);
  });

  it("keeps the DEMO banner until Live, then offers chat without dropping crisis", () => {
    const demo = emptyCompanionState();
    assert.equal(companionBanner(demo), DEMO_BANNER);
    assert.match(DEMO_BANNER, /live chat is off/i);
    assert.equal(companionBanner({ ...demo, status: "checking" }), CHECKING_BANNER);
    assert.equal(openLiveChat(demo).chatOpen, false);
    const live = setCompanionLive(demo, { available: true, model: "grok", reason: "ok" });
    assert.equal(live.status, "live");
    assert.equal(live.reason, "ok");
    assert.equal(companionBanner(live), LIVE_BANNER);
    assert.equal(openLiveChat(live).chatOpen, true);
    const stillCrisis = applyChoice(live, "urgent");
    assert.equal(stillCrisis.navigate, HELP_ROUTE);
    assert.equal(setCompanionLive(live, { available: false, reason: "unavailable" }).status, "demo");
    assert.equal(primaryCtaLabel(live, { hasMessage: true }), "Send to MindPal");
    assert.equal(primaryCtaLabel(live, { hasMessage: true, sending: true }), "Sending…");
    assert.equal(primaryCtaLabel(demo, { hasMessage: true }), "Show practice choices");
  });

  it("resolves a configurable companion base URL without inventing a tunnel", () => {
    assert.equal(normalizeCompanionBase("https://proxy.example"), "https://proxy.example/");
    assert.equal(companionStatusUrl("/mindpal/"), "/mindpal/api/companion/status");
    assert.equal(companionChatUrl("/mindpal"), "/mindpal/api/companion/chat");
    const storage = memoryStorage();
    assert.equal(
      resolveCompanionBaseUrl({ search: "?companionBase=https://proxy.test" }),
      "https://proxy.test/",
    );
    assert.equal(
      resolveCompanionBaseUrl({ globalBase: "https://from-global" }),
      "https://from-global/",
    );
    saveCompanionBase("https://saved.example", storage);
    assert.equal(storage.getItem(COMPANION_BASE_KEY), "https://saved.example/");
    assert.equal(resolveCompanionBaseUrl({ storage }), "https://saved.example/");
    assert.equal(resolveCompanionBaseUrl({}), DEFAULT_COMPANION_BASE);
    assert.equal(COMPANION_BASE_KEY, BASE_STORAGE_KEY);
    assert.equal(COMPANION_BASE_KEY, "mindpal.companion.base");
  });

  it("treats status as Live only when available is true", () => {
    assert.deepEqual(parseCompanionStatus({ available: true, model: "grok" }), {
      available: true,
      model: "grok",
    });
    assert.deepEqual(parseCompanionStatus({ available: "yes" }), {
      available: false,
      model: null,
    });
  });

  it("probes status through the configurable base and fails closed", async () => {
    const calls = [];
    const status = await probeCompanionStatus({
      base: "https://proxy.test",
      timeoutMs: 50,
      fetchImpl: async (url) => {
        calls.push(url);
        return {
          ok: true,
          json: async () => ({ available: true, model: "grok" }),
        };
      },
    });
    assert.deepEqual(calls, ["https://proxy.test/api/companion/status"]);
    assert.equal(status.available, true);
    const offline = await probeCompanionStatus({
      fetchImpl: async () => {
        throw new Error("offline");
      },
    });
    assert.equal(offline.available, false);
  });

  it("builds a policy-versioned chat payload and accepts a matching reply", () => {
    const payload = companionChatPayload({
      safetyState: "ordinary",
      message: "  hello  ",
      requestId: "req-1",
    });
    assert.deepEqual(payload, {
      requestId: "req-1",
      policyVersion: COMPANION_POLICY_VERSION,
      safetyState: "ordinary",
      message: "hello",
    });
    const reply = parseCompanionReply(
      {
        requestId: "req-1",
        policyVersion: COMPANION_POLICY_VERSION,
        kind: "reply",
        reply: "A small next step.",
        modelDisclosure: "xAI Grok",
      },
      "req-1",
    );
    assert.equal(reply.kind, "reply");
    assert.equal(parseCompanionReply({ requestId: "nope" }, "req-1"), null);
  });

  it("wires the Companion page so every control is a real handler", () => {
    assert.match(inject, /function mpCompanionPage\(/);
    assert.match(inject, /mpCompanionDemo\.applyChoice/);
    assert.match(inject, /mpCompanionDemo\.revealPractices/);
    assert.match(inject, /mpCompanionDemo\.activatePracticeCard/);
    assert.match(inject, /mpCompanion\.fetchCompanionStatus/);
    assert.match(inject, /mpCompanionBaseCard/);
    assert.match(inject, /Talk with MindPal/);
    assert.match(inject, /Open Help/);
    assert.match(inject, /Lifeline on 13 11 14/);
    assert.match(inject, /call 000/);
    assert.match(inject, /DETERMINISTIC DEMO|companionBanner/);
    assert.match(inject, /Live companion address/);
    assert.match(inject, /does not invent a public tunnel/);
    assert.match(inject, /mp-practice-card/);
    assert.match(inject, /Hear this/);
    assert.match(inject, /Use microphone/);
    assert.match(inject, /MindPal is writing a reply/);
    assert.match(inject, /Check again/);
    assert.match(inject, /Save the MindPal address/);
    assert.match(inject, /onKeyDown:onKey/);
    assert.doesNotMatch(inject, /No audio or microphone/);
    assert.doesNotMatch(inject, /Preparing fixed choices/);
    assert.doesNotMatch(inject, /trycloudflare\.com|127\.0\.0\.1:8787/);
    assert.match(build, /src\/companion\/demo\.js/);
    assert.match(build, /mpCompanionDemo=/);
    assert.match(build, /function mpReflectPage\(/);
    assert.match(build, /mpCompanionPage/);
    assert.match(build, /t===`Companion`&&\(0,A\.jsx\)\(mpCompanionPage/);
  });
});
