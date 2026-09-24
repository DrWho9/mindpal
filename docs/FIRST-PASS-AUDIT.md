# First-pass audit — broken / no-op pages

Walked against latest `main` (`9f7835f`) plus this branch’s cheap CTA fixes.  
**Not a claim that Live AI works on github.io.**

## Required smokes (owner list)

| Surface | Before this branch | After cheap fix |
|---------|--------------------|-----------------|
| Companion choices | **Works** in deterministic demo. Safety chips toggle; Show practice choices returns fixed copy. Empty textarea does not call a model. | Same. Added **Ctrl/Cmd+Enter** on `#companion-message` so Send is not button-only. |
| YouTube Search | **Hidden no-op feel.** `#youtube-search` existed only after “Browse the full directory”. First paint looked like a directory with no search. | Full directory (and search) **opens on load**. Typing filters titles / creators / synopses. |
| Reflect composer | **Works** after choosing a mode. `#reflection-text` is session-only; no AI. | Unchanged. Smoke asserts composer presence. |
| Appointment companion entry | **No-op / missing.** Body, food and wellbeing said “Nothing here is shared with the Companion” and had **no** Companion CTA. | Added **Talk this appointment through with Companion** — saves `APPOINTMENT_COMPANION_PROMPT` and routes to `#Companion`. Questions on the page are **not** auto-copied (privacy). |

## Live AI / github.io (do not mislabel as broken)

| Surface | Finding |
|---------|---------|
| `#Companion` live send | `GET /mindpal/api/companion/status` then `POST /mindpal/api/companion/chat`. **Absent on static Pages.** Badge stays `DETERMINISTIC DEMO · NO LIVE AI`. Send with a typed message still falls back to the local guide unless a companion base returns `available: true`. |
| Journal “Talk to diary” | `/api/diary/respond` — same static-host limitation. Consent checkbox cannot create a model. |
| Settings | Correctly: “Hosting, live AI, HeyGen rendering and public release remain separate steps.” |

These are **hosting gaps**, not page no-ops.

## Still broken, stubbed, or intentionally incomplete

| Page | Finding | Severity |
|------|---------|----------|
| `#Focus` | Stress, Anger and other topics are `comingSoon` — buttons disabled. Only Relationships is `ready`. | Known gap (blueprint) |
| `#YouTube directory` | Ordinary-release shortlist is empty until the research checkbox (“This draft preview has no videos cleared for ordinary release”). Search works on the full research directory. | Known gap |
| Explore → Videos | Most HeyGen cards are **Open draft** only. V02 + Maddy MP4s play. | Known gap |
| Explore YT meditations | Several categories are “This category is filling.” / empty. Sleep and Anxiety are seeded. | Known gap |
| `#Body, food and wellbeing` | Cards are DRAFT / “Clinical review date: pending”. Real PDF/OCR import is disabled (synthetic sample only). Iron FAQ cannot interpret results. | Known gap |
| `#Feelings` legacy quote path | Inject still contains “Original MindPal draft · human review pending” in the unused legacy `ve` path. Live page uses `mpFeelingsPage`. | Low |
| `#Women’s wellbeing` | “Pregnancy and postnatal medical pathways still wait for specialist review.” Mothers card **does** navigate. | Known gap |
| `#Reflect` | Clears on reload; “no live listener or AI.” By design. | Known gap |
| Settings | Wins / photos / friends “need a future backend.” Sign-out works locally. | Known gap |
| `#Youth preview` / `#Youth lab` | Hidden from adult Today (`ne&&` youth teaser). Deep-link still in allowlist. | Low |
| Men’s health | **No hash route.** Facts appear only after age+gender at sign-in / Account. Not a missing page — an overlay. | Clarified |

## Not no-ops (verified wiring)

- Brand / `mpGoHome` → `#Today` (including when already on Today).
- Support / Growth chips → `#Problem` with selected id.
- Mothers / AOD Feelings chips and Women’s mothers card → dedicated hubs + Companion prefill.
- AOD featured talk-through expand/collapse.
- Team morning breath → reading order; does not mark Pack A Done.
- Daily wins **Enter** saves.
- Appointment **Save my question** (form submit).

## What this branch shipped

Docs + inventory + smoke + the two cheap CTA fixes (YouTube search visible; Appointment companion entry; Companion Ctrl/Cmd+Enter). No Live AI enablement on Pages.
