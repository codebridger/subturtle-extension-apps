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

// useProfileStore is invoked in updateIsLogin's registered-user branch and in
// logout(). Keep a stable reference so tests can assert calls — returning a
// fresh object per useProfileStore() invocation would scatter spies across
// throwaway objects.
const profileStore = {
  bootstrap: vi.fn(),
  logout: vi.fn(),
};
vi.mock("../src/stores/profile", () => ({
  useProfileStore: () => profileStore,
}));

// Mixpanel is wired everywhere via the analytic singleton; in tests we don't
// want network or to require dotenv-injected env vars.
const analyticMock = {
  identify: vi.fn(),
  track: vi.fn(),
  register: vi.fn(),
  reset: vi.fn(),
  people: { set: vi.fn() },
};
vi.mock("../src/plugins/mixpanel", () => ({
  analytic: analyticMock,
}));

function getSendMessageMock() {
  return (globalThis as any).chrome.runtime.sendMessage as ReturnType<
    typeof vi.fn
  >;
}

// chrome.runtime.onMessage.addListener is registered at module import; grab
// the most recently registered handler (after vi.resetModules + re-import).
function getRuntimeOnMessageListener() {
  const addListener = (globalThis as any).chrome.runtime.onMessage
    .addListener as ReturnType<typeof vi.fn>;
  const lastCall = addListener.mock.calls.at(-1);
  if (!lastCall) throw new Error("modular-rest did not register onMessage");
  return lastCall[0] as (request: any, sender?: any) => void;
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

function storeTokenCalls() {
  return getSendMessageMock().mock.calls.filter(
    ([m]) => m && (m as any).type === MESSAGE_TYPE.STORE_USER_TOKEN
  );
}

describe("loginWithLastSession", () => {
  let mod: typeof import("../src/plugins/modular-rest");

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

    profileStore.bootstrap.mockReset();
    profileStore.bootstrap.mockResolvedValue(undefined);
    profileStore.logout.mockReset();

    analyticMock.identify.mockReset();
    analyticMock.reset.mockReset();
    analyticMock.people.set.mockReset();

    getSendMessageMock().mockReset();
    stubBackgroundLoginStatus(null);
    (globalThis as any).chrome.tabs.sendMessage.mockReset?.();

    // Re-import the plugin fresh each test so the chrome.runtime.onMessage
    // listener doesn't accumulate.
    vi.resetModules();
    mod = await import("../src/plugins/modular-rest");

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  describe("anonymous fallback", () => {
    it("falls through to anonymous login when no token is stored", async () => {
      auth.loginAsAnonymous.mockImplementation(async () => {
        auth.isLogin = true;
        auth.user = { id: "anon-1", type: "anonymous" };
        auth.getToken = "anon-token-abc";
        return { token: "anon-token-abc" };
      });

      await mod.loginWithLastSession();
      await new Promise((r) => setTimeout(r, 0));

      expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);
    });

    it("persists the new anonymous token to chrome.storage.sync via background", async () => {
      auth.loginAsAnonymous.mockImplementation(async () => {
        auth.isLogin = true;
        auth.user = { id: "anon-1", type: "anonymous" };
        auth.getToken = "anon-token-abc";
        return { token: "anon-token-abc" };
      });

      await mod.loginWithLastSession();
      await new Promise((r) => setTimeout(r, 0));

      // The "no token" path emits two StoreUserTokenMessages: the wrapper
      // logout() that runs because authentication.isLogin was still false
      // sends StoreUserTokenMessage(null) first, then the anon-fallback .then
      // in the finally writes the fresh anon token. Only the LAST write
      // matters — the background's chrome.storage.sync ends up populated.
      // (The localStorage write at modular-rest.ts:173-175 is commented out
      //  because of the dashboard-origin clobber bug — so we don't assert on
      //  localStorage here.)
      const calls = storeTokenCalls();
      expect(calls.length).toBeGreaterThanOrEqual(1);
      const last = calls.at(-1)![0] as StoreUserTokenMessage;
      expect(last.token).toBe("anon-token-abc");
    });

    it("logs an error and does not crash when loginAsAnonymous itself rejects", async () => {
      auth.loginAsAnonymous.mockRejectedValue(new Error("network down"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(mod.loginWithLastSession()).resolves.toBeUndefined();
      await new Promise((r) => setTimeout(r, 0));

      expect(errSpy).toHaveBeenCalledWith(
        "Subturtle anonymous login failed",
        expect.any(Error)
      );
      expect(storeTokenCalls().some(([m]) => (m as any).token !== null)).toBe(
        false
      );
    });
  });

  describe("stored anonymous token", () => {
    // FIXME: this pins the current behavior introduced in commit 6aff7ed
    // (`tweak on login steps from initial moment`) which added an
    // `if (user.type == "anonymous") authentication.logout()` block at
    // src/plugins/modular-rest.ts:122-124. That contradicts the comment block
    // at src/plugins/modular-rest.ts:130-139 (kept from the prior
    // logout-cascade fix in 825db93) which still claims anon users hold a
    // valid session at the outer .then. If you decide the comment is the
    // intended behavior, drop the inner logout — and update this test to
    // assert no re-roll, no null broadcast, isLogin remains true.
    it("re-rolls the anonymous session when a stored anon token is returned", async () => {
      stubBackgroundLoginStatus("stale-anon");
      auth.loginWithToken.mockImplementation(async (token: string) => {
        auth.isLogin = true;
        auth.user = { id: "anon-1", type: "anonymous" };
        auth.getToken = token;
        return auth.user;
      });
      auth.loginAsAnonymous.mockImplementation(async () => {
        auth.isLogin = true;
        auth.user = { id: "anon-2", type: "anonymous" };
        auth.getToken = "fresh-anon";
        return { token: "fresh-anon" };
      });

      await mod.loginWithLastSession();
      await new Promise((r) => setTimeout(r, 0));

      expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);
      const last = storeTokenCalls().at(-1)![0] as StoreUserTokenMessage;
      expect(last.token).toBe("fresh-anon");
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

      // The plugin's promise chain doesn't catch loginWithToken rejections,
      // so the rejection propagates out. The .finally anon-fallback still
      // runs first.
      await mod.loginWithLastSession().catch(() => undefined);
      await new Promise((r) => setTimeout(r, 0));

      expect(auth.logout).toHaveBeenCalled();
      expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);
      const last = storeTokenCalls().at(-1)?.[0] as
        | StoreUserTokenMessage
        | undefined;
      expect(last?.token).toBe("fresh-anon");
    });
  });

  describe("registered user", () => {
    it("keeps the session and bootstraps the profile store on a valid registered token", async () => {
      stubBackgroundLoginStatus("user-token");
      auth.loginWithToken.mockImplementation(async (token: string) => {
        auth.isLogin = true;
        auth.user = { id: "user-1", type: "user", email: "x@y.z" };
        auth.getToken = token;
        return auth.user;
      });

      await mod.loginWithLastSession();
      await new Promise((r) => setTimeout(r, 0));

      expect(profileStore.bootstrap).toHaveBeenCalledTimes(1);
      expect(analyticMock.identify).toHaveBeenCalledWith("user-1");
      expect(analyticMock.people.set).toHaveBeenCalledWith({ $email: "x@y.z" });
      expect(mod.isLogin.value).toBe(true);

      // No anon re-roll, no clear-broadcast.
      expect(auth.loginAsAnonymous).not.toHaveBeenCalled();
      expect(
        storeTokenCalls().some(([m]) => (m as any).token === null)
      ).toBe(false);
    });

    // This is the regression the comment block at modular-rest.ts:130-139
    // describes: when updateIsLogin returns falsy (here: bootstrap rejected
    // and the .catch returns false) but authentication.isLogin is still
    // true, we MUST NOT broadcast logout — that would clear chrome.storage
    // .sync and 412 the next translate.
    it("does not broadcast logout when bootstrap rejects but the token is valid", async () => {
      stubBackgroundLoginStatus("user-token");
      auth.loginWithToken.mockImplementation(async (token: string) => {
        auth.isLogin = true;
        auth.user = { id: "user-1", type: "user", email: "x@y.z" };
        auth.getToken = token;
        return auth.user;
      });
      profileStore.bootstrap.mockRejectedValue(new Error("network down"));

      await mod.loginWithLastSession();
      await new Promise((r) => setTimeout(r, 0));

      expect(auth.isLogin).toBe(true);
      expect(auth.loginAsAnonymous).not.toHaveBeenCalled();
      expect(
        storeTokenCalls().some(([m]) => (m as any).token === null)
      ).toBe(false);
    });
  });
});

