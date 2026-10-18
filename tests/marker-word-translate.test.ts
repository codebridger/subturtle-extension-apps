import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// One hover (or one marked phrase) must send at most one translation
// request. 2026-10-18 production: one phrase_hovered, then 22
// translation_requested (trigger "word") in ~11 s, 12 in one second, because
// every word the pointer crossed was marked and translated at once.

const { fetchSimple } = vi.hoisted(() => ({ fetchSimple: vi.fn() }));
vi.mock("../src/common/services/translate.service", () => ({
  MissingTargetLanguageError: class extends Error {},
  TranslateService: { instance: { fetchSimpleTranslation: fetchSimple } },
}));

import { useMarkerStore, WORD_TRANSLATE_DELAY_MS } from "../src/stores/marker";

const rect = () => new DOMRect(0, 0, 10, 10);
const words = "the quick brown fox jumps over the lazy dog and runs away".split(" ");

/** What Word.vue's mouseenter does for a single (non-anchored) hover. */
function hover(store: ReturnType<typeof useMarkerStore>, i: number) {
  const id = `0-0-${i}`;
  store.setHoveredWordId(id);
  if (!store.checkedSelected(id)) {
    store.clear();
    store.markWord(id, words[i], rect());
  }
}

describe("word translation per hover", () => {
  let store: ReturnType<typeof useMarkerStore>;

  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    store = useMarkerStore();
    store.setContext(words.join(" "));
    fetchSimple.mockReset();
    fetchSimple.mockResolvedValue("ترجمه");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sweeping across 12 words quickly sends one request, for the word where the pointer stops", async () => {
    for (let i = 0; i < 12; i++) {
      hover(store, i);
      vi.advanceTimersByTime(40); // a fast sweep: 40 ms per word
    }
    expect(fetchSimple).not.toHaveBeenCalled();

    vi.advanceTimersByTime(WORD_TRANSLATE_DELAY_MS);
    expect(fetchSimple).toHaveBeenCalledTimes(1);
    expect(fetchSimple).toHaveBeenCalledWith([words[11]], words.join(" "), "word");
  });

  it("a resting hover is translated after the short delay", () => {
    hover(store, 2);
    vi.advanceTimersByTime(WORD_TRANSLATE_DELAY_MS);
    expect(fetchSimple).toHaveBeenCalledTimes(1);
    expect(fetchSimple.mock.calls[0][0]).toEqual(["brown"]);
  });

  it("hovering the same word again does not send a second request", async () => {
    hover(store, 2);
    vi.advanceTimersByTime(WORD_TRANSLATE_DELAY_MS);
    await vi.runAllTimersAsync();
    store.clear();
    hover(store, 2);
    vi.advanceTimersByTime(WORD_TRANSLATE_DELAY_MS);
    expect(fetchSimple).toHaveBeenCalledTimes(1);
  });

  it("a stale answer does not replace the current phrase's translation", async () => {
    let resolveFirst!: (v: string) => void;
    fetchSimple
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockResolvedValueOnce("second");
    hover(store, 2); // "brown"
    vi.advanceTimersByTime(WORD_TRANSLATE_DELAY_MS);
    hover(store, 3); // "fox"
    vi.advanceTimersByTime(WORD_TRANSLATE_DELAY_MS);
    await vi.runAllTimersAsync();
    resolveFirst("first");
    await vi.runAllTimersAsync();

    expect(store.translatedWords["fox"]).toBe("second");
    expect(store.translatedWords["brown"]).toBe("first");
  });

  it("marking a phrase word by word (anchors) sends one request for the whole phrase", () => {
    hover(store, 1);
    store.markWord("0-0-2", words[2], rect());
    store.markWord("0-0-3", words[3], rect());
    vi.advanceTimersByTime(WORD_TRANSLATE_DELAY_MS);
    expect(fetchSimple).toHaveBeenCalledTimes(1);
    expect(fetchSimple.mock.calls[0][0]).toEqual(["quick brown fox"]);
  });

  it("clearing the selection before the delay sends nothing", () => {
    hover(store, 2);
    store.clear();
    vi.advanceTimersByTime(WORD_TRANSLATE_DELAY_MS);
    expect(fetchSimple).not.toHaveBeenCalled();
  });
});
