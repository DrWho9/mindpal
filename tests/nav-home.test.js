import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HOME_EVENT, HOME_ROUTE, goHome, homeHash } from "../src/nav/home.js";

const root = dirname(fileURLToPath(import.meta.url));

describe("goHome", () => {
  it("uses the existing Today route", () => {
    assert.equal(HOME_ROUTE, "Today");
    assert.equal(homeHash(), "#Today");
  });

  it("calls the app navigate setter and announces close-sheets", () => {
    const routes = [];
    const events = [];
    const scrolls = [];
    const win = {
      dispatchEvent(event) {
        events.push(event.type);
        return true;
      },
      scrollTo(opts) {
        scrolls.push(opts);
      },
    };
    const result = goHome((route) => routes.push(route), { window: win });
    assert.equal(result, "Today");
    assert.deepEqual(routes, ["Today"]);
    assert.ok(events.includes(HOME_EVENT));
    assert.deepEqual(scrolls, [{ top: 0, behavior: "instant" }]);
  });

  it("still announces home when already on Today (React setState no-op)", () => {
    const events = [];
    const win = {
      location: { hash: "#Today" },
      history: { pushState() {} },
      dispatchEvent(event) {
        events.push(event.type);
        return true;
      },
      scrollTo() {},
    };
    goHome((route) => {
      assert.equal(route, "Today");
    }, { window: win });
    assert.ok(events.includes(HOME_EVENT));
  });

  it("closes open dialog sheets when going home", () => {
    const closed = [];
    const win = {
      document: {
        querySelectorAll() {
          return [{ close: () => closed.push("exercise") }];
        },
      },
      dispatchEvent() {
        return true;
      },
      scrollTo() {},
    };
    goHome(() => {}, { window: win });
    assert.deepEqual(closed, ["exercise"]);
  });

  it("falls back to the Today hash when navigate is missing", () => {
    const pushed = [];
    const events = [];
    const win = {
      location: { hash: "#Explore" },
      history: {
        pushState(_state, _title, url) {
          pushed.push(url);
        },
      },
      dispatchEvent(event) {
        events.push(event.type);
        return true;
      },
      scrollTo() {},
    };
    goHome(undefined, { window: win });
    assert.deepEqual(pushed, ["#Today"]);
    assert.ok(events.includes("popstate"));
    assert.ok(events.includes(HOME_EVENT));
  });
});

describe("brand home wiring", () => {
  it("owner UX exposes mpGoHome and problem chips listen for it", () => {
    const inject = readFileSync(join(root, "../src/patches/owner-ux.inject.js"), "utf8");
    assert.match(inject, /function mpGoHome\(/);
    assert.match(inject, /mpNav\.goHome/);
    assert.match(inject, /mpNav\.HOME_EVENT/);
  });

  it("library and coach sheets close on go-home", () => {
    const library = readFileSync(join(root, "../src/patches/watch-with-maddy.inject.js"), "utf8");
    const coaches = readFileSync(join(root, "../src/patches/signed-coaches.inject.js"), "utf8");
    assert.match(library, /mpNav\.HOME_EVENT/);
    assert.match(coaches, /mpNav\.HOME_EVENT/);
  });

  it("build patches the chrome brand to mpGoHome", () => {
    const build = readFileSync(join(root, "../scripts/build.mjs"), "utf8");
    assert.match(build, /onClick:\(\)=>mpGoHome\(I\)/);
    assert.match(build, /className:`brand mp-top-brand`/);
    assert.match(build, /sidebar-brand-home/);
    assert.match(build, /topbar-brand-home/);
    assert.match(build, /replaceAll\("\.showModal\(\)", "\.show\(\)"\)/);
  });
});
