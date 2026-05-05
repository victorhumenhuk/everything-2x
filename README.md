# Everything 2x

A Chrome extension that sets every HTML5 video and audio element on every website to your chosen default playback speed. Set once, forget forever.

[![Install on Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-2ecc71?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/phmdhmdagnabhpapodojfepkeemlifbp)

## What it does

Most speed controllers force you to click a button on every video. Everything 2x does it automatically. You pick a default speed in the popup, and every `<video>` and `<audio>` on every site plays at that speed from the moment it loads.

- Applies your chosen speed to HTML5 video and audio on every site, including embedded iframes
- Speed range from 0.25x to 4x in fine increments
- Quick presets: 1x, 1.25x, 1.5x, 1.75x, 2x, 2.5x, 3x, 4x
- One-tap enable / disable toggle
- Re-applies your speed when sites try to reset it
- Detects newly loaded media dynamically (single-page apps, lazy-loaded players, shadow DOM)
- Settings sync across your devices via Chrome sync storage

## Privacy

- No data collection
- No analytics, no telemetry, no tracking pixels
- No external servers contacted
- No remote code
- All settings stay in your browser
- Only two permissions requested: `storage` (to save your speed setting) and host access (to apply playback speed to media on every site)

Full privacy policy: [PRIVACY.md](PRIVACY.md)

## Use cases

- Speed up online courses, lectures, and tutorials
- Power through long podcasts and audiobooks
- Skim long video content faster
- Slow down language-learning audio for clarity

## Install

**Chrome Web Store:** <https://chromewebstore.google.com/detail/phmdhmdagnabhpapodojfepkeemlifbp>

## Development

To load the extension unpacked for development:

1. Clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable Developer mode in the top right
4. Click "Load unpacked" and select this folder
5. The extension should appear in your toolbar

To package a release:

```bash
chmod +x scripts/package.sh
./scripts/package.sh
```

The zip is written to `dist/everything-2x-v<version>.zip`.

## Permissions justification

| Permission | Why it is required |
|---|---|
| `storage` | Persists the user's chosen default playback speed and enabled state in `chrome.storage.sync`. |
| Host access (`<all_urls>`) | Required to inject the content script that locates HTML5 media elements and sets `playbackRate` on every site. The content script does not read page text, URLs, cookies, or form data. |

No other permissions are requested. No `tabs`, no `activeTab`, no `scripting`, no `webNavigation`.

## Architecture

- `manifest.json` - Manifest V3 declaration
- `media-hook.js` - Main-world content script that hooks `HTMLMediaElement.prototype.play` so playback rate is set before media starts
- `content.js` - Isolated-world content script that scans for media, applies the rate, and watches for dynamically added elements via MutationObserver including open shadow roots
- `shared.js` - Shared constants and storage helpers
- `background.js` - Service worker that aggregates per-tab media counts across all frames for the popup
- `popup.html` / `popup.css` / `popup.js` - Responsive 320px popup with slider, presets, toggle, and "Apply to current tab now" action
- `icons/` - Extension icons at 16, 32, 48, 128, 256

## Releases

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Author

Built by Victor Humenhuk. Follow [@victorhumenhuk](https://x.com/victorhumenhuk) on X for new tools.

## Licence

[MIT](LICENSE) (c) 2026 Victor Humenhuk
