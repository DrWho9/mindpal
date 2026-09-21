# MindPal page audit checklist

Machine list: [`src/qa/page-inventory.js`](../src/qa/page-inventory.js).  
Pipeline: [`BUILD-PIPELINE.md`](BUILD-PIPELINE.md).  
First-pass findings: [`FIRST-PASS-AUDIT.md`](FIRST-PASS-AUDIT.md).

Hash form: `/mindpal/#` + `encodeURIComponent(route)`. Invalid hashes fall back to **Today**. Adult sidebar routes require the local sign-in gate (name + faith + age/gender).

## How to audit a page

For every row: open the route, exercise primary CTAs, confirm Enter/Send/search, then mark:

| Mark | Meaning |
|------|---------|
| `[ ]` | Not yet walked |
| `[x]` | Matches blueprint |
| `[~]` | Partial / known gap (link the blueprint) |
| `[!]` | Broken or no-op — must not squash |

Do **not** tick Companion / Diary AI as Live on github.io.

## Hash routes

| Route | Blueprint | Primary CTA | Enter / Send / search | Audit |
|-------|-----------|-------------|-----------------------|-------|
| `#Today` | [today.md](page-blueprints/today.md) | Step rows, Support/Growth chips, team ritual, Maddy teaser | Wins Enter on later surfaces; chips expand then Open hub | [ ] |
| `#Readings` | [readings.md](page-blueprints/readings.md) | Done for today, Listen, Copy | Listen is TTS / Maddy; Done unlocks next Pack A day | [ ] |
| `#Team morning` | [team-morning.md](page-blueprints/team-morning.md) | Breath timer → peaceful reading | Breath clock is local; reading is **not** Pack A Done | [ ] |
| `#Later` | [later.md](page-blueprints/later.md) | Two-minute E01, Open Focus | Buttons only | [ ] |
| `#Evening` | [evening.md](page-blueprints/evening.md) | Save win, wind-down → Journal | Win input **Enter** saves | [ ] |
| `#Explore` | [explore.md](page-blueprints/explore.md) | Verse / Reading / Videos accordion, library search | Library search filters titles as you type | [ ] |
| `#My diary` | [journal.md](page-blueprints/journal.md) | Save note, search, Talk to diary | Search filters on change; diary AI needs a server | [ ] |
| `#Focus` | [focus.md](page-blueprints/focus.md) | Relationships ready; companion demo | Stress / Anger **coming soon** (disabled, expected) | [ ] |
| `#Companion` | [companion.md](page-blueprints/companion.md) | Practice guide, safety chips, Show practice choices | **Ctrl/Cmd+Enter** sends; Enter in textarea is a newline. Live AI needs companion base | [ ] |
| `#Settings` | [settings.md](page-blueprints/settings.md) | Faith / age-gender edit, Coptic toggle, Sign out | Local only | [ ] |
| `#Feelings` | [feelings.md](page-blueprints/feelings.md) | Read / Videos / Diary / Practice | No live listener. Mothers + AOD chips leave to hubs | [ ] |
| `#YouTube directory` | [youtube-directory.md](page-blueprints/youtube-directory.md) | Search titles, topic filters, Open on YouTube | Search is visible on load; filters as you type | [ ] |
| `#Reflect` | [reflect.md](page-blueprints/reflect.md) | Three modes, composer, download | No network send; composer appears after a mode | [ ] |
| `#Body, food and wellbeing` | [body-food-appointment.md](page-blueprints/body-food-appointment.md) | Save question, Export, Companion entry | Form Enter saves a question; Companion CTA must open `#Companion` | [ ] |
| `#Problem` | [problem-hub.md](page-blueprints/problem-hub.md) | Open hub, Companion, Journal | Prefills Companion via `sessionStorage` | [ ] |
| `#Struggling mothers` | [struggling-mothers.md](page-blueprints/struggling-mothers.md) | Companion, Journal, Maddy / YT | Companion prompt is mother-support, not clinical | [ ] |
| `#Drugs & alcohol` | [drugs-alcohol.md](page-blueprints/drugs-alcohol.md) | Featured talk-through, Companion | DNA = drugs and alcohol nickname, not genetics | [ ] |
| `#Women’s wellbeing` | [womens-wellbeing.md](page-blueprints/womens-wellbeing.md) | Topic practices, mothers card | Mothers card must not no-op | [ ] |
| `#Get support` | [get-support.md](page-blueprints/get-support.md) | Crisis links | External tel/http only; app does not monitor | [ ] |
| `#Youth preview` | [youth.md](page-blueprints/youth.md) | Enter lab | Hidden from adult Today | [ ] |
| `#Youth lab` | [youth.md](page-blueprints/youth.md) | Youth lessons | Adult mode does not use this as home | [ ] |

## Overlays (not hash routes)

| Surface | Blueprint | Audit |
|---------|-----------|-------|
| Sign-in / create local profile | [sign-in.md](page-blueprints/sign-in.md) | [ ] |
| Faith preference (first run + Account) | [sign-in.md](page-blueprints/sign-in.md) | [ ] |
| Age / gender + MindPal facts (incl. men’s health copy) | [mens-health-and-profile.md](page-blueprints/mens-health-and-profile.md) | [ ] |
| Watch with Maddy (Explore / Today teaser) | [explore.md](page-blueprints/explore.md) | [ ] |
| Exercise overlay (E01 / E03 / …) | [focus.md](page-blueprints/focus.md) | [ ] |

## Required automated smoke

These must stay green on `npm run build` (Playwright, system Chrome):

1. **Companion choices** — safety chip selects; Show practice choices writes a demo response.
2. **YouTube Search** — `#youtube-search` filters directory entries (not a no-op).
3. **Reflect composer** — a mode button reveals `#reflection-text`.
4. **Appointment companion entry** — CTA opens `#Companion` and prefills the appointment prompt.

## Live AI rule

`DETERMINISTIC DEMO · NO LIVE AI` on github.io is **correct**. Only a same-origin companion base can flip the badge to `LIVE AI COMPANION · XAI GROK`. See [`BUILD-PIPELINE.md`](BUILD-PIPELINE.md).
