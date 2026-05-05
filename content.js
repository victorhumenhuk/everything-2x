/*
 * Everything 2x runs in two worlds:
 * - media-hook.js runs in the page's main world so it can hook
 *   HTMLMediaElement.prototype.play before site players call it.
 * - This isolated-world content script owns extension APIs. It scans light DOM
 *   and open shadow roots, applies the chosen rate, and reports per-frame media
 *   counts to background.js with chrome.runtime.sendMessage.
 * - background.js aggregates each frame's report by tabId, and popup.js reads
 *   the aggregate from the background service worker instead of trusting only
 *   the top frame.
 */
(function () {
  if (globalThis.__everything2xContentInstalled) {
    return;
  }

  globalThis.__everything2xContentInstalled = true;

  const {
    DEFAULT_SETTINGS,
    MESSAGE_TYPES,
    PAGE_MESSAGE_SOURCE,
    PAGE_MESSAGE_TYPES,
    STORAGE_KEYS,
    isApproximately,
    normalizeSettings
  } = globalThis.Everything2xShared;

  const MEDIA_SELECTOR = "video,audio";
  const REPORT_DEBOUNCE_MS = 250;
  const SCAN_DEBOUNCE_MS = 50;
  const trackedMedia = new WeakMap();
  const syncingMedia = new WeakSet();
  const observedRoots = new WeakSet();

  let settings = { ...DEFAULT_SETTINGS };
  let observer = null;
  let scheduledScan = 0;
  let reportTimer = 0;
  let lastReportedKey = "";

  function storageGet(areaName, defaults) {
    return new Promise((resolve, reject) => {
      chrome.storage[areaName].get(defaults, (result) => {
        const error = chrome.runtime.lastError;

        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve(result || {});
      });
    });
  }

  async function readStoredSettings() {
    try {
      return normalizeSettings(await storageGet("sync", DEFAULT_SETTINGS));
    } catch {
      return normalizeSettings(await storageGet("local", DEFAULT_SETTINGS));
    }
  }

  function publishSettingsToPage() {
    try {
      window.postMessage(
        {
          source: PAGE_MESSAGE_SOURCE,
          type: PAGE_MESSAGE_TYPES.SETTINGS,
          settings
        },
        "*"
      );
    } catch {
      // The frame can be navigating while this script is still alive.
    }
  }

  function isMediaElement(node) {
    return node instanceof HTMLMediaElement;
  }

  function getTrackedEntry(media) {
    let entry = trackedMedia.get(media);

    if (!entry) {
      entry = {
        lastAppliedSpeed: null
      };
      trackedMedia.set(media, entry);
    }

    return entry;
  }

  function shouldApplyDefault(media, entry, force) {
    if (force) {
      return true;
    }

    return (
      isApproximately(media.playbackRate, 1) ||
      isApproximately(media.playbackRate, entry.lastAppliedSpeed)
    );
  }

  function setMediaSpeed(media, speed) {
    try {
      media.defaultPlaybackRate = speed;
    } catch {
      // Some protected players reject rate writes.
    }

    try {
      media.playbackRate = speed;
    } catch {
      // Some protected players reject rate writes.
    }
  }

  function applyToMedia(media, options = {}) {
    if (!settings.enabled || !isMediaElement(media)) {
      return;
    }

    const entry = getTrackedEntry(media);

    if (
      syncingMedia.has(media) ||
      !shouldApplyDefault(media, entry, Boolean(options.force))
    ) {
      return;
    }

    syncingMedia.add(media);

    try {
      setMediaSpeed(media, settings.speed);
      entry.lastAppliedSpeed = settings.speed;
    } finally {
      syncingMedia.delete(media);
    }
  }

  function restoreMediaIfControlled(media) {
    if (!isMediaElement(media)) {
      return;
    }

    const entry = trackedMedia.get(media);

    if (!entry || entry.lastAppliedSpeed == null) {
      return;
    }

    if (isApproximately(media.playbackRate, entry.lastAppliedSpeed)) {
      setMediaSpeed(media, 1);
    }

    entry.lastAppliedSpeed = null;
  }

  function handleRateChange(media) {
    if (syncingMedia.has(media)) {
      return;
    }

    const entry = getTrackedEntry(media);

    if (!settings.enabled) {
      return;
    }

    if (
      !isApproximately(settings.speed, 1) &&
      isApproximately(media.playbackRate, 1)
    ) {
      applyToMedia(media, { force: true });
      return;
    }

    if (!isApproximately(media.playbackRate, settings.speed)) {
      entry.lastAppliedSpeed = null;
    }
  }

  function trackMedia(media) {
    const entry = getTrackedEntry(media);

    if (entry.tracked) {
      return;
    }

    entry.tracked = true;

    const sync = () => applyToMedia(media);

    media.addEventListener("loadedmetadata", sync, { passive: true });
    media.addEventListener("canplay", sync, { passive: true });
    media.addEventListener("play", sync, { passive: true });
    media.addEventListener("ratechange", () => handleRateChange(media), {
      passive: true
    });

    applyToMedia(media);
  }

  function findAllMedia(root, collected = [], seen = new WeakSet(), depth = 0) {
    if (!root || depth > 40) {
      return collected;
    }

    if (isMediaElement(root) && !seen.has(root)) {
      seen.add(root);
      collected.push(root);
    }

    if (typeof root.querySelectorAll !== "function") {
      return collected;
    }

    for (const media of root.querySelectorAll(MEDIA_SELECTOR)) {
      if (!seen.has(media)) {
        seen.add(media);
        collected.push(media);
      }
    }

    for (const element of root.querySelectorAll("*")) {
      if (element.shadowRoot) {
        observeRoot(element.shadowRoot);
        findAllMedia(element.shadowRoot, collected, seen, depth + 1);
      }
      // Closed shadow roots are intentionally skipped; the web platform does
      // not expose a way for extensions to traverse them.
    }

    return collected;
  }

  function applyToAllMedia(options = {}) {
    const mediaElements = findAllMedia(document);

    for (const media of mediaElements) {
      trackMedia(media);

      if (settings.enabled) {
        applyToMedia(media, options);
      } else if (options.restoreDisabled) {
        restoreMediaIfControlled(media);
      }
    }

    queueCountReport(mediaElements.length);
    return mediaElements;
  }

  function getStatus() {
    const mediaElements = applyToAllMedia();

    return {
      ok: true,
      enabled: settings.enabled,
      speed: settings.speed,
      mediaCount: mediaElements.length
    };
  }

  function sendCountReport(count) {
    try {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.MEDIA_COUNT_REPORT,
        enabled: settings.enabled,
        mediaCount: count,
        speed: settings.speed
      });
    } catch {
      // The extension context can disappear during navigation or reload.
    }
  }

  function queueCountReport(count = findAllMedia(document).length) {
    const reportKey = `${count}:${settings.enabled}:${settings.speed}`;

    if (reportKey === lastReportedKey) {
      return;
    }

    lastReportedKey = reportKey;
    window.clearTimeout(reportTimer);
    reportTimer = window.setTimeout(() => {
      sendCountReport(count);
    }, REPORT_DEBOUNCE_MS);
  }

  function scheduleFullScan(options = {}) {
    window.clearTimeout(scheduledScan);
    scheduledScan = window.setTimeout(() => {
      applyToAllMedia(options);
    }, SCAN_DEBOUNCE_MS);
  }

  function mediaFromMutationTarget(target) {
    if (isMediaElement(target)) {
      return target;
    }

    if (target instanceof HTMLSourceElement && isMediaElement(target.parentElement)) {
      return target.parentElement;
    }

    return null;
  }

  function handleMutations(mutations) {
    let shouldScan = false;

    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        const media = mediaFromMutationTarget(mutation.target);

        if (media) {
          trackMedia(media);
          applyToMedia(media);
          shouldScan = true;
        }

        continue;
      }

      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
      }
    }

    if (shouldScan) {
      scheduleFullScan();
    }
  }

  function observeRoot(root) {
    if (!root || observedRoots.has(root) || !observer) {
      return;
    }

    observedRoots.add(root);

    observer.observe(root, {
      attributeFilter: ["src"],
      attributes: true,
      childList: true,
      subtree: true
    });
  }

  function installObserver() {
    observer = new MutationObserver(handleMutations);
    observeRoot(document);
  }

  function updateSettings(nextSettings, options = {}) {
    const wasEnabled = settings.enabled;
    settings = normalizeSettings(nextSettings);
    publishSettingsToPage();

    if (settings.enabled) {
      applyToAllMedia(options);
    } else if (wasEnabled || options.force) {
      applyToAllMedia({ restoreDisabled: true });
    } else {
      queueCountReport();
    }
  }

  function settingsFromChanges(changes) {
    if (
      !changes[STORAGE_KEYS.enabled] &&
      !changes[STORAGE_KEYS.speed] &&
      !changes[STORAGE_KEYS.applyNowToken]
    ) {
      return null;
    }

    return normalizeSettings({
      enabled: changes[STORAGE_KEYS.enabled]?.newValue ?? settings.enabled,
      speed: changes[STORAGE_KEYS.speed]?.newValue ?? settings.speed
    });
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" && areaName !== "local") {
      return;
    }

    const nextSettings = settingsFromChanges(changes);

    if (nextSettings) {
      updateSettings(nextSettings, {
        force: Boolean(changes[STORAGE_KEYS.applyNowToken])
      });
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === MESSAGE_TYPES.GET_STATUS) {
      sendResponse(getStatus());
      return;
    }

    if (message?.type === MESSAGE_TYPES.APPLY_SETTINGS) {
      updateSettings(message.settings, {
        force: Boolean(message.force)
      });
      sendResponse(getStatus());
      return;
    }

    if (message?.type === MESSAGE_TYPES.APPLY_NOW) {
      applyToAllMedia({ force: true });
      sendResponse(getStatus());
    }
  });

  window.addEventListener(
    "message",
    (event) => {
      if (event.source !== window || event.data?.source !== PAGE_MESSAGE_SOURCE) {
        return;
      }

      if (
        event.data.type === PAGE_MESSAGE_TYPES.PLAY_INTERCEPTED ||
        event.data.type === PAGE_MESSAGE_TYPES.SHADOW_ATTACHED
      ) {
        scheduleFullScan({ force: false });
      }
    },
    false
  );

  document.addEventListener("DOMContentLoaded", () => scheduleFullScan(), {
    passive: true
  });
  window.addEventListener("load", () => scheduleFullScan(), { passive: true });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) {
        scheduleFullScan();
      }
    },
    { passive: true }
  );

  installObserver();
  publishSettingsToPage();
  applyToAllMedia();

  void readStoredSettings()
    .then((storedSettings) => {
      updateSettings(storedSettings);
    })
    .catch(() => {
      updateSettings(DEFAULT_SETTINGS);
    });
})();
