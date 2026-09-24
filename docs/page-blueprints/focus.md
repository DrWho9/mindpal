# Focus

| | |
|---|---|
| **Route** | `#Focus` |
| **Nav** | Bottom tab, Today step 2, Later |
| **Sources** | Vendor `Hr`; `mpSupportVideos` replaces the old “tagging not built” dump |

## Purpose

Topic practices for what you are dealing with — not a diagnosis.

## Expected UX

- Topic cards. **Relationships** is `ready`. Stress / Anger and others are `comingSoon` and **disabled**.
- **Browse all practices** lists the six draft exercises.
- Ready topic: tagged practices, readings (`bt`), tagged videos, journal prompt, **Try the companion demo** → `#Companion`.
- Exercise overlay (E01, E03, E05, …).

## Enter / Send / search

None. Companion entry is a navigate, not a send.

## Acceptance tests

- Coming-soon cards stay `disabled` / `aria-disabled` (not silent no-ops pretending to open).
- Companion demo button calls `I('Companion')`.
- Videos section lists tagged media, not “browse the whole library”.

## Known gaps

- Most topics are coming soon.
- Companion from here is the deterministic demo unless a companion base is present.
