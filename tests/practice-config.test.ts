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
  openHolder.calls = [];
  sendHolder.calls = [];
  // Default to logged in; the logged-out test flips this before mounting.
  if (loginHolder.ref) loginHolder.ref.value = true;
  vi.spyOn(window, "open").mockImplementation((url?: string | URL) => {
    openHolder.calls.push(String(url));
    return null;
  });
});

describe("PracticeConfig page (voice-only)", () => {
  it("prompts to save first and reveals the save widget on demand", async () => {
    const w = mountWith({ phrase: "had to" });
    await flushPromises();
    // The voice picker is always shown; the not-saved footer adds the prompt.
    expect(w.text()).toContain("Choose a coach voice");
    expect(w.find(".voice-picker-stub").exists()).toBe(true);
    // Step 1: a prompt + "Let's save it" — no save widget yet.
    expect(w.text()).toContain("Let's save it");
    expect(w.find(".save-stub").exists()).toBe(false);
    // Step 2: clicking it reveals the real save widget; the picker stays put.
    await w.find("button.pilot-btn").trigger("click");
    expect(w.find(".save-stub").exists()).toBe(true);
    expect(w.find(".voice-picker-stub").exists()).toBe(true);
    w.unmount();
  });

  it("reveals the voice config card after an inline save", async () => {
    const w = mountWith({ phrase: "had to" });
    await flushPromises();
    await w.find("button.pilot-btn").trigger("click"); // Let's save it
    await w.find(".save-stub").trigger("click"); // save → emits saved
    await flushPromises();
    expect(w.text()).toContain("Choose a coach voice");
    expect(w.find(".voice-picker-stub").exists()).toBe(true);
    expect(w.text()).toContain("Start");
    expect(w.find(".save-stub").exists()).toBe(false);
    w.unmount();
  });

  it("shows the voice picker and a login prompt when logged out", async () => {
    loginHolder.ref!.value = false;
    const w = mountWith({ phrase: "had to" });
    await flushPromises();
    // Voice picker is previewable without auth, plus an inline login CTA that
    // sets expectations that saving follows login before practice can start.
    expect(w.text()).toContain("Choose a coach voice");
    expect(w.find(".voice-picker-stub").exists()).toBe(true);
    expect(w.text()).toContain("Log in & save first");
    expect(w.text()).toContain("needs a saved phrase");
    // Not the save-first flow, and no Start until they log in.
    expect(w.text()).not.toContain("Let's save it");
    expect(w.text()).not.toContain("Start");
    w.unmount();
  });

  it("dispatches the login-window message from the logged-out CTA", async () => {
    loginHolder.ref!.value = false;
    const w = mountWith({ phrase: "had to" });
    await flushPromises();

    // The only button in the logged-out footer is the login CTA.
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

    // Simulate a completed login: the isLogin watch re-checks the saved state.
    // Still unsaved here, so the page lands on the save-first flow.
    loginHolder.ref!.value = true;
    await flushPromises();

    expect(w.text()).not.toContain("Log in & save first");
    expect(w.text()).toContain("Let's save it");
    // The voice picker persists across the transition (never unmounted).
    expect(w.find(".voice-picker-stub").exists()).toBe(true);
    w.unmount();
  });

  it("shows the voice config card immediately when the phrase is already saved", async () => {
    savedHolder.value = { _id: "PID123" };
    const w = mountWith({ phrase: "had to" });
    await flushPromises();
    expect(w.text()).toContain("Choose a coach voice");
    expect(w.find(".save-stub").exists()).toBe(false);
    w.unmount();
  });

  it("Start (premium) opens a dashboard tab for the saved phrase with the chosen voice", async () => {
    savedHolder.value = { _id: "PID123" };
    const w = mountWith({ phrase: "had to" });
    await flushPromises();

    await w.find("button.pilot-btn").trigger("click");

    expect(openHolder.calls).toHaveLength(1);
    // The link carries a base64 LiveSessionRequest with a single-phrase source.
    const session = new URLSearchParams(
      openHolder.calls[0].split("?")[1]
    ).get("session") as string;
    const req = JSON.parse(atob(session));
    expect(req.source).toEqual({ kind: "phrases", phraseIds: ["PID123"] });
    expect(req.aiCharacter).toBe("Kore");
    w.unmount();
  });

  it("free users with remaining allocation can start (shows sessions left)", async () => {
    savedHolder.value = { _id: "PID123" };
    profileHolder.isFreemium = true;
    profileHolder.freemiumAllocation = {
      allowed_lived_sessions: 3,
      allowed_lived_sessions_used: 1,
    };
    const w = mountWith({ phrase: "had to" });
    await flushPromises();

    expect(w.text()).toContain("2 of 3 free AI sessions left");
    expect(w.text()).not.toContain("Upgrade");

    await w.find("button.pilot-btn").trigger("click");
    expect(openHolder.calls).toHaveLength(1);
    const session = new URLSearchParams(
      openHolder.calls[0].split("?")[1]
    ).get("session") as string;
    expect(JSON.parse(atob(session)).source.phraseIds).toEqual(["PID123"]);
    w.unmount();
  });

  it("free users at their session limit see Upgrade (no session launch)", async () => {
    savedHolder.value = { _id: "PID123" };
    profileHolder.isFreemium = true;
    profileHolder.freemiumAllocation = {
      allowed_lived_sessions: 3,
      allowed_lived_sessions_used: 3,
    };
    const w = mountWith({ phrase: "had to" });
    await flushPromises();

    expect(w.text()).toContain("Upgrade to Premium");
    expect(w.text()).toContain("used all 3 free AI sessions");

    await w.find("button.pilot-btn").trigger("click");
    // Upgrade opens the dashboard subscription settings, not a practice session.
    expect(openHolder.calls).toHaveLength(1);
    expect(openHolder.calls[0]).toContain("/settings/subscription");
    expect(openHolder.calls[0]).not.toContain("session=");
    w.unmount();
  });

  it("premium users just see Start (no allocation note, no upgrade)", async () => {
    savedHolder.value = { _id: "PID123" };
    profileHolder.isFreemium = false;
    const w = mountWith({ phrase: "had to" });
    await flushPromises();
    expect(w.text()).toContain("Start");
    expect(w.text()).not.toContain("Premium");
    expect(w.text()).not.toContain("free AI sessions");
    w.unmount();
  });
});
