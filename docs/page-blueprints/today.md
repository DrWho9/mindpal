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
- **Win of the day** is the first control after the greeting, above Individual Growth. It is always on. It is not a numbered step, not “Step 0”, and not an entry in `STEP_IDS` / `STEP_META`. Step 1 in that model is still Readings; the hub does not mount a Readings row (the morning band is Individual Growth, whose first numbered row is Step 1 · Settle / breathe).
- The card lists today’s wins and saves a new one with **Save this win**. Morning is allowed. Same store as Evening and Journal (`addWin` / `winsForDate`, `mindpal.dailyWins.v1`).
- **Do this next** on the current step. Rows open `#Readings`, `#Focus`, `#Later`, `#Evening`.
- Support (“When it's heavy”) and Growth (“Build strength”) chips expand, then **Open hub** → `#Problem`.
- Faith chip hidden when the local profile is secular.
- Optional **Work team morning ritual** card → `#Team morning`.
- **Open Watch with Maddy** → `#Explore`.
- First-run overlays: faith, then age/gender + two MindPal facts (if the gate did not already collect them).

## Enter / Send / search

No page-level search. **Enter** in `#mp-win-winOfDay` saves a win on Today. Evening (`#mp-win-evening`) and Journal still save into the same list, so Night can review what was added in the morning.

## Content sources

`mindpal.todaySteps.v1`, `mindpal.dailyWins.v1`, `mpProblemHubs`, Maddy catalog, faith verse catalog (collapsed).

## Acceptance tests

- Brand from any sheet returns here and closes dialogs.
- Each step row changes hash to the matching lane.
- Win of the day is visible above Individual Growth Step 1 without opening Evening. Enter and **Save this win** call `addWin`.
- Support/Growth **Open hub** sets `mindpal.selectedProblem.v1` and opens `#Problem`.
- Youth teaser and “Help with how I’m feeling” stay unmounted on adult Today.

## Known gaps

- No Live AI on this page.
- Youth teaser is intentionally hidden in adult mode.
