import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia } from "pinia";
import { nextTick } from "vue";
import { Select } from "pilotui";

/**
 * Regression net for ClickUp 86exzbh61: the bundle selector dropdown in the save
 * modal wouldn't close. pilotui's Select only closes from outside via its own
 * `.relative`-based document handler, which misfires inside the ConsoleCrane
 * modal (almost everything sits under a Tailwind `relative` wrapper) and exposes
 * no close method/prop. SelectPhraseBundleV2 now runs its own outside-click
 * close and a working `closeDropdown()` (also used by SaveWordSectionV2 after a
 * save), both of which drive pilotui's own close path by dispatching the Escape
 * key its trigger button handles.
 *
 * These tests assert that mechanism: the Escape keydown reaches the Select's
 * trigger on an outside click / on closeDropdown(), and is NOT fired for clicks
 * inside the dropdown (so multi-select toggles keep it open). They deliberately
 * don't rely on pilotui actually rendering its open panel in happy-dom — that
 * round trip is covered by the real-browser flow; here we pin our own logic.
 */

const { BUNDLES } = vi.hoisted(() => ({
  BUNDLES: Array.from({ length: 14 }, (_, i) => ({
    _id: `b${i}`,
    title: `Bundle ${i}`,
  })),
}));

vi.mock("@modular-rest/client", () => ({
  dataProvider: {
    find: vi.fn().mockResolvedValue(BUNDLES),
    insertOne: vi.fn().mockResolvedValue({ _id: "new" }),
  },
  authentication: { user: { id: "u1" } },
}));

import SelectPhraseBundleV2 from "../src/console-crane/components/SelectPhraseBundleV2.vue";

async function mountSelector() {
  const wrapper = mount(SelectPhraseBundleV2, {
    attachTo: document.body,
    props: { selectedBundles: [] as string[] },
    global: { plugins: [createPinia()] },
  });
  await flushPromises(); // fetchOptions() resolves

  const triggerEl = wrapper
    .find('button[aria-haspopup="true"]')
    .element as HTMLButtonElement;

  // Spy on the Escape keydown our close path dispatches at the trigger — this is
  // what reaches pilotui's own closeDropdown handler.
  const escapes: string[] = [];
  triggerEl.addEventListener("keydown", (e) => {
    escapes.push((e as KeyboardEvent).key);
  });

  // Mirror pilotui opening its dropdown (we listen to its `open` event).
  const openDropdown = () => wrapper.findComponent(Select).vm.$emit("open");

  return { wrapper, triggerEl, escapes, openDropdown };
}

describe("SelectPhraseBundleV2 dropdown close behaviour", () => {
  let outside: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    outside = document.createElement("div");
    document.body.appendChild(outside);
  });

  it("closes on an outside click while open", async () => {
    const { wrapper, escapes, openDropdown } = await mountSelector();
    openDropdown();
    await nextTick();

    outside.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await nextTick();

    expect(escapes).toContain("Escape");
    wrapper.unmount();
  });

  it("does nothing on an outside click while already closed", async () => {
    const { wrapper, escapes } = await mountSelector();
    // No openDropdown() — isDropdownOpen stays false.
    outside.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await nextTick();

    expect(escapes).toHaveLength(0);
    wrapper.unmount();
  });

  it("stays open when interacting inside the dropdown (multi-select)", async () => {
    const { wrapper, triggerEl, escapes, openDropdown } = await mountSelector();
    openDropdown();
    await nextTick();

    // A pointer press inside our root (e.g. toggling an option) must not be
    // treated as an outside click.
    triggerEl.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await nextTick();

    expect(escapes).toHaveLength(0);
    wrapper.unmount();
  });

  it("exposes a working closeDropdown() for the post-save path", async () => {
    const { wrapper, escapes } = await mountSelector();
    (wrapper.vm as unknown as { closeDropdown: () => void }).closeDropdown();
    await nextTick();

    expect(escapes).toContain("Escape");
    wrapper.unmount();
  });
});
