import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { nextTick } from "vue";

// Mock the text-selection composable so we can drive isVisible directly.
// vi.hoisted lets the mock factory share state with the test body — the
// factory runs before the importer, but we expose the refs through the
// hoisted singleton so tests can read/write them.
const { selection } = vi.hoisted(() => ({
  selection: {
    isVisible: undefined as any,
    text: undefined as any,
    rect: undefined as any,
    contextText: undefined as any,
    clear: vi.fn(),
  },
}));

vi.mock("../src/nibble/composables/useTextSelection", async () => {
  const { ref } = await import("vue");
  selection.isVisible = ref(false);
  selection.text = ref("");
  selection.rect = ref(null);
  selection.contextText = ref("");
  return { useTextSelection: () => selection };
});

// SelectionPopup pulls in TranslateService → @modular-rest/client. Mock so
// the child stub doesn't trigger a real fetch chain just by importing.
vi.mock("@modular-rest/client", () => ({
  functionProvider: { run: vi.fn() },
}));

import NibbleSurface from "../src/nibble/components/NibbleSurface.vue";
import { emitState } from "../src/common/services/console-crane-bridge";

// Regression test for the "modal closes when Nibble toggled off" /
// "selection popup leaks while modal is open" bug class. NibbleSurface owns
// a `v-if="selection.isVisible && !isModalActive"` that gates the popup;
// emitState({isActive: true}) must hide it, false must show it again.
describe("NibbleSurface bridge state gating", () => {
  beforeEach(() => {
    selection.isVisible.value = false;
    selection.text.value = "";
    selection.rect.value = null;
    selection.contextText.value = "";
    selection.clear.mockClear();
  });

  function mountSurface() {
    return mount(NibbleSurface, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: { SelectionPopup: true },
      },
    });
  }

  it("renders SelectionPopup when there is a visible selection and modal is closed", async () => {
    selection.isVisible.value = true;
    selection.text.value = "hi";
    selection.rect.value = new DOMRect(0, 0, 10, 10);

    const wrapper = mountSurface();
    await nextTick();

    expect(wrapper.findComponent({ name: "SelectionPopup" }).exists()).toBe(
      true
    );

    wrapper.unmount();
  });

  it("hides SelectionPopup when emitState({isActive:true}) fires", async () => {
    selection.isVisible.value = true;
    selection.text.value = "hi";
    selection.rect.value = new DOMRect(0, 0, 10, 10);

    const wrapper = mountSurface();
    await nextTick();
    expect(wrapper.findComponent({ name: "SelectionPopup" }).exists()).toBe(
      true
    );

    emitState({ isActive: true });
    await nextTick();
    expect(wrapper.findComponent({ name: "SelectionPopup" }).exists()).toBe(
      false
    );

    wrapper.unmount();
  });

  it("shows SelectionPopup again when emitState({isActive:false}) fires", async () => {
    selection.isVisible.value = true;
    selection.text.value = "hi";
    selection.rect.value = new DOMRect(0, 0, 10, 10);

    const wrapper = mountSurface();
    await nextTick();

    emitState({ isActive: true });
    await nextTick();
    expect(wrapper.findComponent({ name: "SelectionPopup" }).exists()).toBe(
      false
    );

    emitState({ isActive: false });
    await nextTick();
    expect(wrapper.findComponent({ name: "SelectionPopup" }).exists()).toBe(
      true
    );

    wrapper.unmount();
  });

  it("never renders SelectionPopup if there is no visible selection, regardless of modal state", async () => {
    const wrapper = mountSurface();
    await nextTick();

    expect(wrapper.findComponent({ name: "SelectionPopup" }).exists()).toBe(
      false
    );

    emitState({ isActive: true });
    await nextTick();
    expect(wrapper.findComponent({ name: "SelectionPopup" }).exists()).toBe(
      false
    );

    emitState({ isActive: false });
    await nextTick();
    expect(wrapper.findComponent({ name: "SelectionPopup" }).exists()).toBe(
      false
    );

    wrapper.unmount();
  });

  it("unsubscribes from the bridge on unmount (no leak across re-mounts)", async () => {
    selection.isVisible.value = true;
    selection.text.value = "hi";
    selection.rect.value = new DOMRect(0, 0, 10, 10);

    const wrapperA = mountSurface();
    await nextTick();
    wrapperA.unmount();

    // After unmount, future state events must not affect a re-mounted instance.
    const wrapperB = mountSurface();
    await nextTick();
    emitState({ isActive: false });
    await nextTick();

    expect(
      wrapperB.findComponent({ name: "SelectionPopup" }).exists()
    ).toBe(true);

    wrapperB.unmount();
  });
});
