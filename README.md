# Elem3x

A Chrome extension for editing CSS on any page in plain English. Click an element, describe the
change you want - "make this bigger and centre it" - and an LLM returns the CSS, which is applied
live.

Built to skip the loop of opening devtools, hunting for the right selector, and remembering which
property does what.

## How it works

1. **Select** - hover to highlight elements; the extension builds a specific selector for the one
   you click.
2. **Describe** - type the change in plain language.
3. **Apply** - the model returns CSS properties, which are injected into the page.

The extension reads the element's current computed styles first, so the model edits what's
actually there rather than guessing.

## Setup

Requires a [Google Gemini API key](https://aistudio.google.com/apikey).

1. Clone this repo
2. Add your API key where `YOUR_GEMINI_API_KEY_HERE` appears
3. Load it in Chrome: `chrome://extensions` → enable **Developer mode** → **Load unpacked** →
   select this folder

> **Don't commit your key.** It's gitignored below, but the safer pattern is to store it via
> `chrome.storage` and enter it in the extension's UI rather than putting it in source.

## Status

Built in three passes, visible in the commit history:

- **V1** - select an element, describe a change, apply the returned CSS
- **V2** - edits multiple properties at once and reads current values
- **V3** - dynamic selector generation, producing both a detailed and a simplified selector path

Known incomplete: the enable/disable toggle is present in the UI but not yet wired up.

A TypeScript rewrite with a webpack build exists separately as `Elem3x.ts`.

## Stack

Vanilla JavaScript · Chrome Manifest V3 · Gemini API
