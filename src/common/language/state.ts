import {
  LAUNCH_LANGUAGES,
  findLearningCaps,
  languageName,
  primaryCode,
} from "./catalog";
import type {
  LangCode,
  LanguageCapabilities,
  LanguageState,
  LanguageSummary,
} from "./types";

/**
 * Pure rules for round 1 (no Vue, no network), so they are easy to test.
 * The profile store, the popup and the save window all read these.
 */

/**
 * Dark launch (E-12): the new pill and save row show only when the server
 * answered `get-language-state` with an active language. Anything else (an old
 * server without the function, a new account before its first language) keeps
 * today's English-only behaviour.
 */
export function isMultilingualState(
  state: LanguageState | null | undefined
): state is LanguageState {
  if (!state || !state.learningLanguage || !Array.isArray(state.languages)) {
    return false;
  }
  return state.languages.some((l) => l.status === "active");
}

/** Languages the learner can switch to and save into (not paused or removed). */
export function activeLanguages(
  state: LanguageState | null | undefined
): LanguageSummary[] {
  if (!state?.languages) return [];
  return state.languages.filter((l) => l.status === "active");
}

/** The summary row of the active language. */
export function activeSummary(
  state: LanguageState | null | undefined
): LanguageSummary | undefined {
  if (!state?.learningLanguage) return undefined;
  const code = primaryCode(state.learningLanguage);
  return state.languages.find((l) => primaryCode(l.code) === code);
}

export function hasLanguage(
  state: LanguageState | null | undefined,
  code: string | null | undefined
): boolean {
  if (!code) return false;
  const c = primaryCode(code);
  return activeLanguages(state).some((l) => primaryCode(l.code) === c);
}

/**
 * The learner's own language, the one translations are written in (E-01, E-02).
 *
 * - Signed in and the server knows it: the server profile wins. English is a
 *   valid own language (a German learner whose own language is English).
 * - Otherwise (signed out, or an old server): the local value, which the
 *   background guessed from the browser on install or the learner picked.
 */
export function resolveTranslationLanguage(input: {
  signedIn: boolean;
  state: LanguageState | null | undefined;
  localLanguage: string | null | undefined;
}): string {
  if (input.signedIn && input.state?.translationLanguage) {
    return input.state.translationLanguage;
  }
  return input.localLanguage || "";
}

/** "Starting at A2" (never "Your level", Q12). */
export function startingAt(summary: LanguageSummary | undefined): string {
  return summary?.startLevel ? `Starting at ${summary.startLevel}` : "";
}

/** "7 German phrases are due" (E-04). */
export function dueLine(
  summary: LanguageSummary | undefined,
  caps?: LanguageCapabilities | null
): string {
  if (!summary) return "";
  const name = languageName(summary.code, caps);
  const n = Math.max(0, summary.dueCount || 0);
  if (n === 0) return `No ${name} phrases are due`;
  if (n === 1) return `1 ${name} phrase is due`;
  return `${n} ${name} phrases are due`;
}

/** "Starting at A1 · 7 due · 38 phrases" under each picker row. */
export function pickerMeta(summary: LanguageSummary): string {
  const parts = [startingAt(summary)];
  parts.push(`${summary.dueCount || 0} due`);
  const p = summary.phraseCount || 0;
  parts.push(`${p} ${p === 1 ? "phrase" : "phrases"}`);
  return parts.filter(Boolean).join(" · ");
}

export interface PlanLimit {
  used: number;
  max: number;
  atLimit: boolean;
  /** "2 of 10 used" */
  usedText: string;
  /** The card text at the limit; "" below it. */
  limitText: string;
  /** "See plans" (Starter) or "Upgrade". */
  upgradeLabel: string;
  /** Reader and above can remove a language instead. */
  canManage: boolean;
}

/** The plan limit in the popup list (E-14, Q14). */
export function planLimit(state: LanguageState | null | undefined): PlanLimit {
  const used = activeLanguages(state).length;
  const max = Math.max(1, state?.maxLanguages || 1);
  const plan = state?.plan || "starter";
  const atLimit = used >= max;
  let limitText = "";
  if (atLimit) {
    if (plan === "starter") {
      limitText =
        "Starter includes 1 language. To learn another, go Reader (3 languages) or Learner (10).";
    } else if (plan === "reader") {
      limitText = `You use ${used} of ${max} languages on Reader. For up to 10, go Learner. Or remove one.`;
    } else {
      limitText = `You use ${used} of ${max} languages. Remove one to add another.`;
    }
  }
  return {
    used,
    max,
    atLimit,
    usedText: `${used} of ${max} used`,
    limitText,
    upgradeLabel: plan === "starter" ? "See plans" : "Upgrade",
    canManage: plan !== "starter",
  };
}

