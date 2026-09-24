# Problem hub (Support & Growth)

| | |
|---|---|
| **Route** | `#Problem` |
| **Nav** | Today / Explore chips → Open hub |
| **Sources** | `mpProblemHubPage`, `src/data/problem-hubs.json`, `src/problems/hubs.js` |

## Purpose

One theme at a time: tagged readings, videos, Companion prompt, journal line. Support vs Growth framing.

## Expected UX

- No selection → chip list (same as Explore).
- Selected id in `mindpal.selectedProblem.v1`.
- `mothers` and `aod` redirect to their dedicated pages.
- **Talk this through with Companion** saves that hub’s `companionPrompt`.
- **Write this in Journal** prefills the journal prompt.
- **Open today’s Readings** → `#Readings` (does not mark Done).

## Enter / Send / search

No search. Companion is a navigate + sessionStorage prefill.

## Acceptance tests

- Each catalog id has `companionPrompt` and `journalPrompt`.
- `saveCompanionPrompt` / `takeCompanionPrompt` round-trip.
- Faith hub hidden when secular.

## Known gaps

- Readings on the hub are a list, not an inline reader (except AOD featured).
- Companion is demo on Pages.
