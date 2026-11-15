import type {
  LangCode,
  LanguageCapabilities,
  LearningLanguageCaps,
} from "./types";
import { SUPPORTED_LANGUES } from "../static/langueges.static";

/**
 * Names for the seven launch languages, used when the capability register
 * (`get-language-capabilities`) has not answered yet. The register is the
 * source of truth; this is only a fallback so a picker never shows a bare code.
 */
export const LAUNCH_LANGUAGES: Array<{
  code: LangCode;
  name: string;
  nativeName: string;
}> = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  { code: "lt", name: "Lithuanian", nativeName: "Lietuvių" },
];

/**
 * THE one right-to-left list (E-09). Before round 1 there were two lists that
 * disagreed (`helper/text.ts` had Kurdish and Kashmiri, `LanguageDetector`
 * had Sindhi); every RTL check now reads this one.
 */
export const RTL_LANGUAGES: readonly string[] = [
  "ar", // Arabic
  "arc", // Aramaic
  "ckb", // Central Kurdish (Sorani)
  "dv", // Dhivehi
  "fa", // Persian
  "he", // Hebrew
  "iw", // Hebrew, legacy code
  "khw", // Khowar
  "ks", // Kashmiri
  "ku", // Kurdish (Arabic script is the common case in our data)
  "ps", // Pashto
  "sd", // Sindhi
  "ug", // Uyghur
  "ur", // Urdu
  "yi", // Yiddish
];

/** Primary subtag, lower case: "fa-IR" -> "fa". */
export function primaryCode(code?: string | null): string {
  return (code || "").trim().split(/[-_\s]/)[0].toLowerCase();
}

export function isRtlLanguage(code?: string | null): boolean {
  if (!code) return false;
  return RTL_LANGUAGES.includes(primaryCode(code));
}

export function textDirection(code?: string | null): "rtl" | "ltr" {
  return isRtlLanguage(code) ? "rtl" : "ltr";
}

/** The register entry for a learning language, if the register has it. */
export function findLearningCaps(
  caps: LanguageCapabilities | null | undefined,
  code?: string | null
): LearningLanguageCaps | undefined {
  if (!caps || !code) return undefined;
  const c = primaryCode(code);
  return caps.learning.find((l) => primaryCode(l.code) === c);
}

/**
 * The English name of a language: register first (learning, then own), then
 * the launch list, then the translate list, then the code in upper case.
 */
export function languageName(
  code: string | null | undefined,
  caps?: LanguageCapabilities | null
): string {
  if (!code) return "";
  const c = primaryCode(code);
  const fromCaps =
    caps?.learning.find((l) => primaryCode(l.code) === c) ||
    caps?.own.find((l) => primaryCode(l.code) === c);
  if (fromCaps?.name) return fromCaps.name;
  const launch = LAUNCH_LANGUAGES.find((l) => l.code === c);
  if (launch) return launch.name;
  const supported =
    SUPPORTED_LANGUES.find((l) => l.code.toLowerCase() === code.toLowerCase()) ||
    SUPPORTED_LANGUES.find((l) => l.code === c);
  if (supported) return supported.title;
  return code.toUpperCase();
}

/** The language's own name for itself ("Deutsch"), or "" when unknown. */
export function nativeLanguageName(
  code: string | null | undefined,
  caps?: LanguageCapabilities | null
): string {
  if (!code) return "";
  const c = primaryCode(code);
  const fromCaps =
    caps?.learning.find((l) => primaryCode(l.code) === c) ||
    caps?.own.find((l) => primaryCode(l.code) === c);
  if (fromCaps?.nativeName) return fromCaps.nativeName;
  return LAUNCH_LANGUAGES.find((l) => l.code === c)?.nativeName || "";
}

/**
 * Picker label, "German · Deutsch" (Q13). When the native name is the same as
 * the English one ("English"), only one is shown.
 */
export function pickerLabel(
  code: string | null | undefined,
  caps?: LanguageCapabilities | null
): string {
  const name = languageName(code, caps);
  const native = nativeLanguageName(code, caps);
  if (!native || native.toLowerCase() === name.toLowerCase()) return name;
  return `${name} · ${native}`;
}

/** The two-letter chip on the pill and the picker rows ("DE"). */
export function languageChip(code: string | null | undefined): string {
  return primaryCode(code).slice(0, 2).toUpperCase();
}
