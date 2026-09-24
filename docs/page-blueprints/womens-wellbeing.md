# Women’s wellbeing

| | |
|---|---|
| **Route** | `#Women’s wellbeing` |
| **Nav** | Sidebar |
| **Sources** | Vendor `Zi` + `mpMothersWomenCard` |

## Purpose

Vendor women’s topics plus a door into the mothers hub.

## Expected UX

- Topic exercises and diary hooks from `Zi`.
- **Struggling mothers** card: **Open the mothers space** → `#Struggling mothers`.
- Card states medical pathways still wait for specialist review.

## Enter / Send / search

None.

## Acceptance tests

- Mothers CTA calls `mpOpenProblem('mothers')` and `I('Struggling mothers')`.
- Diary callbacks from vendor topics still open `#My diary`.

## Known gaps

- Clinical women’s health content is draft / review pending in the vendor pack.
- Men’s health is **not** this route (see mens-health-and-profile.md).
