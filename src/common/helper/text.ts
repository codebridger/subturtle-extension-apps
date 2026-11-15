import { TranslateService } from "../services/translate.service";
import { RTL_LANGUAGES, isRtlLanguage } from "../language/catalog";

export function firstUpper(word: string) {
  let parts = word.trim().split("");

  try {
    parts[0] = parts[0].toUpperCase();
  } catch (error) { }

  return parts.join("");
}

export function cleanText(text: string) {
  if (!text) return '';

  [
    "\\",
    ".",
    "+",
    "*",
    "?",
    "؟",
    "[",
    "^",
    "]",
    "$",
    "(",
    ")",
    "{",
    "}",
    "=",
    "!",
    "<",
    ">",
    "|",
    ":",
    "-",
    ",",
  ].forEach((remove) => {
    text = text.replaceAll(remove, " ");
  });

  return text.trim();
}

/**
 * Right-to-left language codes. Re-exported from the one list in
 * common/language/catalog.ts (E-09) so the subtitle surfaces keep their import.
 */
export const rtls = RTL_LANGUAGES;

/** Direction of the learner's own language (the translation side). */
export function getDir() {
  return isRtlLanguage(TranslateService.instance.targetLanguage) ? "rtl" : "ltr";
}
