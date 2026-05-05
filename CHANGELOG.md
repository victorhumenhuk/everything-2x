# Changelog

All notable changes to Everything 2x are documented here.

## [2.0.2] - 2026-05-05

### Fixed

- Media detection across iframes: background service worker now aggregates counts from all frames, fixing "0 media elements" on YouTube and other sites with iframe-based players.
- Popup width now fixed at 320px to prevent clipping in Chrome's pinned-extension dropdown.
- Status line copy changed from "0 media elements" (looked like an error) to neutral "Idle / Ready" language.
- Removed all Ko-fi and donation references; footer now shows X handle only.

## [2.0.1] - 2026-05-05

### Removed

- `tabs` permission, which was unnecessary and triggered Chrome Web Store rejection (reference Purple Potassium).
- `scripting` and `webNavigation` permissions, which were also unused.

### Added

- `minimum_chrome_version: 111` to ensure main-world content script support.
- Recursive open shadow root traversal for media detection.
- `ratechange` listener that re-applies the user's default rate when sites reset to 1.0.

## [2.0.0] - 2026-05-01

### Added

- Initial v2 release with responsive popup, light/dark theme, presets, slider, and toggle.
