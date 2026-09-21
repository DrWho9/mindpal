# Feelings hub curation — high-model follow-up

Michael asked that **high-quality models write the content and choose the videos**, not a tag scrape. This PR ships information architecture and a first editorial shortlist so hubs are kits. It does **not** rewrite Pack A bodies (out of scope).

## Queue for a later high-model pass

For each kit in `src/data/feeling-kits.json`:

1. **Rewrite reading blurbs** in MindPal AU literacy (education, not diagnosis). Keep title + theme first; do not lead with Day numbers.
2. **Re-pick videos** for that feeling: prefer playable assets already in-repo (Maddy, V02), then YouTube refs the hub already allows, then a short “Open draft” list. No new HeyGen renders. No speaker dump.
3. **Polish Evidence & guidance** notes (mothers first, then other heavy hubs). Cite only real public pages. Do not invent studies, DOIs, or statistics.

## Kits to cover

| Kit id | Priority | Notes |
| --- | --- | --- |
| `mothers` | First | Openable Pack A chapters + PANDA / Beyond Blue / HealthDirect / COPE |
| `aod` | First | Keep puppy-and-treat talk-through featured; spell out drugs and alcohol |
| `anxiety`, `sleep`, `low-mood`, `stress` | Heavy hubs | Same accordion; evidence section already stubbed with real AU links |
| `overwhelm`, `anger`, `lonely`, `guilty`, `unsure` | Feelings dropdown | Order + blurbs |
| `motivation`, `faith`, `mindset`, `stronger-mind`, `challenge`, `hard-patch`, `gratitude` | Problem hubs | Same kit pattern |

Men’s health is **not wired** through Feelings yet — do not invent a hub here.

## Do not do in the content pass

- Wave B HeyGen
- Changing Today Morning / Day / Night step split
- Rewriting every Pack A body (unless a later ticket asks)

## How to tell the pass worked

Feelings → Drugs & alcohol and Struggling mothers look like calm kits: Start here, openable readings with chapter tags, curated videos, Evidence & guidance, Companion, Journal. Not “12 matching Pack A readings” as Day 14, 36, 42…
