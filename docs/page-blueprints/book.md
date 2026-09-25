# Book

| | |
|---|---|
| **Route** | `#Book` |
| **Nav** | Explore card “Book / Your books”. Not a bottom tab. |
| **Sources** | Private PDF in IndexedDB (`mindpal-book-idb`); Pack A + Pack B as a sample book; design and ambient prefs in localStorage |

## Purpose

A private reader for a PDF the person already has, plus the bundled MindPal readings as a sample. Text stays on the device.

## Expected UX

- Explore shows a full-width **Book** card. **Open your books** goes to `#Book`. Today, Journal, Focus and Companion tabs stay as they are.
- **Choose a PDF** picks a file on phone or desktop. The bytes are stored in IndexedDB and survive refresh. Nothing is uploaded.
- The shelf also offers **Open the sample readings** (Pack A and Pack B, 210 original readings).
- An open book has a warm page (not a white PDF canvas), a collapsible chapter rail, tap or swipe between screen-sized chunks, and a reading-position scrubber.
- **Design** changes font, text size, theme and text/page colours. Prefs persist in `mindpal-book-design-v1`.
- **Ambient** offers Off, Zen, white noise and alpha waves, with a volume control. Sound is generated in the browser and can play while reading and while Listen speaks (the bed ducks while speech is playing).
- **Listen** is the shared MindPal player: play/pause, ±8s skip, scrubber and times. This page does not ship a second player.
- **Chapters** search filters the rail. Notes and a bookmark stay on the device.

## Enter / Send / search

Chapter search filters as you type (no submit). The PDF control is a file input. There is no server form.

## Content sources

Uploaded PDF text (pdf.js, vendored at `/mindpal/vendor/pdfjs/`). Sample book from `pack-a.json` and `pack-b.json`. No scraped library.

## Acceptance tests

- Chapter heuristics, chunking, design prefs and the on-device library round-trip in `tests/book.test.js`.
- `#Book` renders the shelf (Choose a PDF, sample readings) without adding a bottom-tab item.
- Opening the sample shows a chapter rail, Design, Ambient and the shared Listen player.

## Known gaps

- A scanned PDF with no text layer cannot be reflowed; the page says there is no extractable text.
- Listen is the app’s speech player, not a recorded human audiobook.
- Ambient beds are procedural tones, not music recordings.
- The sample is MindPal’s own readings, not a copyrighted book.
- Old shell chapter-audio packs in IndexedDB were only a hook and were never shipped.
