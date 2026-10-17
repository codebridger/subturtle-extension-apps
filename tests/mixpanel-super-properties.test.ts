import { describe, it, expect, beforeEach, vi } from "vitest";

// Every event carries `app` (the type of app) and `app_version` (its version)
// as super properties, the same names as extension_installed / extension_updated.

const manifest = vi.hoisted(() => {
  const m: Record<string, any> = { version: "1.20.0.3", version_name: "1.20.0-dev.3" };
  (globalThis as any).chrome.runtime.getManifest = () => m;
  return m;
});

import mixpanel from "mixpanel-browser";
import { extensionVersion, resetAnalyticsIdentity } from "../src/plugins/mixpanel";

const register = vi.mocked(mixpanel.register);

describe("mixpanel super properties", () => {
  it("registers app and version when the module loads", () => {
    expect(register).toHaveBeenCalledWith({
      app: "chrome-extension",
      app_version: "1.20.0-dev.3",
    });
  });

  describe("after load", () => {
    beforeEach(() => {
      register.mockClear();
      vi.mocked(mixpanel.get_property).mockReturnValue(undefined);
    });

    it("registers them again after resetAnalyticsIdentity (reset clears them)", () => {
      resetAnalyticsIdentity();
      expect(mixpanel.reset).toHaveBeenCalled();
      expect(register).toHaveBeenCalledWith({
        app: "chrome-extension",
        app_version: "1.20.0-dev.3",
      });
    });

    it("uses manifest.version on a stable build (no version_name)", () => {
      delete manifest.version_name;
      expect(extensionVersion()).toBe("1.20.0.3");
      manifest.version_name = "1.20.0-dev.3";
    });

    it("never throws without an extension context, and still registers app", () => {
      const original = (chrome.runtime as any).getManifest;
      (chrome.runtime as any).getManifest = () => {
        throw new Error("Extension context invalidated.");
      };
      try {
        expect(extensionVersion()).toBeUndefined();
        expect(() => resetAnalyticsIdentity()).not.toThrow();
        expect(register).toHaveBeenCalledWith({ app: "chrome-extension" });
      } finally {
        (chrome.runtime as any).getManifest = original;
      }
    });
  });
});
