import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CAPTION_SETTLE_MS,
  createCaptionTranslationGate,
} from "../src/subtitle/helpers/caption-translation-gate";

// E-06: with "translate whole caption" on, each real caption change sends one
// request, after the caption settles.
describe("caption translation gate", () => {
  let send: ReturnType<typeof vi.fn>;
  let gate: ReturnType<typeof createCaptionTranslationGate>;

  beforeEach(() => {
    vi.useFakeTimers();
    send = vi.fn();
    gate = createCaptionTranslationGate(send);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for the caption to settle, then sends it once", () => {
    gate.request("Hello");
    gate.request("Hello\nworld");
    vi.advanceTimersByTime(CAPTION_SETTLE_MS - 1);
    expect(send).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("Hello\nworld");
  });

  it("skips a caption equal to the last one sent", () => {
    gate.request("Hello");
    vi.runAllTimers();
    // The caption blinks off and comes back: no new request, nothing stale.
    expect(gate.request("Hello")).toBe(false);
    vi.runAllTimers();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("reports a new caption as stale and sends it", () => {
    gate.request("Hello");
    vi.runAllTimers();
    expect(gate.request("Bye")).toBe(true);
    vi.runAllTimers();
    expect(send.mock.calls).toEqual([["Hello"], ["Bye"]]);
  });

  it("sends the first caption again after A → B → A (its translation was cleared)", () => {
    gate.request("A");
    vi.runAllTimers();
    gate.request("B");
    expect(gate.request("A")).toBe(true);
    vi.runAllTimers();
    // B never settled, so only A is sent again.
    expect(send.mock.calls).toEqual([["A"], ["A"]]);
  });

  it("sendNow sends at once, even the same caption", () => {
    gate.request("Hello");
    vi.runAllTimers();
    gate.sendNow("Hello");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("forget lets a failed caption be sent again", () => {
    gate.request("Hello");
    vi.runAllTimers();
    gate.forget("Hello");
    gate.request("Hello");
    vi.runAllTimers();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("cancel drops a waiting request", () => {
    gate.request("Hello");
    gate.cancel();
    vi.runAllTimers();
    expect(send).not.toHaveBeenCalled();
  });
});
