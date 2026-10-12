import { describe, it, expect } from "vitest";
import {
  expandToWordBoundaries,
  snapRangeToWords,
} from "../src/nibble/composables/snap-selection";

function snap(text: string, selected: string) {
  const start = text.indexOf(selected);
  const [s, e] = expandToWordBoundaries(text, start, start + selected.length);
  return text.slice(s, e);
}

describe("expandToWordBoundaries", () => {
  const text = "a behavior that involves unnecessary risk";

  it("completes a word cut at the end (the reported case)", () => {
    expect(snap(text, "behavior that involves unnece")).toBe(
      "behavior that involves unnecessary"
    );
  });

  it("completes a word cut at the start", () => {
    expect(snap(text, "havior that")).toBe("behavior that");
  });

  it("leaves whole-word selections alone", () => {
    expect(snap(text, "that involves")).toBe("that involves");
    expect(snap(text, " that ")).toBe(" that ");
  });

  it("keeps contractions and hyphenated words together", () => {
    expect(snap("I don't know", "I don")).toBe("I don't");
    expect(snap("a well-known fact", "well-kn")).toBe("well-known");
  });

  it("does not swallow trailing punctuation", () => {
    expect(snap("risky, really", "risk")).toBe("risky");
  });

  it("works for non-Latin scripts", () => {
    expect(snap("این یک جمله است", "جم")).toBe("جمله");
  });
});

describe("snapRangeToWords", () => {
  it("returns a snapped copy without touching the original range", () => {
    const p = document.createElement("p");
    p.textContent = "a behavior that involves unnecessary risk";
    document.body.appendChild(p);
    const node = p.firstChild!;
    const range = document.createRange();
    range.setStart(node, 4); // "havior…"
    range.setEnd(node, 29); // "…unnece"

    const snapped = snapRangeToWords(range);
    expect(snapped.toString()).toBe("behavior that involves unnecessary");
    expect(range.toString()).toBe("havior that involves unne");
    p.remove();
  });
});
