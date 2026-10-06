import { defineStore } from "pinia";

/**
 * The bundles a user last saved into from each page, keyed by page URL, so the
 * next save on that page preselects them.
 *
 * Kept in chrome.storage.local, NOT `localStorage`: in a content script
 * `localStorage` is the HOST page's storage, so the old copy handed every site
 * the user's bundle ids and a growing list of the URLs they saved from on it
 * (see CLAUDE.md § Gotchas). A copy left there by older builds is moved over
 * and removed the first time this page reads it.
 */
export const STORAGE_KEY = "defaultBundleOfEachPage";
/** Most-recently-used pages kept; the oldest are dropped past this. */
export const MAX_PAGES = 200;

type BundleMap = Record<string, string[]>;

function readStorage(): Promise<BundleMap> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(STORAGE_KEY, (data) => {
        resolve((data?.[STORAGE_KEY] as BundleMap) || {});
      });
    } catch {
      resolve({});
    }
  });
}

function writeStorage(map: BundleMap): Promise<void> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set({ [STORAGE_KEY]: map }, () => resolve());
    } catch {
      resolve();
    }
  });
}

/** Insertion order is recency: re-adding a page moves it to the end. */
function withPage(map: BundleMap, url: string, ids: string[]): BundleMap {
  const next = { ...map };
  delete next[url];
  next[url] = ids;
  const urls = Object.keys(next);
  for (const old of urls.slice(0, Math.max(0, urls.length - MAX_PAGES))) {
    delete next[old];
  }
  return next;
}

/**
 * Move a map older builds wrote into this page's own localStorage. Only the
 * key we named is touched; the host's other keys are never read.
 */
async function migrateHostCopy(map: BundleMap): Promise<BundleMap> {
  let legacy: BundleMap | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return map;
    legacy = JSON.parse(raw);
  } catch {
    // Unparseable — still ours, still to be removed.
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked on this page; nothing was there to move either.
  }
  if (!legacy || typeof legacy !== "object") return map;

  // Entries already in chrome.storage are newer than the host copy; they win.
  let merged: BundleMap = {};
  for (const [url, ids] of Object.entries(legacy)) {
    if (Array.isArray(ids) && !(url in map)) merged = withPage(merged, url, ids);
  }
  for (const [url, ids] of Object.entries(map)) merged = withPage(merged, url, ids);
  await writeStorage(merged);
  return merged;
}

export const useDefaultBundleStore = defineStore("default-bundle", () => {
  async function load(): Promise<BundleMap> {
    return migrateHostCopy(await readStorage());
  }

  async function getDefaultBundles(): Promise<string[]> {
    return (await load())[window.location.href] || [];
  }

  async function setDefaultBundles(ids: string[]) {
    await writeStorage(withPage(await load(), window.location.href, ids));
  }

  return {
    getDefaultBundles,
    setDefaultBundles,
  };
});
