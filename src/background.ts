import { log } from "./common/helper/log";
import {
  GetLoginStatusMessage,
  GetCurrentChromeUserToken,
  OpenLoginWindowMessage,
  StoreUserTokenMessage,
  SettingsSyncMessage,
  SettingsObject,
  MESSAGE_TYPE,
} from "./common/types/messaging";
import { ensureStoredTargetLanguage } from "./common/helper/default-language";

export {};

// Resolve the learner's target language once on install/update so content
// scripts never start with an empty one (see default-language.ts).
chrome.runtime.onInstalled.addListener(() => {
  ensureStoredTargetLanguage().catch((e) =>
    log("background: failed to resolve default language", e)
  );
});

function getOAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, function (token) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}

function getScreenSize() {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    chrome.windows.getCurrent((window) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve({ width: window.width || 0, height: window.height || 0 });
      }
    });
  });
}

function broadcastSettings(settings: SettingsObject) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (!tab?.id) continue;
      // Tabs without our content script (chrome://, web store, freshly
      // installed pre-extension tabs, etc.) reject with "Receiving end does
      // not exist". That's expected for a fire-and-forget broadcast.
      // Cast: @types/chrome@0.0.193 still types tabs.sendMessage as void;
      // in MV3 the no-callback overload returns a Promise.
      (
        chrome.tabs.sendMessage(tab.id, {
          type: MESSAGE_TYPE.SYNC_SETTINGS,
          settings,
        }) as unknown as Promise<unknown>
      ).catch(() => {});
    }
  });
}

chrome.runtime.onMessage.addListener(function (request, _sender, sendResponse) {
  log("background: onMessage", request);

  // Get login status
  if (GetLoginStatusMessage.is(request)) {
    chrome.storage.sync.get("token").then(({ token }) => {
      sendResponse({ status: !!token, token: token || null });
    });
  }

  // Store user token
  else if (StoreUserTokenMessage.is(request)) {
    if (request.token === null) {
      chrome.storage.sync.remove("token").then(() => {
        sendResponse({ status: true });
      });
    } else {
      chrome.storage.sync.set({ token: request.token }).then(() => {
        sendResponse({ status: true });
      });
    }
  }

  // Get current chrome user token
  if (GetCurrentChromeUserToken.is(request)) {
    getOAuthToken()
      .then((token) => {
        sendResponse({ status: !!token, token: token || null });
      })
      .catch((err) => {
        sendResponse({ status: false, token: null });
      });
  }

  // Open Login popup
  else if (OpenLoginWindowMessage.is(request)) {
    getScreenSize().then((screen) => {
      const width = 500;
      const height = 600;

      const left = screen.width / 2 - width / 2;
      const top = screen.height / 2 - height / 2;

      // The login source rides on the hash route's query (E-03).
      const query = request.source
        ? `?source=${encodeURIComponent(request.source)}`
        : "";

      chrome.windows.create({
        url: chrome.runtime.getURL("popup.html") + "#/login" + query,
        type: "popup",
        width: width,
        height: height,
        focused: true,
        left: Math.round(left),
        top: Math.round(top),
      });
    });
  }

  // Handle SYNC_SETTINGS
  else if (SettingsSyncMessage.is(request)) {
    if (request.settings) {
      // Save settings and broadcast. A sender whose store hasn't loaded the
      // language yet (e.g. a theme change racing the first fetch) posts an
      // empty one — keep the stored language instead of wiping it.
      const incoming = request.settings;
      chrome.storage.local
        .get("settings")
        .then((data) => {
          const stored = data.settings as SettingsObject | undefined;
          const merged: SettingsObject = {
            ...incoming,
            language: incoming.language || stored?.language || "",
          };
          return chrome.storage.local
            .set({ settings: merged })
            .then(() => merged);
        })
        .then((merged) => {
          broadcastSettings(merged);
          sendResponse({ status: true });
        });
    } else {
      // Return current settings, resolving a default target language first
      // when none is stored yet (fresh install, or onInstalled raced us).
      ensureStoredTargetLanguage()
        .catch(() =>
          chrome.storage.local
            .get("settings")
            .then((data) => data.settings as SettingsObject | undefined)
        )
        .then((stored) => {
          sendResponse(new SettingsSyncMessage(stored));
        });
    }
  }

  return true;
});
