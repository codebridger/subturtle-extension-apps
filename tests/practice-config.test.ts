import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent } from "vue";
import { encodeRouteParams } from "../src/console-crane/route-params";

// Drive the route :data payload via a hoisted holder (same approach as
// flashcard-preview.test.ts), plus holders for the saved-phrase lookup, the
// freemium flag, window.open calls, and the login ref.
const {
  routeHolder,
  savedHolder,
  profileHolder,
  openHolder,
  loginHolder,
  sendHolder,
} = vi.hoisted(() => ({
    routeHolder: { data: "" },
    savedHolder: { value: null as { _id: string } | null },
    profileHolder: {
      isFreemium: false,
      freemiumAllocation: null as any,
      activeSubscription: null as any,
      fetchSubscription: () => Promise.resolve(),
    },
    openHolder: { calls: [] as string[] },
    // `ref` is filled in by the modular-rest mock so tests can toggle login.
    loginHolder: { ref: null as { value: boolean } | null },
    // Captures the login-window message dispatched by the logged-out CTA.
    sendHolder: { calls: [] as any[] },
  }));

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { data: routeHolder.data } }),
}));
vi.mock("../src/common/services/phrase.service", () => ({
  findSavedPhrase: vi.fn(async () => savedHolder.value),
}));
vi.mock("../src/stores/profile", () => ({
  useProfileStore: () => profileHolder,
}));
vi.mock("../src/common/static/global", () => ({
  getSubturtleDashboardUrlWithToken: (path?: string) => `OPEN:${path ?? ""}`,
}));
// Real Vue ref so the component's template + isLogin watch stay reactive; the
// heavy modular-rest plugin (chrome APIs, @modular-rest/client) is mocked away.
vi.mock("../src/plugins/modular-rest", async () => {
  const { ref } = await import("vue");
  const isLogin = ref(true);
  loginHolder.ref = isLogin;
  return { isLogin };
});
// Spy on the login-window dispatch instead of hitting the chrome runtime shim.
vi.mock("../src/common/helper/massage", () => ({
  sendMessage: (arg: any) => {
    sendHolder.calls.push(arg);
    return Promise.resolve({});
  },
}));

// Pilotui Button → minimal stub that re-emits click (mirrors word-detail.test.ts).
vi.mock("pilotui/elements", () => ({
  Button: defineComponent({
    name: "PilotButton",
    props: { label: { type: String, default: "" } },
    emits: ["click"],
    template:
      '<button class="pilot-btn" @click="$emit(\'click\')">{{ label }}<slot name="icon" /></button>',
  }),
}));

// Heavy children → light stubs. The save stub re-emits `saved` with a phrase doc.
vi.mock("../src/console-crane/components/SaveWordSectionV2.vue", () => ({
  default: defineComponent({
    name: "SaveWordSectionV2Stub",
    emits: ["saved"],
    template:
      "<button class=\"save-stub\" @click=\"$emit('saved', { _id: 'NEWID' })\">save</button>",
  }),
}));
vi.mock("../src/console-crane/components/VoicePicker.vue", () => ({
  default: defineComponent({
    name: "VoicePickerStub",
    props: { modelValue: { type: String, default: "" } },
    template: '<div class="voice-picker-stub" />',
  }),
}));

import PracticeConfig from "../src/console-crane/modules/practice-config/index.vue";
import { OpenLoginWindowMessage } from "../src/common/types/messaging";

function mountWith(payload: Record<string, unknown>) {
  routeHolder.data = encodeRouteParams(payload);
  return mount(PracticeConfig);
}

beforeEach(() => {
  savedHolder.value = null;
  profileHolder.isFreemium = false;
  profileHolder.freemiumAllocation = null;
  profileHolder.activeSubscription = null;
  openHolder.calls = [];
  sendHolder.calls = [];
  // Default to logged in; the logged-out test flips this before mounting.
  if (loginHolder.ref) loginHolder.ref.value = true;
  vi.spyOn(window, "open").mockImplementation((url?: string | URL) => {
    openHolder.calls.push(String(url));
    return null;
  });
});

