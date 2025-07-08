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

export {};

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
      tab?.id &&
        chrome.tabs.sendMessage(tab.id, {
          type: MESSAGE_TYPE.SYNC_SETTINGS,
          settings,
        });
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

      chrome.windows.create({
        url: chrome.runtime.getURL("popup.html") + "#/login",
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
      // Save settings and broadcast
      chrome.storage.local.set({ settings: request.settings }).then(() => {
        if (request.settings) broadcastSettings(request.settings);
        sendResponse({ status: true });
      });
    } else {
      // Return current settings
      chrome.storage.local.get("settings").then((data) => {
        const settings = new SettingsSyncMessage(data.settings);
        sendResponse(settings);
      });
    }
  }

  return true;
});
