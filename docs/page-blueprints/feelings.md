# Feelings

| | |
|---|---|
| **Route** | `#Feelings` |
| **Nav** | Sidebar; not the Today hero (that CTA is hidden) |
| **Sources** | `mpFeelingsPage` in `feelings-readings.inject.js`; mothers/AOD chips in `owner-ux.inject.js` |

## Purpose

Pick an optional feeling word and browse tagged readings/videos. **Not** an assessment and **not** a live conversation.

## Expected UX

- Optional `<select>` including mothers and drugs & alcohol.
- **Read something supportive** / **Videos** / **Open my diary** / **Try a short practice** (E01).
- Read: Pack A + owner readings by tag. Videos: emotion-scoped list + tagged directory. No speaker dump as the default.
- Chip cards above: **Open the mothers space**, **Open the drugs & alcohol space**.
- Disclaimer: no listener or live AI.

## Enter / Send / search

No search box. Tag chips filter lists.

## Acceptance tests

- Each of the four row buttons changes the page (read/video panel, `#My diary`, or E01 overlay).
- Mothers / AOD chips navigate to their hubs (not no-op).
- “Stop and return to Today” calls `mpGoHome` / `I('Today')`.

## Known gaps

- No live AI (by design).
- Legacy `ve` inject still contains “human review pending” quote path; it is not the mounted page.
