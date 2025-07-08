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

export const useSettingsStore = defineStore("settings", () => {
  const theme = ref<string>("");
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

  function setTheme(newTheme: string) {
    theme.value = newTheme;
    syncSettingsToBackground();
  }

  function setLanguage(newLang: string) {
    language.value = newLang;
    analytic.track("Target changed", { to: newLang });
    analytic.register({ target: newLang });
    syncSettingsToBackground();
  }

  async function initialize() {
    if (initialized.value) return;

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
      log("fetchSettingsFromBackground", response);
      if (
        response &&
        (response as any).type === MESSAGE_TYPE.SYNC_SETTINGS &&
        typeof (response as any).settings === "object" &&
        (response as any).settings
      ) {
        const settings = (response as any).settings as SettingsObject;
        if (settings.theme) theme.value = settings.theme;
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
        if (message.settings.theme) theme.value = message.settings.theme;
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
          if (newSettings.theme) theme.value = newSettings.theme;
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
    broadcastLanguageChange,
    syncSettingsToBackground,
    fetchSettingsFromBackground,
  };
});