/** Dashboard paths the extension opens (Q7). Hash-mode routes. */
export const DASHBOARD_PATHS = {
  board: "/board",
  languages: "/settings/languages",
  subscription: "/settings/subscription",
  profile: "/settings/profile",
};

/** `/settings/languages/add?language=de&from=extension` (Q7). */
export function addLanguagePath(language?: string | null): string {
  const params = new URLSearchParams();
  if (language) params.set("language", primaryCode(language));
  params.set("from", "extension");
  return `/settings/languages/add?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Save window language row (E-05, E-06)
// ---------------------------------------------------------------------------

/**
 * - active:  the detected language is the active one.
 * - other:   another language the learner studies; it saves there and the
 *            active language does not change.
 * - missing: a learning language the learner has not added. Two choices:
 *            "Save to <active>" or "Keep for <detected>" (Q6).
 * - unknown: no usable detection (own-language text, a language we do not
 *            teach): it saves to the active language, shown on the row.
 * - chosen:  the learner picked a language for this phrase with Change.
 */
export type SaveRowKind = "active" | "other" | "missing" | "unknown" | "chosen";

export interface SaveRow {
  kind: SaveRowKind;
  /** The detected language, when known. */
  detected: LangCode | null;
  /** Where Save writes; null while the learner must choose (missing). */
  target: LangCode | null;
  /** The active language. */
  active: LangCode;
}

export function resolveSaveRow(input: {
  state: LanguageState;
  caps?: LanguageCapabilities | null;
  detected?: string | null;
  /** The language the learner picked for this phrase, if any. */
  override?: string | null;
}): SaveRow {
  const active = primaryCode(input.state.learningLanguage);
  const detected = input.detected ? primaryCode(input.detected) : null;

  if (input.override && hasLanguage(input.state, input.override)) {
    return {
      kind: "chosen",
      detected,
      target: primaryCode(input.override),
      active,
    };
  }

  if (detected && hasLanguage(input.state, detected)) {
    return {
      kind: detected === active ? "active" : "other",
      detected,
      target: detected,
      active,
    };
  }

  if (detected && isOfferedLearningLanguage(detected, input.caps)) {
    // A paused language is already the learner's: keeping a phrase for it
    // would never join, so it falls through to "unknown" (saves to active,
    // shown on the row, and Change is there).
    const paused = input.state.languages.some(
      (l) => primaryCode(l.code) === detected && l.status === "paused"
    );
    if (!paused) return { kind: "missing", detected, target: null, active };
  }

  return { kind: "unknown", detected, target: active, active };
}

/**
 * A language the learner could add: in the register, switched on, with saving
 * ready. Before the register answers, the seven launch languages count.
 */
export function isOfferedLearningLanguage(
  code: string,
  caps?: LanguageCapabilities | null
): boolean {
  const c = primaryCode(code);
  if (caps && caps.learning.length) {
    const entry = findLearningCaps(caps, c);
    return !!entry && entry.enabled && entry.features?.save !== false;
  }
  return LAUNCH_LANGUAGES.some((l) => l.code === c);
}

/** The row's two text lines for each state (copy from the UX spec). */
export function saveRowCopy(
  row: SaveRow,
  caps?: LanguageCapabilities | null
): { title: string; detail: string } {
  const detectedName = languageName(row.detected, caps);
  const targetName = languageName(row.target, caps);
  const activeName = languageName(row.active, caps);
  switch (row.kind) {
    case "active":
      return {
        title: `${detectedName} · detected`,
        detail: `Saves to your ${targetName} profile`,
      };
    case "other":
      return {
        title: `${detectedName} · detected`,
        detail: `Saves to your ${targetName} profile. You stay in ${activeName}.`,
      };
    case "missing":
      return {
        title: `This looks like ${detectedName}`,
        detail: `${detectedName} is not in your languages yet`,
      };
    case "chosen":
      return {
        title: `Saves to ${targetName}`,
        detail: `You chose ${targetName} for this phrase`,
      };
    default:
      return {
        title: `Saves to ${targetName}`,
        detail: `Saves to your ${targetName} profile`,
      };
  }
}

/**
 * Mongo filter for "documents in this language". Stored documents with no
 * `language` are English (ADR-006), so an English query also matches them
 * until the backfill has run everywhere.
 */
export function languageFilter(language: string): unknown {
  const c = primaryCode(language);
  return c === "en" ? { $in: ["en", null] } : c;
}
