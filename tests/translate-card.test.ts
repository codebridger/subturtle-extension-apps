import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { defineComponent } from "vue";

// Stub WordDetailModule at module-resolve time. The real module pulls in
// modular-rest, the translation service, and the auth plugin chain — none of
// which we want to evaluate while testing the popup's input shell. The stub
// re-emits prop changes so we can assert the parent passed the right word,
// and exposes a `loading` event so we can drive the parent's spinner state.
vi.mock("../src/console-crane/modules/word-detail/index.vue", () => ({
  default: defineComponent({
    name: "WordDetailModule",
    props: { word: { type: String, required: true } },
    emits: ["loading"],
    template: '<div class="word-detail-stub" :data-word="word"></div>',
  }),
}));

import TranslateCard from "../src/popup/components/TranslateCard.vue";

// CLAUDE.md verification checklist for the popup translate input:
//  - input is auto-focused on open
//  - submitting renders the detailed result inline
//  - re-translating a different word resets the result
//  - the button shows a spinner while pending
//  - logged-out users see "Login to save this phrase" / logged-in get the
//    bundle picker — that's WordDetailModule's responsibility, not this
//    component's, so we cover it elsewhere.
describe("TranslateCard (popup translate input)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mountCard(): VueWrapper {
    return mount(TranslateCard, {
      attachTo: document.body,
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
      },
    });
  }

  it("auto-focuses the input on mount", async () => {
    const wrapper = mountCard();
    await flushPromises();

    const input = wrapper.find("input").element;
    expect(document.activeElement).toBe(input);

    wrapper.unmount();
  });

  it("disables the submit button when the input is empty", () => {
    const wrapper = mountCard();
    expect(
      wrapper.find('button[type="submit"]').attributes("disabled")
    ).toBeDefined();
    wrapper.unmount();
  });

  it("disables the submit button on whitespace-only input", async () => {
    const wrapper = mountCard();
    await wrapper.find("input").setValue("   \t  ");
    expect(
      wrapper.find('button[type="submit"]').attributes("disabled")
    ).toBeDefined();
    wrapper.unmount();
  });

  it("enables the submit button once meaningful text is entered", async () => {
    const wrapper = mountCard();
    await wrapper.find("input").setValue("hello");
    expect(
      wrapper.find('button[type="submit"]').attributes("disabled")
    ).toBeUndefined();
    wrapper.unmount();
  });

  it("renders WordDetailModule with the typed word on submit", async () => {
    const wrapper = mountCard();
    await wrapper.find("input").setValue("hello");
    await wrapper.find("form").trigger("submit");

    const stub = wrapper.find(".word-detail-stub");
    expect(stub.exists()).toBe(true);
    expect(stub.attributes("data-word")).toBe("hello");

    wrapper.unmount();
  });

  it("trims surrounding whitespace before passing the word along", async () => {
    const wrapper = mountCard();
    await wrapper.find("input").setValue("  hello  ");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.find(".word-detail-stub").attributes("data-word")).toBe(
      "hello"
    );
    wrapper.unmount();
  });

  it("updates the result when a different word is submitted", async () => {
    const wrapper = mountCard();

    await wrapper.find("input").setValue("hello");
    await wrapper.find("form").trigger("submit");
    // Clear the loading flag so the next submit isn't blocked by `loading`.
    wrapper.findComponent({ name: "WordDetailModule" }).vm.$emit("loading", false);
    await flushPromises();

    await wrapper.find("input").setValue("world");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.find(".word-detail-stub").attributes("data-word")).toBe(
      "world"
    );
    wrapper.unmount();
  });

  it("shows a spinner and 'Translating…' label after submit", async () => {
    const wrapper = mountCard();
    await wrapper.find("input").setValue("hi");
    await wrapper.find("form").trigger("submit");

    const button = wrapper.find('button[type="submit"]');
    expect(button.text()).toContain("Translating");
    expect(button.find("svg.animate-spin").exists()).toBe(true);
    wrapper.unmount();
  });

  it("clears the spinner when WordDetailModule emits loading=false", async () => {
    const wrapper = mountCard();
    await wrapper.find("input").setValue("hi");
    await wrapper.find("form").trigger("submit");

    wrapper.findComponent({ name: "WordDetailModule" }).vm.$emit("loading", false);
    await flushPromises();

    const button = wrapper.find('button[type="submit"]');
    expect(button.text()).not.toContain("Translating");
    expect(button.find("svg.animate-spin").exists()).toBe(false);
    wrapper.unmount();
  });

  it("disables submit while a translation is pending", async () => {
    const wrapper = mountCard();
    await wrapper.find("input").setValue("hi");
    await wrapper.find("form").trigger("submit");

    expect(
      wrapper.find('button[type="submit"]').attributes("disabled")
    ).toBeDefined();
    wrapper.unmount();
  });

  it("ignores re-submitting the same word (no double-fetch on enter mash)", async () => {
    const wrapper = mountCard();
    await wrapper.find("input").setValue("hi");
    await wrapper.find("form").trigger("submit");

    const stub = wrapper.findComponent({ name: "WordDetailModule" });
    stub.vm.$emit("loading", false);
    await flushPromises();

    // Resubmit identical text — TranslateCard's submit() short-circuits.
    // Spinner must not reappear.
    await wrapper.find("form").trigger("submit");
    expect(wrapper.find('button[type="submit"]').text()).not.toContain(
      "Translating"
    );
    wrapper.unmount();
  });
});
