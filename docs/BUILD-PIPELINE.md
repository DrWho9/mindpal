# MindPal build pipeline

Owner process (Michael / DrWho9): **do not squash until this sequence has run**.

```
Blueprint (high model)
        ↓
Cloud agent build (prefer a strong code model / Grok-class)
        ↓
Review (highest available review model)
        ↓
DrWho9 squash to main
```

## 1. Blueprint (high model)

Use a high-capability planning model to write or update the page spec **before** implementation.

- Inventory lives in [`src/qa/page-inventory.js`](../src/qa/page-inventory.js).
- One markdown file per page under [`docs/page-blueprints/`](page-blueprints/).
- Master checklist: [`docs/PAGE-AUDIT.md`](PAGE-AUDIT.md).
- A blueprint is the contract: purpose, expected UX, Enter / Send / search, content sources, acceptance tests, known gaps.
- If Live AI is mentioned, the blueprint **must** repeat the companion-base caveat. Static `github.io` has no `/mindpal/api/companion/*` — do not claim Live AI works there.

## 2. Cloud agent build (strong code model / Grok-class)

Prefer a strong implementation model (Grok-class or equivalent code model) to:

1. Branch from latest `main` (`cursor/<descriptive-name>-****`).
2. Implement only what the blueprint accepts.
3. Add or extend cheap smoke (node harness + Playwright against system Chrome).
4. Run `npm test` then `npm run build` (build re-runs unit tests, patches the vendor bundle, verifies, then route smoke).
5. Open a draft PR. Do not squash.

The live UI is still the patched DayStart vendor bundle (`scripts/build.mjs`). Prefer inject / data / `src/` changes over hand-editing `assets/index-*.js`.

## 3. Review (highest available review model)

Run the highest available review model on the PR **before** DrWho9 squash:

- Diff vs latest `main`, not vs an older local snapshot.
- Confirm every touched route still matches its blueprint (CTA, Enter/Send, content source, disclaimers).
- Confirm smoke covers at least: Companion choices, YouTube Search, Reflect composer, Appointment companion entry.
- Reject any copy that claims Live AI on github.io without a companion base.
- Reject empty `onClick`, disabled-as-done, or “coming soon” presented as a working path unless the blueprint lists it as a known gap.

## 4. DrWho9 squash

Only after blueprint + build + review are green. Squash is an owner action, not an agent action.

## Commands

| Step | Command |
|------|---------|
| Unit + inventory contracts | `npm test` |
| Patch vendor, verify, Playwright smoke | `npm run build` |
| Playwright only (after a build) | `npm run smoke` |
| Static bundle checks | `npm run verify` |

Playwright uses **system Chrome** (`playwright-core`, `channel: "chrome"` / `/usr/local/bin/google-chrome`). It does not download browsers and must run against the **current** hashed assets (after `build`).

## Hosting reminder

`https://<user>.github.io/mindpal/` is a static Pages shell.

- Companion probe: `GET /mindpal/api/companion/status`
- Live chat: `POST /mindpal/api/companion/chat`
- Diary AI: `/api/diary/respond`

Those routes are **not** on github.io. The shipped UI must stay in **DETERMINISTIC DEMO · NO LIVE AI** there. A private companion base is a separate hosting step (see Settings copy).
