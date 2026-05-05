# Everything 2x

Chrome extension that sets video and audio to your chosen default playback speed on every site. Set once, forget forever.

## What it does

- Auto-applies your default playback rate (default 2.0x) to every `<video>` and `<audio>` element on every page and every iframe.
- Works on YouTube, Vimeo, Spotify Web, SoundCloud, Udemy, Coursera, BBC iPlayer, news sites, and anything else with HTML5 media.
- Re-applies the rate when sites try to reset it.
- Detects dynamically added media via MutationObserver, including media inside open shadow roots.
- Settings sync across devices via `chrome.storage.sync`.

## Privacy

The extension does not collect, transmit, or sell any data. There is no telemetry, no analytics, no remote code. All settings stay in `chrome.storage.sync`.

## Install

Chrome Web Store: https://chromewebstore.google.com/detail/phmdhmdagnabhpapodojfepkeemlifbp

## Development

```bash
# Load unpacked
# 1. Open chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked" and select this folder
```

## Permissions

- `storage`: persist user's chosen default speed and enabled state
- `<all_urls>` host access: required to apply playback speed to media elements on every site

No other permissions are requested.

## Author

Built by Victor Humenhuk. Follow [@victorhumenhuk](https://x.com/victorhumenhuk) on X for new tools.

## Licence

MIT
