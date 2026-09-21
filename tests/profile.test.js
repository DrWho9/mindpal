import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  AVATAR_COLORS,
  PROFILE_ROUTE,
  PROFILE_STORAGE_KEY,
  SIGNED_COACHES,
  STARTER_LIKES,
  addBook,
  addCustomLike,
  addGoal,
  avatarFace,
  emptyProfile,
  listProfileSpeakers,
  loadProfile,
  normalizeProfile,
  parseProfileJson,
  persistProfile,
  profileInitials,
  removeBook,
  sectionSummary,
  setAvatar,
  setGoalDone,
  toggleLike,
  toggleSpeaker,
} from "../src/profile/store.js";

const root = dirname(fileURLToPath(import.meta.url));
const speakers = JSON.parse(
  readFileSync(join(root, "../src/data/speakers-catalog.json"), "utf8"),
);

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    store,
  };
}

describe("profile store", () => {
  it("uses a localStorage key and Profile hash route", () => {
    assert.equal(PROFILE_STORAGE_KEY, "mindpal.profile.v1");
    assert.equal(PROFILE_ROUTE, "Profile");
  });

  it("builds initials from a display name", () => {
    assert.equal(profileInitials("Mo"), "MO");
    assert.equal(profileInitials("Michael Owner"), "MO");
    assert.equal(profileInitials(""), "");
    assert.equal(avatarFace(emptyProfile(), "Mo").text, "MO");
    assert.equal(avatarFace({ avatar: { emoji: "🌿" } }, "Mo").text, "🌿");
  });

  it("ignores junk and keeps avatar presets", () => {
    const next = normalizeProfile({
      avatar: { color: "nope", shape: "star", emoji: "🔥" },
      likes: ["tea", "not-a-like"],
      speakers: ["tony-robbins", "someone-else"],
      books: [{ title: "  " }, { title: "Braiding Sweetgrass", author: "Robin Wall Kimmerer" }],
      goals: [{ title: "" }, { title: "Walk more", timeframe: "this-week", done: true }],
    }, speakers);
    assert.equal(next.avatar.color, "sage");
    assert.equal(next.avatar.shape, "circle");
    assert.equal(next.avatar.emoji, "");
    assert.deepEqual(next.likes, ["tea"]);
    assert.deepEqual(next.speakers, ["tony-robbins"]);
    assert.equal(next.books.length, 1);
    assert.equal(next.books[0].author, "Robin Wall Kimmerer");
    assert.equal(next.goals[0].done, true);
    assert.equal(next.goals[0].timeframe, "this-week");
  });

  it("persists likes, speakers, books and goals on the device", () => {
    const storage = memoryStorage();
    let profile = emptyProfile();
    profile = setAvatar({ color: "dusk", shape: "hex", emoji: "☀️" }, profile);
    profile = toggleLike("tea", profile);
    const custom = addCustomLike("Birdwatching", profile);
    profile = custom.profile;
    profile = toggleSpeaker("tony-robbins", profile, speakers);
    profile = toggleSpeaker("coach-denyse", profile, speakers);
    profile = addBook("The Let Them Theory", "Mel Robbins", profile).profile;
    profile = addGoal({ title: "Swim at the local pool", note: "Once a week", timeframe: "this-month" }, profile).profile;
    persistProfile(profile, storage, speakers);

    const loaded = loadProfile(storage, speakers);
    assert.equal(storage.store.has(PROFILE_STORAGE_KEY), true);
    assert.equal(loaded.avatar.color, "dusk");
    assert.equal(loaded.avatar.shape, "hex");
    assert.equal(loaded.avatar.emoji, "☀️");
    assert.ok(loaded.likes.includes("tea"));
    assert.ok(loaded.likes.includes(custom.item.id));
    assert.ok(loaded.speakers.includes("tony-robbins"));
    assert.ok(loaded.speakers.includes("coach-denyse"));
    assert.equal(loaded.books[0].title, "The Let Them Theory");
    assert.equal(loaded.goals[0].title, "Swim at the local pool");
    const done = setGoalDone(loaded.goals[0].id, true, loaded);
    assert.equal(done.goals[0].done, true);
    assert.equal(removeBook(loaded.books[0].id, loaded).books.length, 0);
  });

  it("treats a custom like that matches a starter as that starter", () => {
    const added = addCustomLike("Quiet cups of tea", emptyProfile());
    assert.equal(added.item.id, "tea");
    assert.deepEqual(added.profile.likes, ["tea"]);
    assert.equal(added.profile.customLikes.length, 0);
  });

  it("lists the speaker catalog plus signed coaches", () => {
    const list = listProfileSpeakers(speakers);
    assert.equal(list[0].id, "tony-robbins");
    assert.ok(list.some((item) => item.id === "russ-harris"));
    assert.deepEqual(
      list.filter((item) => item.kind === "coach").map((item) => item.id),
      SIGNED_COACHES.map((item) => item.id),
    );
  });

  it("returns encouraging empty summaries", () => {
    const empty = emptyProfile();
    assert.equal(sectionSummary("likes", empty), "None chosen yet");
    assert.equal(sectionSummary("books", empty), "None listed yet");
    assert.equal(sectionSummary("goals", empty), "None listed yet");
    assert.match(sectionSummary("avatar", empty, { name: "Mo" }), /Initials/);
  });

  it("recovers from broken JSON", () => {
    assert.deepEqual(parseProfileJson("not-json").likes, []);
    assert.equal(AVATAR_COLORS.length >= 4, true);
    assert.ok(STARTER_LIKES.some((item) => item.id === "tea"));
  });
});

describe("profile chrome and page", () => {
  it("keeps the wordmark as home and adds a separate profile control", () => {
    const inject = readFileSync(join(root, "../src/patches/profile.inject.js"), "utf8");
    const owner = readFileSync(join(root, "../src/patches/owner-ux.inject.js"), "utf8");
    const build = readFileSync(join(root, "../scripts/build.mjs"), "utf8");
    assert.match(inject, /function mpProfilePage\(/);
    assert.match(inject, /function mpProfileButton\(/);
    assert.match(inject, /function mpProfileAccordion\(/);
    assert.match(inject, /t\(o\?``:n\)/);
    assert.match(inject, /Your MindPal profile/);
    assert.match(inject, /When you’re ready, choose a few likes/);
    assert.match(inject, /No favourites yet/);
    assert.match(inject, /Nothing listed yet/);
    assert.match(inject, /A quiet list of things you hope to do/);
    assert.match(inject, /listProfileSpeakers/);
    assert.match(owner, /function mpGoHome\(/);
    assert.match(build, /onClick:\(\)=>mpGoHome\(I\)/);
    assert.match(build, /mpProfileButton/);
    assert.match(build, /I\(`Profile`\)/);
    assert.match(build, /t===`Profile`&&\(0,A\.jsx\)\(mpProfilePage,\{\}\)/);
    assert.match(build, /mp-brand-row/);
    assert.match(build, /onClick:\(\)=>mpGoHome\(I\).*mpProfileButton/);
  });
});
