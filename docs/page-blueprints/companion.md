# Companion

| | |
|---|---|
| **Route** | `#Companion` |
| **Nav** | Bottom tab (badge “Demo”); hubs “Talk this through…”; Focus demo; Appointment card |
| **Sources** | Vendor `Xi`; prefill `mpProblems.takeCompanionPrompt()`; probe `Ni()` → `/mindpal/api/companion/status` |

## Purpose

Optional educational practice guide. Software, not a therapist or emergency service.

## Expected UX

- Badge: `LIVE AI COMPANION · XAI GROK` **only** if the status probe returns available. Otherwise `DETERMINISTIC DEMO · NO LIVE AI`.
- **Try the local practice guide** starts a session (consent flag in memory).
- Safety chips: A small exercise / I’m distressed / I’m not sure I’m safe / Immediate help. Selection must change `selected` and cancel in-flight requests. Urgent shows 000 + **Open urgent support**.
- **Show practice choices** (empty message, or no live AI) returns fixed copy (`Deterministic demo — no AI model was contacted.`).
- **Send to AI companion** appears only when live AI is available **and** the textarea has text. On github.io this must not appear as a working live send.
- Exercise shortcuts: E01, E03.
- **End session** clears the chat.
- Hub / appointment prompts prefill the textarea via `mindpal.companionPrompt.v1` (consumed on mount).

## Enter / Send / search

| Key | Behaviour |
|-----|-----------|
| Enter in textarea | Newline (not send) |
| **Ctrl+Enter** / **Cmd+Enter** | Same as the primary Send / Show practice choices button |
| Primary button | `D()` — live send if probe + text, else deterministic choices |

No search.

## Content sources

Fixed copy map `yi` / `Si` in the vendor bundle. Live path: `POST /mindpal/api/companion/chat` through a same-origin proxy (xAI Grok). 8 turns / 10 minutes. `urgent` defers to human support.

## Acceptance tests (smoke)

- Start the local guide.
- Click **A small exercise** — button becomes selected.
- Click **Show practice choices** — `.chat-response` is non-empty (not a no-op).
- Appointment / hub entry prefills then starts a session with that text still present.
- On Pages, badge stays deterministic. **Do not** assert Live AI.

## Known gaps

- **No companion base on github.io.** Live AI is a separate hosting step.
- Character stage is a local preview (text-only toggle). No microphone.
- Prefill is lost if Companion was already mounted before `saveCompanionPrompt` (unmount/remount on route change is the intended path).
