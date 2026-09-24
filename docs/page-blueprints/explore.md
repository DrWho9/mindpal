# Explore

| | |
|---|---|
| **Route** | `#Explore` |
| **Nav** | Bottom tab; Today Maddy teaser |
| **Sources** | Vendor `Ki` + injections: feeling choice, problem list, Maddy, YT meditations, signed coaches |

## Purpose

Toolkit: verse, pack reading, video library, feeling/problem directories, Watch with Maddy, YouTube meditation link-outs.

## Expected UX

- Three accordion cards: Readings / Reading / Videos (labels patched).
- **Videos** shows signed coaches + merged HeyGen library. **Search library** (`aria-label="Search library"`) filters titles as you type; empty → “No matches. Try a different word.”
- Watch with Maddy plays published MP4s (no HeyGen draft gate).
- Voice-guided YouTube meditations: category chips; **Open on YouTube** (no embed).
- Feeling select + Support/Growth chips (same hubs as Today).

## Enter / Send / search

Library search is live `onChange` (no Submit). YouTube meditations use chips, not a text box (the directory search lives on `#YouTube directory`).

## Content sources

`mpVideoCatalog`, `mpMaddy`, `mpMeditationCatalog`, Pack A, `problem-hubs.json`.

## Acceptance tests

- Search for a known title keeps a card; a nonsense string shows the empty status.
- V02 **Play** opens the library host; other V-cards stay **Open draft** unless `publicEligible` and an mp4 exist.
- Maddy cards dispatch `mindpal-open-library-video`.

## Known gaps

- Most HeyGen films are drafts.
- Several meditation categories are filling.
- Sub-views (`verse` / `reading` / `videos`) are React state, not hash routes.
