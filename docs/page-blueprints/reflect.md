# Reflect

| | |
|---|---|
| **Route** | `#Reflect` |
| **Nav** | Sidebar |
| **Sources** | Vendor `ti` (`active` when hash is Reflect) |

## Purpose

Self-guided writing. No live listener, no AI, no risk assessment.

## Expected UX

- Three modes: **Write without prompts**, **Help me look at this differently**, **Help me choose a next step**.
- Choosing a mode reveals `#reflection-text` (composer).
- Optional gratitude details; download `mindpal-reflection.txt`; clear session.
- **Open my diary** does not auto-copy.
- Help → `#Get support`.

## Enter / Send / search

No send. Textareas are local. Download is a file write, not a network post.

## Acceptance tests (smoke)

- Before a mode: composer may be hidden.
- Click **Write without prompts** → `#reflection-text` is visible and accepts input.
- Mode buttons toggle `aria-pressed`.

## Known gaps

- Clears on reload (by design).
- Reframe path is a fixed four-question script, not a model.
