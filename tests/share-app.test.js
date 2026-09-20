import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  MINDPAL_PAGES_URL,
  mindpalShareUrl,
  shareMindPalApp,
} from "../src/share/app.js";

const root = dirname(fileURLToPath(import.meta.url));
const inject = readFileSync(
  join(root, "../src/patches/sidebar-share.inject.js"),
  "utf8",
);

describe("MindPal share URL", () => {
  it("uses origin plus /mindpal/ or the published Pages URL", () => {
    assert.equal(
      mindpalShareUrl({ origin: "https://drwho9.github.io" }),
      "https://drwho9.github.io/mindpal/",
    );
    assert.equal(
      mindpalShareUrl({ origin: "http://127.0.0.1:4173" }),
      "http://127.0.0.1:4173/mindpal/",
    );
    assert.equal(mindpalShareUrl({ origin: "" }), MINDPAL_PAGES_URL);
  });
});

describe("shareMindPalApp", () => {
  it("uses Web Share when available", async () => {
    const shared = [];
    const result = await shareMindPalApp({
      location: { origin: "https://drwho9.github.io" },
      share: async (payload) => {
        shared.push(payload);
      },
    });
    assert.equal(result, "shared");
    assert.equal(shared[0].url, "https://drwho9.github.io/mindpal/");
    assert.equal(shared[0].title, "MindPal");
  });

  it("copies the app link when share is unavailable", async () => {
    let copied = "";
    const result = await shareMindPalApp({
      location: { origin: "https://drwho9.github.io" },
      share: null,
      clipboardWrite: async (text) => {
        copied = text;
      },
    });
    assert.equal(result, "copied");
    assert.equal(copied, "https://drwho9.github.io/mindpal/");
  });

  it("treats share abort as cancelled", async () => {
    const err = new Error("nope");
    err.name = "AbortError";
    const result = await shareMindPalApp({
      location: { origin: "https://example.com" },
      share: async () => {
        throw err;
      },
    });
    assert.equal(result, "cancelled");
  });
});

describe("sidebar share inject keeps the quote", () => {
  it("is a Share button, not a quote replacement", () => {
    assert.match(inject, /Share MindPal/);
    assert.match(inject, /shareMindPalApp/);
    assert.doesNotMatch(inject, /happiness of your life/);
  });

  it("build keeps Marcus Aurelius text and only strips quote marks", () => {
    const build = readFileSync(join(root, "../scripts/build.mjs"), "utf8");
    assert.match(
      build,
      /"brand\.quote":`The happiness of your life depends on the quality of your thoughts\.`/,
    );
    assert.match(build, /mpSidebarShare/);
    assert.doesNotMatch(build, /remove.*brand-quote|delete.*brand\.quote/i);
  });
});
