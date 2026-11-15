import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleConsoleEscape, dispatchInternalEscape } from "../src/console-crane/escape";

function esc(target?: EventTarget) {
  const e = new KeyboardEvent("keydown", { key: "Escape", cancelable: true, bubbles: true });
  if (target) Object.defineProperty(e, "target", { value: target });
  return e;
}

describe("console-crane Esc", () => {
  let nav: { isOnMainPage: boolean; canGoBack: boolean; goBack: any; close: any };
  let root: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    nav = { isOnMainPage: true, canGoBack: false, goBack: vi.fn(), close: vi.fn() };
    root = document.createElement("div");
    document.body.appendChild(root);
  });
  afterEach(() => {
    root.remove();
    vi.useRealTimers();
  });

  it("closes from a main page and consumes the event", () => {
    const e = esc();
    expect(handleConsoleEscape(e, nav, root)).toBe(true);
    expect(nav.close).toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(true);
  });

  it("goes back from a sub-page", () => {
    nav.isOnMainPage = false;
    nav.canGoBack = true;
    handleConsoleEscape(esc(), nav, root);
    expect(nav.goBack).toHaveBeenCalled();
    expect(nav.close).not.toHaveBeenCalled();
  });

  it("closes a sub-page that was opened directly (nothing to go back to)", () => {
    nav.isOnMainPage = false;
    handleConsoleEscape(esc(), nav, root);
    expect(nav.close).toHaveBeenCalled();
  });

  it("in our own input: lets the field handle Esc, then blurs — doesn't close", () => {
    const input = document.createElement("input");
    root.appendChild(input);
    input.focus();
    const blur = vi.spyOn(input, "blur");
    const e = esc(input);
    handleConsoleEscape(e, nav, root);
    expect(e.defaultPrevented).toBe(false);
    expect(nav.close).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(blur).toHaveBeenCalled();
  });

  // E-05 regression: the bundle list closes itself with a synthetic Escape on
  // its trigger (pilotui has no close method). The window must not close on
  // it, after a save or on a click inside the window.
  it("lets our own dropdown-close Escape through without closing the window", () => {
    const trigger = document.createElement("button");
    root.appendChild(trigger);
    const seen: KeyboardEvent[] = [];
    const onWindow = (e: Event) => handleConsoleEscape(e as KeyboardEvent, nav, root);
    window.addEventListener("keydown", onWindow, true);
    trigger.addEventListener("keydown", (e) => seen.push(e as KeyboardEvent));
    try {
      dispatchInternalEscape(trigger);
    } finally {
      window.removeEventListener("keydown", onWindow, true);
    }
    expect(nav.close).not.toHaveBeenCalled();
    expect(nav.goBack).not.toHaveBeenCalled();
    // It still reaches the trigger, so the dropdown closes.
    expect(seen.map((e) => e.key)).toEqual(["Escape"]);
  });

  it("with the bundle list open, Esc closes the list only", () => {
    const trigger = document.createElement("button");
    trigger.setAttribute("aria-haspopup", "true");
    trigger.setAttribute("aria-expanded", "true");
    root.appendChild(trigger);
    const seen: string[] = [];
    trigger.addEventListener("keydown", (e) => seen.push((e as KeyboardEvent).key));
    const e = esc();
    expect(handleConsoleEscape(e, nav, root)).toBe(true);
    expect(e.defaultPrevented).toBe(true);
    expect(nav.close).not.toHaveBeenCalled();
    expect(seen).toEqual(["Escape"]);

    // Closed list: Esc closes the window as before.
    trigger.setAttribute("aria-expanded", "false");
    handleConsoleEscape(esc(), nav, root);
    expect(nav.close).toHaveBeenCalled();
  });

  it("ignores other keys", () => {
    const e = new KeyboardEvent("keydown", { key: "Enter", cancelable: true });
    expect(handleConsoleEscape(e, nav, root)).toBe(false);
    expect(e.defaultPrevented).toBe(false);
  });
});
