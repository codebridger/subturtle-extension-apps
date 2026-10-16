/**
 * Esc for the console-crane modal: back from a sub-page (Practice, Flashcard
 * preview, Settings), close from a main page.
 *
 * The listener is only attached while the modal is open (see index.vue), so a
 * closed modal never sees — let alone swallows — the host page's Esc (YouTube
 * exits fullscreen with it). While open, we consume it so the page underneath
 * doesn't also react.
 *
 * Esc inside one of our own text fields first just leaves the field: the
 * event is let through so the field's own Esc handler runs (the advice chat's
 * edit box uses it as "cancel edit"), then the field is blurred. A stray Esc
 * while typing shouldn't throw the whole card away.
 *
 * Esc while a dropdown (the bundle list) is open closes only the dropdown.
 */

/**
 * Escape keydowns we dispatch ourselves. pilotui's Select has no close method,
 * so SelectPhraseBundleV2 closes its dropdown by sending the Escape key the
 * Select trigger already handles. That synthetic event also passes our
 * window capture listener, which used to read it as "close the window": the
 * save window closed right after "Save to German" (closeDropdown runs after a
 * save) and on any click inside the window while the bundle list was open
 * (the outside-click close). Events in this set are let through untouched.
 */
const internalEscapes = new WeakSet<Event>();

/** Send an Escape keydown to `target` that the console's Esc handler ignores. */
export function dispatchInternalEscape(target: EventTarget): void {
  const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
  internalEscapes.add(event);
  target.dispatchEvent(event);
}

/** A pilotui Select trigger whose dropdown is open, inside the modal. */
const OPEN_DROPDOWN_SELECTOR = '[aria-haspopup="true"][aria-expanded="true"]';

export interface ConsoleEscapeTarget {
  isOnMainPage: boolean;
  canGoBack: boolean;
  goBack: () => void;
  close: () => void;
}

function isEditable(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

/** Returns true when the event was handled (and consumed). */
export function handleConsoleEscape(
  event: KeyboardEvent,
  target: ConsoleEscapeTarget,
  modalRoot: Element | null
): boolean {
  if (event.key !== "Escape" || event.isComposing) return false;
  // Our own dropdown close (see dispatchInternalEscape): not for the window.
  if (internalEscapes.has(event)) return false;

  const active = event.target;
  if (isEditable(active) && modalRoot?.contains(active)) {
    // After the field's own handlers (we run in the capture phase).
    setTimeout(() => active.blur(), 0);
    return true;
  }

  event.preventDefault();
  event.stopPropagation();

  // An open dropdown (the bundle list) closes first; the window stays.
  const openDropdown = modalRoot?.querySelector(OPEN_DROPDOWN_SELECTOR);
  if (openDropdown) {
    dispatchInternalEscape(openDropdown);
    return true;
  }

  if (!target.isOnMainPage && target.canGoBack) target.goBack();
  else target.close();
  return true;
}
