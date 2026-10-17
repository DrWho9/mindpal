import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { brainRuntime, brainStyles, patchBrainRoutes } from "../../src/brain/build-extension.mjs";

const snapshot = fileURLToPath(new URL("../../", import.meta.url));
function withSyntheticSource(run) {
  const root = mkdtempSync(join(tmpdir(), "brain-extension-"));
  mkdirSync(join(root, "src/brain"), { recursive: true });
  for (const file of ["core.js", "index.js", "react-bridge.inject.js", "styles.css"]) {
    copyFileSync(join(snapshot, "src/brain", file), join(root, "src/brain", file));
  }
  try { run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test("proposed runtime fails closed when the accepted full bank has not been supplied", () => {
  withSyntheticSource(root => assert.throws(() => brainRuntime(root), /ENOENT/));
});

test("proposed runtime rejects a fixture and packages a complete synthetic bank as valid JS", () => {
  withSyntheticSource(root => {
    const question = {
      id: "brain-001", level: 1, position: 1, skill: "synthetic", prompt: "Synthetic item",
      options: ["A", "B", "C", "D"].map(id => ({ id, text: `Option ${id}` })),
      correctOptionId: "A", explanation: "Synthetic explanation",
    };
    const bank = { schemaVersion: "1.0", title: "Brain", questions: [question] };
    const path = join(root, "src/brain/questions.json");
    writeFileSync(path, JSON.stringify(bank));
    assert.throws(() => brainRuntime(root), /complete bank/);
    bank.questions = Array.from({ length: 320 }, (_, i) => ({ ...question, id: `brain-${String(i + 1).padStart(3, "0")}`, level: Math.floor(i / 20) + 1, position: i % 20 + 1 }));
    writeFileSync(path, JSON.stringify(bank));
    const runtime = brainRuntime(root);
    const script = new vm.Script(runtime);
    const context = vm.createContext({});
    script.runInContext(context);
    assert.equal(context.mpBrainBank.questions.length, 320);
    assert.equal(typeof context.mpBrain.mountBrain, "function");
    assert.equal(typeof context.mpBrainPage, "function");
    assert.equal(runtime.includes("developmentFixture"), false);
    assert.ok(brainStyles(root).includes(".mp-brain"));
  });
});

test("route adapter adds Brain only at known pinned shell seams and rejects drift", () => {
  // Synthetic post-patchOwnerUx seam excerpt, not a compiled app claim.
  const fixture = [
    "Ii=[`Feelings`,`YouTube directory`,`Today`,`Profile`,",
    '"route.book":`Book`', "Book:`route.book`,",
    "zi=[{name:`Feelings`,icon:fn},{name:`Appointment Questions`,icon:fn}]",
    "t===`Book`&&(0,A.jsx)(mpYourBooksPage,{})",
  ].join("\n");
  const patched = patchBrainRoutes(fixture);
  assert.match(patched, /Ii=\[`Brain`,/);
  assert.match(patched, /name:`Brain`/);
  assert.ok(patched.includes("{name:`Appointment Questions`,icon:fn},{name:`Brain`,icon:fn}]"));
  assert.ok(patched.includes("zi=[{name:`Feelings`,icon:fn},"));
  assert.match(patched, /mpBrainPage,\{onExit:\(\)=>I\(`Today`\)\}/);
  assert.throws(() => patchBrainRoutes("unrecognized source"), /expected one integration anchor/);
  assert.throws(() => patchBrainRoutes(fixture + fixture), /found 2/);
  assert.throws(() => patchBrainRoutes(patched), /expected one integration anchor/);
  const build = readFileSync(join(snapshot, "scripts/build.mjs"), "utf8");
  assert.ok(build.includes("  next = patchOwnerUx(next);"));
  assert.ok(build.includes("t===`Book`&&(0,A.jsx)(mpYourBooksPage,{})"));
});
