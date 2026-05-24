import type { Chunk } from "../word-detail/types";

export interface PreviewData {
  phrase?: string;
  translation?: string;
  context?: string;
  chunks?: Chunk[];
  direction?: { source: "ltr" | "rtl"; target: "ltr" | "rtl" };
}

export interface PreviewCard {
  kind: "recognition" | "cloze";
  title: string;
  /** Leitner levels this card type is reviewed at. */
  levels: string;
  /** Card front (the prompt shown first). */
  front: string;
  /** Revealed unit on the back — the blanked chunk, for cloze cards. */
  answer?: string;
}

/**
 * Every flashcard a phrase generates:
 *   - one Recognition card (Levels 1-2, shipped) whenever there's a phrase;
 *   - one Fill-in-the-blank card (Levels 3-5, proposed in PRFAQ-001 Phase 1) per
 *     confirmed chunk whose text appears in the source sentence, with the first
 *     occurrence blanked.
 *
 * The recognition card guarantees at least one card; cloze cards are additive
 * and strictly tied to confirmed chunks.
 */
export function buildPreviewCards(data: PreviewData): PreviewCard[] {
  const cards: PreviewCard[] = [];
  const phrase = data.phrase?.trim() || "";
  const sentence = (data.context || "").trim();

  if (phrase) {
    cards.push({
      kind: "recognition",
      title: "Recognition",
      levels: "Levels 1–2",
      front: phrase,
    });
  }

  for (const chunk of data.chunks || []) {
    const unit = (chunk.text || "").trim();
    if (!unit || !sentence) continue;
    const idx = sentence.toLowerCase().indexOf(unit.toLowerCase());
    if (idx === -1) continue;
    cards.push({
      kind: "cloze",
      title: "Fill in the blank",
      levels: "Levels 3–5",
      front: sentence.slice(0, idx) + "_____" + sentence.slice(idx + unit.length),
      answer: unit,
    });
  }

  return cards;
}
