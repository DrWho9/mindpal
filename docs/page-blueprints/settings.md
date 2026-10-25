# Settings

| | |
|---|---|
| **Route** | `#Settings` |
| **Nav** | Sidebar (adult) |
| **Sources** | Vendor `Qi` + `mpFaithSettings` + `mpAccountFooter` |

## Purpose

Local preferences and the local account. Not a cloud settings console.

## Expected UX

- Nickname / display preferences from the vendor card.
- **Calendar & morning picture**: Coptic date toggle, welcome image toggle.
- **Account**: faith edit, age/gender edit (MindPal facts), **Sign out** → first-run gate.
- Privacy copy: wins stay on this device. A Win of the day can keep a prototype placeholder image in this browser only. That image is a bundled fake picture and not real private photo storage. Friends and sharing need a future backend. Hosting and live AI are separate steps.

## Enter / Send / search

None. Toggles persist to `localStorage`.

## Acceptance tests

- Sign out clears `mindpal.sessionUser.v1` and shows sign-in.
- Mid-page `Nt` login card stays unmounted.
- Faith / profile edits dispatch change events so Today updates.

## Known gaps

- No backend, no encryption, and no consent flow for wins or photos. The placeholder blob stays in this browser. Real camera photos are not accepted.
- Demo passwords only.
