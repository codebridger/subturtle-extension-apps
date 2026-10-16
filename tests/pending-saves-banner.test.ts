import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, enableAutoUnmount } from "@vue/test-utils";

// save-first E-05: the toolbar popup tells a logged-out learner how many
// phrases wait on this browser; signed in, it carries on the sync.

const { loginRef } = vi.hoisted(() => ({ loginRef: { current: null as any } }));
vi.mock("../src/plugins/modular-rest", async () => {
  const { ref } = await import("vue");
  loginRef.current = ref(false);
  return { isLogin: loginRef.current };
});
const { sync } = vi.hoisted(() => ({ sync: vi.fn() }));
vi.mock("../src/common/services/pending-saves-sync", () => ({
  syncPendingSaves: sync,
}));

import { installMemoryChromeStorage } from "./memory-chrome-storage";
import PendingSavesBanner from "../src/popup/components/PendingSavesBanner.vue";
import { addPendingSave } from "../src/common/services/pending-saves";
import { OpenLoginWindowMessage } from "../src/common/types/messaging";

const save = (phrase: string) =>
  addPendingSave({ phrase, translation: "x", translation_language: "fa" });
const banner = (w: ReturnType<typeof mount>) =>
  w.find('[data-testid="pending-saves-banner"]');

describe("PendingSavesBanner (toolbar popup)", () => {
  enableAutoUnmount(afterEach);

  beforeEach(() => {
    vi.clearAllMocks();
    installMemoryChromeStorage();
    loginRef.current.value = false;
    sync.mockResolvedValue({ skipped: false, limitReached: false, left: 0 });
  });

  it("shows nothing without local phrases", async () => {
    const w = mount(PendingSavesBanner);
    await flushPromises();
    expect(banner(w).exists()).toBe(false);
  });

  it('logged out: "N phrases waiting. Sign in to keep them", and Sign in opens login', async () => {
    await save("a");
    await save("b");
    const w = mount(PendingSavesBanner);
    await flushPromises();

    expect(banner(w).text()).toContain("2 phrases waiting. Sign in to keep them.");
    expect(sync).not.toHaveBeenCalled();

    await w.find('[data-testid="pending-saves-signin"]').trigger("click");
    const send = chrome.runtime.sendMessage as ReturnType<typeof vi.fn>;
    const open = send.mock.calls.find(([m]) => OpenLoginWindowMessage.is(m));
    expect(open?.[0].source).toBe("popup");
  });

  it("follows the count as phrases are saved elsewhere", async () => {
    const w = mount(PendingSavesBanner);
    await flushPromises();
    await save("a");
    await flushPromises();
    expect(banner(w).text()).toContain("1 phrase waiting.");
  });

  it("signed in: syncs, and shows a line only when the save limit stopped it", async () => {
    await save("a");
    loginRef.current.value = true;
    sync.mockResolvedValue({ skipped: false, limitReached: true, left: 1 });
    const w = mount(PendingSavesBanner);
    await flushPromises();

    expect(sync).toHaveBeenCalledTimes(1);
    expect(banner(w).text()).toContain("1 phrase is still waiting");
    expect(w.find('[data-testid="pending-saves-signin"]').exists()).toBe(false);
  });

  it("signed in with no limit problem: no line", async () => {
    await save("a");
    loginRef.current.value = true;
    const w = mount(PendingSavesBanner);
    await flushPromises();
    expect(banner(w).exists()).toBe(false);
  });
});
