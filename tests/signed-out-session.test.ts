import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import {
  MESSAGE_TYPE,
  StoreUserTokenMessage,
} from "../src/common/types/messaging";

// Signed-out learners must never send a request that carries a user id but no
// token (seen on the dev API on 2026-10-16: `find-one` → 401 "authentication
// is required", `translateWithContext` → 403 "a function can only act on the
// signed-in user's account", then a re-login and a retry).
//
// The auth mock copies the real @modular-rest/client 1.12 AuthService where it
// matters here: `isLogin` / `getToken` are getters over `token`, `logout()`
// clears the token but NOT `user`, and `loginAsAnonymous()` sets a token but
// no user. The older suites' mocks also cleared `user` on logout, which is
// why they never saw a request with a user id and no token.
const auth = vi.hoisted(() => {
  const a = {
    token: null as string | null,
    user: null as null | { id: string; type: string },
    get isLogin() {
      return !!a.token;
    },
    get getToken() {
      return a.token;
    },
    loginWithToken: vi.fn(),
    loginAsAnonymous: vi.fn(),
    logout: vi.fn(() => {
      a.token = null;
    }),
  };
  return a;
});

// Every request is checked like the server does: no token → 401, a claimed
// account that is not the token's → 403.
const calls = vi.hoisted(
  () => [] as { kind: string; token: string | null; claimed?: string }[]
);
const server = vi.hoisted(() => ({
  tokenOwner: {} as Record<string, string>,
}));

function check(kind: string, claimed: string | undefined) {
  calls.push({ kind, token: auth.token, claimed });
  if (!auth.token) {
    throw { hasError: true, error: "authentication is required" };
  }
  if (claimed && server.tokenOwner[auth.token] !== claimed) {
    throw {
      hasError: true,
      error: {
        status: "error",
        message:
          "FORBIDDEN: a function can only act on the signed-in user's account.",
      },
    };
  }
}

vi.mock("@modular-rest/client", () => ({
  GlobalOptions: { set: vi.fn() },
  authentication: auth,
  fileProvider: {},
  dataProvider: {
    findOne: vi.fn(async (opts: any) => {
      check("find-one", opts?.query?.refId);
      return null;
    }),
  },
  functionProvider: {
    run: vi.fn(async (opts: any) => {
      check(opts.name, opts.args?.userId ?? opts.args?.refId);
      return "translated";
    }),
  },
}));

const profileStore = {
  bootstrap: vi.fn(async () => undefined),
  logout: vi.fn(),
  adoptBootstrap: vi.fn(),
  userDetail: undefined as any,
  isFreemium: false,
  activeSubscription: null as any,
  freemiumAllocation: null as any,
};
vi.mock("../src/stores/profile", () => ({
  useProfileStore: () => profileStore,
}));

vi.mock("../src/plugins/mixpanel", () => ({
  setAnalyticsUser: vi.fn(),
  resetAnalyticsIdentity: vi.fn(),
}));

const ANON_ID = "anon-shared";
let storedToken: string | null = null;
let loginStatusDelay: Promise<void> = Promise.resolve();

function sendMessageMock() {
  return (globalThis as any).chrome.runtime.sendMessage as ReturnType<
    typeof vi.fn
  >;
}

/** The background: GetLoginStatus answers the stored token, StoreUserToken writes it. */
function stubBackground() {
  sendMessageMock().mockImplementation(
    (message: any, callback?: (response: any) => void) => {
      if (message?.type === MESSAGE_TYPE.GET_LOGIN_STATUS) {
        const token = storedToken;
        loginStatusDelay.then(() =>
          callback?.({ status: !!token, ...(token ? { token } : {}) })
        );
        return;
      }
      if (message?.type === MESSAGE_TYPE.STORE_USER_TOKEN) {
        storedToken = message.token;
      }
      callback?.({ status: true });
    }
  );
}

function nullBroadcasts() {
  return sendMessageMock().mock.calls.filter(
    ([m]) => m?.type === MESSAGE_TYPE.STORE_USER_TOKEN && m.token === null
  );
}

// The plugin's chrome.runtime.onMessage listener, captured right after it is
// imported (the settings store adds its own listener later).
let pluginListener: (request: any) => void;
function onMessageListener() {
  return pluginListener;
}

function callsWithUserIdButNoToken() {
  return calls.filter((c) => c.claimed && !c.token);
}

let plugin: typeof import("../src/plugins/modular-rest");
let translate: typeof import("../src/common/services/translate.service");
let phrases: typeof import("../src/common/services/phrase.service");

