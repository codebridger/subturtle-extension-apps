import { languageName } from "./catalog";
import type { LangCode, LanguageCapabilities } from "./types";

/**
 * Result states of the save window (design SaveWindow X6, X7, X8).
 *
 * - saved:         a normal save to the detected, active or chosen language.
 * - savedInstead:  "Save to English" for a language the learner has not added
 *                  (X8). Undo returns to the two choices.
 * - kept:          "Keep for German" (X7): held on the server for 30 days, it
 *                  joins German when the learner adds it. Undo returns to the
 *                  two choices.
 */
export type SaveOutcomeKind = "saved" | "savedInstead" | "kept";

export interface SaveOutcome {
  kind: SaveOutcomeKind;
  /** Where it went (saved) or what it waits for (kept). */
  language: LangCode;
  /** Bundle titles it was saved to (saved, savedInstead). */
  bundleTitles?: string[];
  /** Bundle ids it was added to, for Undo. */
  bundleIds?: string[];
  /** The phrase document, for Undo and practice. */
  phraseId?: string;
}

export function saveOutcomeCopy(
  outcome: SaveOutcome,
  phrase: string,
  caps?: LanguageCapabilities | null
): { title: string; text: string; canUndo: boolean } {
  const lang = languageName(outcome.language, caps);
  const quoted = `"${phrase}"`;
  const bundles = (outcome.bundleTitles || []).filter(Boolean).join(", ");
  const savedTo = bundles ? `Saved to ${bundles} · ${lang}` : `Saved · ${lang}`;

  if (outcome.kind === "kept") {
    return {
      title: `Kept for ${lang}`,
      text: `${quoted} waits for ${lang}. Add ${lang} on your dashboard and it joins your ${lang} review. We keep it for 30 days.`,
      canUndo: true,
    };
  }
  if (outcome.kind === "savedInstead") {
    return {
      title: savedTo,
      text: `${quoted} is in your ${lang} phrases, as you chose. You can move it later from the bundle.`,
      canUndo: true,
    };
  }
  return {
    title: savedTo,
    text: `${quoted} is in your ${lang} review. Keep watching. It will be waiting on Today.`,
    canUndo: false,
  };
}
