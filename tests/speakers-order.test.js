import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  REQUIRED_SPEAKER_IDS,
  applySpeakerDisplayOrder,
  speakerIdFromObject,
  speakerIdsInCatalog,
} from "../src/speakers/order.js";

const root = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  readFileSync(join(root, "../src/data/speakers-catalog.json"), "utf8"),
);
const vendor = readFileSync(
  join(root, "../vendor/daystart-8f78bb0/index-BiA2yEms.js"),
  "utf8",
);

describe("Speakers you enjoy display order", () => {
  it("locks the verified set most→least popular without adding or removing rows", () => {
    assert.deepEqual(
      catalog.map((item) => item.id),
      REQUIRED_SPEAKER_IDS,
    );
    assert.equal(catalog.length, 13);
    assert.deepEqual(
      [...catalog.map((item) => item.id)].sort(),
      [...speakerIdsInCatalog(vendor)].sort(),
    );
  });

  it("keeps bios, roles, evidence and verified flags on each id", () => {
    const vendorObjects = new Map();
    const start = vendor.indexOf("x=[{id:`");
    const end = vendor.indexOf("}],S={revision:", start);
    const inner = vendor.slice(start + 3, end + 1);
    for (const raw of inner.match(/\{id:`[^}]+\}/g) || []) {
      vendorObjects.set(speakerIdFromObject(raw), raw);
    }
    for (const row of catalog) {
      const raw = vendorObjects.get(row.id);
      assert.ok(raw, row.id);
      assert.ok(raw.includes(`name:\`${row.name}\``), row.id);
      assert.ok(raw.includes(`role:\`${row.role}\``), row.id);
      assert.ok(raw.includes("verified:!0"), row.id);
      assert.ok(raw.includes(`checkedAt:\`${row.checkedAt}\``), row.id);
      for (const url of row.roleEvidence) {
        assert.ok(raw.includes(url), `${row.id} evidence`);
      }
      for (const alias of row.aliases) {
        assert.ok(raw.includes(alias), `${row.id} alias`);
      }
    }
  });

  it("reorders the source array to Tony Robbins first and Russ Harris last", () => {
    const patched = applySpeakerDisplayOrder(vendor);
    assert.deepEqual(speakerIdsInCatalog(patched), REQUIRED_SPEAKER_IDS);
    assert.match(patched, /x=\[\{id:`tony-robbins`/);
    assert.match(patched, /id:`russ-harris`[\s\S]*?\}\],S=\{revision:/);
    assert.equal(patched.includes("Speakers you enjoy"), true);
  });
});
