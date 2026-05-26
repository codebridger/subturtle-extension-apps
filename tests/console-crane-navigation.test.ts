import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Router } from "vue-router";

// The holder keeps module-level state, so reset modules between tests to get a
// fresh, unregistered instance each time.
beforeEach(() => {
  vi.resetModules();
});

const fakeRouter = () => ({ push: vi.fn() }) as unknown as Router;

describe("console-crane navigation holder", () => {
  it("returns null before a router is registered", async () => {
    const { getConsoleCraneRouter } = await import(
      "../src/console-crane/navigation"
    );
    expect(getConsoleCraneRouter()).toBeNull();
  });

  it("returns the registered router after setConsoleCraneRouter", async () => {
    const nav = await import("../src/console-crane/navigation");
    const router = fakeRouter();
    nav.setConsoleCraneRouter(router);
    expect(nav.getConsoleCraneRouter()).toBe(router);
  });

  it("replaces a previously registered router", async () => {
    const nav = await import("../src/console-crane/navigation");
    const first = fakeRouter();
    const second = fakeRouter();
    nav.setConsoleCraneRouter(first);
    nav.setConsoleCraneRouter(second);
    expect(nav.getConsoleCraneRouter()).toBe(second);
  });
});
