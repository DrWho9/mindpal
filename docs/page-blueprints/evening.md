# Evening (Before you sleep)

| | |
|---|---|
| **Route** | `#Evening` |
| **Nav** | Today Night step |
| **Sources** | `mpEveningPage`, `mpWinsPanel` (`variant: evening`) |

## Purpose

Close the day: read today’s wins, add one more, then a short Journal wind-down.

## Expected UX

- Wins list for the civil date from `mindpal.dailyWins.v1`.
- **Save this win** — also **Enter** in the win input.
- **Write a short wind-down note** prefills Journal with `Before sleep, I noticed…`.

## Enter / Send / search

**Enter** in `#mp-win-evening` saves. No search.

## Acceptance tests

- Empty save shows “Write a few words first”.
- Enter and the button both call `addWin`.
- Wind-down CTA lands on `#My diary` with the evening prompt.

## Known gaps

- Wins stay on this device; no cloud share.
