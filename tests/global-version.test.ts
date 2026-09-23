import { describe, it, expect, afterEach } from "vitest";
import { getExtensionVersion, VERSION } from "../src/common/static/global";

// getExtensionVersion drives the "vX.Y.Z" line shown in the popup Home footer.
// It must prefer the manifest's version_name (full semver incl. prerelease
// channel) over the numeric version, and degrade gracefully when there's no
// real extension runtime (the Vitest chrome shim has no getManifest).
describe("getExtensionVersion", () => {
  const runtime = (globalThis as any).chrome.runtime;

  afterEach(() => {
    // The shim is shared across files — don't leak a getManifest into it.
    delete runtime.getManifest;
  });

  it("prefers version_name when present (prerelease build)", () => {
    runtime.getManifest = () => ({
      version: "1.15.1.2",
      version_name: "1.15.1-dev.2",
    });
    expect(getExtensionVersion()).toBe("1.15.1-dev.2");
  });

  it("falls back to numeric version on a stable build", () => {
    runtime.getManifest = () => ({ version: "1.15.1" });
    expect(getExtensionVersion()).toBe("1.15.1");
  });

  it("falls back to the package.json VERSION outside an extension context", () => {
    // No getManifest on the shim → call throws → catch returns VERSION.
    expect(runtime.getManifest).toBeUndefined();
    expect(getExtensionVersion()).toBe(VERSION);
  });
});
