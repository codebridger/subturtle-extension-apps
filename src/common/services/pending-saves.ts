/**
 * Save first, sign in later (save-first E-02).
 *
 * A logged-out learner's saved phrases live here, in chrome.storage.local
 * (one key, a list), until they sign in. Then pending-saves-sync.ts sends each
 * one to their account with `createPhrase` and removes it from the list.
 *
 * chrome.storage, never the page's localStorage: content scripts share the
 * host page's localStorage (see CLAUDE.md, "Gotchas"). chrome.storage.local
 * is also what the popup and every tab read, so the count stays the same
 * everywhere.
 */

export const PENDING_SAVES_KEY = "pendingSaves";

/** The soft sign-in card shows from this many local phrases on (save-first E-03). */
export const SIGNIN_NUDGE_AT = 3;

/** At this many local phrases, sign-in is required to save more (save-first E-03). */
export const MAX_PENDING_SAVES = 50;

/**
 * Everything `createPhrase` needs, captured at save time. The page URL and
 * title are kept so the sync can ask the server for a bundle name for that
 * page (the suggestion needs a signed-in user, so it cannot run now).
 */
export interface PendingSave {
  phrase: string;
  translation: string;
  translation_language: string;
  context?: string;
  direction?: { source: "ltr" | "rtl"; target: "ltr" | "rtl" };
  language_info?: { source: string; target: string };
  linguistic_data?: any;
  chunks?: any[];
  sourceUrl?: string;
  pageTitle?: string;
  savedAt: number;
}

/** The key two saves of "the same phrase" share: the server matches on this too. */
export function phraseKey(phrase: string): string {
  return (phrase || "").trim();
}

export async function listPendingSaves(): Promise<PendingSave[]> {
  try {
    const data = await chrome.storage.local.get(PENDING_SAVES_KEY);
    const list = data?.[PENDING_SAVES_KEY];
    return Array.isArray(list) ? list : [];
  } catch {
    // No extension context (an orphaned content script after an update).
    return [];
  }
}

async function writePendingSaves(list: PendingSave[]): Promise<void> {
  await chrome.storage.local.set({ [PENDING_SAVES_KEY]: list });
}

export async function countPendingSaves(): Promise<number> {
  return (await listPendingSaves()).length;
}

export async function findPendingSave(
  phrase: string
): Promise<PendingSave | null> {
  const key = phraseKey(phrase);
  if (!key) return null;
  const list = await listPendingSaves();
  return list.find((p) => phraseKey(p.phrase) === key) || null;
}

export type AddPendingSaveResult =
  | { status: "added"; count: number }
  | { status: "exists"; count: number }
  | { status: "full"; count: number };

/**
 * Add a phrase to the local list. Saving the same phrase again keeps one copy
 * (the newer data replaces the old one). A new phrase is refused when the list
 * already holds MAX_PENDING_SAVES.
 */
export async function addPendingSave(
  item: Omit<PendingSave, "savedAt"> & { savedAt?: number }
): Promise<AddPendingSaveResult> {
  const key = phraseKey(item.phrase);
  const list = await listPendingSaves();
  // A plain JSON copy: callers pass Vue props (reactive proxies), which
  // chrome.storage cannot store as they are.
  const entry: PendingSave = JSON.parse(
    JSON.stringify({
      ...item,
      phrase: key,
      translation: (item.translation || "").trim(),
      savedAt: item.savedAt ?? Date.now(),
    })
  );

  const index = list.findIndex((p) => phraseKey(p.phrase) === key);
  if (index >= 0) {
    list[index] = entry;
    await writePendingSaves(list);
    return { status: "exists", count: list.length };
  }

  if (list.length >= MAX_PENDING_SAVES) {
    return { status: "full", count: list.length };
  }

  list.push(entry);
  await writePendingSaves(list);
  return { status: "added", count: list.length };
}

/** Remove one phrase (after the server accepted it). Returns how many are left. */
export async function removePendingSave(phrase: string): Promise<number> {
  const key = phraseKey(phrase);
  const list = (await listPendingSaves()).filter(
    (p) => phraseKey(p.phrase) !== key
  );
  await writePendingSaves(list);
  return list.length;
}

/**
 * Call `cb` with the new count whenever the list changes in any tab or page.
 * Returns a function that stops listening.
 */
export function onPendingSavesChange(cb: (count: number) => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string
  ) => {
    if (area !== "local" || !(PENDING_SAVES_KEY in changes)) return;
    const list = changes[PENDING_SAVES_KEY].newValue;
    cb(Array.isArray(list) ? list.length : 0);
  };
  try {
    chrome.storage.onChanged.addListener(listener);
  } catch {
    return () => {};
  }
  return () => {
    try {
      chrome.storage.onChanged.removeListener(listener);
    } catch {
      // Extension context gone; nothing to remove.
    }
  };
}
