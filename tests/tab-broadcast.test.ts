import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendMessageToTabs, isNoReceiverError } from "../src/common/helper/massage";

/**
 * E-03 regression: after a language switch the popup tells every open tab.
 * Tabs without our content scripts (chrome:// pages, tabs opened before the
 * extension loaded) reject with "Receiving end does not exist"; that used to
 * surface as an uncaught error in the popup.
 */
describe("sendMessageToTabs", () => {
  let chromeTabs: any;
  let original: any;
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);

  beforeEach(() => {
    unhandled.length = 0;
    process.on("unhandledRejection", onUnhandled);
    chromeTabs = (globalThis as any).chrome.tabs;
    original = { query: chromeTabs.query, sendMessage: chromeTabs.sendMessage };
  });
  afterEach(() => {
    process.off("unhandledRejection", onUnhandled);
    chromeTabs.query = original.query;
    chromeTabs.sendMessage = original.sendMessage;
  });

  async function settle() {
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
  }

  it("ignores tabs with no receiver and still sends to the others", async () => {
    chromeTabs.query = vi.fn((_q: any, cb: (tabs: any[]) => void) => cb([{ id: 1 }, { id: 2 }, {}]));
    chromeTabs.sendMessage = vi.fn((id: number) =>
      id === 1
        ? Promise.reject(new Error("Could not establish connection. Receiving end does not exist."))
        : Promise.resolve(undefined)
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    sendMessageToTabs({ type: "x" });
    await settle();

    expect(chromeTabs.sendMessage.mock.calls.map((c: any[]) => c[0])).toEqual([1, 2]);
    expect(unhandled).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("logs other errors as a warning, not as an uncaught error", async () => {
    chromeTabs.query = vi.fn((_q: any, cb: (tabs: any[]) => void) => cb([{ id: 3 }]));
    chromeTabs.sendMessage = vi.fn(() => Promise.reject(new Error("Something else")));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    sendMessageToTabs({ type: "x" });
    await settle();

    expect(unhandled).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("works when sendMessage returns nothing (callback form, test shims)", () => {
    chromeTabs.query = vi.fn((_q: any, cb: (tabs: any[]) => void) => cb([{ id: 4 }]));
    chromeTabs.sendMessage = vi.fn(() => undefined);
    expect(() => sendMessageToTabs({ type: "x" })).not.toThrow();
  });

  it("recognises the no-receiver error only", () => {
    expect(isNoReceiverError(new Error("Could not establish connection. Receiving end does not exist."))).toBe(true);
    expect(isNoReceiverError("Receiving end does not exist.")).toBe(true);
    expect(isNoReceiverError(new Error("Extension context invalidated."))).toBe(false);
    expect(isNoReceiverError(undefined)).toBe(false);
  });
});
