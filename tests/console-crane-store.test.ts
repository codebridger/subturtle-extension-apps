import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// Mock the router so the test doesn't pull in the real page components and
// their service dependencies. We capture every router.push() call to assert
// the encoded params and route name.
const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));
vi.mock("../src/console-crane/router", () => ({
  router: { push: mockPush },
}));

import { useConsoleCraneStore } from "../src/console-crane/stores/console-crane";
import { decodeRouteParams } from "../src/console-crane/route-params";

describe("useConsoleCraneStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockPush.mockReset();
  });

  describe("toggleConsoleCrane", () => {
    it("activates the modal, pushes history, and routes with encoded params", () => {
      const store = useConsoleCraneStore();
      const params = { word: "hello", context: "world" };

      store.toggleConsoleCrane("word-detail", params);

      expect(store.isActive).toBe(true);
      expect(store.history).toHaveLength(1);
      expect(store.history[0]).toEqual({ name: "word-detail", params });

      expect(mockPush).toHaveBeenCalledTimes(1);
      const arg = mockPush.mock.calls[0][0];
      expect(arg.name).toBe("word-detail");
      expect(decodeRouteParams(arg.params.data)).toEqual(params);
    });

    it("flips isActive when called twice without explicit active flag", () => {
      const store = useConsoleCraneStore();

      store.toggleConsoleCrane("empty");
      expect(store.isActive).toBe(true);

      store.toggleConsoleCrane("empty");
      expect(store.isActive).toBe(false);
    });

    it("force-activates when called with active:true even if already active", () => {
      const store = useConsoleCraneStore();
      store.toggleConsoleCrane("word-detail", { word: "a" }, true);
      expect(store.isActive).toBe(true);

      store.toggleConsoleCrane("word-detail", { word: "b" }, true);
      expect(store.isActive).toBe(true);
      expect(store.history).toHaveLength(2);
    });

    it("does not push to history when the page+params are identical", () => {
      const store = useConsoleCraneStore();
      store.toggleConsoleCrane("word-detail", { word: "x" }, true);
      store.toggleConsoleCrane("word-detail", { word: "x" }, true);
      expect(store.history).toHaveLength(1);
    });

    it("survives non-Latin1 params (Unicode-safe encoding)", () => {
      const store = useConsoleCraneStore();
      const params = { word: "سلام", context: "你好 🐢" };

      expect(() =>
        store.toggleConsoleCrane("word-detail", params, true)
      ).not.toThrow();

      const arg = mockPush.mock.calls[0][0];
      expect(decodeRouteParams(arg.params.data)).toEqual(params);
    });
  });

  describe("goBack", () => {
    it("pops history and routes to the previous entry", () => {
      const store = useConsoleCraneStore();
      store.toggleConsoleCrane("word-detail", { word: "first" }, true);
      store.toggleConsoleCrane("word-detail", { word: "second" }, true);
      expect(store.history).toHaveLength(2);

      mockPush.mockClear();
      store.goBack();

      expect(store.history).toHaveLength(1);
      expect(mockPush).toHaveBeenCalledTimes(1);
      const arg = mockPush.mock.calls[0][0];
      expect(decodeRouteParams(arg.params.data)).toEqual({ word: "first" });
    });

    it("is a no-op when history has one entry or fewer", () => {
      const store = useConsoleCraneStore();
      store.goBack();
      expect(mockPush).not.toHaveBeenCalled();

      store.toggleConsoleCrane("empty", undefined, true);
      mockPush.mockClear();

      store.goBack();
      expect(mockPush).not.toHaveBeenCalled();
      expect(store.history).toHaveLength(1);
    });
  });

  describe("derived state", () => {
    it("canGoBack reflects history depth", () => {
      const store = useConsoleCraneStore();
      expect(store.canGoBack).toBe(false);

      store.toggleConsoleCrane("word-detail", { a: 1 }, true);
      expect(store.canGoBack).toBe(false);

      store.toggleConsoleCrane("word-detail", { a: 2 }, true);
      expect(store.canGoBack).toBe(true);
    });

    it("isOnMainPage is true for empty/word-detail and false for settings", () => {
      const store = useConsoleCraneStore();
      expect(store.isOnMainPage).toBe(true); // empty history defaults true

      store.toggleConsoleCrane("word-detail", { a: 1 }, true);
      expect(store.isOnMainPage).toBe(true);

      store.toggleConsoleCrane("settings", undefined, true);
      expect(store.isOnMainPage).toBe(false);
    });
  });

  it("resetHistory clears the stack", () => {
    const store = useConsoleCraneStore();
    store.toggleConsoleCrane("word-detail", { a: 1 }, true);
    store.toggleConsoleCrane("word-detail", { a: 2 }, true);
    store.resetHistory();
    expect(store.history).toEqual([]);
    expect(store.canGoBack).toBe(false);
  });
});
