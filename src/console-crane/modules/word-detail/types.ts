export type Example = {
  /** Example sentence showing the text in use */
  source: string;
  /** Translation of the example sentence */
  target: string;
};

export type RelatedExpression = {
  /** Related word or expression */
  source: string;
  /** Translation of the related expression */
  target: string;
};

export type LinguisticData = {
  /** Whether the text is valid for translation */
  isValid: boolean;
  /** Classification of the text (noun, verb, idiom, phrasal verb, expression, etc.) */
  type: string;
  /** Clear explanation of meaning, contextualized to usage */
  definition: string;
  /** Information about how and when to use this text */
  // usage_notes: string;
  /** Phonetic guidance (especially for non-Latin script languages) */
  pronunciation: string;
  /** Indication of formality level */
  formality_level: "formal" | "neutral" | "informal";
  /** When the literal meaning differs significantly from idiomatic usage */
  // literal_translation: string;
  /** Cultural context important for proper understanding */
  // cultural_notes: string;
  /** Additional grammatical information when relevant */
  // grammar_notes: string;
  /** Example sentences showing the text in use, with translations */
  examples: Example[];
  /** Similar or connected expressions with translations */
  related_expressions: RelatedExpression[];
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
};
