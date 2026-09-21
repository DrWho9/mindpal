# Body, food and wellbeing (appointment questions)

| | |
|---|---|
| **Route** | `#Body, food and wellbeing` |
| **Nav** | Sidebar |
| **Sources** | Vendor `$r` + `mpAppointmentCompanionCard` |

## Purpose

Educational health cards and an **appointment question notebook**. Not a clinic, diet, or results interpreter.

## Expected UX

- Topic `<select>` filters draft cards (`Yr`). Cards say DRAFT / review pending.
- **Questions for my appointment**: starters, `#appointment-question`, **Save my question** (form submit), edit/remove, **Export my questions**.
- Report organiser is a **synthetic** sample. Real PDF/OCR is disabled.
- **Talk this appointment through with Companion** (below the vendor panel) saves `APPOINTMENT_COMPANION_PROMPT` and opens `#Companion`. Page notes are **not** auto-copied.

## Enter / Send / search

| Control | Behaviour |
|---------|-----------|
| Save form | Enter in the question field submits (`preventDefault` + save) |
| Companion CTA | Navigate + `saveCompanionPrompt` |
| Topic select | Browse filter only — “not a health profile” |

## Acceptance tests (smoke)

- Companion CTA is visible on this hash.
- Click → hash is `Companion` and the prompt is consumed into `#companion-message` after starting the local guide.
- Save question with text appends a session item; empty is disabled.

## Known gaps

- Clinical review pending on all cards.
- Cannot interpret bloods / iron.
- Companion does not ingest the notebook (privacy). Users restate what they want to ask.
