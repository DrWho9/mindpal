import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { civilDateKey, formatCivilDate, partOfDay } from "../src/calendar/civil.js";
import {
  formatCopticDate,
  formatCopticLabel,
  gregorianToCoptic,
} from "../src/calendar/coptic.js";

function localDate(year, month, day, hour = 10) {
  return new Date(year, month - 1, day, hour, 0, 0, 0);
}

describe("civil date", () => {
  it("keys the local calendar day as YYYY-MM-DD", () => {
    assert.equal(civilDateKey(localDate(2026, 9, 20)), "2026-09-20");
  });

  it("formats an AU-friendly long date", () => {
    const text = formatCivilDate(localDate(2026, 9, 20), "en-AU");
    assert.match(text, /Sunday/);
    assert.match(text, /20/);
    assert.match(text, /September/);
    assert.match(text, /2026/);
  });

  it("names morning, afternoon and evening", () => {
    assert.equal(partOfDay(localDate(2026, 9, 20, 8)), "morning");
    assert.equal(partOfDay(localDate(2026, 9, 20, 14)), "afternoon");
    assert.equal(partOfDay(localDate(2026, 9, 20, 20)), "evening");
  });
});

describe("Coptic conversion", () => {
  it("maps 20 September 2026 to 10 Thout 1743", () => {
    const result = gregorianToCoptic(localDate(2026, 9, 20));
    assert.deepEqual(result, { year: 1743, month: 1, day: 10 });
    assert.equal(formatCopticDate(localDate(2026, 9, 20)), "10 Thout 1743");
    assert.equal(formatCopticLabel(localDate(2026, 9, 20)), "Coptic: 10 Thout 1743");
  });

  it("treats 11 September 2026 as Coptic New Year", () => {
    assert.deepEqual(gregorianToCoptic(localDate(2026, 9, 11)), {
      year: 1743,
      month: 1,
      day: 1,
    });
  });

  it("uses 12 September in a Gregorian leap year", () => {
    assert.deepEqual(gregorianToCoptic(localDate(2024, 9, 12)), {
      year: 1741,
      month: 1,
      day: 1,
    });
  });

  it("maps 7 January 2026 to 29 Koiak 1742", () => {
    assert.deepEqual(gregorianToCoptic(localDate(2026, 1, 7)), {
      year: 1742,
      month: 4,
      day: 29,
    });
    assert.equal(formatCopticDate(localDate(2026, 1, 7)), "29 Koiak 1742");
  });
});
