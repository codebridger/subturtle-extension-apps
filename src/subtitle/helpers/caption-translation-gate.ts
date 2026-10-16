/**
 * Translate each caption once (E-06).
 *
 * With "translate whole caption" on, the caption watcher fires on every
 * `textList` change, and a player can change it several times for one caption
 * (lines added one by one, a caption that blinks off and back on). Each change
 * used to send a translation request.
 *
 * The gate waits for the caption to settle (`delayMs`, about 150 ms), then
 * sends it only when the joined text differs from the one whose translation
 * is on screen (the last one sent). A failed request is forgotten, so the same
 * caption can be tried again.
 */
export const CAPTION_SETTLE_MS = 150;

export interface CaptionTranslationGate {
  /**
   * The caption changed to `text`: send it once it has been stable for the
   * delay, unless its translation is already on screen. Returns true when the
   * translation on screen belongs to another caption, so the caller should
   * clear it now instead of showing it under the new text while it settles.
   */
  request(text: string): boolean;
  /** Send `text` now, even if it was sent before (the user turned it on). */
  sendNow(text: string): void;
  /** The request for `text` failed: let the same caption be sent again. */
  forget(text: string): void;
  /** Drop a waiting request (unmount, translation turned off). */
  cancel(): void;
}

export function createCaptionTranslationGate(
  send: (text: string) => void,
  delayMs: number = CAPTION_SETTLE_MS
): CaptionTranslationGate {
  // The caption whose translation is on screen, or on its way.
  let lastSent: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const sendNow = (text: string) => {
    cancel();
    lastSent = text;
    send(text);
  };

  return {
    request(text) {
      cancel();
      const stale = text !== lastSent;
      // The caller clears the old translation, so nothing is on screen now.
      if (stale) lastSent = null;
      timer = setTimeout(() => {
        timer = null;
        if (text !== lastSent) sendNow(text);
      }, delayMs);
      return stale;
    },
    sendNow,
    forget(text) {
      if (lastSent === text) lastSent = null;
    },
    cancel() {
      cancel();
    },
  };
}