beforeEach(async () => {
  calls.length = 0;
  auth.token = null;
  auth.user = null;
  server.tokenOwner = {};
  storedToken = null;
  loginStatusDelay = Promise.resolve();

  // The anonymous account is one shared account on the server: every
  // /user/loginAnonymous answers a new token for the same user id.
  let n = 0;
  auth.loginAsAnonymous.mockReset().mockImplementation(async () => {
    const token = `anon-token-${++n}`;
    server.tokenOwner[token] = ANON_ID;
    auth.token = token;
    return { token };
  });
  auth.loginWithToken.mockReset().mockImplementation(async (token: string) => {
    auth.token = token;
    const owner = server.tokenOwner[token];
    if (!owner) {
      auth.logout();
      throw { hasError: true, error: "Precondition Failed" };
    }
    auth.user = { id: owner, type: owner === ANON_ID ? "anonymous" : "user" };
    return auth.user;
  });
  auth.logout.mockClear();

  sendMessageMock().mockReset();
  stubBackground();
  delete (globalThis as any).__subturtlePageOnce;

  vi.resetModules();
  setActivePinia(createPinia());
  plugin = await import("../src/plugins/modular-rest");
  const add = (globalThis as any).chrome.runtime.onMessage
    .addListener as ReturnType<typeof vi.fn>;
  pluginListener = add.mock.calls.at(-1)![0];
  translate = await import("../src/common/services/translate.service");
  phrases = await import("../src/common/services/phrase.service");
  const { useSettingsStore } = await import("../src/common/store/settings");
  useSettingsStore().language = "en";

  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "debug").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("signed out: a stored anonymous token", () => {
  beforeEach(() => {
    storedToken = "anon-token-stored";
    server.tokenOwner[storedToken] = ANON_ID;
  });

  it("is kept: no new anonymous login, no logout broadcast", async () => {
    await plugin.loginWithLastSession();

    expect(auth.token).toBe("anon-token-stored");
    expect(auth.loginAsAnonymous).not.toHaveBeenCalled();
    expect(nullBroadcasts()).toHaveLength(0);
    expect(storedToken).toBe("anon-token-stored");
  });

  it("the first translation goes out with the token and works on the first try", async () => {
    await plugin.loginWithLastSession();
    await translate.TranslateService.instance.fetchSimpleTranslation("hi", "", "selection");

    expect(callsWithUserIdButNoToken()).toEqual([]);
    expect(calls.filter((c) => c.kind === "translateWithContext")).toHaveLength(1);
  });
});

describe("signed out: the popup clears the token in this tab", () => {
  // The popup's own session restore used to drop a stored anonymous token and
  // broadcast StoreUserTokenMessage(null) to every tab. Each content script
  // then ran logout(false), which left the anonymous user id behind and no
  // token. A real logout from the popup sends the same message.
  it("the next translation waits for a token instead of failing first", async () => {
    storedToken = "anon-token-stored";
    server.tokenOwner[storedToken] = ANON_ID;
    await plugin.loginWithLastSession();

    onMessageListener()(new StoreUserTokenMessage(null));
    await new Promise((r) => setTimeout(r, 0));

    await translate.TranslateService.instance.fetchSimpleTranslation("hi", "", "selection");

    expect(callsWithUserIdButNoToken()).toEqual([]);
    expect(calls.filter((c) => !c.token)).toEqual([]);
    expect(calls.filter((c) => c.kind === "translateWithContext")).toHaveLength(1);
  });

  it("logout forgets the user, so nothing can claim it without a token", async () => {
    auth.token = "user-token";
    server.tokenOwner["user-token"] = "user-1";
    auth.user = { id: "user-1", type: "user" };

    onMessageListener()(new StoreUserTokenMessage(null));
    await new Promise((r) => setTimeout(r, 0));

    expect(auth.user).toBeNull();
  });
});

describe("signed out: a call made before the session bootstrap finishes", () => {
  it("waits for the bootstrap's token instead of going out without one", async () => {
    let release!: () => void;
    loginStatusDelay = new Promise<void>((r) => (release = r));

    const boot = plugin.loginWithLastSession();
    const pending = translate.TranslateService.instance.fetchSimpleTranslation(
      "hi",
      "",
      "selection"
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toEqual([]);

    release();
    await boot;
    await pending;

    expect(calls.filter((c) => !c.token)).toEqual([]);
    // One anonymous login: the bootstrap's. The call reused it.
    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);
  });
});

describe("findSavedPhrase", () => {
  it("makes no request for an anonymous user (they have no saved phrases)", async () => {
    storedToken = "anon-token-stored";
    server.tokenOwner[storedToken] = ANON_ID;
    await plugin.loginWithLastSession();
    expect(auth.user?.type).toBe("anonymous");

    expect(await phrases.findSavedPhrase("hello")).toBeNull();
    expect(calls.filter((c) => c.kind === "find-one")).toEqual([]);
  });

  it("makes no request with a user left over after logout", async () => {
    auth.user = { id: ANON_ID, type: "anonymous" };
    auth.token = null;

    expect(await phrases.findSavedPhrase("hello")).toBeNull();
    expect(calls).toEqual([]);
  });

  it("still looks the phrase up for a signed-in user", async () => {
    storedToken = "user-token";
    server.tokenOwner["user-token"] = "user-1";
    await plugin.loginWithLastSession();

    await phrases.findSavedPhrase("hello");
    expect(calls).toEqual([
      { kind: "find-one", token: "user-token", claimed: "user-1" },
    ]);
  });
});
