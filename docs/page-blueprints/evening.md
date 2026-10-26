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
- The photo thumbnail stays on Win of the day. This card shows the same win text. Another tab's change to a wins key refreshes this list without writing. A photo message on `mindpal-photos` refreshes it the same way.
- **Reset wins on this device** is not on this card. This card does not run the blocked-save check. The control appears on Win of the day only, and only while saving is blocked. Confirm keeps the unreadable record as a backup on this device, then clears it, and removes stored placeholder images except one saved in the last 15 seconds. While that cleanup is still running, Reset and Confirm stay disabled on Win of the day. If that cleanup is skipped or fails, the Win of the day card says the placeholder images could not be removed from this device. The newest three timestamped copies stay. This is a prototype, not real private storage. Save on this card is also disabled, and Enter is ignored, while a save is still pending. A save that is still waiting after about 10 seconds stops waiting. If the words were stored and the placeholder image was not, the card says the placeholder image was not saved. If the words were not stored, it says the win was not saved.
- **Past wins** is not on this card. The expandable list of other days, its thumbnails, and **Remove** stay on Win of the day. A later date is marked Future date there. Remove there asks before it deletes one win. This card still shows today's wins only.
- `exportV1` turns the current v2 list into a version 1 record without writing storage, so a rollback to v1 code can keep the wins. Photos are left out. A win with no recorded time leaves `at` out of that export. Duplicate ids are made unique in memory on load and are written on the next save. A missing time stays a fixed value in the stored list, and this card says "Time not recorded" too. Removing a win removes one win.
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
- There is no backend, no encryption, and no consent flow. Placeholder bytes, when they can be stored, live in IndexedDB on this device only. Real camera photos are not accepted.
