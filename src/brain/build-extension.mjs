/** PROPOSED integration adapter. Not called by the existing MindPal build. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateBank } from "./core.js";

function stripModule(source) {
  return source
    .replace(/^import[\s\S]*? from ["'][^"']+["'];?\s*$/gm, "")
    .replace(/^export (const|function) /gm, "$1 ");
}

export function brainRuntime(root) {
  // No fallback to dev-fixture.js: a missing or incomplete bank must stop integration.
  const bank = validateBank(JSON.parse(readFileSync(join(root, "src/brain/questions.json"), "utf8")));
  const core = stripModule(readFileSync(join(root, "src/brain/core.js"), "utf8"));
  const page = stripModule(readFileSync(join(root, "src/brain/index.js"), "utf8"));
  const bridge = readFileSync(join(root, "src/brain/react-bridge.inject.js"), "utf8");
  return `var mpBrainBank=${JSON.stringify(bank)};var mpBrain=(function(){\n${core}\n${page}\nreturn {mountBrain};\n})();\n${bridge}`;
}

export function brainStyles(root) {
  return readFileSync(join(root, "src/brain/styles.css"), "utf8").trim();
}

export function patchBrainRoutes(source) {
  // Apply only AFTER patchOwnerUx. Exactly-one checks prevent silent drift.
  const changes = [
    ["allowlist", "Ii=[`Feelings`,`YouTube directory`,", "Ii=[`Brain`,`Feelings`,`YouTube directory`,"],
    ["label", '"route.book":`Book`', '"route.book":`Book`,"route.brain":`Brain`'],
    ["route label", "Book:`route.book`,", "Brain:`route.brain`,Book:`route.book`,"],
    ["sidebar", "{name:`Appointment Questions`,icon:fn}]", "{name:`Appointment Questions`,icon:fn},{name:`Brain`,icon:fn}]"],
    ["page", "t===`Book`&&(0,A.jsx)(mpYourBooksPage,{})", "t===`Brain`&&(0,A.jsx)(mpBrainPage,{onExit:()=>I(`Today`)}),t===`Book`&&(0,A.jsx)(mpYourBooksPage,{})"],
  ];
  let next = source;
  for (const [label, anchor, replacement] of changes) {
    const count = next.split(anchor).length - 1;
    if (count !== 1) throw new Error(`Brain ${label}: expected one integration anchor, found ${count}. Reconcile with the build owner.`);
    next = next.replace(anchor, replacement);
  }
  return next;
}
