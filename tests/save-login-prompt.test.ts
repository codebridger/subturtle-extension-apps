import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { reactive } from "vue";
import { encodeRouteParams } from "../src/console-crane/route-params";

// E-03: the "Login to save this phrase" button on the word card sends
// save-login-prompt_viewed once per word view and save-login-prompt_clicked,
// and opens the login window with source "save_prompt".

const route = vi.hoisted(() => ({ current: null as any }));
vi.mock("vue-router", () => ({ useRoute: () => route.current }));

const { loginRef } = vi.hoisted(() => ({ loginRef: { current: null as any } }));
vi.mock("../src/plugins/modular-rest", async () => {
  const { ref } = await import("vue");
  loginRef.current = ref(false);
  return { isLogin: loginRef.current };
});

vi.mock("../src/console-crane/components/SaveWordSectionV2.vue", () => ({
  default: { name: "SaveWordSectionV2", template: "<div />" },
}));
vi.mock("pilotui", () => ({
  Button: { name: "PilotButton", template: "<button />" },
}));
vi.mock("pilotui/elements", () => ({
  IconButton: { name: "PilotIconButton", template: "<span />" },
}));
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
import { OpenLoginWindowMessage } from "../src/common/types/messaging";

const fetchDetailed = vi.mocked(
  TranslateService.instance.fetchDetailedTranslation
);
const track = vi.mocked(analytic.track);

const count = (event: string) =>
  track.mock.calls.filter(([e]) => e === event).length;

function showWord(word: string) {
  route.current.name = "word-detail";
  route.current.params.data = encodeRouteParams({ word, context: "" });
}

function mountCard() {
  return mount(WordDetail, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      provide: { frameSize: { width: 400, height: 600 } },
    },
  });
}

const loginButton = (w: ReturnType<typeof mountCard>) =>
  w.findAll("button").find((b) => b.text().includes("Login to save"));

describe("save-login prompt on the word card (E-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginRef.current.value = false;
    vi.mocked(findSavedPhrase).mockResolvedValue(null);
    fetchDetailed.mockImplementation(async (word: string) => ({
      phrase: word,
      context: "",
      translation: { phrase: `fa:${word}`, context: "" },
      linguistic_data: { isValid: true, definition: "x" },
      chunks: [],
    }) as any);
    route.current = reactive({ name: "", params: { data: "" } });
    showWord("had to");
  });

  it("sends save-login-prompt_viewed once when the button shows", async () => {
    const w = mountCard();
    await flushPromises();

    expect(loginButton(w)).toBeDefined();
    expect(count("save-login-prompt_viewed")).toBe(1);

    // A re-render of the same word view does not send it again.
    await w.vm.$forceUpdate();
    await flushPromises();
    expect(count("save-login-prompt_viewed")).toBe(1);
    w.unmount();
  });

  it("sends it again for a new word", async () => {
    const w = mountCard();
    await flushPromises();
    showWord("give up");
    await flushPromises();

    expect(fetchDetailed).toHaveBeenCalledTimes(2);
    expect(count("save-login-prompt_viewed")).toBe(2);
    w.unmount();
  });

  it("does not send it to a logged-in user", async () => {
    loginRef.current.value = true;
    const w = mountCard();
    await flushPromises();

    expect(loginButton(w)).toBeUndefined();
    expect(count("save-login-prompt_viewed")).toBe(0);
    w.unmount();
  });

  it("click: sends save-login-prompt_clicked and opens login with source save_prompt", async () => {
    const w = mountCard();
    await flushPromises();
    await loginButton(w)!.trigger("click");

    expect(count("save-login-prompt_clicked")).toBe(1);
    const send = chrome.runtime.sendMessage as ReturnType<typeof vi.fn>;
    const open = send.mock.calls.find(([m]) => OpenLoginWindowMessage.is(m));
    expect(open?.[0].source).toBe("save_prompt");
    w.unmount();
  });
});
