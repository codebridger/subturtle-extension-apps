import { SUPPORTED_LANGUES } from "../static/langueges.static";
import { SettingsObject } from "../types/messaging";

/**
 * First-run guess of the learner's own language (the language translations
 * are written in), for signed-out learners only.
 *
 * Round 1 (E-01, E-02): a signed-in learner's own language comes from the
 * server profile (`get-language-state` → `translationLanguage`), and
 * TranslateService prefers it over this local value. The local value is only
 * the signed-out fallback, and the value an old server (no language profile
 * yet) keeps using.
 *
 * English is a valid own language: a learner can pick it, and a server profile
 * that says "en" is used as is (a German learner whose own language is
 * English). Only the *guess* skips an English browser UI, because an English
 * UI says nothing about the learner's own language: most learners of English
 * run Chrome in English. If nothing non-English is found the language stays
 * unset, the popup shows a placeholder and the translate service refuses to
 * send a request (see TranslateService.requireLanguageTitle) instead of
 * sending null.
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
