# Profile facts & men’s health

| | |
|---|---|
| **Route** | **None.** Overlay on first local profile and Settings → Account. |
| **Sources** | `src/prefs/profile.js` `FACTS`; `mpMindPalFactsCard` |

## Purpose

Two reflection facts after age + gender. Men’s copy (e.g. 40–49 man: mood / sleep / heart-adjacent education) is **not** a diagnosis and not a men’s-health clinic.

## Expected UX

- Bands: Under 18 … 60+. Genders: Man / Woman / Non-binary / Prefer not to say.
- Under 18 uses youth-safe facts (`factsAreYouthSafe`).
- Man / Woman buckets; other genders use `general`.
- Disclaimer: “not a diagnosis and not medical advice.”
- Account card shows `Age and gender: …` with Edit.

## Enter / Send / search

Continue / Save preference only.

## Acceptance tests

- `factsForProfile('40_49', 'man')` returns two facts.
- Youth facts fail `YOUTH_UNSAFE` if someone later adds clinical adult copy.
- There is still **no** `#Men’s Health` hash — do not add one without a blueprint.

## Known gaps

- Not treatment, screening, or a replacement for a GP.
- Women’s clinical pathways are also not this overlay (see Women’s wellbeing + mothers).
