# Sign-in, local profile, faith setup

| | |
|---|---|
| **Route** | Overlay (not in `Ii`). Blocks the adult shell until `Dt()` + faith + age/gender. |
| **Sources** | `mpSignInPage`, `mpFaithPrefQuestions`, `mpProfilePrefQuestions`; `src/prefs/faith.js` |

## Purpose

Device-local demo account so Today can greet you and target optional faith / facts.

## Expected UX

1. **Sign in** or **Create local profile** (throwaway password). Demo users such as `Mo1` exist in the vendor seed.
2. Faith: religious (tradition chips) or **No religion / prefer secular**.
3. Age band + gender (Prefer not to say is fine) → two MindPal facts → Continue.
4. Lands on `#Today`.

Sign-out from Settings returns here. Tabs hide until the gate passes.

## Enter / Send / search

Buttons only (not a native form submit). Password field is local SHA-256.

## Acceptance tests

- Gate holds if faith **or** demographics are missing.
- Secular skips morning verse.
- Nothing is posted to a server.

## Known gaps

- Demo auth only. Not production identity.
