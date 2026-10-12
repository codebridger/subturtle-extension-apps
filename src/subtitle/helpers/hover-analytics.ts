import { analytic } from "../../plugins/mixpanel";

/**
 * `phrase_hovered` (docs/metrics/instrumentation.md — props: `word`).
 *
 * When subtitles moved to `<Word>` + the marker store, the hover translation
 * kept working but the event stayed behind in `_support-template`, so Mixpanel
 * showed 0 hovers next to 144 clicks. This restores it with a light debounce:
 * the event fires only once the pointer has rested on a word for
 * HOVER_DWELL_MS, so sweeping the cursor across a caption line doesn't send an
 * event per word, and staying on (or re-entering) the same word doesn't send
 * it twice.
 */
export const HOVER_DWELL_MS = 300;

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingWord: string | null = null;
let lastTrackedWord: string | null = null;

/** Pointer entered a word. */
export function trackPhraseHoverStart(word: string | undefined | null) {
  const w = (word || "").trim();
  if (!w) return;
  if (w === pendingWord || w === lastTrackedWord) return;

  cancelPhraseHover();
  pendingWord = w;
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    pendingWord = null;
    lastTrackedWord = w;
    analytic.track("phrase_hovered", { word: w });
  }, HOVER_DWELL_MS);
}

/** Pointer left the word before the dwell elapsed — not a real hover. */
export function cancelPhraseHover() {
  if (pendingTimer !== null) clearTimeout(pendingTimer);
  pendingTimer = null;
  pendingWord = null;
}

/**
 * The hover ended for good (selection cleared). Lets a later hover of the
 * same word count again.
 */
export function endPhraseHover() {
  cancelPhraseHover();
  lastTrackedWord = null;
}
