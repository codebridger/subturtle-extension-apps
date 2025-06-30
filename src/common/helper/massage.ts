import { BaseMessage, LoginStatusResponse } from "../types/messaging";

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
 * Send message to all tabs
 * @param message
 * @returns
 */
export function sendMessageToTabs<T extends BaseMessage | LoginStatusResponse>(
  message: T | any
) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      tab?.id && chrome.tabs.sendMessage(tab.id, message);
    }
  });
}
