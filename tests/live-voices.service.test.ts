import { describe, it, expect, vi, beforeEach } from "vitest";

// Controllable functionProvider mock. The service is a module-level singleton,
// so each test re-imports a fresh module via vi.resetModules().
const { runMock } = vi.hoisted(() => ({ runMock: vi.fn() }));
vi.mock("@modular-rest/client", () => ({
  functionProvider: { run: (...args: any[]) => runMock(...args) },
}));

async function loadService() {
  const mod = await import("../src/common/services/live-voices.service");
  return mod.LiveVoicesService;
}

beforeEach(() => {
  vi.resetModules();
  runMock.mockReset();
});

describe("LiveVoicesService", () => {
  it("fetches once and caches the server list", async () => {
    runMock.mockResolvedValueOnce([{ name: "Kore", label: "Kore" }]);
    const Service = await loadService();

    const first = await Service.instance.getVoices();
    const second = await Service.instance.getVoices();

    expect(first).toEqual([{ name: "Kore", label: "Kore" }]);
    expect(second).toBe(first); // served from cache
    expect(runMock).toHaveBeenCalledTimes(1);
    expect(runMock).toHaveBeenCalledWith({
      name: "get-live-session-voices",
      args: {},
    });
  });

  it("returns an empty list on failure and retries on the next call", async () => {
    runMock.mockRejectedValueOnce(new Error("network"));
    const Service = await loadService();

    const first = await Service.instance.getVoices();
    expect(first).toEqual([]);

    // Failures aren't cached — a later success populates the list.
    runMock.mockResolvedValueOnce([{ name: "Kore", label: "Kore" }]);
    const second = await Service.instance.getVoices();
    expect(second).toEqual([{ name: "Kore", label: "Kore" }]);
    expect(runMock).toHaveBeenCalledTimes(2);
  });
});
