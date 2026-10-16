import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";

/**
 * Popup language pill, list, due line and plan limit (E-03, E-04, E-12, E-14).
 */

const run = vi.hoisted(() => vi.fn());
const isLoginRef = vi.hoisted(() => ({ value: true }));

vi.mock("@modular-rest/client", () => ({
  functionProvider: { run },
  dataProvider: { findOne: vi.fn() },
  authentication: { user: { id: "u1", type: "user" }, getToken: "TOKEN", logout: vi.fn() },
}));

// HomeView imports the plugin for isLogin/logout; keep its side effects out.
vi.mock("../src/plugins/modular-rest", async () => {
  const { ref } = await import("vue");
  const isLogin = ref(true);
  (isLoginRef as any).ref = isLogin;
  return { isLogin, logout: vi.fn() };
});

vi.mock("../src/console-crane/modules/word-detail/index.vue", () => ({
  default: defineComponent({ name: "WordDetailModule", template: "<div />" }),
}));

const routerPush = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: routerPush }),
}));

import LanguageSwitcher from "../src/popup/components/LanguageSwitcher.vue";
import LanguagePill from "../src/popup/components/LanguagePill.vue";
import HomeView from "../src/popup/views/HomeView.vue";
import { useLanguageStore } from "../src/stores/language";
import type { LanguageState, LanguageSummary } from "../src/common/language/types";
import { MESSAGE_TYPE } from "../src/common/types/messaging";

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

const globalStubs = { "router-link": { template: "<a><slot /></a>" } };

let openSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  setActivePinia(createPinia());
  run.mockReset();
  routerPush.mockReset();
  openSpy = vi.fn();
  (window as any).open = openSpy;
  process.env.SUBTURTLE_DASHBOARD_URL = "https://dash.example";
  (globalThis as any).chrome.tabs.query = vi.fn((_q: any, cb: any) => cb([{ id: 1 }, { id: 2 }]));
  (globalThis as any).chrome.tabs.sendMessage = vi.fn();
  (isLoginRef as any).ref && ((isLoginRef as any).ref.value = true);
});

describe("LanguagePill", () => {
  it("shows the language and where the learner started", () => {
    const w = mount(LanguagePill, {
      props: { code: "de", name: "German", level: "A1", caption: "Saves go here" },
    });
    expect(w.text()).toContain("DE");
    expect(w.text()).toContain("German");
    expect(w.text()).toContain("Saves go here · Starting at A1");
    expect(w.attributes("aria-label")).toBe("Change language. Learning German, starting at A1");
  });

  it("says Sign in when signed out", () => {
    const w = mount(LanguagePill, { props: { name: "Sign in" } });
    expect(w.text()).toContain("Sign in");
    expect(w.text()).not.toContain("Starting at");
  });
});

