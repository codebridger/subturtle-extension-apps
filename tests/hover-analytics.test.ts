import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { analytic } from "../src/plugins/mixpanel";
import {
  HOVER_DWELL_MS,
  cancelPhraseHover,
  endPhraseHover,
  trackPhraseHoverStart,
} from "../src/subtitle/helpers/hover-analytics";

const track = vi.mocked(analytic.track);

describe("phrase_hovered tracking", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    endPhraseHover();
    track.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("sends one event with `word` once the pointer rests on a word", () => {
    trackPhraseHoverStart(" hello ");
    expect(track).not.toHaveBeenCalled();
    vi.advanceTimersByTime(HOVER_DWELL_MS);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("phrase_hovered", { word: "hello" });
  });

  it("does not send for words swept over quickly", () => {
    for (const w of ["a", "quick", "sweep"]) {
      trackPhraseHoverStart(w);
      vi.advanceTimersByTime(50);
      cancelPhraseHover();
    }
    vi.advanceTimersByTime(HOVER_DWELL_MS * 2);
    expect(track).not.toHaveBeenCalled();
  });

  it("does not repeat for re-entering the same word in one hover", () => {
    trackPhraseHoverStart("hello");
    vi.advanceTimersByTime(HOVER_DWELL_MS);
    // mouse jitter: leave + re-enter while the word is still the hovered one
    cancelPhraseHover();
    trackPhraseHoverStart("hello");
    vi.advanceTimersByTime(HOVER_DWELL_MS);
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("counts a new hover of the same word after the hover ended", () => {
    trackPhraseHoverStart("hello");
    vi.advanceTimersByTime(HOVER_DWELL_MS);
    endPhraseHover();
    trackPhraseHoverStart("hello");
    vi.advanceTimersByTime(HOVER_DWELL_MS);
    expect(track).toHaveBeenCalledTimes(2);
  });

  it("ignores empty words", () => {
    trackPhraseHoverStart("  ");
    vi.advanceTimersByTime(HOVER_DWELL_MS);
    expect(track).not.toHaveBeenCalled();
  });
});
