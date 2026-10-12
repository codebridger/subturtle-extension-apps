import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleConsoleEscape } from "../src/console-crane/escape";

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

  it("ignores other keys", () => {
    const e = new KeyboardEvent("keydown", { key: "Enter", cancelable: true });
    expect(handleConsoleEscape(e, nav, root)).toBe(false);
    expect(e.defaultPrevented).toBe(false);
  });
});