// Reader: paid tier with 0 included voice minutes and a monthly text-chat cap
// (the 2026-10-12 report). Learner: voice minutes + unlimited text.
const READER = {
  tier: "reader",
  is_freemium: false,
  voice_minutes_total: 0,
  voice_minutes_used: 0,
  allowed_text_chats: 20,
  allowed_text_chats_used: 3,
  active_top_ups: [],
};
const LEARNER = {
  tier: "learner",
  is_freemium: false,
  voice_minutes_total: 90,
  voice_minutes_used: 30,
  allowed_text_chats: null,
  active_top_ups: [],
};

function decodeOpened(url: string) {
  const [path, query] = url.replace(/^OPEN:/, "").split("?");
  return {
    path,
    req: JSON.parse(atob(new URLSearchParams(query).get("session") as string)),
  };
}

function startButton(w: ReturnType<typeof mount>) {
  return w
    .findAll("button.pilot-btn")
    .find((b) => b.text().startsWith("Start"))!;
}

describe("PracticeConfig page", () => {
  it("prompts to save first and reveals the save widget on demand", async () => {
    const w = mountWith({ phrase: "had to" });
    await flushPromises();
    expect(w.findAll(".mode-option")).toHaveLength(2);
    expect(w.text()).toContain("Let's save it");
    expect(w.find(".save-stub").exists()).toBe(false);
    await w.find("button.pilot-btn").trigger("click");
    expect(w.find(".save-stub").exists()).toBe(true);
    // The save widget brings its own button; the sticky footer steps aside.
    expect(w.find(".practice-footer").exists()).toBe(false);
    w.unmount();
  });

  it("reveals Start after an inline save", async () => {
    profileHolder.activeSubscription = LEARNER;
    const w = mountWith({ phrase: "had to" });
    await flushPromises();
    await w.find("button.pilot-btn").trigger("click"); // Let's save it
    await w.find(".save-stub").trigger("click"); // save → emits saved
    await flushPromises();
    expect(startButton(w)).toBeTruthy();
    expect(w.find(".save-stub").exists()).toBe(false);
    w.unmount();
  });

  it("shows a login prompt when logged out (no counts, no Start)", async () => {
    loginHolder.ref!.value = false;
    const w = mountWith({ phrase: "had to" });
    await flushPromises();
    expect(w.findAll(".mode-option")).toHaveLength(2);
    expect(w.text()).toContain("Log in & save first");
    expect(w.text()).toContain("needs a saved phrase");
    expect(w.text()).not.toContain("Let's save it");
    expect(w.text()).not.toContain("Start");
    w.unmount();
  });

  it("dispatches the login-window message from the logged-out CTA", async () => {
    loginHolder.ref!.value = false;
    const w = mountWith({ phrase: "had to" });
    await flushPromises();
    await w.find("button.pilot-btn").trigger("click");
    expect(sendHolder.calls).toHaveLength(1);
    expect(sendHolder.calls[0]).toBeInstanceOf(OpenLoginWindowMessage);
    w.unmount();
  });

  it("advances past the login prompt once the user logs in", async () => {
    loginHolder.ref!.value = false;
    const w = mountWith({ phrase: "had to" });
    await flushPromises();
    expect(w.text()).toContain("Log in & save first");
    loginHolder.ref!.value = true;
    await flushPromises();
    expect(w.text()).not.toContain("Log in & save first");
    expect(w.text()).toContain("Let's save it");
    w.unmount();
  });

  it("keeps the primary CTA in a sticky footer", async () => {
    savedHolder.value = { _id: "PID123" };
    profileHolder.activeSubscription = LEARNER;
    const w = mountWith({ phrase: "had to" });
    await flushPromises();
    const footer = w.find(".practice-footer");
    expect(footer.classes()).toContain("sticky");
    expect(footer.classes()).toContain("bottom-0");
    expect(footer.text()).toContain("Start");
    w.unmount();
  });

  it("Reader (0 voice minutes): defaults to Text, disables Voice, opens the text session", async () => {
    savedHolder.value = { _id: "PID123" };
    profileHolder.activeSubscription = READER;
    const w = mountWith({ phrase: "had to" });
    await flushPromises();

    const voice = w.find('.mode-option[data-mode="voice"]');
    expect(voice.attributes("disabled")).toBeDefined();
    expect(voice.text()).toContain("No voice minutes left");
    expect(
      w.find('.mode-option[data-mode="text"]').attributes("aria-checked")
    ).toBe("true");
    expect(w.text()).toContain("17 of 20 text chats left this month");
    expect(w.find(".voice-picker-stub").exists()).toBe(false);
    expect(w.text()).not.toContain("monthly credits");

    await startButton(w).trigger("click");
    expect(openHolder.calls).toHaveLength(1);
    const { path, req } = decodeOpened(openHolder.calls[0]);
    expect(path).toBe("/practice/live-session-text");
    expect(req.mode).toBe("text");
    expect(req.source).toEqual({ kind: "phrases", phraseIds: ["PID123"] });
    w.unmount();
  });

  it("Learner: defaults to Voice with real minutes left and the chosen voice", async () => {
    savedHolder.value = { _id: "PID123" };
    profileHolder.activeSubscription = LEARNER;
    const w = mountWith({ phrase: "had to" });
    await flushPromises();

    expect(w.find(".voice-picker-stub").exists()).toBe(true);
    expect(w.text()).toContain("60 voice minutes left");
    expect(w.find('.mode-option[data-mode="text"]').text()).toContain(
      "Unlimited chats"
    );

    await startButton(w).trigger("click");
    const { path, req } = decodeOpened(openHolder.calls[0]);
    expect(path).toBe("/practice/live-session");
    expect(req.mode).toBe("voice");
    expect(req.aiCharacter).toBe("Kore");
    w.unmount();
  });

  it("lets the user switch Voice → Text", async () => {
    savedHolder.value = { _id: "PID123" };
    profileHolder.activeSubscription = LEARNER;
    const w = mountWith({ phrase: "had to" });
    await flushPromises();
    await w.find('.mode-option[data-mode="text"]').trigger("click");
    expect(w.find(".voice-picker-stub").exists()).toBe(false);
    await startButton(w).trigger("click");
    expect(decodeOpened(openHolder.calls[0]).path).toBe(
      "/practice/live-session-text"
    );
    w.unmount();
  });

  it("counts voice top-ups as available minutes", async () => {
    savedHolder.value = { _id: "PID123" };
    profileHolder.activeSubscription = {
      ...READER,
      active_top_ups: [{ minutes_remaining: 15 }],
    };
    const w = mountWith({ phrase: "had to" });
    await flushPromises();
    expect(
      w.find('.mode-option[data-mode="voice"]').attributes("disabled")
    ).toBeUndefined();
    expect(w.text()).toContain("15 voice minutes left");
    w.unmount();
  });

  it("free users out of both text chats and voice see Upgrade", async () => {
    savedHolder.value = { _id: "PID123" };
    profileHolder.isFreemium = true;
    profileHolder.freemiumAllocation = {
      allowed_lived_sessions: 3,
      allowed_lived_sessions_used: 3,
      voice_minutes_total: 5,
      voice_minutes_used: 5,
      allowed_text_chats: 5,
      allowed_text_chats_used: 5,
    };
    const w = mountWith({ phrase: "had to" });
    await flushPromises();

    expect(w.text()).toContain("Upgrade");
    expect(w.text()).not.toContain("Start");
    await w.find(".practice-footer button.pilot-btn").trigger("click");
    expect(openHolder.calls).toHaveLength(1);
    expect(openHolder.calls[0]).toContain("/settings/subscription");
    expect(openHolder.calls[0]).not.toContain("session=");
    w.unmount();
  });

  it("free users with text chats left but no voice can still start a text chat", async () => {
    savedHolder.value = { _id: "PID123" };
    profileHolder.isFreemium = true;
    profileHolder.freemiumAllocation = {
      allowed_lived_sessions: 3,
      allowed_lived_sessions_used: 3,
      voice_minutes_total: 5,
      voice_minutes_used: 0,
      allowed_text_chats: 5,
      allowed_text_chats_used: 1,
    };
    const w = mountWith({ phrase: "had to" });
    await flushPromises();
    expect(w.text()).not.toContain("Upgrade");
    expect(w.text()).toContain("4 of 5 text chats left this month");
    w.unmount();
  });
});
