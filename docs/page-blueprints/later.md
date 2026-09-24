# Later (a later pause)

| | |
|---|---|
| **Route** | `#Later` |
| **Nav** | Today Day step (optional) |
| **Sources** | `mpLaterPage` |

## Purpose

Optional mid-day pause. One short practice or a hop to Focus.

## Expected UX

- **Try a two-minute steady detail** opens exercise `E01`.
- **Open Focus for more** → `#Focus`.

## Enter / Send / search

None.

## Acceptance tests

- Both CTAs have handlers (`onExercise('E01')`, `I('Focus')`).
- Page is a thin lane, not an empty stub.

## Known gaps

- Only E01 is offered here; the rest of the catalogue lives on Focus.
