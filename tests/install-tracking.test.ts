import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  handleInstalled,
  welcomeUrl,
} from "../src/common/helper/install-tracking";
import { ANON_ID_KEY } from "../src/common/helper/install-id";

// E-02: chrome.runtime.onInstalled tracks extension_installed /
// extension_updated on the install id, and opens the welcome page on install.

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function memoryChromeStorage() {
  const mem: Record<string, any> = {};
  vi.mocked(chrome.storage.local.get).mockImplementation(((
    key: string,
    cb: (d: any) => void
  ) => cb(key in mem ? { [key]: mem[key] } : {})) as any);
  vi.mocked(chrome.storage.local.set).mockImplementation(((
    obj: Record<string, any>,
    cb?: () => void
  ) => {
    Object.assign(mem, obj);
    cb?.();
  }) as any);
  return mem;
}

/** Decode the events posted to the mixpanel /track endpoint. */
function sentEvents(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.map(([url, init]) => {
    const data = new URLSearchParams(init.body).get("data")!;
    const bin = atob(data);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return { url, ...JSON.parse(new TextDecoder().decode(bytes)) };
  });
}

describe("handleInstalled (background)", () => {
  let mem: Record<string, any>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let manifest: Record<string, any>;
  const tabsCreate = vi.fn(async (_: any) => ({}));

  beforeEach(() => {
    mem = memoryChromeStorage();
    manifest = { version: "1.18.0", update_url: "https://clients2.google.com/" };
    (chrome.runtime as any).getManifest = () => manifest;
    (chrome.tabs as any).create = tabsCreate;
    tabsCreate.mockClear();
    fetchMock = vi.fn(async () => new Response("1"));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("MIXPANEL_PROJECT_TOKEN", "test-token");
    vi.stubEnv("MIXPANEL_API_HOST", "https://proxy.test/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("on install: creates the install id, opens the welcome page, tracks extension_installed", async () => {
    await handleInstalled({ reason: "install" } as any);

    const id = mem[ANON_ID_KEY];
    expect(id).toMatch(UUID_V4);

    expect(tabsCreate).toHaveBeenCalledWith({
      url: `https://subturtle.app/?install_id=${id}&utm_source=extension&utm_medium=install`,
    });

    const [e] = sentEvents(fetchMock);
    expect(e.url).toBe("https://proxy.test/track/?ip=1");
    expect(e.event).toBe("extension_installed");
    expect(e.properties).toMatchObject({
      token: "test-token",
      distinct_id: id,
      $device_id: id,
      app: "chrome-extension",
      app_version: "1.18.0",
      reason: "install",
    });
  });

  it("reuses an install id that already exists", async () => {
    mem[ANON_ID_KEY] = "existing-id";
    await handleInstalled({ reason: "install" } as any);
    expect(mem[ANON_ID_KEY]).toBe("existing-id");
    expect(sentEvents(fetchMock)[0].properties.distinct_id).toBe("existing-id");
  });

  it("on update: tracks extension_updated with previous_app_version and opens nothing", async () => {
    mem[ANON_ID_KEY] = "existing-id";
    await handleInstalled({ reason: "update", previousVersion: "1.17.0" } as any);

    expect(tabsCreate).not.toHaveBeenCalled();
    const [e] = sentEvents(fetchMock);
    expect(e.event).toBe("extension_updated");
    expect(e.properties).toMatchObject({
      distinct_id: "existing-id",
      previous_app_version: "1.17.0",
      app_version: "1.18.0",
    });
  });

  it("ignores a Chrome update", async () => {
    await handleInstalled({ reason: "chrome_update" } as any);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(tabsCreate).not.toHaveBeenCalled();
  });

  it("an unpacked build still tracks the install but opens no tab", async () => {
    delete manifest.update_url;
    await handleInstalled({ reason: "install" } as any);
    expect(tabsCreate).not.toHaveBeenCalled();
    expect(sentEvents(fetchMock)[0].event).toBe("extension_installed");
  });

  it("a failed analytics request does not throw", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await expect(handleInstalled({ reason: "install" } as any)).resolves.toBeUndefined();
    expect(tabsCreate).toHaveBeenCalled();
  });

  it("builds the welcome URL with encoded params", () => {
    expect(welcomeUrl("a b")).toBe(
      "https://subturtle.app/?install_id=a+b&utm_source=extension&utm_medium=install"
    );
  });
});
