/**
 * Multilingual round 1: the shapes the server's `language` module returns.
 *
 * Copied from the API contract (`subturtle-doc/docs/tech/multilingual-api.md`,
 * section 1). Kept here instead of importing from the sibling dashboard repo:
 * CI clones the dashboard's default branch, which does not have these types
 * until the round ships. Do not rename fields; the server sends exactly these.
 */

/** ISO 639-1 code: "de", "fa", ... */
export type LangCode = string;
export type CefrStart = "A1" | "A2" | "B1" | "B2";
export type LanguageStatus = "active" | "paused" | "removed" | "purging";
export type Plan = "starter" | "reader" | "learner" | "coach";

export interface LanguageFeatures {
  save: boolean;
  review: boolean;
  cloze: boolean;
  coachText: boolean;
  coachVoice: boolean;
  levelTest: boolean;
  starterPack: boolean;
  map: boolean;
}

/** One learning language in the capability register. */
export interface LearningLanguageCaps {
  code: LangCode;
  name: string;
  nativeName: string;
  rtl: boolean;
  ttsVoice: string;
  /** Switched on for learners. */
  enabled: boolean;
  features: LanguageFeatures;
}

/** One own language (the language translations and explanations are in). */
export interface OwnLanguage {
  code: LangCode;
  name: string;
  nativeName: string;
  rtl: boolean;
  explanationReviewed: "teacher" | "ai";
}

export interface LanguageCapabilities {
  learning: LearningLanguageCaps[];
  own: OwnLanguage[];
}

/** One row of the switcher. */
export interface LanguageSummary {
  code: LangCode;
  status: LanguageStatus;
  startLevel: CefrStart;
  startLevelSource: "test" | "default";
  dueCount: number;
  phraseCount: number;
  explanationLanguage: LangCode;
  starterPack: {
    state: "none" | "offered" | "in_progress" | "done" | "skipped";
    heard: number;
    total: number;
  };
  /** ISO date, when status = removed. */
  purgeAt?: string;
}

export interface PendingPhrases {
  language: LangCode;
  count: number;
  expiresAt: string;
}

/** `get-language-state` result. */
export interface LanguageState {
  /** The learner's own language (L1). */
  translationLanguage: LangCode | null;
  /** The active learning language; null before the first run. */
  learningLanguage: LangCode | null;
  /** Active + paused + removed (not purging). */
  languages: LanguageSummary[];
  onboardingState: "needs_language" | "done";
  plan: Plan;
  /** Starter 1, Reader 3, Learner and Coach 10. */
  maxLanguages: number;
  pending: PendingPhrases[];
}

/** What `createPhrase` adds to its reply in round 1. */
export interface CreatePhraseLanguageReply {
  language?: LangCode;
  languageSource?: string;
}

/** What `translateWithContext` adds to its reply in round 1 (B-14). */
export interface TranslationLanguageReply {
  detectedLanguage?: LangCode | null;
  resolvedLanguage?: LangCode | null;
  inProfile?: boolean;
}

/** `keep-phrase-pending` result. */
export interface KeepPhrasePendingReply {
  phraseId: string;
  expiresAt: string;
}
