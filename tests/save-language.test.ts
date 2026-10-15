import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";

/**
 * Save window language row and its states (E-05, E-06, E-07; design
 * SaveWindow X3 to X8). The server is mocked to the API contract.
 */

const h = vi.hoisted(() => ({
  run: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
  insertOne: vi.fn(),
  removeOne: vi.fn(),
  suggestion: { matchedBundle: null as any, suggestedName: null as any },
  selectorLanguages: [] as Array<string | null | undefined>,
}));

vi.mock("@modular-rest/client", () => ({
  functionProvider: { run: h.run },
  dataProvider: {
    find: h.find,
    findOne: h.findOne,
    insertOne: h.insertOne,
    removeOne: h.removeOne,
  },
  authentication: { user: { id: "u1", type: "user" }, getToken: "TOKEN" },
}));

// The profile store imports the sibling dashboard repo's types; keep it out.
vi.mock("../src/stores/profile", () => ({
  useProfileStore: () => ({
    isFreemium: false,
    freemiumAllocation: null,
    fetchSubscription: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("../src/common/services/translate.service", () => ({
  TranslateService: { instance: { targetLanguage: "fa" } },
}));

vi.mock("../src/common/services/bundle-suggestion.service", () => ({
  BundleSuggestionService: {
    instance: {
      getForCurrentPage: vi.fn(async () => h.suggestion),
      clear: vi.fn(),
    },
  },
}));

vi.mock("pilotui", () => ({
  InputGroup: defineComponent({ template: "<div><slot /></div>" }),
  Button: defineComponent({
    name: "PilotButton",
    props: { label: String, disabled: Boolean },
    emits: ["click"],
    template:
      '<button class="pilot-save" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
  }),
}));

vi.mock("../src/console-crane/components/SelectPhraseBundleV2.vue", () => ({
  default: defineComponent({
    name: "SelectPhraseBundleV2",
    props: ["selectedBundles", "suggestedName", "language"],
    setup(props, { expose }) {
      h.selectorLanguages.push(props.language);
      expose({
        closeDropdown: () => {},
        titleFor: (id: string) => ({ b1: "Dark S1", b2: "Office" } as any)[id] || "",
      });
      return {};
    },
    template: '<div class="bundle-stub" :data-language="language" :data-selected="(selectedBundles || []).join(\',\')" />',
  }),
}));

import SaveWordSectionV2 from "../src/console-crane/components/SaveWordSectionV2.vue";
import { useLanguageStore } from "../src/stores/language";
import type { LanguageState, LanguageSummary } from "../src/common/language/types";

function summary(code: string): LanguageSummary {
  return {
    code,
    status: "active",
    startLevel: "A1",
    startLevelSource: "default",
    dueCount: 0,
    phraseCount: 0,
    explanationLanguage: "fa",
    starterPack: { state: "none", heard: 0, total: 0 },
  };
}

const SARA: LanguageState = {
  translationLanguage: "fa",
  learningLanguage: "de",
  languages: [summary("en"), summary("de")],
  onboardingState: "done",
  plan: "learner",
  maxLanguages: 10,
  pending: [],
};

function callsOf(name: string) {
  return h.run.mock.calls.filter((c) => c[0].name === name).map((c) => c[0].args);
}

let openSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  setActivePinia(createPinia());
  for (const fn of [h.run, h.find, h.findOne, h.insertOne, h.removeOne]) fn.mockReset();
  h.selectorLanguages.length = 0;
  h.suggestion = { matchedBundle: { _id: "b1", title: "Dark S1" }, suggestedName: null };
  h.findOne.mockResolvedValue(null); // not saved yet
  h.find.mockResolvedValue([]);
  h.run.mockImplementation(async ({ name, args }: any) => {
    if (name === "createPhrase") return { _id: "p1", phrase: args.phrase, language: args.language };
    if (name === "keep-phrase-pending") return { phraseId: "k1", expiresAt: "2026-11-15" };
    return undefined;
  });
  openSpy = vi.fn();
  (window as any).open = openSpy;
  process.env.SUBTURTLE_DASHBOARD_URL = "https://dash.example";
});

async function mountSave(detected: string | null, opts: { multilingual?: boolean } = {}) {
  if (opts.multilingual !== false) useLanguageStore().setState(SARA);
  const w = mount(SaveWordSectionV2, {
    props: {
      phrase: "muss gleich los",
      translation: "باید همین الان بروم",
      detected_language: detected,
      canGoBackToVideo: true,
      offerPractice: true,
    },
    attachTo: document.body,
  });
  await flushPromises();
  return w;
}

describe("dark phase (E-12)", () => {
  it("shows no language row and saves exactly as before", async () => {
    const w = await mountSave("de", { multilingual: false });
    expect(w.find("[data-testid='save-language-row']").exists()).toBe(false);
    expect(w.find(".pilot-save").text()).toBe("Save");
    expect(h.findOne.mock.calls[0][0].query).toEqual({ refId: "u1", phrase: "muss gleich los" });

    await w.find(".pilot-save").trigger("click");
    await flushPromises();
    const [args] = callsOf("createPhrase");
    expect(args).not.toHaveProperty("language");
    expect(args.bundleIds).toEqual(["b1"]);
    w.unmount();
  });
});

describe("language row (E-05)", () => {
  it("active: detected German, Save to German, German bundles", async () => {
    const w = await mountSave("de");
    const row = w.find("[data-testid='save-language-row']");
    expect(row.attributes("data-kind")).toBe("active");
    expect(row.text()).toContain("German · detected");
    expect(row.text()).toContain("Saves to your German profile");
    expect(w.find(".pilot-save").text()).toBe("Save to German");
    expect(w.find(".bundle-stub").attributes("data-language")).toBe("de");
    // Saved-phrase lookup per language (E-07).
    expect(h.findOne.mock.calls[0][0].query).toMatchObject({ phrase: "muss gleich los", language: "de" });

    await w.find(".pilot-save").trigger("click");
    await flushPromises();
    expect(callsOf("createPhrase")[0]).toMatchObject({ language: "de", bundleIds: ["b1"] });
    expect(w.find("[data-testid='saved-line']").text()).toContain("Saved to Dark S1 · German");
    w.unmount();
  });

  it("other: an English phrase saves to English, the active language stays", async () => {
    const w = await mountSave("en");
    expect(w.find("[data-testid='save-language-row']").text()).toContain(
      "Saves to your English profile. You stay in German."
    );
    expect(w.find(".pilot-save").text()).toBe("Save to English");
    expect(w.find(".bundle-stub").attributes("data-language")).toBe("en");
    // English also matches phrases stored before languages existed.
    expect(h.findOne.mock.calls[0][0].query.language).toEqual({ $in: ["en", null] });
    w.unmount();
  });

  it("Change picks a language for this phrase only", async () => {
    const w = await mountSave("de");
    await w.find("[data-testid='save-language-change']").trigger("click");
    const picker = w.find("[data-testid='save-language-picker']");
    expect(picker.text()).toContain("Save it to which language?");
    expect(picker.text()).toContain("Only this phrase changes");
    expect(picker.find("[data-testid='language-add']").exists()).toBe(false);
    await picker.find("[data-testid='language-row-en']").trigger("click");
    await flushPromises();

    const row = w.find("[data-testid='save-language-row']");
    expect(row.attributes("data-kind")).toBe("chosen");
    expect(row.text()).toContain("You chose English for this phrase");
    expect(w.find(".pilot-save").text()).toBe("Save to English");
    await w.find(".pilot-save").trigger("click");
    await flushPromises();
    expect(callsOf("createPhrase")[0].language).toBe("en");
    // The active language did not change.
    expect(useLanguageStore().state?.learningLanguage).toBe("de");
    w.unmount();
  });
});

describe("language not added (E-06)", () => {
  it("offers two choices and no bundle picker", async () => {
    const w = await mountSave("es");
    const row = w.find("[data-testid='save-language-row']");
    expect(row.attributes("data-kind")).toBe("missing");
    expect(row.text()).toContain("This looks like Spanish");
    expect(row.text()).toContain("Spanish is not in your languages yet");
    expect(w.find("[data-testid='save-to-active']").text()).toBe("Save to German");
    expect(w.find("[data-testid='keep-pending']").text()).toBe("Keep for Spanish");
    expect(w.find(".bundle-stub").exists()).toBe(false);
    expect(w.find(".pilot-save").exists()).toBe(false);
    w.unmount();
  });

  it("Keep for Spanish holds it on the server, with Undo", async () => {
    const w = await mountSave("es");
    await w.find("[data-testid='keep-pending']").trigger("click");
    await flushPromises();

    const [args] = callsOf("keep-phrase-pending");
    expect(args.language).toBe("es");
    expect(args.phrase).toMatchObject({
      phrase: "muss gleich los",
      translation: "باید همین الان بروم",
      type: "linguistic",
    });
    expect(args.phrase).not.toHaveProperty("bundleIds");
    expect(callsOf("createPhrase")).toHaveLength(0);

    const box = w.find("[data-testid='save-outcome']");
    expect(box.attributes("data-kind")).toBe("kept");
    expect(box.text()).toContain("Kept for Spanish");
    expect(box.text()).toContain("We keep it for 30 days.");
    expect(box.text()).toContain("Back to my video");
    expect(box.text()).toContain("Add Spanish now");

    await box.find("[data-testid='undo']").trigger("click");
    await flushPromises();
    expect(h.removeOne).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "phrase",
        query: { _id: "k1", refId: "u1", status: "pending" },
      })
    );
    expect(w.find("[data-testid='save-outcome']").exists()).toBe(false);
    expect(w.find("[data-testid='save-language-row']").attributes("data-kind")).toBe("missing");
    w.unmount();
  });

  it("Save to German saves at once to the page's German bundle, with Undo", async () => {
    const w = await mountSave("es");
    await w.find("[data-testid='save-to-active']").trigger("click");
    await flushPromises();

    expect(callsOf("createPhrase")[0]).toMatchObject({ language: "de", bundleIds: ["b1"] });
    const box = w.find("[data-testid='save-outcome']");
    expect(box.attributes("data-kind")).toBe("savedInstead");
    expect(box.text()).toContain("Saved to Dark S1 · German");
    expect(box.text()).toContain("as you chose");
    expect(box.text()).toContain("Practise it now");

    await box.find("[data-testid='undo']").trigger("click");
    await flushPromises();
    expect(callsOf("removePhrase")[0]).toEqual({ phraseId: "p1", bundleId: "b1", refId: "u1" });
    expect(w.find("[data-testid='save-language-row']").attributes("data-kind")).toBe("missing");
    w.unmount();
  });

  it("Save to German without a bundle to use shows the bundle picker", async () => {
    h.suggestion = { matchedBundle: null, suggestedName: null };
    const w = await mountSave("es");
    await w.find("[data-testid='save-to-active']").trigger("click");
    await flushPromises();
    expect(callsOf("createPhrase")).toHaveLength(0);
    expect(w.find("[data-testid='save-language-row']").attributes("data-kind")).toBe("chosen");
    expect(w.find(".bundle-stub").attributes("data-language")).toBe("de");
    w.unmount();
  });

  it("the small link opens Add a language on the dashboard with the language", async () => {
    const w = await mountSave("es");
    await w.find("[data-testid='add-language-link']").trigger("click");
    const [url, target] = openSpy.mock.calls[0];
    expect(target).toBe("_blank");
    expect(url).toContain(
      "redirect=" + encodeURIComponent("/settings/languages/add?language=es&from=extension")
    );
    w.unmount();
  });

  it("a failed Keep says so and keeps the choices", async () => {
    h.run.mockImplementation(async ({ name }: any) => {
      if (name === "keep-phrase-pending") throw new Error("down");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const w = await mountSave("es");
    await w.find("[data-testid='keep-pending']").trigger("click");
    await flushPromises();
    expect(w.find("[role='alert']").text()).toContain("could not keep");
    expect(w.find("[data-testid='keep-pending']").exists()).toBe(true);
    w.unmount();
  });

  it("Back to my video and Practise it now ask the page", async () => {
    const w = await mountSave("es");
    await w.find("[data-testid='save-to-active']").trigger("click");
    await flushPromises();
    await w.find("[data-testid='practise-now']").trigger("click");
    expect(w.emitted("practice")?.[0]).toEqual([{ phraseId: "p1", language: "de" }]);
    await w.find("[data-testid='back-to-video']").trigger("click");
    expect(w.emitted("back")).toBeTruthy();
    w.unmount();
  });
});
