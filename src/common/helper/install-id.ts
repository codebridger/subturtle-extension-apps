/**
 * The install's analytics id (A3 in the analytics work list): one random id
 * per install, kept in chrome.storage.local under `analyticsAnonymousId`.
 *
 * Mixpanel uses it as the anonymous `distinct_id` / `$device_id`
 * (plugins/mixpanel.ts), and server calls that fire an analytics event send it
 * as `deviceId` (E-01) so server events land on the same person.
 *
 * This module has no mixpanel import, so it is safe in every context: content
 * scripts, the popup and the background service worker.
 */

export const ANON_ID_KEY = "analyticsAnonymousId";

/** crypto.randomUUID is missing on plain-http pages; getRandomValues is not. */
export function newAnonymousId(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// One read-or-create at a time per context, so two callers on the first page
// ever do not mint two different ids.
let pending: Promise<string | undefined> | null = null;

/**
 * The last id this script read or created. A content script left in an open
 * tab across an extension update keeps running, but chrome.storage throws
 * there ("Extension context invalidated"); without this, its calls went out
 * with no id and the server filed them under "anonymous-unknown"
 * (2026-10-17, v1.19.0 rollout).
 */
let lastKnown: string | undefined;

/**
 * Read the stored install id, creating and storing it when there is none yet.
 * Not cached while storage works: logout rotates the id
 * (resetAnalyticsIdentity), and the next call must see the new one.
 *
 * When storage fails, it answers the last id this script saw. It resolves
 * `undefined` only when storage never worked in this script.
 */
export function getInstallId(): Promise<string | undefined> {
  if (pending) return pending;
  pending = new Promise<string | undefined>((resolve) => {
    try {
      chrome.storage.local.get(ANON_ID_KEY, (data) => {
        // A failed read must not mint a new id: that would split the person.
        if (chrome.runtime?.lastError) return resolve(lastKnown);
        let id = data?.[ANON_ID_KEY] as string | undefined;
        if (id) return resolve((lastKnown = id));
        id = newAnonymousId();
        lastKnown = id;
        try {
          chrome.storage.local.set({ [ANON_ID_KEY]: id }, () => resolve(id));
        } catch {
          resolve(id);
        }
      });
    } catch {
      resolve(lastKnown);
    }
  }).finally(() => {
    pending = null;
  });
  return pending;
}

/** Read the id once while the script is young, so a later update cannot cut it off. */
export function rememberInstallId(): void {
  void getInstallId();
}
