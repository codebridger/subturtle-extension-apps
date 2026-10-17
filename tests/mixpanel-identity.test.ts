import { describe, it, expect, beforeEach, vi } from "vitest";
import { installMemoryChromeStorage } from "./memory-chrome-storage";

// Mixpanel identity and URL privacy (plugins/mixpanel.ts):
// - page load: register only, never $identify or a profile update;
// - the real login: exactly one $identify and one people.set;
// - $device_id is only ever the install id, never mixpanel's random id;
// - the host page's URL and referrer are never sent.

/**
 * A stateful stand-in for mixpanel-browser 2.45, with the behaviour that
 * matters here: init() and reset() set a random distinct_id AND $device_id,
 * and identify() sends `$identify` only when the distinct_id changes.
 */
const fake = vi.hoisted(() => {
  const state = {
    config: null as any,
    props: {} as Record<string, any>,
    tracked: [] as Array<{ event: string; props: Record<string, any> }>,
    peopleSet: [] as any[],
    identifyCalls: 0,
  };
  const random = () => `RANDOM-${Math.random().toString(36).slice(2)}`;
  const mp: any = {
    init: (_token: string, config: any) => {
      state.config = config;
      const id = random();
      state.props = { distinct_id: id, $device_id: id };
    },
    register: (p: Record<string, any>) => Object.assign(state.props, p),
    unregister: (k: string) => delete state.props[k],
    get_property: (k: string) => state.props[k],
    track: (event: string, props: Record<string, any> = {}) =>
      state.tracked.push({ event, props: { ...state.props, ...props } }),
    identify: (id: string) => {
      state.identifyCalls++;
      const previous = state.props.distinct_id;
      state.props.$user_id = id;
      if (!state.props.$device_id) state.props.$device_id = previous;
      state.props.distinct_id = id;
      if (id !== previous) {
        mp.track("$identify", { distinct_id: id, $anon_distinct_id: previous });
      }
    },
    reset: () => {
      const id = random();
      state.props = { distinct_id: id, $device_id: id };
    },
    people: { set: (p: any) => state.peopleSet.push(p) },
  };
  return { state, mp };
});
vi.mock("mixpanel-browser", () => ({ default: fake.mp }));

const INSTALL = "install-1234";
let mem: Record<string, any>;

async function loadPlugin() {
  vi.resetModules();
  return import("../src/plugins/mixpanel");
}

/** Make chrome.storage reads answer later, as Chrome does. */
function asyncStorageReads() {
  const local = chrome.storage.local as any;
  const get = local.get;
  local.get = (keys: any, cb?: (d: any) => void) =>
    cb ? setTimeout(() => get(keys, cb), 0) : get(keys);
}

/** Let the async chrome.storage read (install id) answer. */
const settle = () => new Promise((r) => setTimeout(r, 0));

const identifies = () => fake.state.tracked.filter((t) => t.event === "$identify");

beforeEach(() => {
  mem = installMemoryChromeStorage();
  mem.analyticsAnonymousId = INSTALL;
  (chrome.runtime as any).getManifest = () => ({ version: "1.20.0" });
  fake.state.tracked = [];
  fake.state.peopleSet = [];
  fake.state.identifyCalls = 0;
});

describe("privacy: no host page URL or referrer", () => {
  it("blocks the URL and referrer properties", async () => {
    await loadPlugin();
    expect(fake.state.config.property_blacklist).toEqual([
      "$current_url",
      "$referrer",
      "$referring_domain",
      "$initial_referrer",
      "$initial_referring_domain",
    ]);
  });

  it("keeps the in-memory, no-cookie setup", async () => {
    await loadPlugin();
    expect(fake.state.config.disable_persistence).toBe(true);
    expect(fake.state.config.batch_requests).toBe(false);
  });
});

