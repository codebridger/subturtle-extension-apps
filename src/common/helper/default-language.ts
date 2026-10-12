import { SUPPORTED_LANGUES } from "../static/langueges.static";
import { SettingsObject } from "../types/messaging";

/**
 * First-run target-language resolution.
 *
 * Until the user picks a language in the popup, `settings.language` used to be
 * absent, so `TranslateService.languageTitle` was null and translateWithContext
 * went out with `targetLanguage: null` — the server then answered in whatever
 * language it guessed (Spanish, in the 2026-10-12 report) while the popup's
 * select showed "English" because that was its hard-coded initial value.
 *
 * Subturtle teaches English, so English is never a sensible *target*: an
 * English UI language tells us nothing about the learner's own language and is
 * skipped. If nothing non-English is found the language stays unset, the popup
 * shows a placeholder and the translate service refuses to send a request
 * (see TranslateService.requireLanguageTitle) instead of sending null.
 *
 * The account profile has no language field yet (dashboard `profile` module);
 * when it gets one, pass it as the first candidate.
 */

/** Map a BCP-47 tag (`pt-BR`, `zh-TW`, `iw`) to a code in SUPPORTED_LANGUES. */
export function toSupportedLanguageCode(tag?: string | null): string | null {
  if (!tag) return null;
  const trimmed = tag.trim();
  if (!trimmed) return null;

  const exact = SUPPORTED_LANGUES.find(
    (l) => l.code.toLowerCase() === trimmed.toLowerCase()
  );
  if (exact) return exact.code;

  const primary = trimmed.split(/[-_\s]/)[0].toLowerCase();
  // Chinese needs the script/region to pick Simplified vs Traditional.
  if (primary === "zh") {
    return /-(tw|hk|mo|hant)\b/i.test(trimmed) ? "zh-TW" : "zh-CN";
  }
  // Legacy ISO code for Hebrew that Chrome still reports on some systems.
  if (primary === "iw") return "he";

  const match = SUPPORTED_LANGUES.find((l) => l.code === primary);
  return match ? match.code : null;
}

/**
 * Pick the first candidate that maps to a supported, non-English language.
 * Candidates are in priority order (stored value, legacy key, UI languages).
 */
export function pickDefaultTargetLanguage(
  candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    const code = toSupportedLanguageCode(candidate);
    if (code && code !== "en") return code;
  }
  return null;
}

/** The browser's UI language(s), most preferred first. Works in the SW too. */
export function getBrowserUiLanguages(): string[] {
  const list: string[] = [];
  try {
    const ui = chrome?.i18n?.getUILanguage?.();
    if (ui) list.push(ui);
  } catch (_e) {
    // chrome.i18n is missing outside the extension — fall through.
  }
  if (typeof navigator !== "undefined") {
    if (Array.isArray(navigator.languages)) list.push(...navigator.languages);
    else if (navigator.language) list.push(navigator.language);
  }
  return list;
}

/**
 * Background-side: make sure `chrome.storage.local.settings.language` holds a
 * supported language, resolving and persisting a default when it doesn't.
 * Returns the (possibly updated) settings, or undefined when there was nothing
 * stored and nothing could be resolved.
 *
 * Called on install and whenever a content script / the popup asks for
 * settings, so a fresh install never answers with an empty language.
 */
export async function ensureStoredTargetLanguage(
  uiLanguages: string[] = getBrowserUiLanguages()
): Promise<SettingsObject | undefined> {
  const data = await chrome.storage.local.get(["settings", "target"]);
  const settings = data.settings as SettingsObject | undefined;

  const current = toSupportedLanguageCode(settings?.language);
  if (current) {
    // Repair codes that only exist in older builds (e.g. "he or iw").
    if (settings && current !== settings.language) {
      const repaired = { ...settings, language: current };
      await chrome.storage.local.set({ settings: repaired });
      return repaired;
    }
    return settings;
  }

  const language = pickDefaultTargetLanguage([
    // Builds before the settings store kept the choice under `target`.
    data.target as string | undefined,
    ...uiLanguages,
  ]);
  if (!language) return settings;

  const next: SettingsObject = {
    theme: settings?.theme || "dark",
    nibbleDisabledDomains: settings?.nibbleDisabledDomains || [],
    ...settings,
    language,
  };
  await chrome.storage.local.set({ settings: next });
  return next;
}
