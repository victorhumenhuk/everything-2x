# Privacy Policy for Everything 2x

**Last updated:** 5 May 2026

Everything 2x is a Chrome browser extension that sets a default playback speed for HTML5 video and audio elements on websites you visit. This document describes what the extension does and does not do with data.

## What the extension does with data

The extension reads and writes the `playbackRate` property of HTML5 `<video>` and `<audio>` elements on the pages you visit, in order to apply your chosen default playback speed. That is the entirety of its interaction with web page content.

## What the extension stores

The extension stores the following two values in `chrome.storage.sync`:

- Your chosen default playback speed, a number between 0.25 and 4.0
- Whether the extension is enabled or disabled, a boolean

These values are stored locally in your browser and synced across your Chrome installations through your Google Account using Chrome's built-in sync storage. No third party has access to this data.

## What the extension does NOT collect

The extension does not collect, store, transmit, sell, or share:

- Personally identifiable information
- Health information
- Financial or payment information
- Authentication credentials
- Personal communications such as emails, messages, or chat
- Location data
- Web browsing history
- User activity such as clicks, keystrokes, scroll position, or mouse movement
- Page content such as text, images, audio, video, or hyperlinks
- IP addresses
- Cookies

## Third parties

The extension does not share any data with any third party. The extension does not contact any external server. The extension contains no analytics, no tracking pixels, no telemetry, no advertising, and no remote code.

## Permissions explained

- **`storage`**: used to save and retrieve your chosen default playback speed and enabled state across browser sessions and devices.
- **Host access (`<all_urls>`)**: required to inject a content script that locates HTML5 media elements and sets their `playbackRate`. The content script does not read page text, URLs, cookies, form data, or any other content. It does not transmit any data externally.

No other permissions are requested.

## Open source

The full source code of this extension is published at <https://github.com/victorhumenhuk/Everything-2x> so anyone can verify these claims independently.

## Contact

For privacy questions, contact <victor@thesmios.com>.

## Changes

Material changes to this policy will be reflected here with an updated "Last updated" date and committed to the public repository.
