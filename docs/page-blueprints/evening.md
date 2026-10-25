# Evening (Before you sleep)

| | |
|---|---|
| **Route** | `#Evening` |
| **Nav** | Today Night step |
| **Sources** | `mpEveningPage`, `mpWinsPanel` (`variant: evening`) |

## Purpose

Close the day: read today’s wins, add one more, then a short Journal wind-down. Wins can already have been saved from **Win of the day** on Today; this page reviews the same `mindpal.dailyWins.v2` list. A readable `mindpal.dailyWins.v1` store is copied into v2 on load, and the v1 key is left in place.

## Expected UX

- Wins list for the civil date from `mindpal.dailyWins.v2`. A readable v1 store is migrated on load and then left untouched. The v1 key is not deleted, including when it is already missing.
- **Reset wins on this device** is not on this card. It appears on Win of the day only, and only while saving is blocked. Confirm keeps the unreadable record as a backup on this device, then clears it. The newest three timestamped copies stay. This is a prototype, not real private storage.
- `exportV1` turns the current v2 list into a version 1 record without writing storage, so a rollback to v1 code can keep the wins. Photos are left out. Duplicate ids are made unique in memory on load and are written on the next save. A missing time stays a fixed value, not the clock. Removing a win removes one win.
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
- Real photos would need IndexedDB. There is no backend, no encryption, and no consent flow.
