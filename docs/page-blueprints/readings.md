# Readings

| | |
|---|---|
| **Route** | `#Readings` |
| **Nav** | Today step 1, Explore “Reading”, hub “Open today’s Readings” |
| **Sources** | `src/patches/daily-reading.inject.js` (`bt`), `mpReadingsPage`, `src/data/pack-a.json`, `pack-b.json`, `owner-readings.json` |

## Purpose

Today’s pack reading (Pack A sequential mornings). Optional faith verse/prayer when the profile is religious.

## Expected UX

- **Done for today** unlocks the next Pack A day. Opening or Listen is not Done.
- Listen uses Neural file if present, else browser TTS; optional Maddy listen clips.
- Copy / Share stay on-device.
- Pack B appears after 100 Pack A Done.

## Enter / Send / search

No search. No network send.

## Content sources

`mindpal.readings.v1` progress; Pack A/B JSON; owner support readings; `mpFaith.pickMorningVerse`.

## Acceptance tests

- `canMarkDone` / `markReadingDone` only when the day is unlocked.
- Secular profiles omit the verse block.
- Owner / AOD featured readings stay ungated as support, not as Pack A mornings.

## Known gaps

- TTS quality depends on the device voice list.
- Pack B is locked until Pack A completes.