describe("LanguageSwitcher (popup list)", () => {
  function mountSwitcher(state = sara()) {
    useLanguageStore().setState(state);
    return mount(LanguageSwitcher, { props: { state, caps: null }, attachTo: document.body });
  }

  it("lists the learner's languages with native names, the active one ticked", () => {
    const w = mountSwitcher();
    const rows = w.findAll("[data-testid^='language-row-']");
    expect(rows.map((r) => r.text())).toEqual([
      expect.stringContaining("English"),
      expect.stringContaining("German · Deutsch"),
    ]);
    expect(w.find("[data-testid='language-row-de']").attributes("aria-current")).toBe("true");
    expect(w.find("[data-testid='language-row-en']").attributes("aria-current")).toBe("false");
    expect(w.text()).toContain("Starting at A1 · 7 due · 38 phrases");
    expect(w.text()).toContain("2 of 10 used");
    w.unmount();
  });

  it("switches the language on the server and tells every open tab", async () => {
    const next = sara({ learningLanguage: "en" });
    run.mockResolvedValue({ state: next });
    const w = mountSwitcher();
    await w.find("[data-testid='language-row-en']").trigger("click");
    await flushPromises();

    expect(run).toHaveBeenCalledWith({ name: "set-active-language", args: { userId: "u1", language: "en" } });
    expect(useLanguageStore().state?.learningLanguage).toBe("en");
    const sent = (globalThis as any).chrome.tabs.sendMessage.mock.calls;
    expect(sent).toHaveLength(2);
    expect(sent[0][1].type).toBe(MESSAGE_TYPE.LANGUAGE_STATE_CHANGED);
    expect(sent[0][1].state.learningLanguage).toBe("en");
    expect(w.emitted("close")).toBeTruthy();
    w.unmount();
  });

  it("picking the active language just closes the list", async () => {
    const w = mountSwitcher();
    await w.find("[data-testid='language-row-de']").trigger("click");
    expect(run).not.toHaveBeenCalled();
    expect(w.emitted("close")).toBeTruthy();
    w.unmount();
  });

  it("keeps the list open with a message when the switch fails", async () => {
    run.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const w = mountSwitcher();
    await w.find("[data-testid='language-row-en']").trigger("click");
    await flushPromises();
    expect(w.find("[role='alert']").text()).toContain("could not switch");
    expect(w.emitted("close")).toBeFalsy();
    expect(useLanguageStore().state?.learningLanguage).toBe("de");
    w.unmount();
  });

  it("Add a language opens the dashboard in a new tab, signed in", async () => {
    const w = mountSwitcher();
    await w.find("[data-testid='language-add']").trigger("click");
    expect(openSpy).toHaveBeenCalledTimes(1);
    const [url, target] = openSpy.mock.calls[0];
    expect(target).toBe("_blank");
    expect(url).toContain("login_with_token?token=TOKEN");
    expect(url).toContain(
      "redirect=" + encodeURIComponent("/settings/languages/add?from=extension")
    );
    w.unmount();
  });

  it("at the plan limit, Upgrade opens the Subscription page (E-14)", async () => {
    const w = mountSwitcher(
      sara({ plan: "starter", maxLanguages: 1, learningLanguage: "en", languages: [summary("en")] })
    );
    expect(w.find("[data-testid='language-add']").exists()).toBe(false);
    const card = w.find("[data-testid='language-limit']");
    expect(card.text()).toContain("Starter includes 1 language");
    expect(card.text()).not.toContain("Manage");
    await card.find("button").trigger("click");
    expect(openSpy.mock.calls[0][0]).toContain(
      "redirect=" + encodeURIComponent("/settings/subscription")
    );
    w.unmount();
  });

  it("Reader at 3 of 3 offers Manage too", () => {
    const w = mountSwitcher(
      sara({ plan: "reader", maxLanguages: 3, languages: [summary("en"), summary("de"), summary("es")] })
    );
    expect(w.find("[data-testid='language-limit']").text()).toContain("Manage");
    w.unmount();
  });
});

describe("HomeView language parts", () => {
  function mountHome() {
    return mount(HomeView, { global: { stubs: globalStubs } });
  }

  it("dark launch: no pill, no due line, the old select stays (E-12)", async () => {
    const w = mountHome();
    await flushPromises();
    expect(w.find("[data-testid='language-pill']").exists()).toBe(false);
    expect(w.find("[data-testid='due-line']").exists()).toBe(false);
    expect(w.find("[data-testid='own-language']").exists()).toBe(false);
    expect(w.text()).toContain("My language");
    w.unmount();
  });

  it("with language profiles: pill, due line and own language; the old select is gone", async () => {
    useLanguageStore().setState(sara());
    const w = mountHome();
    await flushPromises();
    expect(w.find("[data-testid='language-pill']").text()).toContain("German");
    expect(w.find("[data-testid='due-line']").text()).toContain("7 German phrases are due");
    expect(w.find("[data-testid='own-language']").text()).toContain("Persian");
    expect(w.text()).not.toContain("My language");
    expect(w.find("[data-testid='translated-into']").exists()).toBe(true);
    w.unmount();
  });

  it("the pill opens the list, and the due line opens the dashboard board", async () => {
    useLanguageStore().setState(sara());
    const w = mountHome();
    await flushPromises();
    await w.find("[data-testid='language-pill']").trigger("click");
    expect(w.find("[data-testid='language-switcher']").exists()).toBe(true);
    await w.find("[data-testid='due-line']").trigger("click");
    expect(openSpy.mock.calls[0][0]).toContain("redirect=" + encodeURIComponent("/board"));
    w.unmount();
  });

  it("signed out: a Sign in pill when the server has the register (E-02)", async () => {
    (isLoginRef as any).ref.value = false;
    run.mockImplementation(async ({ name }: any) => {
      if (name === "get-language-capabilities") return { learning: [], own: [] };
      throw new Error("no");
    });
    const w = mountHome();
    await flushPromises();
    const pill = w.find("[data-testid='language-pill']");
    expect(pill.text()).toContain("Sign in");
    await pill.trigger("click");
    expect(routerPush).toHaveBeenCalledWith("/intro");
    w.unmount();
  });

  it("signed out on an old server: no pill", async () => {
    (isLoginRef as any).ref.value = false;
    run.mockRejectedValue(new Error("Function not found"));
    const w = mountHome();
    await flushPromises();
    expect(w.find("[data-testid='language-pill']").exists()).toBe(false);
    w.unmount();
  });
});
