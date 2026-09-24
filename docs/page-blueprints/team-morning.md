# Work team morning ritual

| | |
|---|---|
| **Route** | `#Team morning` |
| **Nav** | Today Morning card |
| **Sources** | `mpTeamRitualPage`, `src/today/team-ritual.js` |

## Purpose

Optional two-step settle for a work team: **breathe (~3 min)** then **peaceful reading**. Not a second Pack A Done path.

## Expected UX

- Step 1 plays Maddy timed-breath (`/mindpal/videos/maddy/timed-breath.mp4`) with an on-screen clock.
- Step 2 unlocks a peaceful Pack A reading (theme-filtered). Marking it done does **not** credit Pack A.
- Skip is allowed. Progress in `mindpal.teamMorningRitual.v1`.

## Enter / Send / search

Buttons and the breath timer only.

## Acceptance tests

- Breath before reading (`canOpenReading` false until breathe is done/skipped).
- `does not mark a Pack A` copy remains.
- Back to Today / Open Readings CTAs navigate.

## Known gaps

- Relies on the Maddy MP4 being present (verify checks file size).
