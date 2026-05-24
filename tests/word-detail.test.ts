import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { defineComponent } from "vue";

// --- Mocks (declared before importing the SFC under test) ---

// The save card pulls in modular-rest, services and stores we don't exercise
// here — stub it to a marker element.
vi.mock("../src/console-crane/components/SaveWordSectionV2.vue", () => ({
  default: defineComponent({
    name: "SaveWordSectionV2",
    template: '<div class="save-stub" />',
  }),
}));

// We drive the component through its word/context props (the popup path), so a
// benign useRoute stub is enough.
vi.mock("vue-router", () => ({ useRoute: () => ({ params: {} }) }));

// Pilotui buttons → minimal stubs that surface their label and re-emit click.
vi.mock("pilotui", () => ({
  Button: defineComponent({
    name: "PilotButton",
    props: { label: { type: String, default: "" } },
    emits: ["click"],
    template:
      '<button class="pilot-btn" @click="$emit(\'click\')">{{ label }}<slot name="icon" /></button>',
  }),
}));
vi.mock("pilotui/elements", () => ({
  IconButton: defineComponent({
    name: "PilotIconButton",
    props: { label: { type: String, default: "" } },
    template: '<span class="pilot-iconbtn">{{ label }}</span>',
  }),
}));

// Login state — a ref we flip per test.
vi.mock("../src/plugins/modular-rest", async () => {
  const { ref } = await import("vue");
  return { isLogin: ref(true) };
});

// Translation + saved-phrase lookups.
vi.mock("../src/common/services/translate.service", () => ({
  TranslateService: {
    instance: {
      fetchDetailedTranslation: vi.fn(),
      fetchTranslationAdvice: vi.fn(),
      languageTitle: "Persian",
      targetLanguage: "fa",
    },
  },
}));
vi.mock("../src/common/services/phrase.service", () => ({
  findSavedPhrase: vi.fn(),
}));

import WordDetail from "../src/console-crane/modules/word-detail/index.vue";
import { TranslateService } from "../src/common/services/translate.service";
import { findSavedPhrase } from "../src/common/services/phrase.service";
import { isLogin } from "../src/plugins/modular-rest";
import { useConsoleCraneStore } from "../src/console-crane/stores/console-crane";

const fetchDetailed = vi.mocked(TranslateService.instance.fetchDetailedTranslation);
const findSaved = vi.mocked(findSavedPhrase);

const WORD_DATA = {
  phrase: "Kinsta Plan",
  context: "A Kinsta Plan Includes More",
  direction: { source: "ltr", target: "rtl" },
  translation: { phrase: "پلن کینستا", context: "" },
  language_info: { source: "en", target: "fa" },
  linguistic_data: {
    isValid: true,
    type: "noun_phrase",
    definition: "A service package from Kinsta.",
    phonetic: { transliteration: "کینستا پلن" },
    formality_level: "neutral",
  },
  chunks: [],
};

function mountWordDetail(props: { word: string; context?: string }) {
  const pinia = createTestingPinia({ createSpy: vi.fn });
  const wrapper = mount(WordDetail, {
    props,
    global: {
      plugins: [pinia],
      // The component injects the parent modal's frame size; supply a stub.
      provide: { frameSize: { width: 400, height: 600 } },
    },
  });
  const store = useConsoleCraneStore(pinia);
  return { wrapper, store };
}

function buttonLabels(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll(".pilot-btn").map((b) => b.text());
}

describe("WordDetail page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isLogin as unknown as { value: boolean }).value = true;
    findSaved.mockResolvedValue(null);
    fetchDetailed.mockResolvedValue(WORD_DATA as any);
  });

  it("renders the Definition as a labelled card (no Fieldset legend)", async () => {
    const { wrapper } = mountWordDetail({
      word: "Kinsta Plan",
      context: "A Kinsta Plan Includes More",
    });
    await flushPromises();

    expect(wrapper.text()).toContain("Definition");
    expect(wrapper.text()).toContain("A service package from Kinsta.");
    // The old Fieldset rendered its legend as an <h3>; the card uses a <p>.
    expect(wrapper.find("h3").exists()).toBe(false);
    wrapper.unmount();
  });

  it("shows the action buttons under the translation when logged in", async () => {
    const { wrapper } = mountWordDetail({ word: "Kinsta Plan" });
    await flushPromises();

    const labels = buttonLabels(wrapper).join("|");
    expect(labels).toContain("Practice with AI");
    expect(labels).toContain("Preview flashcard");
    wrapper.unmount();
  });

  it("hides the action buttons when logged out", async () => {
    (isLogin as unknown as { value: boolean }).value = false;
    const { wrapper } = mountWordDetail({ word: "Kinsta Plan" });
    await flushPromises();

    expect(buttonLabels(wrapper).join("|")).not.toContain("Practice with AI");
    wrapper.unmount();
  });

  it("navigates to practice-config with the phrase on 'Practice with AI'", async () => {
    const { wrapper, store } = mountWordDetail({
      word: "Kinsta Plan",
      context: "A Kinsta Plan Includes More",
    });
    await flushPromises();

    const btn = wrapper
      .findAll(".pilot-btn")
      .find((b) => b.text().includes("Practice with AI"))!;
    await btn.trigger("click");

    expect(store.toggleConsoleCrane).toHaveBeenCalledWith(
      "practice-config",
      expect.objectContaining({
        phrase: "Kinsta Plan",
        context: "A Kinsta Plan Includes More",
        chunks: [],
      }),
      true
    );
    wrapper.unmount();
  });

  it("navigates to flashcard-preview with phrase + translation on 'Preview flashcard'", async () => {
    const { wrapper, store } = mountWordDetail({
      word: "Kinsta Plan",
      context: "A Kinsta Plan Includes More",
    });
    await flushPromises();

    const btn = wrapper
      .findAll(".pilot-btn")
      .find((b) => b.text().includes("Preview flashcard"))!;
    await btn.trigger("click");

    expect(store.toggleConsoleCrane).toHaveBeenCalledWith(
      "flashcard-preview",
      expect.objectContaining({
        phrase: "Kinsta Plan",
        translation: "پلن کینستا",
        context: "A Kinsta Plan Includes More",
        chunks: [],
        direction: { source: "ltr", target: "rtl" },
      }),
      true
    );
    wrapper.unmount();
  });
});
