# MindPal (phone)

This is **MindPal** — not a separate product. Verse for the Day and daily readings are in-app modules.

## Install MindPal on your phone
1. Open the MindPal HTTPS URL on your phone.
2. **iPhone (Safari):** Share → **Add to Home Screen** → Add.
3. **Android (Chrome):** menu → **Add to Home screen** / Install.
4. Open the **MindPal** icon — Verse, Reading, and **Book** modules.

## Book tab (interactive)
- Upload a PDF **you own** (File picker). Bytes stay on-device (optional IndexedDB); never uploaded to MindPal servers.
- Parses text with pdf.js (CDN; network needed first time).
- **Chapters:** uses PDF outline/bookmarks when present; otherwise heading heuristics (Chapter N, title-case lines, numbered sections).
- **UI:** collapsible chapter rail (collapsed by default) · Kindle-style reading chrome when a book is open (Back, Bookmark, chapter title + in-chapter %, scrubber, bottom Chapters / Search / Notes / Design) · ~half-screen reflowed text chunks (not raw PDF canvas as primary).
- **Advance:** tap left/right thirds of the screen, or swipe ← →. End of a chapter continues into the next on the following tap.
- Last chunk index remembered in localStorage for that filename.
- **Listen / Pause:** on-device Web Speech (`speechSynthesis`) — works offline when an OS voice is installed. No paid cloud TTS in v1. Hook reserved for later local TTS packs or pre-rendered chapter audio stored with the book in IndexedDB.
- **Design (Aa):** font (Serif Georgia / Sans system / Soft rounded), text & background colour pickers, theme presets (Paper cream, Sage calm, Night, Sepia, Soft sky). Choices persist in `localStorage` key `mindpal-book-design-v1` and apply live to the reading surface.
- **Search / Notes:** Search filters the chapter rail; Notes are a per-book localStorage stub.

Offline: service worker caches MindPal shell + Verse/Reading content after first open (cache `mindpal-v1-6-book-design`). pdf.js + a new PDF still need network / file pick.
