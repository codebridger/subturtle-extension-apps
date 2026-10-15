import { describe, it, expect } from "vitest";
import {
  activeLanguages,
  addLanguagePath,
  dueLine,
  isMultilingualState,
  languageFilter,
  pickerMeta,
  planLimit,
  resolveSaveRow,
  resolveTranslationLanguage,
  saveRowCopy,
  startingAt,
} from "../src/common/language/state";
import type {
  LanguageCapabilities,
  LanguageState,
  LanguageSummary,
} from "../src/common/language/types";

function summary(code: string, extra: Partial<LanguageSummary> = {}): LanguageSummary {
  return {
    code,
    status: "active",
    startLevel: "A1",
    startLevelSource: "default",
    dueCount: 0,
    phraseCount: 0,
    explanationLanguage: "fa",
    starterPack: { state: "none", heard: 0, total: 0 },
    ...extra,
  };
}

// Sara (UX spec): Persian speaker, English B1 and German A1, German active.
function sara(extra: Partial<LanguageState> = {}): LanguageState {
  return {
    translationLanguage: "fa",
    learningLanguage: "de",
    languages: [
      summary("en", { startLevel: "B1", dueCount: 12, phraseCount: 142 }),
      summary("de", { dueCount: 7, phraseCount: 38 }),
    ],
    onboardingState: "done",
    plan: "learner",
    maxLanguages: 10,
    pending: [],
    ...extra,
  };
}

const caps: LanguageCapabilities = {
  learning: ["en", "es", "de", "fr", "it", "sv", "lt"].map((code) => ({
    code,
    name: { en: "English", es: "Spanish", de: "German", fr: "French", it: "Italian", sv: "Swedish", lt: "Lithuanian" }[code]!,
    nativeName: code,
    rtl: false,
    ttsVoice: "",
    enabled: code !== "lt",
    features: { save: true, review: true, cloze: true, coachText: true, coachVoice: true, levelTest: true, starterPack: false, map: false },
  })),
  own: [],
};

describe("dark launch gate (E-12)", () => {
  it("is off when the server has no language state", () => {
    expect(isMultilingualState(null)).toBe(false);
    expect(isMultilingualState(undefined)).toBe(false);
  });

  it("is off before the first language (new account)", () => {
    expect(
      isMultilingualState(
        sara({ learningLanguage: null, languages: [], onboardingState: "needs_language" })
      )
    ).toBe(false);
  });

  it("is off when every language is paused or removed", () => {
    expect(
      isMultilingualState(
        sara({ languages: [summary("de", { status: "paused" })] })
      )
    ).toBe(false);
  });

  it("is on with an active language", () => {
    expect(isMultilingualState(sara())).toBe(true);
  });
});

describe("own language resolution (E-01, E-02)", () => {
  it("prefers the server profile when signed in", () => {
    expect(
      resolveTranslationLanguage({ signedIn: true, state: sara(), localLanguage: "ar" })
    ).toBe("fa");
  });

  it("allows English as the own language from the server", () => {
    expect(
      resolveTranslationLanguage({
        signedIn: true,
        state: sara({ translationLanguage: "en" }),
        localLanguage: "fa",
      })
    ).toBe("en");
  });

  it("keeps the local guess for signed-out learners", () => {
    expect(
      resolveTranslationLanguage({ signedIn: false, state: sara(), localLanguage: "ar" })
    ).toBe("ar");
  });

  it("falls back to the local value on an old server", () => {
    expect(
      resolveTranslationLanguage({ signedIn: true, state: null, localLanguage: "tr" })
    ).toBe("tr");
  });

  it("falls back to the local value when the profile has no own language yet", () => {
    expect(
      resolveTranslationLanguage({
        signedIn: true,
        state: sara({ translationLanguage: null }),
        localLanguage: "vi",
      })
    ).toBe("vi");
  });
});

describe("popup copy (E-03, E-04)", () => {
  it("says Starting at, never Your level", () => {
    expect(startingAt(summary("de", { startLevel: "A2" }))).toBe("Starting at A2");
  });

  it("writes the due line", () => {
    expect(dueLine(summary("de", { dueCount: 7 }), caps)).toBe("7 German phrases are due");
    expect(dueLine(summary("de", { dueCount: 1 }), caps)).toBe("1 German phrase is due");
    expect(dueLine(summary("de", { dueCount: 0 }), caps)).toBe("No German phrases are due");
  });

  it("writes the picker meta line", () => {
    expect(pickerMeta(summary("de", { dueCount: 7, phraseCount: 38 }))).toBe(
      "Starting at A1 · 7 due · 38 phrases"
    );
  });

  it("lists only active languages in the switcher", () => {
    const state = sara({
      languages: [summary("en"), summary("de", { status: "paused" }), summary("es", { status: "removed" })],
    });
    expect(activeLanguages(state).map((l) => l.code)).toEqual(["en"]);
  });
});

