import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { defineComponent, h, KeepAlive, reactive } from "vue";
import { encodeRouteParams } from "../src/console-crane/route-params";

// A reactive stand-in for the console-crane router's current route, so the
// kept-alive word card sees the route change to a sub-page and back.
const route = vi.hoisted(() => ({ current: null as any }));
vi.mock("vue-router", () => ({ useRoute: () => route.current }));

vi.mock("../src/console-crane/components/SaveWordSectionV2.vue", () => ({
  default: { name: "SaveWordSectionV2", template: "<div />" },
}));
vi.mock("pilotui", () => ({
  Button: {
    name: "PilotButton",
    props: { label: { type: String, default: "" } },
    emits: ["click"],
    template:
      '<button class="pilot-btn" @click="$emit(\'click\')">{{ label }}</button>',
  },
}));
vi.mock("pilotui/elements", () => ({
  IconButton: { name: "PilotIconButton", template: "<span />" },
}));
vi.mock("../src/plugins/modular-rest", async () => {
  const { ref } = await import("vue");
  return { isLogin: ref(true) };
});
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
import { analytic } from "../src/plugins/mixpanel";

const fetchDetailed = vi.mocked(
  TranslateService.instance.fetchDetailedTranslation
);
const findSaved = vi.mocked(findSavedPhrase);
const track = vi.mocked(analytic.track);

const SubPage = defineComponent({
  name: "FlashcardPreview",
  render: () => h("div", "preview"),
});

// Mirrors console-crane/index.vue: <keep-alive include="WordDetailModule">.
const Host = defineComponent({
  render() {
    const page = route.current.name === "word-detail" ? WordDetail : SubPage;
    return h(KeepAlive, { include: "WordDetailModule" }, [h(page)]);
  },
});

function go(name: string, data: Record<string, unknown>) {
  route.current.name = name;
  route.current.params.data = encodeRouteParams(data);
}

function viewedCount() {
  return track.mock.calls.filter(([e]) => e === "word-detail-page_viewed")
    .length;
}

describe("word card ↔ flashcard preview (Back)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findSaved.mockResolvedValue(null);
    fetchDetailed.mockResolvedValue({
      phrase: "had to",
      context: "",
      translation: { phrase: "مجبور بود", context: "" },
      linguistic_data: { isValid: true, definition: "x" },
      chunks: [],
    } as any);
    route.current = reactive({ name: "", params: { data: "" } });
    go("word-detail", { word: "had to", context: "I had to go" });
  });

  function mountHost() {
    return mount(Host, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        provide: { frameSize: { width: 400, height: 600 } },
      },
    });
  }

  it("does not re-send word-detail-page_viewed or re-run lookups on Back", async () => {
    const w = mountHost();
    await flushPromises();
    expect(viewedCount()).toBe(1);
    expect(fetchDetailed).toHaveBeenCalledTimes(1);
    expect(findSaved).toHaveBeenCalledTimes(1);

    // "Preview flashcard" → sub-page, then Back.
    await w
      .findAll(".pilot-btn")
      .find((b) => b.text().includes("Preview flashcard"))!
      .trigger("click");
    go("flashcard-preview", { phrase: "had to" });
    await flushPromises();
    go("word-detail", { word: "had to", context: "I had to go" });
    await flushPromises();

    expect(viewedCount()).toBe(1);
    expect(fetchDetailed).toHaveBeenCalledTimes(1);
    expect(findSaved).toHaveBeenCalledTimes(1);
    expect(w.text()).toContain("مجبور بود");
    w.unmount();
  });

  it("a different word after the modal closed is a new view with a fresh lookup", async () => {
    const w = mountHost();
    await flushPromises();
    go("empty", {}); // modal closed
    await flushPromises();
    go("word-detail", { word: "give up", context: "" });
    await flushPromises();

    expect(viewedCount()).toBe(2);
    expect(fetchDetailed).toHaveBeenCalledTimes(2);
    expect(fetchDetailed).toHaveBeenLastCalledWith("give up", "", "detail");
    w.unmount();
  });
});