describe("recoverSession (withAuthRetry's system-wide recovery)", () => {
  let mod: typeof import("../src/plugins/modular-rest");

  beforeEach(async () => {
    setActivePinia(createPinia());
    auth.isLogin = false;
    auth.user = null;
    auth.getToken = null;
    auth.loginAsAnonymous.mockReset();
    auth.logout.mockReset();
    auth.logout.mockImplementation(() => {
      auth.isLogin = false;
      auth.user = null;
      auth.getToken = null;
    });

    profileStore.logout.mockReset();
    analyticMock.reset.mockReset();

    getSendMessageMock().mockReset();
    stubBackgroundLoginStatus(null);
    (globalThis as any).chrome.tabs.sendMessage.mockReset?.();

    vi.resetModules();
    mod = await import("../src/plugins/modular-rest");

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("tears a registered session down (logout) then re-establishes anonymous", async () => {
    // A registered user whose token just died: must be fully torn down so no
    // phantom logged-in state lingers, then downgraded to a fresh anon session.
    auth.isLogin = true;
    auth.user = { id: "user-1", type: "user", email: "x@y.z" };
    auth.getToken = "dead-token";
    auth.loginAsAnonymous.mockImplementation(async () => {
      auth.isLogin = true;
      auth.user = null;
      auth.getToken = "fresh-anon";
      return { token: "fresh-anon" };
    });

    const ok = await mod.recoverSession();
    await new Promise((r) => setTimeout(r, 0));

    // logout() teardown ran first...
    expect(auth.logout).toHaveBeenCalled();
    expect(profileStore.logout).toHaveBeenCalled();
    expect(analyticMock.reset).toHaveBeenCalled();
    // ...then a fresh anonymous session was established and persisted.
    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);
    expect(ok).toBe(true);
    const last = storeTokenCalls().at(-1)?.[0] as StoreUserTokenMessage;
    expect(last.token).toBe("fresh-anon");
    // A clear-broadcast (null) preceded the fresh-token write.
    expect(storeTokenCalls().some(([m]) => (m as any).token === null)).toBe(
      true
    );
  });

  it("for an anonymous session, skips the logout teardown and just re-auths", async () => {
    // The common stale-anon-token case: `user` is null. No registered identity
    // to reset, so no logout broadcast that would re-roll other tabs' sessions.
    auth.isLogin = false;
    auth.user = null;
    auth.getToken = null;
    auth.loginAsAnonymous.mockImplementation(async () => {
      auth.isLogin = true;
      auth.getToken = "fresh-anon";
      return { token: "fresh-anon" };
    });

    const ok = await mod.recoverSession();
    await new Promise((r) => setTimeout(r, 0));

    expect(auth.logout).not.toHaveBeenCalled();
    expect(profileStore.logout).not.toHaveBeenCalled();
    expect(analyticMock.reset).not.toHaveBeenCalled();
    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);
    expect(ok).toBe(true);
    // No clear-broadcast — only the fresh-token write.
    expect(storeTokenCalls().some(([m]) => (m as any).token === null)).toBe(
      false
    );
    const last = storeTokenCalls().at(-1)?.[0] as StoreUserTokenMessage;
    expect(last.token).toBe("fresh-anon");
  });

  it("returns false when the anonymous re-auth fails after a registered teardown", async () => {
    auth.isLogin = true;
    auth.user = { id: "user-1", type: "user" };
    auth.loginAsAnonymous.mockRejectedValue(new Error("network down"));

    const ok = await mod.recoverSession();

    expect(auth.logout).toHaveBeenCalled();
    expect(ok).toBe(false);
  });
});

