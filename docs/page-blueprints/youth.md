# Youth preview & Youth lab

| | |
|---|---|
| **Routes** | `#Youth preview`, `#Youth lab` |
| **Nav** | Youth teaser (hidden on adult Today); allowlist deep links |
| **Sources** | Vendor `Te` / `ye` |

## Purpose

Separate youth preview and lesson lab. Adult home is Today.

## Expected UX

- Adult Today must **not** show the youth teaser (`ne&&` only).
- Deep-linking `#Youth preview` still works for the youth gate.
- Youth-safe MindPal facts (no heart-disease / menopause language) if an under-18 band is chosen at profile setup.

## Enter / Send / search

Vendor lesson controls only.

## Acceptance tests

- Allowlist includes both hashes (invalid hashes must not 404 the shell).
- Adult sign-in still lands on `#Today`.

## Known gaps

- Adult QA does not treat these as primary surfaces.
- Youth lab content is the vendor corpus, not Pack A.
