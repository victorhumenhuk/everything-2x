(function () {
  if (globalThis.__everything2xMainHookInstalled) {
    return;
  }

  globalThis.__everything2xMainHookInstalled = true;

  const SOURCE = "everything-2x-extension";
  const PLAY_INTERCEPTED_MESSAGE = "__EVERYTHING_2X_PLAY_INTERCEPTED__";
  const SETTINGS_MESSAGE = "EVERYTHING_2X_SETTINGS";
  const SHADOW_MESSAGE = "EVERYTHING_2X_SHADOW_ATTACHED";
  const MIN_SPEED = 0.25;
  const MAX_SPEED = 4;
  const SPEED_STEP = 0.05;

  const mediaState = new WeakMap();
  let settings = {
    enabled: true,
    speed: 2
  };

  function clampSpeed(value) {
    const number = Number(value);
    const fallback = settings.speed || 2;
    const finite = Number.isFinite(number) ? number : fallback;
    const stepped = Math.round(finite / SPEED_STEP) * SPEED_STEP;
    return Number(Math.min(MAX_SPEED, Math.max(MIN_SPEED, stepped)).toFixed(2));
  }

  function isApproximately(value, expected) {
    return Math.abs(Number(value) - Number(expected)) < 0.001;
  }

  function normalizeSettings(nextSettings) {
    return {
      enabled: nextSettings?.enabled !== false,
      speed: clampSpeed(nextSettings?.speed)
    };
  }

  function getMediaState(media) {
    let entry = mediaState.get(media);

    if (!entry) {
      entry = {
        lastAppliedSpeed: null,
        syncing: false
      };
      mediaState.set(media, entry);
    }

    return entry;
  }

  function shouldApplyDefault(media, entry) {
    return (
      isApproximately(media.playbackRate, 1) ||
      isApproximately(media.playbackRate, entry.lastAppliedSpeed)
    );
  }

  function applyDefaultRate(media) {
    if (!settings.enabled || !(media instanceof HTMLMediaElement)) {
      return;
    }

    const entry = getMediaState(media);

    if (entry.syncing || !shouldApplyDefault(media, entry)) {
      return;
    }

    entry.syncing = true;

    try {
      media.defaultPlaybackRate = settings.speed;
    } catch {
      // Some protected players reject rate writes.
    }

    try {
      media.playbackRate = settings.speed;
      entry.lastAppliedSpeed = settings.speed;
    } catch {
      // Some protected players reject rate writes.
    } finally {
      entry.syncing = false;
    }
  }

  function trackOnPlay(media) {
    const entry = getMediaState(media);

    if (entry.tracked) {
      return;
    }

    entry.tracked = true;

    const sync = () => {
      if (!entry.syncing) {
        applyDefaultRate(media);
      }
    };

    media.addEventListener("loadedmetadata", sync, { passive: true });
    media.addEventListener("canplay", sync, { passive: true });
    media.addEventListener("ratechange", sync, { passive: true });
  }

  const nativePlay = HTMLMediaElement.prototype.play;

  HTMLMediaElement.prototype.play = function (...args) {
    trackOnPlay(this);
    applyDefaultRate(this);

    try {
      window.postMessage(
        {
          source: SOURCE,
          type: PLAY_INTERCEPTED_MESSAGE
        },
        "*"
      );
    } catch {
      // Page teardown can invalidate messaging.
    }

    return nativePlay.apply(this, args);
  };

  const nativeAttachShadow = Element.prototype.attachShadow;

  if (typeof nativeAttachShadow === "function") {
    Element.prototype.attachShadow = function (...args) {
      const shadowRoot = nativeAttachShadow.apply(this, args);

      try {
        window.postMessage(
          {
            source: SOURCE,
            type: SHADOW_MESSAGE
          },
          "*"
        );
      } catch {
        // Page teardown can invalidate messaging.
      }

      return shadowRoot;
    };
  }

  window.addEventListener(
    "message",
    (event) => {
      if (event.source !== window || event.data?.source !== SOURCE) {
        return;
      }

      if (event.data.type === SETTINGS_MESSAGE) {
        settings = normalizeSettings(event.data.settings);
      }
    },
    false
  );
})();
