# Journal (My diary)

| | |
|---|---|
| **Route** | `#My diary` |
| **Nav** | Bottom tab; hub “Write this in Journal” |
| **Sources** | Vendor diary `Yi` + wins panel; IndexedDB `mindpal-private-diary-v1` |

## Purpose

Private notes on this device. Optional “Talk to diary” is a **server** feature.

## Expected UX

- Session vs device storage modes.
- Save / edit / delete notes.
- **Search diary** filters the list as you type.
- Prefill from hubs (`C(prompt)` then navigate).
- Daily wins panel above the diary. A win with no recorded time says "Time not recorded" here too. This panel does not run the blocked-save check. The control **Reset wins on this device** is on Win of the day, not on this panel. The photo thumbnail is not on this panel. **Past wins** is not on this panel either. That expandable list of other days stays on Win of the day, where Remove asks before it deletes one win. Another tab's change to a wins key, or a photo message on `mindpal-photos`, refreshes the list without writing.

## Enter / Send / search

Search: `onChange` only. Diary AI form submit hits `/api/diary/respond` **only** with consent — dead on github.io.

## Acceptance tests

- Search narrows visible notes.
- Hub prefill appears in the composer.
- Without a diary API, the AI toggle must not pretend a model answered.

## Known gaps

- Diary AI requires a companion/diary base. Static Pages: local notes only.
- There is no backend, no encryption, and no consent flow for win photos. The only image is the synthetic placeholder, stored in this browser when IndexedDB is available.