describe("plan limit (E-14)", () => {
  it("counts against the plan below the limit", () => {
    const limit = planLimit(sara());
    expect(limit).toMatchObject({ used: 2, max: 10, atLimit: false, usedText: "2 of 10 used" });
  });

  it("Starter: one language, See plans, no Manage", () => {
    const limit = planLimit(
      sara({ plan: "starter", maxLanguages: 1, languages: [summary("en")], learningLanguage: "en" })
    );
    expect(limit.atLimit).toBe(true);
    expect(limit.upgradeLabel).toBe("See plans");
    expect(limit.canManage).toBe(false);
    expect(limit.limitText).toContain("Starter includes 1 language");
  });

  it("Reader at 3 of 3: Upgrade or Manage", () => {
    const limit = planLimit(
      sara({ plan: "reader", maxLanguages: 3, languages: [summary("en"), summary("de"), summary("es")] })
    );
    expect(limit.atLimit).toBe(true);
    expect(limit.upgradeLabel).toBe("Upgrade");
    expect(limit.canManage).toBe(true);
    expect(limit.limitText).toBe(
      "You use 3 of 3 languages on Reader. For up to 10, go Learner. Or remove one."
    );
  });
});

describe("dashboard deep link (Q7)", () => {
  it("adds a language from the extension", () => {
    expect(addLanguagePath("de")).toBe("/settings/languages/add?language=de&from=extension");
  });

  it("works without a language", () => {
    expect(addLanguagePath()).toBe("/settings/languages/add?from=extension");
  });

  it("uses the primary code", () => {
    expect(addLanguagePath("de-AT")).toBe("/settings/languages/add?language=de&from=extension");
  });
});

describe("save row states (E-05, E-06)", () => {
  it("active: the detected language is the active one", () => {
    const row = resolveSaveRow({ state: sara(), caps, detected: "de" });
    expect(row).toEqual({ kind: "active", detected: "de", target: "de", active: "de" });
    expect(saveRowCopy(row, caps)).toEqual({
      title: "German · detected",
      detail: "Saves to your German profile",
    });
  });

  it("other: saves to another language the learner has, active stays", () => {
    const row = resolveSaveRow({ state: sara(), caps, detected: "en" });
    expect(row.kind).toBe("other");
    expect(row.target).toBe("en");
    expect(saveRowCopy(row, caps).detail).toBe(
      "Saves to your English profile. You stay in German."
    );
  });

  it("missing: a learning language not added has no target until the learner chooses", () => {
    const row = resolveSaveRow({ state: sara(), caps, detected: "es" });
    expect(row).toEqual({ kind: "missing", detected: "es", target: null, active: "de" });
    expect(saveRowCopy(row, caps)).toEqual({
      title: "This looks like Spanish",
      detail: "Spanish is not in your languages yet",
    });
  });

  it("missing works before the register answers (launch list)", () => {
    expect(resolveSaveRow({ state: sara(), caps: null, detected: "fr" }).kind).toBe("missing");
  });

  it("unknown: a language we do not teach saves to the active language", () => {
    const row = resolveSaveRow({ state: sara(), caps, detected: "ja" });
    expect(row).toEqual({ kind: "unknown", detected: "ja", target: "de", active: "de" });
  });

  it("unknown: a language switched off in the register is not offered", () => {
    expect(resolveSaveRow({ state: sara(), caps, detected: "lt" }).kind).toBe("unknown");
  });

  it("unknown: no detection saves to the active language", () => {
    expect(resolveSaveRow({ state: sara(), caps, detected: null }).target).toBe("de");
  });

  it("a paused language is not offered as Keep", () => {
    const state = sara({ languages: [...sara().languages, summary("es", { status: "paused" })] });
    expect(resolveSaveRow({ state, caps, detected: "es" }).kind).toBe("unknown");
  });

  it("chosen: Change wins over the detection", () => {
    const row = resolveSaveRow({ state: sara(), caps, detected: "de", override: "en" });
    expect(row).toEqual({ kind: "chosen", detected: "de", target: "en", active: "de" });
    expect(saveRowCopy(row, caps)).toEqual({
      title: "Saves to English",
      detail: "You chose English for this phrase",
    });
  });

  it("chosen: a missing phrase saved to the active language", () => {
    const row = resolveSaveRow({ state: sara(), caps, detected: "es", override: "de" });
    expect(row.kind).toBe("chosen");
    expect(row.target).toBe("de");
  });

  it("ignores an override the learner does not have", () => {
    expect(resolveSaveRow({ state: sara(), caps, detected: "de", override: "it" }).kind).toBe(
      "active"
    );
  });

  it("matches region codes", () => {
    expect(resolveSaveRow({ state: sara(), caps, detected: "de-AT" }).kind).toBe("active");
  });
});

describe("language filter (ADR-006: no language means English)", () => {
  it("English also matches old documents without a language", () => {
    expect(languageFilter("en")).toEqual({ $in: ["en", null] });
  });

  it("other languages match exactly", () => {
    expect(languageFilter("de")).toBe("de");
  });
});
