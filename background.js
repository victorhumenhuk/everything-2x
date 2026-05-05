importScripts("shared.js");

const {
  DEFAULT_SETTINGS,
  MESSAGE_TYPES,
  normalizeSettings
} = globalThis.Everything2xShared;

const FRAME_STATUS_MAX_AGE_MS = 45_000;
const tabFrameStatus = new Map();

function now() {
  return Date.now();
}

function storageSet(areaName, values) {
  return new Promise((resolve, reject) => {
    chrome.storage[areaName].set(values, () => {
      const error = chrome.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve();
    });
  });
}

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

async function readSettings() {
  try {
    return normalizeSettings(await storageGet("sync", DEFAULT_SETTINGS));
  } catch {
    return normalizeSettings(await storageGet("local", DEFAULT_SETTINGS));
  }
}

async function ensureDefaultSettings() {
  const currentSettings = await readSettings();
  await storageSet("sync", currentSettings);
}

function getActiveTabId() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const error = chrome.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(tabs[0]?.id ?? null);
    });
  });
}

function rememberFrameStatus(sender, message) {
  const tabId = sender.tab?.id;

  if (!Number.isInteger(tabId)) {
    return;
  }

  let frames = tabFrameStatus.get(tabId);

  if (!frames) {
    frames = new Map();
    tabFrameStatus.set(tabId, frames);
  }

  frames.set(sender.frameId ?? 0, {
    enabled: message.enabled !== false,
    mediaCount: Number.isFinite(message.mediaCount) ? message.mediaCount : 0,
    speed: Number.isFinite(message.speed) ? message.speed : DEFAULT_SETTINGS.speed,
    updatedAt: now()
  });
}

function aggregateTabStatus(tabId, settings) {
  const frames = tabFrameStatus.get(tabId);
  const cutoff = now() - FRAME_STATUS_MAX_AGE_MS;
  let mediaCount = 0;
  let frameCount = 0;

  if (frames) {
    for (const [frameId, status] of frames) {
      if (status.updatedAt < cutoff) {
        frames.delete(frameId);
        continue;
      }

      frameCount += 1;
      mediaCount += Number.isFinite(status.mediaCount) ? status.mediaCount : 0;
    }

    if (frames.size === 0) {
      tabFrameStatus.delete(tabId);
    }
  }

  return {
    ok: true,
    enabled: settings.enabled,
    frameCount,
    mediaCount,
    speed: settings.speed
  };
}

async function getActiveTabStatus() {
  const [settings, tabId] = await Promise.all([readSettings(), getActiveTabId()]);

  if (!Number.isInteger(tabId)) {
    return {
      ok: false,
      reason: "no-active-tab",
      ...settings,
      frameCount: 0,
      mediaCount: 0
    };
  }

  return aggregateTabStatus(tabId, settings);
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureDefaultSettings().catch(async () => {
    await storageSet("local", DEFAULT_SETTINGS).catch(() => {});
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === MESSAGE_TYPES.MEDIA_COUNT_REPORT) {
    rememberFrameStatus(sender, message);
    sendResponse({ ok: true });
    return;
  }

  if (message?.type === MESSAGE_TYPES.GET_ACTIVE_TAB_STATUS) {
    (async () => {
      sendResponse(await getActiveTabStatus());
    })();
    return true;
  }
});

chrome.tabs.onRemoved?.addListener((tabId) => {
  tabFrameStatus.delete(tabId);
});

chrome.tabs.onUpdated?.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    tabFrameStatus.delete(tabId);
  }
});
