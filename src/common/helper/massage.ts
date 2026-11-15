import { BaseMessage, LoginStatusResponse } from "../types/messaging";
import { debug, log } from "./log";

/**
 * Send message to background
 * @param message
 * @returns
 */
export async function sendMessage<T extends BaseMessage | LoginStatusResponse>(
  message: T | any
) {
  return new Promise<T>((resolve, reject) => {
    try {
      debug("Sending message to background:", message);
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          // Chrome runtime errors should be properly formatted with message
          reject(
            new Error(
              chrome.runtime.lastError.message || "Unknown runtime error"
            )
          );
        } else if (!response) {
          // Handle case where response is undefined/null
          reject(new Error("No response received"));
        } else {
          debug("Received response:", response);
          resolve(response);
        }
      });
    } catch (err) {
      // Handle any synchronous errors in sendMessage call
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * True for the error Chrome gives when a tab has no listener: tabs without our
 * content scripts (chrome:// pages, the Web Store, tabs opened before the
 * extension was installed or reloaded). Expected for a broadcast.
 */
export function isNoReceiverError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /Receiving end does not exist/i.test(message);
}

/**
 * Send message to all tabs. Fire-and-forget: a tab without our content
 * scripts is skipped quietly (E-03: the popup used to log an uncaught
 * "Receiving end does not exist" for each such tab after a language switch).
 * @param message
 * @returns
 */
export function sendMessageToTabs<T extends BaseMessage | LoginStatusResponse>(
  message: T | any
) {
  // it seems tabs loads with a delay, so we check if it's loaded
  if (!chrome.tabs) return;

  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (!tab?.id) continue;
      // Cast: @types/chrome still types tabs.sendMessage as void; in MV3 the
      // no-callback overload returns a Promise.
      const sent = chrome.tabs.sendMessage(tab.id, message) as unknown as
        | Promise<unknown>
        | undefined;
      sent?.catch?.((error: unknown) => {
        if (!isNoReceiverError(error)) {
          console.warn("Could not send a message to a tab:", error);
        }
      });
    }
  });
}