describe("identity on page load", () => {
  it("never uses mixpanel's random id as $device_id", async () => {
    asyncStorageReads();
    await loadPlugin();
    // Before the install id is read: no device id at all.
    expect(fake.state.props.$device_id).toBeUndefined();
    await settle();
    expect(fake.state.props.$device_id).toBe(INSTALL);
  });

  it("logged out: distinct_id and $device_id are the install id", async () => {
    await loadPlugin();
    await settle();
    expect(fake.state.props).toMatchObject({
      distinct_id: INSTALL,
      $device_id: INSTALL,
      app: "chrome-extension",
      app_version: "1.20.0",
    });
    expect(fake.state.props.$user_id).toBeUndefined();
  });

  it("logged in: registers the user with the install id, no $identify, no profile update", async () => {
    const mp = await loadPlugin();
    await settle();
    mp.setAnalyticsUser("user-1");

    expect(fake.state.props).toMatchObject({
      distinct_id: "user-1",
      $user_id: "user-1",
      $device_id: INSTALL,
    });
    expect(fake.state.identifyCalls).toBe(0);
    expect(identifies()).toEqual([]);
    expect(fake.state.peopleSet).toEqual([]);
  });

  it("logged in before the install id is read: the install id still becomes $device_id", async () => {
    asyncStorageReads();
    const mp = await loadPlugin();
    mp.setAnalyticsUser("user-1"); // session restored first
    expect(fake.state.props.$device_id).toBeUndefined();
    await settle();
    expect(fake.state.props).toMatchObject({
      distinct_id: "user-1",
      $user_id: "user-1",
      $device_id: INSTALL,
    });
  });

  it("three page loads logged in send no $identify", async () => {
    for (let i = 0; i < 3; i++) {
      const mp = await loadPlugin();
      await settle();
      mp.setAnalyticsUser("user-1");
    }
    expect(identifies()).toEqual([]);
    expect(fake.state.peopleSet).toEqual([]);
  });
});

describe("the real login", () => {
  it("sends exactly one $identify from the install id, and one profile update", async () => {
    const mp = await loadPlugin();
    await settle();
    // The session restore inside the login runs first and registers the user.
    mp.setAnalyticsUser("user-1");
    await mp.identifyAtLogin("user-1", "a@b.co");

    expect(identifies()).toHaveLength(1);
    expect(identifies()[0].props).toMatchObject({
      distinct_id: "user-1",
      $anon_distinct_id: INSTALL,
      $device_id: INSTALL,
    });
    expect(fake.state.peopleSet).toEqual([{ $email: "a@b.co" }]);
    expect(fake.state.props).toMatchObject({
      distinct_id: "user-1",
      $user_id: "user-1",
      $device_id: INSTALL,
    });
  });

  it("waits for the install id when the page is young", async () => {
    const mp = await loadPlugin();
    await mp.identifyAtLogin("user-1", "a@b.co");
    expect(identifies()[0].props.$anon_distinct_id).toBe(INSTALL);
    expect(fake.state.props.$device_id).toBe(INSTALL);
  });
});

describe("logout", () => {
  it("after a user: a new install id, no user, app and app_version kept, no random $device_id", async () => {
    const mp = await loadPlugin();
    await settle();
    mp.setAnalyticsUser("user-1");
    mp.resetAnalyticsIdentity();

    const newId = mem.analyticsAnonymousId;
    expect(newId).not.toBe(INSTALL);
    expect(fake.state.props).toMatchObject({
      distinct_id: newId,
      $device_id: newId,
      app: "chrome-extension",
      app_version: "1.20.0",
    });
    expect(fake.state.props.$user_id).toBeUndefined();
    expect(String(fake.state.props.$device_id)).not.toMatch(/^RANDOM-/);
  });

  it("with no user: keeps the install id", async () => {
    const mp = await loadPlugin();
    await settle();
    mp.resetAnalyticsIdentity();
    await settle();
    expect(mem.analyticsAnonymousId).toBe(INSTALL);
    expect(fake.state.props).toMatchObject({ distinct_id: INSTALL, $device_id: INSTALL });
  });

  it("a later page load is not linked to the old user", async () => {
    const mp = await loadPlugin();
    await settle();
    mp.setAnalyticsUser("user-1");
    mp.resetAnalyticsIdentity();
    mp.analytic.track("word-detail-page_viewed");
    const last = fake.state.tracked.at(-1)!;
    expect(last.props.$user_id).toBeUndefined();
    expect(last.props.distinct_id).toBe(mem.analyticsAnonymousId);
  });
});
