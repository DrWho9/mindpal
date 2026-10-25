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
- The card lists today’s wins and saves a new one with **Save this win**. Morning is allowed. Same store as Evening and Journal (`addWin` / `winsForDate`, `mindpal.dailyWins.v2`). On first load, a readable `mindpal.dailyWins.v1` store is copied into v2 and the v1 key is left in place. The card can attach a bundled fake placeholder image. When IndexedDB can be opened, those bytes are a Blob in `mindpal-photos` / `winPhotos`, keyed by the win id, and the v2 record keeps only the reference `idb`. When IndexedDB is unavailable, the record keeps the placeholder path and the card says placeholder image storage is not available. A quota or put error says the placeholder image was not saved, and the win text still saves when it can. A reference with no blob, or a stored value that is not the placeholder image, shows the bundled placeholder and says the placeholder image is not on this device. Save is disabled, and Enter is ignored, while a save is still pending, so two quick presses do not create two wins. This is a prototype on this device only, not real private photo storage.
- Removing a win deletes that win's placeholder image blob, including one stored in the last 15 seconds (`WIN_PHOTO_PENDING_MS`). Reset, after the unreadable v2 key is actually cleared, deletes stored placeholder image blobs except one stored in those last 15 seconds. The same grace window applies when a save replaces an unreadable record and deletes blobs the new record does not name. That window keeps a placeholder image another tab has stored and not yet written into the wins record. If reset does not clear the key, the blobs stay. If image cleanup is skipped or fails, including when the photo database cannot be listed, the blobs stay and the card says the placeholder images could not be removed from this device. When cleanup finishes, the card says they were removed, except one stored in the last 15 seconds. An ordinary save of a readable record deletes blobs only for references that record had and the save dropped. It does not sweep unknown keys. A plain load does not write and does not open the photo database. The cached IndexedDB connection closes and drops on `versionchange`, drops on `close`, and the next use opens again.
- Another tab's change to a `mindpal.dailyWins` key refreshes this card and the other wins panels. That refresh only reads (`readWinsStore`, `winsSaveBlockedQuiet`). It forgets the remembered backup probe answer so the next real check does not reuse a stale result, and it does not write a new probe. A photo blob change is announced on a BroadcastChannel named `mindpal-photos`. Those messages do not write and do not post again.
- When saving is blocked, the card shows **Reset wins on this device**. That includes a full backup cap and a backup that cannot be written. The check runs on this card only. It writes a probe the same size as the unreadable record, then removes that probe. The answer is remembered for that same record, so a later visit does not write the probe again. A failed save forgets that answer, and the next check writes the probe again. Another tab changing a wins key also forgets it. If the probe cannot be removed, that key can remain and saving stays blocked. The control stays hidden when a save can still be stored. A confirm step is required. Confirm copies the unreadable `mindpal.dailyWins.v2` text into a backup on this device, then clears that key so a new win can be saved. When image cleanup finishes, the card says the placeholder images were removed, except one another tab started saving in the last 15 seconds. When that cleanup is skipped or fails, the card says the placeholder images could not be removed from this device. Older timestamped copies are dropped only to keep the newest three. Backup names that are not timestamps are kept. It does not delete `mindpal.dailyWins.v1`. If the reset does not clear anything, the card says the reset was not needed or did not happen. This is a prototype recovery path, not real private storage.
- `exportV1` reads the current v2 store back as a version 1 record (`id`, `text`, and `at` when a time was recorded, no photo). A win whose time was not recorded leaves `at` out. It does not write storage. Migration does not delete or overwrite `mindpal.dailyWins.v1`, including when that key is already missing. A rollback to code that reads the v1 key can store that export under the v1 key as a separate step.
- A v1 win with no id gets a stable id, a short hash of its place in the list, its time, and its text. A win with no time uses a fixed value, not the clock, and the card says "Time not recorded". That line is shared, so Evening and Journal show it too. Two reads while v2 are unreadable show the same ids and times. Duplicate ids already stored in v2 are made unique in memory on load. That load does not write. The next save stores the unique ids. If those duplicates both use the IndexedDB reference, they share one placeholder image blob. The win that keeps the original id keeps that reference. The win that receives a new id keeps the bundled placeholder path instead, so it does not claim a second blob. Removing a win removes one win.
- **Do this next** on the current step. Rows open `#Readings`, `#Focus`, `#Later`, `#Evening`.
- Support (“When it's heavy”) and Growth (“Build strength”) chips expand, then **Open hub** → `#Problem`.
- Faith chip hidden when the local profile is secular.
- Optional **Work team morning ritual** card → `#Team morning`.
- **Open Watch with Maddy** → `#Explore`.
- First-run overlays: faith, then age/gender + two MindPal facts (if the gate did not already collect them).

## Enter / Send / search

No page-level search. **Enter** in `#mp-win-winOfDay` saves a win on Today. Evening (`#mp-win-evening`) and Journal still save into the same list, so Night can review what was added in the morning.

## Content sources

`mindpal.todaySteps.v1`, `mindpal.dailyWins.v2` (copied from a readable `mindpal.dailyWins.v1` when v2 is absent), IndexedDB `mindpal-photos` / `winPhotos` for the placeholder blob, `mpProblemHubs`, Maddy catalog, faith verse catalog (collapsed).

## Acceptance tests

- Brand from any sheet returns here and closes dialogs.
- Each step row changes hash to the matching lane.
- Win of the day is visible above Individual Growth Step 1 without opening Evening. Enter and **Save this win** call `addWin`.
- Support/Growth **Open hub** sets `mindpal.selectedProblem.v1` and opens `#Problem`.
- Youth teaser and “Help with how I’m feeling” stay unmounted on adult Today.

## Known gaps

- No Live AI on this page.
- Youth teaser is intentionally hidden in adult mode.
- There is no backend, no encryption, and no consent flow. The only image is the synthetic placeholder. Real camera photos are not accepted.
- A later write to `mindpal.dailyWins.v1` from an old tab is not merged into the v2 list. Roll back to v1 code with `exportV1` instead.
