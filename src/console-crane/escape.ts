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
 */
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

  const active = event.target;
  if (isEditable(active) && modalRoot?.contains(active)) {
    // After the field's own handlers (we run in the capture phase).
    setTimeout(() => active.blur(), 0);
    return true;
  }

  event.preventDefault();
  event.stopPropagation();

  if (!target.isOnMainPage && target.canGoBack) target.goBack();
  else target.close();
  return true;
}
