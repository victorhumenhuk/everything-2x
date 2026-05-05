(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.Everything2xShared = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const MIN_SPEED = 0.25;
  const MAX_SPEED = 4;
  const SPEED_STEP = 0.05;
  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    speed: 2
  });

  const STORAGE_KEYS = Object.freeze({
    applyNowToken: "applyNowToken",
    enabled: "enabled",
    speed: "speed"
  });

  const MESSAGE_TYPES = Object.freeze({
    APPLY_NOW: "EVERYTHING_2X_APPLY_NOW",
    APPLY_SETTINGS: "EVERYTHING_2X_APPLY_SETTINGS",
    GET_ACTIVE_TAB_STATUS: "EVERYTHING_2X_GET_ACTIVE_TAB_STATUS",
    GET_STATUS: "EVERYTHING_2X_GET_STATUS",
    MEDIA_COUNT_REPORT: "EVERYTHING_2X_MEDIA_COUNT_REPORT"
  });

  const PAGE_MESSAGE_SOURCE = "everything-2x-extension";
  const PAGE_MESSAGE_TYPES = Object.freeze({
    PLAY_INTERCEPTED: "__EVERYTHING_2X_PLAY_INTERCEPTED__",
    SETTINGS: "EVERYTHING_2X_SETTINGS",
    SHADOW_ATTACHED: "EVERYTHING_2X_SHADOW_ATTACHED"
  });

  function toNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clampSpeed(value) {
    const number = toNumber(value, DEFAULT_SETTINGS.speed);
    const stepped = Math.round(number / SPEED_STEP) * SPEED_STEP;
    const clamped = Math.min(MAX_SPEED, Math.max(MIN_SPEED, stepped));
    return Number(clamped.toFixed(2));
  }

  function normalizeSettings(settings) {
    return {
      enabled: settings?.enabled !== false,
      speed: clampSpeed(settings?.speed)
    };
  }

  function formatSpeed(speed) {
    const normalized = clampSpeed(speed);

    if (Number.isInteger(normalized) || Number.isInteger(normalized * 10)) {
      return `${normalized.toFixed(1)}x`;
    }

    return `${normalized.toFixed(2)}x`;
  }

  function isApproximately(value, expected) {
    return Math.abs(Number(value) - Number(expected)) < 0.001;
  }

  return {
    DEFAULT_SETTINGS,
    MAX_SPEED,
    MESSAGE_TYPES,
    MIN_SPEED,
    PAGE_MESSAGE_SOURCE,
    PAGE_MESSAGE_TYPES,
    SPEED_STEP,
    STORAGE_KEYS,
    clampSpeed,
    formatSpeed,
    isApproximately,
    normalizeSettings
  };
});
