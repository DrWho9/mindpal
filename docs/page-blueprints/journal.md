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
- Daily wins panel above the diary.

## Enter / Send / search

Search: `onChange` only. Diary AI form submit hits `/api/diary/respond` **only** with consent — dead on github.io.

## Acceptance tests

- Search narrows visible notes.
- Hub prefill appears in the composer.
- Without a diary API, the AI toggle must not pretend a model answered.

## Known gaps

- Diary AI requires a companion/diary base. Static Pages: local notes only.
