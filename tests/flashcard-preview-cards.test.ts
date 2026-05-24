import { describe, it, expect } from "vitest";
import {
  buildPreviewCards,
  type PreviewData,
} from "../src/console-crane/modules/flashcard-preview/cards";
import type { Chunk } from "../src/console-crane/modules/word-detail/types";

function chunk(text: string, extra: Partial<Chunk> = {}): Chunk {
  return { text, type: "collocation", confidence: 0.9, ...extra };
}

describe("buildPreviewCards", () => {
  describe("recognition card", () => {
    it("is always produced when a phrase is present", () => {
      const cards = buildPreviewCards({
        phrase: "Kinsta Plan",
        translation: "پلن کینستا",
      });
      expect(cards).toHaveLength(1);
      expect(cards[0].kind).toBe("recognition");
      expect(cards[0].front).toBe("Kinsta Plan");
      expect(cards[0].levels).toMatch(/^Levels 1[–-]2$/);
      expect(cards[0].answer).toBeUndefined();
    });

    it("trims the phrase", () => {
      const [card] = buildPreviewCards({ phrase: "  hello  " });
      expect(card.front).toBe("hello");
    });

    it("produces no cards when there is no phrase and no usable chunks", () => {
      expect(buildPreviewCards({})).toEqual([]);
      expect(buildPreviewCards({ phrase: "   " })).toEqual([]);
    });
  });

  describe("fill-in-the-blank (cloze) cards", () => {
    const base: PreviewData = {
      phrase: "Kinsta Plan",
      translation: "پلن کینستا",
      context: "A Kinsta Plan Includes More",
    };

    it("adds a cloze card per confirmed chunk found in the sentence", () => {
      const cards = buildPreviewCards({ ...base, chunks: [chunk("Kinsta Plan")] });
      expect(cards).toHaveLength(2);
      expect(cards[0].kind).toBe("recognition");

      const cloze = cards[1];
      expect(cloze.kind).toBe("cloze");
      expect(cloze.front).toBe("A _____ Includes More");
      expect(cloze.answer).toBe("Kinsta Plan");
      expect(cloze.levels).toMatch(/^Levels 3[–-]5$/);
    });

    it("matches case-insensitively but blanks the original-cased span", () => {
      const cards = buildPreviewCards({
        phrase: "Plans are turbocharged",
        context: "Plans are Turbocharged with extras",
        chunks: [chunk("turbocharged")],
      });
      const cloze = cards.find((c) => c.kind === "cloze")!;
      expect(cloze.front).toBe("Plans are _____ with extras");
      expect(cloze.answer).toBe("turbocharged");
    });

    it("blanks only the first occurrence of the chunk", () => {
      const cards = buildPreviewCards({
        phrase: "go",
        context: "go and go again",
        chunks: [chunk("go")],
      });
      const cloze = cards.find((c) => c.kind === "cloze")!;
      expect(cloze.front).toBe("_____ and go again");
    });

    it("skips a chunk whose text is absent from the sentence", () => {
      const cards = buildPreviewCards({ ...base, chunks: [chunk("nonexistent")] });
      expect(cards).toHaveLength(1);
      expect(cards[0].kind).toBe("recognition");
    });

    it("produces no cloze cards when there is no source sentence", () => {
      const cards = buildPreviewCards({
        phrase: "Kinsta Plan",
        context: "",
        chunks: [chunk("Kinsta Plan")],
      });
      expect(cards).toHaveLength(1);
      expect(cards[0].kind).toBe("recognition");
    });

    it("skips chunks with empty or whitespace text", () => {
      const cards = buildPreviewCards({ ...base, chunks: [chunk("   "), chunk("")] });
      expect(cards).toHaveLength(1);
    });

    it("emits one cloze per found chunk, recognition first, each blanked in the full sentence", () => {
      const cards = buildPreviewCards({
        phrase: "turbocharged with plenty of",
        context: "Plans are turbocharged with plenty of resources",
        chunks: [chunk("turbocharged with"), chunk("plenty of")],
      });
      expect(cards.map((c) => c.kind)).toEqual(["recognition", "cloze", "cloze"]);
      expect(cards[1].front).toBe("Plans are _____ plenty of resources");
      expect(cards[1].answer).toBe("turbocharged with");
      expect(cards[2].front).toBe("Plans are turbocharged with _____ resources");
      expect(cards[2].answer).toBe("plenty of");
    });
  });
});
