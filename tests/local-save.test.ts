import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { reactive } from "vue";
import { encodeRouteParams } from "../src/console-crane/route-params";

// save-first E-02 / E-03: on the word card, a logged-out learner gets two
// choices from the first phrase on, "Save without login" (kept on this
// browser) and "Login to save"; a soft sign-in card from the 3rd local phrase
// on; at the cap, only sign-in is offered.

const route = vi.hoisted(() => ({ current: null as any }));
vi.mock("vue-router", () => ({ useRoute: () => route.current }));

const { loginRef } = vi.hoisted(() => ({ loginRef: { current: null as any } }));
vi.mock("../src/plugins/modular-rest", async () => {
  const { ref } = await import("vue");
  loginRef.current = ref(false);
  return { isLogin: loginRef.current };
});

vi.mock("../src/console-crane/components/SaveWordSectionV2.vue", () => ({
  default: { name: "SaveWordSectionV2", template: '<div data-testid="server-save" />' },
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

import { installMemoryChromeStorage } from "./memory-chrome-storage";
import WordDetail from "../src/console-crane/modules/word-detail/index.vue";
import { TranslateService } from "../src/common/services/translate.service";
import { findSavedPhrase } from "../src/common/services/phrase.service";
import { analytic } from "../src/plugins/mixpanel";
import { OpenLoginWindowMessage } from "../src/common/types/messaging";
import {
  MAX_PENDING_SAVES,
  PENDING_SAVES_KEY,
} from "../src/common/services/pending-saves";

const fetchDetailed = vi.mocked(
  TranslateService.instance.fetchDetailedTranslation
);
const track = vi.mocked(analytic.track);
const calls = (event: string) =>
  track.mock.calls.filter(([e]) => e === event).map(([, p]) => p);

function showWord(word: string) {
  route.current.name = "word-detail";
  route.current.params.data = encodeRouteParams({ word, context: `I ${word} today` });
}

function mountCard() {
  return mount(WordDetail, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      provide: { frameSize: { width: 400, height: 600 } },
    },
  });
}

type Card = ReturnType<typeof mountCard>;
const byTestId = (w: Card, id: string) => w.find(`[data-testid="${id}"]`);

async function saveWord(w: Card, word: string) {
  showWord(word);
  await flushPromises();
  await byTestId(w, "local-save-button").trigger("click");
  await flushPromises();
}

describe("save first, sign in later — word card", () => {
  let mem: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    mem = installMemoryChromeStorage();
    loginRef.current.value = false;
    vi.mocked(findSavedPhrase).mockResolvedValue(null);
    fetchDetailed.mockImplementation(async (word: string) => ({
      phrase: word,
      context: `I ${word} today`,
      translation: { phrase: `fa ${word}`, context: "" },
      linguistic_data: { isValid: true, definition: "x" },
      chunks: [],
    }) as any);
    route.current = reactive({ name: "", params: { data: "" } });
    showWord("had to");
  });

  it("shows both choices to a logged-out learner, from the first phrase", async () => {
    const w = mountCard();
    await flushPromises();

    expect(byTestId(w, "local-save-button").text()).toBe("Save without login");
    expect(byTestId(w, "login-to-save").text()).toBe("Login to save");
    expect(byTestId(w, "server-save").exists()).toBe(false);
    expect(calls("save-login-prompt_viewed")).toHaveLength(1);

    // A re-render of the same word does not send the view again.
    await w.vm.$forceUpdate();
    await flushPromises();
    expect(calls("save-login-prompt_viewed")).toHaveLength(1);
    w.unmount();
  });

  it("sends save-login-prompt_viewed again for a new word", async () => {
    const w = mountCard();
    await flushPromises();
    showWord("give up");
    await flushPromises();
    expect(calls("save-login-prompt_viewed")).toHaveLength(2);
    w.unmount();
  });

  it("Login to save opens the login window with source save_prompt", async () => {
    const w = mountCard();
    await flushPromises();
    await byTestId(w, "login-to-save").trigger("click");

    expect(calls("save-login-prompt_clicked")).toHaveLength(1);
    const send = chrome.runtime.sendMessage as ReturnType<typeof vi.fn>;
    const open = send.mock.calls.find(([m]) => OpenLoginWindowMessage.is(m));
    expect(open?.[0].source).toBe("save_prompt");
    expect(mem[PENDING_SAVES_KEY]).toBeUndefined();
    w.unmount();
  });

  it("a signed-in learner still gets the server save", async () => {
    loginRef.current.value = true;
    const w = mountCard();
    await flushPromises();

    expect(byTestId(w, "server-save").exists()).toBe(true);
    expect(byTestId(w, "local-save").exists()).toBe(false);
    w.unmount();
  });

  it("Save keeps the phrase on this browser and shows it as saved", async () => {
    const w = mountCard();
    await flushPromises();
    await byTestId(w, "local-save-button").trigger("click");
    await flushPromises();

    expect(mem[PENDING_SAVES_KEY]).toHaveLength(1);
    expect(mem[PENDING_SAVES_KEY][0]).toMatchObject({
      phrase: "had to",
      translation: "fa had to",
      translation_language: "fa",
      context: "I had to today",
    });
    expect(byTestId(w, "local-saved").exists()).toBe(true);
    expect(byTestId(w, "save-choices").exists()).toBe(false);
    expect(calls("save-without-login_clicked")).toEqual([{ count: 0 }]);
    expect(calls("phrase_saved")).toEqual([{ logged_in: false }]);
    // Only two saves so far: no sign-in card yet.
    expect(byTestId(w, "signin-card").exists()).toBe(false);
    w.unmount();
  });

  it("opening a locally saved phrase again shows it as saved", async () => {
    const w1 = mountCard();
    await saveWord(w1, "had to");
    w1.unmount();

    const w2 = mountCard();
    await flushPromises();
    expect(byTestId(w2, "local-saved").exists()).toBe(true);
    expect(byTestId(w2, "local-save-button").exists()).toBe(false);
    w2.unmount();
  });

  it("from the 3rd save on, shows the sign-in card; Not now hides it until the next save", async () => {
    const w = mountCard();
    await saveWord(w, "one");
    await saveWord(w, "two");
    expect(byTestId(w, "signin-card").exists()).toBe(false);

    await saveWord(w, "three");
    const card = byTestId(w, "signin-card");
    expect(card.exists()).toBe(true);
    expect(card.text()).toContain(
      "Sign in to keep your 3 phrases and review them tomorrow."
    );
    expect(calls("save-signin-card_viewed")).toEqual([{ count: 3, required: false }]);

    await byTestId(w, "signin-card-dismiss").trigger("click");
    expect(byTestId(w, "signin-card").exists()).toBe(false);
    expect(calls("save-signin-card_dismissed")).toEqual([{ count: 3 }]);

    await saveWord(w, "four");
    expect(byTestId(w, "signin-card").text()).toContain("your 4 phrases");
    w.unmount();
  });

  it("Sign in opens the login window with source save_prompt", async () => {
    const w = mountCard();
    await saveWord(w, "one");
    await saveWord(w, "two");
    await saveWord(w, "three");
    await byTestId(w, "signin-card-signin").trigger("click");

    expect(calls("save-signin-card_clicked")).toEqual([{ count: 3 }]);
    const send = chrome.runtime.sendMessage as ReturnType<typeof vi.fn>;
    const open = send.mock.calls.find(([m]) => OpenLoginWindowMessage.is(m));
    expect(open?.[0].source).toBe("save_prompt");
    w.unmount();
  });

  it(`at ${MAX_PENDING_SAVES} local phrases, sign-in replaces Save`, async () => {
    mem[PENDING_SAVES_KEY] = Array.from({ length: MAX_PENDING_SAVES }, (_, i) => ({
      phrase: `p${i}`,
      translation: "x",
      translation_language: "fa",
      savedAt: i,
    }));
    const w = mountCard();
    await flushPromises();

    expect(byTestId(w, "local-save-button").exists()).toBe(false);
    expect(byTestId(w, "login-to-save").exists()).toBe(false);
    expect(calls("save-login-prompt_viewed")).toHaveLength(0);
    const card = byTestId(w, "signin-card");
    expect(card.attributes("data-required")).toBe("true");
    expect(card.text()).toContain(`your ${MAX_PENDING_SAVES} phrases`);
    expect(byTestId(w, "signin-card-dismiss").exists()).toBe(false);
    expect(calls("save-signin-card_viewed")).toEqual([
      { count: MAX_PENDING_SAVES, required: true },
    ]);
    w.unmount();
  });
});
