# Today

| | |
|---|---|
| **Route** | `#Today` (home; `mpNav.HOME_ROUTE`) |
| **Nav** | Bottom tab, MindPal brand, `mpGoHome` |
| **Sources** | `src/patches/owner-ux.inject.js` (`Rr` / day bands), `src/today/steps.js`, `src/today/wins.js`, `src/today/team-ritual.js`, `src/data/problem-hubs.json` |

## Purpose

Morning → Day → Night hub. One day’s steps, optional team ritual, Support/Growth chips, Maddy teaser. Not a feelings dump (that button is build-hidden).

## Expected UX

- Greeting + civil date; optional Coptic date if enabled.
- **Do this next** on the current step. Rows open `#Readings`, `#Focus`, `#Later`, `#Evening`.
- Support (“When it's heavy”) and Growth (“Build strength”) chips expand, then **Open hub** → `#Problem`.
- Faith chip hidden when the local profile is secular.
- Optional **Work team morning ritual** card → `#Team morning`.
- **Open Watch with Maddy** → `#Explore`.
- First-run overlays: faith, then age/gender + two MindPal facts (if the gate did not already collect them).

## Enter / Send / search

No page-level search. Wins are added from Evening / Journal (Enter saves there), not from the Today hub card (hub only nudges).

## Content sources

`mindpal.todaySteps.v1`, `mindpal.dailyWins.v1`, `mpProblemHubs`, Maddy catalog, faith verse catalog (collapsed).

## Acceptance tests

- Brand from any sheet returns here and closes dialogs.
- Each step row changes hash to the matching lane.
- Support/Growth **Open hub** sets `mindpal.selectedProblem.v1` and opens `#Problem`.
- Youth teaser and “Help with how I’m feeling” stay unmounted on adult Today.

## Known gaps

- No Live AI on this page.
- Youth teaser is intentionally hidden in adult mode.
