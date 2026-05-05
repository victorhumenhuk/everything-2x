const {
  DEFAULT_SETTINGS,
  MESSAGE_TYPES,
  STORAGE_KEYS,
  formatSpeed,
  isApproximately,
  normalizeSettings
} = globalThis.Everything2xShared;

const connectionStatus = document.getElementById("connectionStatus");
const enabledText = document.getElementById("enabledText");
const enabledToggle = document.getElementById("enabledToggle");
const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");
const toggleLabel = document.getElementById("toggleLabel");
const applyNowButton = document.getElementById("applyNow");
const presetButtons = Array.from(document.querySelectorAll(".preset-button"));

let settings = { ...DEFAULT_SETTINGS };
let saveTimer = 0;

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

function runtimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(response);
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

async function writeSettings(nextSettings, options = {}) {
  const normalized = normalizeSettings(nextSettings);
  const values = { ...normalized };

  if (options.force) {
    values[STORAGE_KEYS.applyNowToken] = `${Date.now()}:${Math.random()}`;
  }

  try {
    await storageSet("sync", values);
  } catch {
    await storageSet("local", values);
  }

  return normalized;
}

function setStatusHtml(html, state = "ready") {
  connectionStatus.innerHTML = html;
  connectionStatus.dataset.state = state;
}

function setBusy(isBusy) {
  applyNowButton.disabled = isBusy;
}

function mediaNoun(count) {
  return count === 1 ? "media element" : "media elements";
}

function renderStatusFromResponse(response) {
  if (!response?.ok) {
    setStatusHtml("<strong>Idle</strong> — page cannot be controlled", "error");
    return;
  }

  const count = Number.isFinite(response.mediaCount) ? response.mediaCount : 0;
  const speed = formatSpeed(response.speed ?? settings.speed);

  if (count === 0) {
    setStatusHtml("<strong>Idle</strong> — no media on this page yet");
    return;
  }

  if (response.enabled === false) {
    setStatusHtml(
      `<strong>Disabled</strong> — ${count} ${mediaNoun(count)} found`
    );
    return;
  }

  setStatusHtml(
    `<strong>Ready</strong> — applying ${speed} to ${count} ${mediaNoun(count)}`
  );
}

async function refreshStatus() {
  const response = await runtimeMessage({
    type: MESSAGE_TYPES.GET_ACTIVE_TAB_STATUS
  });
  renderStatusFromResponse(response);
}

function render() {
  const speedLabel = formatSpeed(settings.speed);

  enabledToggle.checked = settings.enabled;
  enabledToggle.setAttribute("aria-checked", String(settings.enabled));
  speedSlider.value = String(settings.speed);
  speedSlider.setAttribute("aria-valuenow", String(settings.speed));
  speedSlider.setAttribute("aria-valuetext", speedLabel);
  speedValue.value = speedLabel;
  speedValue.textContent = speedLabel;
  enabledText.textContent = settings.enabled ? "Enabled" : "Disabled";
  toggleLabel.textContent = settings.enabled ? "Enabled" : "Disabled";

  for (const button of presetButtons) {
    const presetSpeed = Number(button.dataset.speed);
    const isSelected = isApproximately(presetSpeed, settings.speed);
    button.setAttribute("aria-pressed", String(isSelected));
  }
}

async function persistAndNotify(options = {}) {
  settings = await writeSettings(settings, options);
  render();
  await refreshStatus();
}

function schedulePersist() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void persistAndNotify().catch(() => {
      setStatusHtml("<strong>Ready</strong> — settings saved");
    });
  }, 150);
}

function commitSettings(nextSettings, options = {}) {
  settings = normalizeSettings(nextSettings);
  render();

  if (options.debounce) {
    schedulePersist();
    return;
  }

  window.clearTimeout(saveTimer);

  void persistAndNotify(options).catch(() => {
    setStatusHtml("<strong>Ready</strong> — settings saved");
  });
}

enabledToggle.addEventListener("change", () => {
  commitSettings(
    {
      ...settings,
      enabled: enabledToggle.checked
    },
    { force: true }
  );
});

speedSlider.addEventListener("input", () => {
  commitSettings(
    {
      ...settings,
      speed: speedSlider.value
    },
    { debounce: true }
  );
});

for (const button of presetButtons) {
  button.addEventListener("click", () => {
    commitSettings({
      ...settings,
      speed: button.dataset.speed
    });
  });
}

applyNowButton.addEventListener("click", async () => {
  window.clearTimeout(saveTimer);
  setBusy(true);
  setStatusHtml("<strong>Ready</strong> — applying now");

  try {
    await persistAndNotify({ force: true });
  } catch {
    setStatusHtml("<strong>Idle</strong> — page cannot be controlled", "error");
  } finally {
    setBusy(false);
  }
});

async function init() {
  setBusy(true);

  try {
    settings = await readSettings();
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }

  render();

  try {
    await refreshStatus();
  } catch {
    setStatusHtml("<strong>Idle</strong> — no media on this page yet");
  } finally {
    setBusy(false);
  }
}

void init();
