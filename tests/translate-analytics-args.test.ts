import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// E-01 / E-05: translation calls send the install's analytics id as
// `deviceId` and what asked for them as `trigger`.
const auth = vi.hoisted(() => ({
  user: null as { id: string } | null,
  isLogin: true,
  getToken: "anon-token" as string | null,
  loginAsAnonymous: vi.fn(),
}));

vi.mock("@modular-rest/client", () => ({
  functionProvider: { run: vi.fn() },
  authentication: auth,
}));

import { TranslateService } from "../src/common/services/translate.service";
import { useSettingsStore } from "../src/common/store/settings";
import { ANON_ID_KEY, getInstallId } from "../src/common/helper/install-id";
import { functionProvider } from "@modular-rest/client";

const runMock = functionProvider.run as unknown as ReturnType<typeof vi.fn>;
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** An in-memory chrome.storage.local, since the shared shim stores nothing. */
function memoryChromeStorage() {
  const mem: Record<string, any> = {};
  vi.mocked(chrome.storage.local.get).mockImplementation(((
    key: string,
    cb: (d: any) => void
  ) => setTimeout(() => cb(key in mem ? { [key]: mem[key] } : {}), 0)) as any);
  vi.mocked(chrome.storage.local.set).mockImplementation(((
    obj: Record<string, any>,
    cb?: () => void
  ) => {
    Object.assign(mem, obj);
    setTimeout(() => cb?.(), 0);
  }) as any);
  return mem;
}

function lastArgs() {
  return runMock.mock.calls.at(-1)![0].args;
}

describe("getInstallId", () => {
  let mem: Record<string, any>;
  beforeEach(() => {
    mem = memoryChromeStorage();
  });

  it("returns the stored id", async () => {
    mem[ANON_ID_KEY] = "install-1";
    expect(await getInstallId()).toBe("install-1");
  });

  it("creates and stores one id when there is none, even for parallel callers", async () => {
    const [a, b] = await Promise.all([getInstallId(), getInstallId()]);
    expect(a).toMatch(UUID_V4);
    expect(b).toBe(a);
    expect(mem[ANON_ID_KEY]).toBe(a);
  });

  it("follows a new id written later (logout rotates it)", async () => {
    mem[ANON_ID_KEY] = "before";
    expect(await getInstallId()).toBe("before");
    mem[ANON_ID_KEY] = "after";
    expect(await getInstallId()).toBe("after");
  });

  it("after an extension update cuts off storage, answers the last id it read", async () => {
    mem[ANON_ID_KEY] = "install-7";
    expect(await getInstallId()).toBe("install-7");
    vi.mocked(chrome.storage.local.get).mockImplementation((() => {
      throw new Error("Extension context invalidated.");
    }) as any);
    expect(await getInstallId()).toBe("install-7");
  });

  it("a failed read (lastError) does not mint a new id", async () => {
    mem[ANON_ID_KEY] = "install-8";
    expect(await getInstallId()).toBe("install-8");
    delete mem[ANON_ID_KEY];
    vi.mocked(chrome.storage.local.get).mockImplementation(((
      _key: string,
      cb: (d: any) => void
    ) => {
      (chrome.runtime as any).lastError = { message: "Extension context invalidated." };
      cb(undefined);
      (chrome.runtime as any).lastError = undefined;
    }) as any);
    expect(await getInstallId()).toBe("install-8");
    expect(mem[ANON_ID_KEY]).toBeUndefined();
  });

  it("resolves undefined when storage never worked in this script", async () => {
    vi.resetModules();
    const fresh = await import("../src/common/helper/install-id");
    vi.mocked(chrome.storage.local.get).mockImplementation((() => {
      throw new Error("Extension context invalidated.");
    }) as any);
    expect(await fresh.getInstallId()).toBeUndefined();
  });
});

describe("TranslateService analytics args", () => {
  let mem: Record<string, any>;

  beforeEach(() => {
    setActivePinia(createPinia());
    useSettingsStore().language = "en";
    (TranslateService.instance as any).translationCache = {};
    runMock.mockReset();
    runMock.mockResolvedValue("translated");
    mem = memoryChromeStorage();
    mem[ANON_ID_KEY] = "install-1";
    auth.user = null;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends deviceId and trigger with a simple translation", async () => {
    await TranslateService.instance.fetchSimpleTranslation(
      ["a caption"],
      "",
      "caption"
    );
    expect(runMock.mock.calls.at(-1)![0].name).toBe("translateWithContext");
    expect(lastArgs()).toMatchObject({
      translationType: "simple",
      deviceId: "install-1",
      trigger: "caption",
    });
  });

  it("keeps sending userId for a signed-in user", async () => {
    auth.user = { id: "user-1" };
    await TranslateService.instance.fetchSimpleTranslation("hi", "", "word");
    expect(lastArgs()).toMatchObject({
      userId: "user-1",
      deviceId: "install-1",
      trigger: "word",
    });
  });

  it("sends trigger 'detail' by default with a detailed translation", async () => {
    runMock.mockResolvedValue({ chunks: [] });
    await TranslateService.instance.fetchDetailedTranslation("hello", "ctx");
    expect(lastArgs()).toMatchObject({
      translationType: "detailed",
      deviceId: "install-1",
      trigger: "detail",
    });
  });

  it("waits for a first-run id instead of sending an empty one", async () => {
    delete mem[ANON_ID_KEY];
    await TranslateService.instance.fetchSimpleTranslation(
      "x",
      "",
      "selection"
    );
    expect(lastArgs().deviceId).toMatch(UUID_V4);
    expect(lastArgs().deviceId).toBe(mem[ANON_ID_KEY]);
  });

  it("keeps sending the install id after an update cuts off storage (no anonymous-unknown)", async () => {
    await TranslateService.instance.fetchSimpleTranslation("x", "", "word");
    vi.mocked(chrome.storage.local.get).mockImplementation((() => {
      throw new Error("Extension context invalidated.");
    }) as any);
    await TranslateService.instance.fetchSimpleTranslation("y", "", "word");
    expect(lastArgs().deviceId).toBe("install-1");
  });

  it("sends deviceId with translationAdvice", async () => {
    runMock.mockResolvedValue({ type: "reply", text: "ok" });
    await TranslateService.instance.fetchTranslationAdvice({
      phrase: "p",
      context: "c",
      message: "m",
    });
    expect(runMock.mock.calls.at(-1)![0].name).toBe("translationAdvice");
    expect(lastArgs().deviceId).toBe("install-1");
  });
});