describe("chrome.runtime.onMessage StoreUserTokenMessage listener", () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
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

    profileStore.bootstrap.mockReset();
    profileStore.bootstrap.mockResolvedValue(undefined);
    profileStore.logout.mockReset();
    analyticMock.reset.mockReset();

    getSendMessageMock().mockReset();
    stubBackgroundLoginStatus(null);
    (globalThis as any).chrome.tabs.sendMessage.mockReset?.();

    vi.resetModules();
    await import("../src/plugins/modular-rest");

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("token=null logs the user out without re-broadcasting", async () => {
    auth.isLogin = true;
    auth.user = { id: "user-1", type: "user" };

    const listener = getRuntimeOnMessageListener();
    listener(new StoreUserTokenMessage(null));
    await new Promise((r) => setTimeout(r, 0));

    expect(auth.logout).toHaveBeenCalled();
    expect(profileStore.logout).toHaveBeenCalled();
    expect(analyticMock.reset).toHaveBeenCalled();

    // logout(false) — no broadcast back out (would loop otherwise).
    expect(
      getSendMessageMock().mock.calls.some(
        ([m]) => (m as any)?.type === MESSAGE_TYPE.STORE_USER_TOKEN
      )
    ).toBe(false);
    expect(
      (globalThis as any).chrome.tabs.sendMessage.mock.calls.length
    ).toBe(0);
  });

  it("token=<value> re-enters loginWithLastSession", async () => {
    // Re-entering should hit the GetLoginStatusMessage path. We just verify
    // the GetLoginStatus round-trip happens — full recursion behavior is
    // already covered by the loginWithLastSession suite above. Stub the
    // anon-fallback so the .finally branch doesn't dereference an unstubbed
    // vi.fn() return.
    auth.loginAsAnonymous.mockResolvedValue({ token: "anon" });

    const listener = getRuntimeOnMessageListener();
    listener(new StoreUserTokenMessage("incoming-token"));
    await new Promise((r) => setTimeout(r, 0));

    expect(
      getSendMessageMock().mock.calls.some(
        ([m]) => (m as any)?.type === MESSAGE_TYPE.GET_LOGIN_STATUS
      )
    ).toBe(true);
  });
});
