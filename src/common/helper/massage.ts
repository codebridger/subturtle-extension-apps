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
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
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
