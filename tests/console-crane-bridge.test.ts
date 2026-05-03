import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  emitOpen,
  onOpen,
  emitState,
  onState,
  requestState,
  onRequestState,
  type OpenPayload,
  type StatePayload,
} from "../src/common/services/console-crane-bridge";

// The bridge backs a cross-bundle contract (nibble / main feature scripts ←→
// console-crane content script) over window CustomEvents. These tests pin the
// payload shape and subscribe/unsubscribe semantics so a refactor of the
// internals can't silently break the wire format.
describe("console-crane bridge", () => {
  beforeEach(() => {
    // happy-dom shares window across tests; nothing else holds listeners,
    // but reset just in case test order shifts.
    vi.restoreAllMocks();
  });

  describe("emitOpen / onOpen", () => {
    it("delivers payload intact to a registered listener", () => {
      const handler = vi.fn();
      const off = onOpen(handler);

      const payload: OpenPayload = {
        page: "word-detail",
        params: { word: "hello", context: "ctx" },
        active: true,
      };
      emitOpen(payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
      off();
    });

    it("delivers to multiple listeners and stops on unsubscribe", () => {
      const a = vi.fn();
      const b = vi.fn();
      const offA = onOpen(a);
      const offB = onOpen(b);

      emitOpen({ page: "settings" });
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);

      offA();
      emitOpen({ page: "settings" });
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(2);

      offB();
    });
  });

  describe("emitState / onState", () => {
    it("delivers state payload intact", () => {
      const handler = vi.fn();
      const off = onState(handler);

      const payload: StatePayload = { isActive: true };
      emitState(payload);

      expect(handler).toHaveBeenCalledWith(payload);
      off();
    });
  });

  describe("requestState / onRequestState", () => {
    it("fires the request listener with no payload", () => {
      const handler = vi.fn();
      const off = onRequestState(handler);

      requestState();
      expect(handler).toHaveBeenCalledTimes(1);
      off();
    });

    it("stops firing after unsubscribe", () => {
      const handler = vi.fn();
      const off = onRequestState(handler);

      requestState();
      off();
      requestState();

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  it("open and state channels are independent", () => {
    const onOpenHandler = vi.fn();
    const onStateHandler = vi.fn();
    const offOpen = onOpen(onOpenHandler);
    const offState = onState(onStateHandler);

    emitOpen({ page: "empty" });
    expect(onOpenHandler).toHaveBeenCalledTimes(1);
    expect(onStateHandler).not.toHaveBeenCalled();

    emitState({ isActive: false });
    expect(onOpenHandler).toHaveBeenCalledTimes(1);
    expect(onStateHandler).toHaveBeenCalledTimes(1);

    offOpen();
    offState();
  });
});
