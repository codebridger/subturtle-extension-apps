import { vi } from "vitest";

// Hand-rolled chrome.* shim. The production code touches a small surface
// of chrome APIs at module load (settings store registers onMessage /
// onChanged listeners) plus on-demand calls (sendMessage, tabs.query,
// storage.local.get/set, i18n.getUILanguage). Keep this minimal — tests
// override individual fns with vi.fn() when they need specific behaviour.
function makeChromeShim() {
  return {
    runtime: {
      sendMessage: vi.fn(
        (_message: any, callback?: (response: any) => void) => {
          if (callback) callback({});
          return Promise.resolve({});
        }
      ),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
      lastError: undefined as { message?: string } | undefined,
      getURL: vi.fn((p: string) => `chrome-extension://test${p}`),
    },
    storage: {
      local: {
        get: vi.fn((_key: any, callback: (data: any) => void) => callback({})),
        set: vi.fn(
          (_obj: any, callback?: () => void) => callback && callback()
        ),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    tabs: {
      query: vi.fn((_q: any, callback: (tabs: any[]) => void) => callback([])),
      sendMessage: vi.fn(),
    },
    i18n: {
      getUILanguage: vi.fn(() => "en-US"),
    },
  };
}

(globalThis as any).chrome = makeChromeShim();

// Production code uses analytics + dotenv-injected mixpanel token. In tests
// we never want network traffic, so neutralize the module entirely.
vi.mock("mixpanel-browser", () => ({
  default: {
    init: vi.fn(),
    register: vi.fn(),
    track: vi.fn(),
  },
}));

// Silence noisy console.log from src/common/helper/log.ts during tests.
vi.spyOn(console, "log").mockImplementation(() => {});
