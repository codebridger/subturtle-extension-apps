import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import {
  MESSAGE_TYPE,
  StoreUserTokenMessage,
  type LoginStatusResponse,
} from "../src/common/types/messaging";

// Controllable @modular-rest/client mock. The plugin module under test reads
// `authentication.{isLogin,user,getToken}` and calls
// `loginWithToken|loginAsAnonymous|logout`. We expose hooks so each test can
// shape the auth state before exercising loginWithLastSession.
const auth = {
  isLogin: false,
  user: null as null | { id: string; type: string; email?: string },
  getToken: null as string | null,
  loginWithToken: vi.fn(),
  loginAsAnonymous: vi.fn(),
  logout: vi.fn(() => {
    auth.isLogin = false;
    auth.user = null;
    auth.getToken = null;
  }),
};

vi.mock("@modular-rest/client", () => ({
  GlobalOptions: { set: vi.fn() },
  authentication: auth,
  dataProvider: {},
  fileProvider: {},
  functionProvider: { run: vi.fn() },
}));

// useProfileStore is only invoked inside updateIsLogin's registered-user
// branch and inside logout(); the anon flow doesn't hit those, but logout() is
// still called when the token truly fails to validate. Keep it as a no-op so
// it doesn't pull in the sibling dashboard-app type imports at module load.
vi.mock("../src/stores/profile", () => ({
  useProfileStore: () => ({
    logout: vi.fn(),
    bootstrap: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mixpanel is wired everywhere via the analytic singleton; in tests we don't
// want network or to require dotenv-injected env vars.
vi.mock("../src/plugins/mixpanel", () => ({
  analytic: {
    identify: vi.fn(),
    track: vi.fn(),
    register: vi.fn(),
    reset: vi.fn(),
    people: { set: vi.fn() },
  },
}));

// Capture chrome.runtime.sendMessage so we can assert what crosses to the
// background. The setup.ts shim makes it a vi.fn() that resolves with {}.
function getSendMessageMock() {
  return (globalThis as any).chrome.runtime.sendMessage as ReturnType<
    typeof vi.fn
  >;
}

// Make chrome.runtime.sendMessage shape its response based on which message
// type was passed. GetLoginStatusMessage callers expect {status, token},
// everyone else can get the default {} from the setup shim.
function stubBackgroundLoginStatus(token: string | null) {
  const sendMessage = getSendMessageMock();
  sendMessage.mockImplementation(
    (message: any, callback?: (response: any) => void) => {
      if (message?.type === MESSAGE_TYPE.GET_LOGIN_STATUS) {
        const response: LoginStatusResponse = {
          status: !!token,
          ...(token ? { token } : {}),
        };
        callback?.(response);
        return Promise.resolve(response);
      }
      callback?.({});
      return Promise.resolve({});
    }
  );
}

describe("loginWithLastSession (anonymous flow)", () => {
  let loginWithLastSession: typeof import("../src/plugins/modular-rest").loginWithLastSession;

  beforeEach(async () => {
    setActivePinia(createPinia());

    // Reset auth state.
    auth.isLogin = false;
    auth.user = null;
    auth.getToken = null;
    auth.loginWithToken.mockReset();
    auth.loginAsAnonymous.mockReset();
    auth.logout.mockReset();
    auth.logout.mockImplementation(() => {
      auth.isLogin = false;
      auth.user = null;
      auth.getToken = null;
    });

    // Reset the chrome shim default.
    getSendMessageMock().mockReset();
    stubBackgroundLoginStatus(null);

    // Reset localStorage between tests (happy-dom gives us a real one).
    localStorage.clear();

    // Re-import the plugin fresh each test so the chrome.runtime.onMessage
    // listener doesn't accumulate.
    vi.resetModules();
    const mod = await import("../src/plugins/modular-rest");
    loginWithLastSession = mod.loginWithLastSession;

    // Suppress noisy console output from the plugin's anon-login console.log
    // and bootstrap error path.
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("falls through to anonymous login when no token is stored", async () => {
    auth.loginAsAnonymous.mockImplementation(async () => {
      auth.isLogin = true;
      auth.user = { id: "anon-1", type: "anonymous" };
      auth.getToken = "anon-token-abc";
      return { token: "anon-token-abc" };
    });

    await loginWithLastSession();
    // .finally fires the anon login asynchronously; let microtasks settle.
    await new Promise((r) => setTimeout(r, 0));

    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);
  });

  it("persists the new anonymous token to chrome.storage.sync and localStorage", async () => {
    auth.loginAsAnonymous.mockImplementation(async () => {
      auth.isLogin = true;
      auth.user = { id: "anon-1", type: "anonymous" };
      auth.getToken = "anon-token-abc";
      return { token: "anon-token-abc" };
    });

    await loginWithLastSession();
    await new Promise((r) => setTimeout(r, 0));

    // The "no token" path actually emits two StoreUserTokenMessages: the
    // wrapper logout() that runs because authentication.isLogin was still
    // false sends StoreUserTokenMessage(null) first, then the anon-fallback
    // .then in the finally writes the fresh anon token. The end state is
    // what matters — the LAST write must be the new anon token, so the
    // background's chrome.storage.sync ends up populated.
    const sendMessage = getSendMessageMock();
    const storeCalls = sendMessage.mock.calls.filter(
      ([m]) =>
        m && (m as any).type === MESSAGE_TYPE.STORE_USER_TOKEN
    );
    expect(storeCalls.length).toBeGreaterThanOrEqual(1);
    const lastStore = storeCalls[storeCalls.length - 1][0] as StoreUserTokenMessage;
    expect(lastStore.token).toBe("anon-token-abc");

    // localStorage cache for the page itself, mirroring what
    // @modular-rest/client's authentication.saveSession() would do.
    expect(localStorage.getItem("token")).toBe("anon-token-abc");
  });

  it("does NOT broadcast logout when the token validates as an anonymous user", async () => {
    // Background returns a stored anon token (the success path the user hits
    // every fresh popup open).
    stubBackgroundLoginStatus("anon-token-abc");
    auth.loginWithToken.mockImplementation(async (token: string) => {
      auth.isLogin = true;
      auth.user = { id: "anon-1", type: "anonymous" };
      auth.getToken = token;
      return auth.user;
    });

    await loginWithLastSession();
    await new Promise((r) => setTimeout(r, 0));

    // The wrapper logout() would broadcast StoreUserTokenMessage(null) and
    // call authentication.logout(). Neither must happen for an anon session
    // — that's the cascade that wiped chrome.storage.sync and 412'd every
    // subsequent translate before the fix.
    expect(auth.logout).not.toHaveBeenCalled();
    const sendMessage = getSendMessageMock();
    const nullStoreCalls = sendMessage.mock.calls.filter(
      ([m]) =>
        m &&
        (m as any).type === MESSAGE_TYPE.STORE_USER_TOKEN &&
        (m as any).token === null
    );
    expect(nullStoreCalls).toHaveLength(0);

    // And we should NOT have re-rolled an anon login when validation worked.
    expect(auth.loginAsAnonymous).not.toHaveBeenCalled();
  });

  it("falls through to a fresh anon login when a stored token is rejected by the server", async () => {
    stubBackgroundLoginStatus("stale-token");
    auth.loginWithToken.mockImplementation(async () => {
      // modular-rest's internal loginWithToken catch path calls
      // authentication.logout() before rethrowing. Mirror that.
      auth.logout();
      throw new Error("token rejected");
    });
    auth.loginAsAnonymous.mockImplementation(async () => {
      auth.isLogin = true;
      auth.user = { id: "anon-2", type: "anonymous" };
      auth.getToken = "fresh-anon";
      return { token: "fresh-anon" };
    });

    // The plugin's promise chain doesn't catch loginWithToken rejections, so
    // the rejection propagates out of loginWithLastSession. The .finally
    // anon-fallback still runs first. Swallow here so the test asserts on
    // observable side-effects rather than the throw itself.
    await loginWithLastSession().catch(() => undefined);
    await new Promise((r) => setTimeout(r, 0));

    // modular-rest's internal logout fired (mocked above before throwing).
    expect(auth.logout).toHaveBeenCalled();

    // And we fell through to a fresh anon login that overwrites the stale
    // token in chrome.storage.sync with the new one — recovery without the
    // user having to do anything.
    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);

    const sendMessage = getSendMessageMock();
    const storeCalls = sendMessage.mock.calls.filter(
      ([m]) =>
        m && (m as any).type === MESSAGE_TYPE.STORE_USER_TOKEN
    );
    const lastStore = storeCalls[storeCalls.length - 1]?.[0] as
      | StoreUserTokenMessage
      | undefined;
    expect(lastStore?.token).toBe("fresh-anon");
  });
});
