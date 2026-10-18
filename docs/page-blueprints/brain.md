# Brain quiz

## Purpose
Untimed educational reasoning practice with 320 questions in 16 levels of 20. This is not an IQ test or clinical assessment.

## Expected UX
Open Brain directly below Appointment Questions in the left sidebar. Choose Foundation (the unchanged 320-question bank), UMAT-level (9 original multi-step reasoning questions), or Challenge (9 original harder reasoning questions). New rounds default to UMAT-level; an existing saved round retains its question set. These labels are editorial practice levels, not official UMAT items, measured exam equivalence, or an assessment score.

Choose immediate feedback or a batch, and choose 1–320 Foundation questions or 1–9 questions at either higher difficulty. The count limit and presets follow the selected bank. Submit an answer to see the explanation in immediate mode. In batch mode, edit choices with Back and receive answers and explanations only after submitting the entire batch. Resume saved rounds on the same device. Changing difficulty is available during setup; an active round must be explicitly discarded first. Existing MindPal features, age gates, Foundation answers and saved rounds remain available.

## Enter / Send / search
Native labeled radio controls and buttons support keyboard navigation. Submit answer or Submit batch is explicit. No search is needed.

## Acceptance tests
Check the sidebar order, hash route, immediate and batch modes, counts, Back, resume, storage failure, stale controls, mobile wrapping and focus. Check all three native-radio difficulties, bank-specific IDs/counts, unchanged Foundation bytes, restoration of legacy rounds, no mixed-bank sessions, difficulty switching without replacing the focused radio, and a safe clamp when switching to the smaller banks. Batch UI must not reveal correctness before submission. The static source contains answer data and is not designed to keep answers secret from developer tools.

## Known gaps
Real-browser layout and assistive-technology acceptance remain pending. Local storage cannot guarantee atomic writes across simultaneous tabs. No analytics, remote storage or provider is added by Brain.

## Local verification
`npm test` and `npm run build` include the focused Brain content, session, difficulty and controller tests. `npm run test:brain:browser` separately checks native radio keyboard interaction, all three question banks, batch resume and 1280/375/320px layouts in an isolated local module fixture. Set `MINDPAL_CHROME` to an installed Chromium/Chrome executable; no browser download is required. This fixture does not claim full-shell or age-gate acceptance.
