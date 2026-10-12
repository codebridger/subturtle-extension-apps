/**
 * Snap a selection to whole words before translating / saving.
 *
 * Drag-selecting on a normal page often stops mid-word, and Nibble sent that
 * verbatim ("behavior that involves unnece"). We widen each edge that falls
 * inside a word to the word's boundary. This works on a CLONE of the range:
 * the user's visible selection and the page DOM are never touched (Nibble
 * must not mutate the host page).
 *
 * "Word" = letters, combining marks and digits (any script), plus an
 * apostrophe or hyphen joining two of them ("don't", "well-known").
 * Words split across elements (<b>beh</b>avior) are only snapped within the
 * edge text node.
 */
const WORD_CHAR = /[\p{L}\p{M}\p{N}]/u;
const JOINER = /['’\-]/;

function isWordAt(text: string, i: number): boolean {
  const c = text[i];
  if (c === undefined) return false;
  if (WORD_CHAR.test(c)) return true;
  // A joiner counts only between two word characters.
  return (
    JOINER.test(c) &&
    WORD_CHAR.test(text[i - 1] ?? "") &&
    WORD_CHAR.test(text[i + 1] ?? "")
  );
}

/** Move a start offset that falls inside a word back to the word's start. */
export function snapStart(text: string, offset: number): number {
  let s = offset;
  // Mid-word when the first selected char and the one before it are both
  // part of a word.
  if (isWordAt(text, s) && isWordAt(text, s - 1)) {
    while (s > 0 && isWordAt(text, s - 1)) s--;
  }
  return s;
}

/** Move an end offset that falls inside a word forward to the word's end. */
export function snapEnd(text: string, offset: number): number {
  let e = offset;
  if (isWordAt(text, e - 1) && isWordAt(text, e)) {
    while (e < text.length && isWordAt(text, e)) e++;
  }
  return e;
}

/** Widen [start, end) in `text` so neither edge cuts through a word. */
export function expandToWordBoundaries(
  text: string,
  start: number,
  end: number
): [number, number] {
  return [snapStart(text, start), snapEnd(text, end)];
}

/** A copy of `range` with its text-node edges snapped to word boundaries. */
export function snapRangeToWords(range: Range): Range {
  const snapped = range.cloneRange();
  const { startContainer, startOffset, endContainer, endOffset } = range;
  if (startContainer.nodeType === Node.TEXT_NODE) {
    snapped.setStart(
      startContainer,
      snapStart((startContainer as Text).data, startOffset)
    );
  }
  if (endContainer.nodeType === Node.TEXT_NODE) {
    snapped.setEnd(endContainer, snapEnd((endContainer as Text).data, endOffset));
  }
  return snapped;
}
