# Brain quiz

## Purpose
Untimed educational reasoning practice with 320 questions in 16 levels of 20. This is not an IQ test or clinical assessment.

## Expected UX
Open Brain directly below Appointment Questions in the left sidebar. Choose immediate feedback or a batch, and choose 1–320 questions. Submit an answer to see the explanation in immediate mode. In batch mode, edit choices with Back and receive answers and explanations only after submitting the entire batch. Resume saved rounds on the same device. Existing MindPal features remain available.

## Enter / Send / search
Native labeled radio controls and buttons support keyboard navigation. Submit answer or Submit batch is explicit. No search is needed.

## Acceptance tests
Check the sidebar order, hash route, immediate and batch modes, counts, Back, resume, storage failure, stale controls, mobile wrapping and focus. Batch UI must not reveal correctness before submission. The static source contains answer data and is not designed to keep answers secret from developer tools.

## Known gaps
Real-browser layout and assistive-technology acceptance remain pending. Local storage cannot guarantee atomic writes across simultaneous tabs. No analytics, remote storage or provider is added by Brain.
