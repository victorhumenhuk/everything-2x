# Changelog

All notable changes to Everything 2x are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.2] - 2026-05-05

### Fixed
- Media detection across iframes: background service worker now aggregates counts from all frames, fixing the "0 media elements" issue on video and audio pages with iframe-based players.
- Popup width fixed at 320px to prevent clipping in Chrome's pinned-extension dropdown.
- Status line copy changed from "0 media elements" to neutral "Idle / Ready" language.

### Removed
- All external funding links.
- Footer now shows attribution and X handle only.

## [2.0.1] - 2026-05-05

### Removed
- `tabs` permission (Chrome Web Store rejection reference Purple Potassium).
- `scripting` and `webNavigation` permissions (unused).

### Added
- `minimum_chrome_version: 111` to ensure main-world content script support.
- Recursive open shadow root traversal for media detection.
- `ratechange` listener that re-applies the user's default rate when sites reset to 1.0.

## [2.0.0] - 2026-05-01

### Added
- Initial v2 release with responsive popup, light/dark theme, presets, slider, and toggle.
