import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

/**
 * E-01 / E-02 / E-12: the own language and the languages come from the server
 * profile when it has them; otherwise the extension behaves as before.
 */

const auth = vi.hoisted(() => ({
  user: { id: "u1", type: "user" } as any,
  isLogin: true,
  getToken: "t",
  loginAsAnonymous: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@modular-rest/client", () => ({
  functionProvider: { run: vi.fn() },
  dataProvider: { findOne: vi.fn().mockResolvedValue({ refId: "u1" }) },
  authentication: auth,
}));

import { functionProvider } from "@modular-rest/client";
import { TranslateService } from "../src/common/services/translate.service";
import { useSettingsStore } from "../src/common/store/settings";
import { useLanguageStore } from "../src/stores/language";
import { fetchLanguageState } from "../src/common/language/api";
import type { LanguageState } from "../src/common/language/types";

const run = functionProvider.run as unknown as ReturnType<typeof vi.fn>;

const STATE: LanguageState = {
  translationLanguage: "fa",
  learningLanguage: "de",
  languages: [
    {
      code: "de",
      status: "active",
      startLevel: "A1",
      startLevelSource: "default",
      dueCount: 7,
      phraseCount: 38,
      explanationLanguage: "fa",
      starterPack: { state: "none", heard: 0, total: 0 },
    },
  ],
  onboardingState: "done",
  plan: "learner",
  maxLanguages: 10,
  pending: [],
};

function argsOfLastCall(name: string) {
  const call = run.mock.calls.filter((c) => c[0].name === name).pop();
  return call?.[0].args;
}

describe("TranslateService own language", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    (TranslateService.instance as any).translationCache = {};
    run.mockReset();
    run.mockResolvedValue("ok");
    useSettingsStore().language = "ar";
  });

  it("uses the local setting and today's request on an old server", async () => {
    await TranslateService.instance.fetchSimpleTranslation("hello");
    const args = argsOfLastCall("translateWithContext");
    expect(args.targetLanguage).toBe("Arabic");
    expect(args).not.toHaveProperty("translationLanguage");
  });

  it("uses the server profile's own language when it has one", async () => {
    useLanguageStore().setState(STATE);
    await TranslateService.instance.fetchSimpleTranslation("hello");
    const args = argsOfLastCall("translateWithContext");
    expect(args.targetLanguage).toBe("Persian");
    expect(args.translationLanguage).toBe("fa");
  });

  it("accepts English from the server", async () => {
    useLanguageStore().setState({ ...STATE, translationLanguage: "en" });
    await TranslateService.instance.fetchSimpleTranslation("Hallo");
    const args = argsOfLastCall("translateWithContext");
    expect(args.targetLanguage).toBe("English");
    expect(args.translationLanguage).toBe("en");
  });

  it("goes back to the local setting after logout", async () => {
    const languages = useLanguageStore();
    languages.setState(STATE);
    languages.clear(); // what the profile store's logout calls
    await TranslateService.instance.fetchSimpleTranslation("hello");
    expect(argsOfLastCall("translateWithContext").targetLanguage).toBe("Arabic");
  });
});

describe("language store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    run.mockReset();
  });

  it("reads the state and the register from the server", async () => {
    run.mockImplementation(async ({ name }: any) => {
      if (name === "get-language-state") return STATE;
      if (name === "get-language-capabilities") return { learning: [], own: [] };
      throw new Error("unexpected " + name);
    });
    const languages = useLanguageStore();
    await languages.fetchLanguages();
    expect(languages.state).toEqual(STATE);
    expect(languages.caps).toEqual({ learning: [], own: [] });
    expect(languages.isMultilingual).toBe(true);
  });

  it("stays English-only when the server has no language functions (E-12)", async () => {
    run.mockRejectedValue("Function not found");
    const languages = useLanguageStore();
    await expect(languages.fetchLanguages()).resolves.toBeNull();
    expect(languages.state).toBeNull();
    expect(languages.isMultilingual).toBe(false);
  });

  it("ignores a reply without the contract's fields", async () => {
    run.mockResolvedValue({ unexpected: true });
    expect(await fetchLanguageState()).toBeNull();
  });

  it("fetches the public register once", async () => {
    run.mockResolvedValue({ learning: [], own: [] });
    const languages = useLanguageStore();
    await languages.fetchCaps();
    await languages.fetchCaps();
    expect(run).toHaveBeenCalledTimes(1);
  });
});
