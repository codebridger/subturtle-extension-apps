import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";

// SelectionPopup pulls in TranslateService → @modular-rest/client → mock the
// network layer so a stray click in another test can't fire a real request.
vi.mock("@modular-rest/client", () => ({
  functionProvider: { run: vi.fn() },
  authentication: { user: { id: "test-user-id" } },
}));

import SelectionPopup from "../src/nibble/components/SelectionPopup.vue";

// Regression test for the "popup deselects page text and unmounts mid-click"
// bug noted in CLAUDE.md. The fix relies on `@mousedown.prevent.stop` on the
// root element. Both modifiers must be in place: `.prevent` keeps the browser
// from clearing the user's selection, and `.stop` keeps the document-level
// mousedown listener (used by useTextSelection to detect clicks outside the
// selection) from firing.
describe("SelectionPopup root mousedown handling", () => {
  let parent: HTMLElement;

  beforeEach(() => {
    parent = document.createElement("div");
    document.body.appendChild(parent);
  });

  function mountPopup() {
    return mount(SelectionPopup, {
      attachTo: parent,
      props: {
        text: "hello",
        context: "context paragraph",
        rect: new DOMRect(100, 100, 50, 20),
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
      },
    });
  }

  it("calls preventDefault on root mousedown (.prevent modifier)", () => {
    const wrapper = mountPopup();

    const root = wrapper.find(".nibble-popup").element as HTMLElement;
    const ev = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    root.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
    wrapper.unmount();
  });

  it("stops mousedown from bubbling to document (.stop modifier)", () => {
    const wrapper = mountPopup();

    const documentListener = vi.fn();
    document.addEventListener("mousedown", documentListener);

    const root = wrapper.find(".nibble-popup").element as HTMLElement;
    root.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true })
    );

    expect(documentListener).not.toHaveBeenCalled();

    document.removeEventListener("mousedown", documentListener);
    wrapper.unmount();
  });

  it("renders the icon button in initial mode", () => {
    const wrapper = mountPopup();
    expect(wrapper.find(".nibble-icon-btn").exists()).toBe(true);
    expect(wrapper.find(".nibble-card").exists()).toBe(false);
    wrapper.unmount();
  });
});
