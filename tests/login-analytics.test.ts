import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";

// E-03: user_logged-in carries `source`, and a failed login sends
// login_failed with `source` and `reason`.

const { loginMock, tokenRef, getMock, route } = vi.hoisted(() => {
  process.env.ENABLE_PASSWORD_AUTH = "true";
  return {
    loginMock: vi.fn(),
    tokenRef: { current: null as string | null },
    getMock: vi.fn(),
    route: { current: { query: {} as Record<string, unknown> } },
  };
});

vi.mock("vue-router", () => ({ useRoute: () => route.current }));
vi.mock("../src/plugins/modular-rest", async () => {
  const { ref } = await import("vue");
  return {
    authentication: {
      login: loginMock,
      get getToken() {
        return tokenRef.current;
      },
    },
    loginWithLastSession: vi.fn().mockResolvedValue(undefined),
    isLogin: ref(false),
  };
});
vi.mock("../src/popup/helper/http", () => ({ get: getMock, post: vi.fn() }));

import LoginView from "../src/popup/views/LoginView.vue";
import {
  googleFailReason,
  loginSourceFrom,
} from "../src/popup/helper/login-analytics";
import { analytic } from "../src/plugins/mixpanel";

const track = vi.mocked(analytic.track);
const eventsNamed = (name: string) =>
  track.mock.calls.filter(([e]) => e === name).map(([, p]) => p);

describe("login analytics helpers", () => {
  it("reads a known source and falls back to popup", () => {
    expect(loginSourceFrom("save_prompt")).toBe("save_prompt");
    expect(loginSourceFrom("practice")).toBe("practice");
    expect(loginSourceFrom(undefined)).toBe("popup");
    expect(loginSourceFrom("evil")).toBe("popup");
    expect(loginSourceFrom(["save_prompt"])).toBe("popup");
  });

  it("maps a closed Google window to window_closed, the rest to google_error", () => {
    expect(googleFailReason({ message: "The user did not approve access." })).toBe(
      "window_closed"
    );
    expect(googleFailReason(new Error("No access_token found"))).toBe(
      "google_error"
    );
    expect(googleFailReason(undefined)).toBe("google_error");
  });
});

describe("LoginView login events", () => {
  let wrapper: VueWrapper | null = null;
  let authFlow: (cb: (url?: string) => void) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    tokenRef.current = null;
    route.current = { query: { source: "save_prompt" } };
    (chrome as any).identity = {
      getRedirectURL: () => "https://id.chromiumapp.org/",
      launchWebAuthFlow: (_: unknown, cb: (url?: string) => void) =>
        authFlow(cb),
    };
    authFlow = (cb) => cb("https://id.chromiumapp.org/#access_token=g-token");
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    (chrome.runtime as any).lastError = undefined;
  });

  async function mountView() {
    wrapper = mount(LoginView, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
    });
    await flushPromises();
    return wrapper;
  }

  const googleButton = (w: VueWrapper) =>
    w.findAll("button").find((b) => b.text().includes("Google Account"))!;

  async function submitPassword(w: VueWrapper) {
    await w.find('[data-testid="open-password-form"]').trigger("click");
    await w.find('[data-testid="password-email"]').setValue("a@b.co");
    await w.find('[data-testid="password-value"]').setValue("password123");
    await w.find('[data-testid="password-form"]').trigger("submit");
    await flushPromises();
  }

  it("user_logged-in carries the source from the route", async () => {
    getMock.mockResolvedValue({ status: "success", token: "jwt" });
    const w = await mountView();
    await googleButton(w).trigger("click");
    await flushPromises();

    expect(eventsNamed("user_logged-in")).toEqual([{ source: "save_prompt" }]);
    expect(eventsNamed("login_failed")).toEqual([]);
  });

  it("no source on the route counts as popup", async () => {
    route.current = { query: {} };
    loginMock.mockImplementation(async () => {
      tokenRef.current = "jwt";
    });
    const w = await mountView();
    await submitPassword(w);

    expect(eventsNamed("user_logged-in")).toEqual([{ source: "popup" }]);
  });

  it("closing the Google window sends login_failed window_closed", async () => {
    authFlow = (cb) => {
      (chrome.runtime as any).lastError = {
        message: "The user did not approve access.",
      };
      cb(undefined);
    };
    const w = await mountView();
    await googleButton(w).trigger("click");
    await flushPromises();

    expect(eventsNamed("login_failed")).toEqual([
      { source: "save_prompt", reason: "window_closed" },
    ]);
    expect(getMock).not.toHaveBeenCalled();
  });

  it("a server error after Google sends login_failed server_error", async () => {
    route.current = { query: { source: "practice" } };
    getMock.mockRejectedValue(new Error("HTTP error! status: 500"));
    const w = await mountView();
    await googleButton(w).trigger("click");
    await flushPromises();

    expect(eventsNamed("login_failed")).toEqual([
      { source: "practice", reason: "server_error" },
    ]);
    expect(eventsNamed("user_logged-in")).toEqual([]);
  });

  it("a server reply with no token is a failure, not a login", async () => {
    getMock.mockResolvedValue({ status: "error" });
    const w = await mountView();
    await googleButton(w).trigger("click");
    await flushPromises();

    expect(eventsNamed("login_failed")).toEqual([
      { source: "save_prompt", reason: "server_error" },
    ]);
    expect(eventsNamed("user_logged-in")).toEqual([]);
  });

  it("a rejected password login sends login_failed server_error", async () => {
    loginMock.mockRejectedValue({ status: false, error: "Wrong creds" });
    const w = await mountView();
    await submitPassword(w);

    expect(eventsNamed("login_failed")).toEqual([
      { source: "save_prompt", reason: "server_error" },
    ]);
  });
});
