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
  const theme = ref<Theme>("dark");
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

  let scopeObserver: MutationObserver | null = null;
  let currentEffectiveTheme: "dark" | "light" = "dark";

  function resolveTheme(themeValue: Theme): "dark" | "light" {
    if (themeValue === "auto") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return themeValue;
  }

  function applyToScopeElement(el: Element) {
    el.classList.remove("light", "dark");
    el.classList.add(currentEffectiveTheme);
  }

  // The `dark` class lives on every `.subturtle-scope` element rather than
  // `<html>`, because postcss-prefix-selector rewrites Tailwind's dark rules to
  // the compound form `.subturtle-scope.dark ...` — so the same element must
  // carry both classes for dark utilities to take effect.
  function applyThemeToDOM(themeValue: Theme) {
    currentEffectiveTheme = resolveTheme(themeValue);

    document
      .querySelectorAll(".subturtle-scope")
      .forEach(applyToScopeElement);

    // Vue teleports (e.g. WordSelectionRectangle, the YouTube caption
    // container) mount `.subturtle-scope` wrappers after this initial pass,
    // so an observer keeps later additions in sync with the active theme.
    if (!scopeObserver && typeof MutationObserver !== "undefined") {
      scopeObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          m.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            if (node.classList?.contains("subturtle-scope")) {
              applyToScopeElement(node);
            }
            node
              .querySelectorAll?.(".subturtle-scope")
              .forEach(applyToScopeElement);
          });
        }
      });
      scopeObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  function setTheme(newTheme: Theme) {
    theme.value = newTheme;
    applyThemeToDOM(newTheme);
    localStorage.setItem("theme", newTheme);

    syncSettingsToBackground();

    analytic.track("theme_changed");
  }

  function initializeTheme() {
    const savedTheme = localStorage.getItem("theme") as Theme;
    theme.value = savedTheme || "dark";
    applyThemeToDOM(savedTheme || "dark");
  }

  function setLanguage(newLang: string) {
    language.value = newLang;

    syncSettingsToBackground();

    analytic.track("target-language_changed");
  }

  async function initialize() {
    if (initialized.value) return;

    initializeTheme();
    await fetchSettingsFromBackground();
    initialized.value = true;
  }

  async function syncSettingsToBackground() {
    const settings: SettingsObject = {
      theme: theme.value,
      language: language.value,
    };

    analytic.register({ target_language: language.value, theme: theme.value });

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

        analytic.register({
          target_language: language.value,
          theme: theme.value,
        });
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
