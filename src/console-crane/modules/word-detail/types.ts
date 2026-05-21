/** A reusable language pattern found inside the user's selection. */
export type Chunk = {
  /** The exact reusable pattern as it appears in the selection */
  text: string;
  /** Kind of pattern (collocation, phrasal_verb, idiom, discourse_marker, other) */
  type: string;
  /** Short explanation of the chunk's meaning/usage in the target language */
  definition?: string;
  /** Pronunciation of the chunk written in the target language alphabet */
  transliteration?: string;
  /** Model confidence that this is a useful learnable chunk (0-1) */
  confidence: number;
};

export type LinguisticData = {
  /** Whether the text is valid for translation */
  isValid: boolean;
  /** Classification of the text (noun, verb, idiom, phrasal verb, expression, etc.) */
  type: string;
  /** Clear explanation of meaning, contextualized to usage */
  definition: string;
  /** Phonetic guidance written in the target language alphabet */
  phonetic: {
    transliteration: string;
  };
  /** Indication of formality level */
  formality_level: "formal" | "neutral" | "informal";
};

export type LanguageLearningData = {
  phrase: string;
  context: string;
  // Whether the target language is RTL
  direction: {
    source: "ltr" | "rtl";
    target: "ltr" | "rtl";
  };
  /** Translations of the provided phrase and context */
  translation: {
    /** Translation of the provided phrase */
    phrase: string;
    /** Translation of the context */
    context: string;
  };
  /** Language information */
  language_info: {
    /** Source language code */
    source: string;
    /** Target language code */
    target: string;
  };
  /** Linguistic analysis data in target language */
  linguistic_data: LinguisticData;
  /** Reusable patterns found inside the selection (cap 2; empty for short/cross-language). */
  chunks: Chunk[];
};

/** Result of the per-page bundle suggestion call. */
export type BundleSuggestion = {
  matchedBundle: { _id: string; title: string } | null;
  suggestedName: string | null;
};

/** Response shape of the translationAdvice RPC. */
export type TranslationAdvice = {
  /** Plain-text answer to the user's question, when they asked for advice. */
  reply?: string;
  /** Updated chunks, when the user asked to change the highlighted patterns. */
  chunks?: Chunk[];
};
