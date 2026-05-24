import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { encodeRouteParams } from "../src/console-crane/route-params";

// The page reads its payload from the route's :data param. Drive that via a
// hoisted holder the mock reads, set fresh before each mount.
const { routeHolder } = vi.hoisted(() => ({ routeHolder: { data: "" } }));
vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { data: routeHolder.data } }),
}));

import FlashcardPreview from "../src/console-crane/modules/flashcard-preview/index.vue";

function mountWith(payload: Record<string, unknown>) {
  routeHolder.data = encodeRouteParams(payload);
  return mount(FlashcardPreview);
}

describe("FlashcardPreview page", () => {
  it("renders the header and subtitle", () => {
    const w = mountWith({ phrase: "Kinsta Plan", translation: "پلن کینستا" });
    expect(w.text()).toContain("Flashcard preview");
    expect(w.text()).toContain("across Leitner levels");
    w.unmount();
  });

  it("shows a single Recognition card for a phrase with no chunks", () => {
    const w = mountWith({
      phrase: "Kinsta Plan",
      translation: "پلن کینستا",
      context: "A Kinsta Plan Includes More",
    });
    expect(w.text()).toContain("Recognition");
    expect(w.text()).toContain("Levels 1");
    expect(w.text()).toContain("Kinsta Plan");
    expect(w.text()).toContain("پلن کینستا");
    expect(w.text()).not.toContain("Fill in the blank");
    w.unmount();
  });

  it("shows Recognition + Fill-in-the-blank when a confirmed chunk is present", () => {
    const w = mountWith({
      phrase: "turbocharged with",
      translation: "تقویت شده",
      context: "Plans are turbocharged with extras",
      direction: { source: "ltr", target: "rtl" },
      chunks: [{ text: "turbocharged with", type: "collocation", confidence: 0.9 }],
    });
    expect(w.text()).toContain("Recognition");
    expect(w.text()).toContain("Fill in the blank");
    expect(w.text()).toContain("Levels 3");
    // The cloze front blanks the chunk inside the sentence.
    expect(w.text()).toContain("Plans are _____ extras");
    w.unmount();
  });

  it("shows the empty state when there is nothing to preview", () => {
    const w = mountWith({});
    expect(w.text()).toContain("No preview available");
    w.unmount();
  });
});
