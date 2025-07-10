import { defineStore } from "pinia";
import { ref } from "vue";
import { analytic } from "../../plugins/mixpanel";
import { log } from "../helper/log";
import { sendMessage } from "../helper/massage";
import {
  SettingsSyncMessage,
  MESSAGE_TYPE,
  SettingsObject,
} from "../types/messaging";
import { Theme } from "../types/general.type";

export const useSettingsStore = defineStore("settings", () => {
  const theme = ref<Theme>("auto");
  const language = ref<string>("");
  const initialized = ref<boolean>(false);

  function broadcastLanguageChange(lang: string) {
    log("begin broadcastLanguageChange", lang);
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        let tabId = tabs[0]?.id;
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { target: lang });
          log("broadcastLanguageChange", lang);
        }
      });
    }
  }

  function applyThemeToDOM(themeValue: Theme) {
    document.documentElement.classList.remove("light", "dark");
    if (themeValue === "auto") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      document.documentElement.classList.add(prefersDark ? "dark" : "light");
    } else {
      document.documentElement.classList.add(themeValue);
    }
  }

  function setTheme(newTheme: Theme) {
    theme.value = newTheme;
    applyThemeToDOM(newTheme);
    localStorage.setItem("theme", newTheme);
    syncSettingsToBackground();
  }

  function initializeTheme() {
    const savedTheme = localStorage.getItem("theme") as Theme;
    theme.value = savedTheme;
    applyThemeToDOM(savedTheme);
  }

  function setLanguage(newLang: string) {
    language.value = newLang;
    analytic.track("Target changed", { to: newLang });
    analytic.register({ target: newLang });
    syncSettingsToBackground();
  }

  async function initialize() {
    if (initialized.value) return;

    initializeTheme();
    analytic.register({ target: language.value });
    await fetchSettingsFromBackground();
    initialized.value = true;
  }

  async function syncSettingsToBackground() {
    const settings: SettingsObject = {
      theme: theme.value,
      language: language.value,
    };
    try {
      await sendMessage(new SettingsSyncMessage(settings));
    } catch (e) {
      log("Failed to sync settings to background", e);
    }
  }

  async function fetchSettingsFromBackground() {
    try {
      const response = await sendMessage(new SettingsSyncMessage());

      if (
        response &&
        (response as any).type === MESSAGE_TYPE.SYNC_SETTINGS &&
        typeof (response as any).settings === "object" &&
        (response as any).settings
      ) {
        const settings = (response as any).settings as SettingsObject;
        if (settings.theme) {
          theme.value = settings.theme as Theme;
          applyThemeToDOM(settings.theme as Theme);
        }
        if (settings.language) language.value = settings.language;
      }
    } catch (e) {
      log("Failed to fetch settings from background", e);
    }
  }

  // Listen for SYNC_SETTINGS messages from background
  if (
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    chrome.runtime.onMessage
  ) {
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (message.type === MESSAGE_TYPE.SYNC_SETTINGS && message.settings) {
        if (message.settings.theme) {
          theme.value = message.settings.theme as Theme;
          applyThemeToDOM(message.settings.theme as Theme);
        }
        if (message.settings.language)
          language.value = message.settings.language;
      }
    });
  }

  // Listen for storage changes
  if (
    typeof chrome !== "undefined" &&
    chrome.storage &&
    chrome.storage.onChanged
  ) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local" && changes.settings) {
        const newSettings = changes.settings.newValue as SettingsObject;
        if (newSettings) {
          if (newSettings.theme) {
            theme.value = newSettings.theme as Theme;
            applyThemeToDOM(newSettings.theme as Theme);
          }
          if (newSettings.language) language.value = newSettings.language;
        }
      }
    });
  }

  return {
    theme,
    language,
    setTheme,
    setLanguage,
    initialize,
    initializeTheme,
    broadcastLanguageChange,
    syncSettingsToBackground,
    fetchSettingsFromBackground,
  };
});
