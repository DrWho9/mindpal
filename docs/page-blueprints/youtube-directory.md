# YouTube directory

| | |
|---|---|
| **Route** | `#YouTube directory` |
| **Nav** | Sidebar; Feelings “directory” |
| **Sources** | Vendor `ge` → `_e`; external corpus `T` |

## Purpose

Browse external YouTube research entries. Link-out only. MindPal does not embed players or send your feeling/diary in the URL.

## Expected UX

- Heading **Browse external videos** + directory panel.
- Ordinary-release shortlist is empty until the research checkbox (honest stub).
- **Full directory and search are open on first paint** so Search is not hidden behind an extra click.
- `#youtube-search` — “Search titles, creators and descriptions” — live filter.
- Topic / purpose / duration / style / speaker filters.
- **Open on YouTube · external** when the entry is openable.
- Optional practice / diary / human-support CTAs.

## Enter / Send / search

Search filters on `onChange`. Enter does not submit a form (input is not in a `<form>`). A nonsense query shows “No matching entries…”.

## Acceptance tests (smoke)

- `#youtube-search` is in the document without clicking Browse.
- Typing a token that exists in the corpus reduces the “Directory entries” count or keeps matches.
- Typing `zzzz-no-such-video` yields the empty status (proves the field is not a no-op).

## Known gaps

- Almost nothing is cleared for ordinary release.
- Many cards are draft / review pending.
- Distinct from Explore’s YouTube **meditations** JSON (chips, not this corpus).
