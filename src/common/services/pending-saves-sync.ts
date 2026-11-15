/**
 * Send local saves to the account after sign-in (save-first E-04).
 *
 * Runs after a login completes (LoginView), when the toolbar popup opens
 * signed in, and when a page's console-crane script sees a signed-in user, so
 * a sync that was cut off (the login window closed, the browser quit) carries
 * on at the next start.
 *
 * - One run at a time: an in-page promise, plus a lock in chrome.storage.local
 *   with an end time, so two tabs do not send the same list together. If they
 *   still race, nothing breaks: `createPhrase` reuses a phrase with the same
 *   text for the same user, and adds it to a bundle only once.
 * - A phrase leaves the list only after the server accepted it.
 * - The Starter save limit stops the run; the rest stay for later.
 * - No `withAuthRetry`: on an auth error it falls back to the shared anonymous
 *   account, and a user's phrases must never be saved there.
 * - Languages (multilingual round 1): logged out there is no language state,
 *   so each phrase gets its language here, with the same rule as the save
 *   window (`resolveSaveRow` on the detected language). A language the
 *   learner has not added goes to the active language ("Save to <active>").
 *   Without language profiles nothing is sent, as before (an old server
 *   resolves it itself, B-25).
 */
import {
  authentication,
  dataProvider,
  functionProvider,
} from "@modular-rest/client";
import { COLLECTIONS, DATABASE } from "../static/global";
import { getInstallId } from "../helper/install-id";
import { analytic } from "../../plugins/mixpanel";
import { log } from "../helper/log";
import { useLanguageStore } from "../../stores/language";
import { languageFilter, resolveSaveRow } from "../language/state";
import {
  listPendingSaves,
  removePendingSave,
  type PendingSave,
} from "./pending-saves";

export const SYNC_LOCK_KEY = "pendingSavesSyncLock";
/** A lock older than this is from a run that died; take it over. */
export const SYNC_LOCK_MS = 2 * 60 * 1000;
/** The bundle used when the server has no name for the phrase's page. */
export const FALLBACK_BUNDLE_TITLE = "Saved phrases";

export interface SyncResult {
  /** Phrases the server accepted (removed from the local list). */
  sent: number;
  /** Phrases that failed for another reason (kept, tried again next time). */
  failed: number;
  /** Phrases still in the local list after the run. */
  left: number;
  /** The run stopped at the Starter save limit. */
  limitReached: boolean;
  /** The run did not start: not signed in, nothing to send, or another run holds the lock. */
  skipped: boolean;
}

const SKIPPED: SyncResult = {
  sent: 0,
  failed: 0,
  left: 0,
  limitReached: false,
  skipped: true,
};

let running: Promise<SyncResult> | null = null;

/** The signed-in user's id, or null for logged out / the anonymous account. */
function signedInUserId(): string | null {
  const user = authentication.user;
  if (!authentication.isLogin || !user?.id) return null;
  return user.type?.toLowerCase() === "user" ? user.id : null;
}

/** The server refused a new phrase because the plan's save limit is reached. */
export function isSaveLimitError(err: unknown): boolean {
  let text = "";
  try {
    text = typeof err === "string" ? err : JSON.stringify(err) || "";
  } catch {
    // Not serialisable; fall back to the message.
  }
  text += ` ${(err as any)?.message ?? ""}`;
  return text.includes("TIER_LIMIT_REACHED");
}

async function acquireLock(): Promise<string | null> {
  const owner = Math.random().toString(36).slice(2);
  try {
    const data = await chrome.storage.local.get(SYNC_LOCK_KEY);
    const lock = data?.[SYNC_LOCK_KEY];
    if (lock && typeof lock.until === "number" && lock.until > Date.now()) {
      return null;
    }
    await chrome.storage.local.set({
      [SYNC_LOCK_KEY]: { owner, until: Date.now() + SYNC_LOCK_MS },
    });
    // Read back: if another tab wrote at the same moment, the last write wins
    // and only that tab goes on.
    const check = await chrome.storage.local.get(SYNC_LOCK_KEY);
    return check?.[SYNC_LOCK_KEY]?.owner === owner ? owner : null;
  } catch {
    return null;
  }
}

async function refreshLock(owner: string): Promise<void> {
  await chrome.storage.local.set({
    [SYNC_LOCK_KEY]: { owner, until: Date.now() + SYNC_LOCK_MS },
  });
}

async function releaseLock(owner: string): Promise<void> {
  try {
    const data = await chrome.storage.local.get(SYNC_LOCK_KEY);
    if (data?.[SYNC_LOCK_KEY]?.owner === owner) {
      await chrome.storage.local.remove(SYNC_LOCK_KEY);
    }
  } catch {
    // The lock ends by itself after SYNC_LOCK_MS.
  }
}

/**
 * A function that gives the language each phrase is saved to, or null for
 * all (no language profiles: requests stay as before). Loads the learner's
 * language state when the login has not loaded it yet.
 */
async function languagePicker(): Promise<(item: PendingSave) => string | null> {
  let languages: ReturnType<typeof useLanguageStore>;
  try {
    languages = useLanguageStore();
  } catch {
    // No Pinia in this context.
    return () => null;
  }
  if (!languages.state) await languages.fetchLanguages();
  const state = languages.state;
  if (!languages.isMultilingual || !state) return () => null;

  return (item) => {
    const row = resolveSaveRow({
      state,
      caps: languages.caps,
      detected: item.detected_language ?? null,
    });
    return row.target ?? row.active;
  };
}

async function findBundleByTitle(
  userId: string,
  title: string,
  language: string | null
): Promise<string | null> {
  const existing = await dataProvider.findOne<any>({
    database: DATABASE.USER_CONTENT,
    collection: COLLECTIONS.PHRASE_BUNDLE,
    query: {
      refId: userId,
      title,
      ...(language ? { language: languageFilter(language) } : {}),
    },
  });
  return existing?._id || null;
}

/** Use the user's bundle with this title, or create it (the refId+title index is unique). */
async function findOrCreateBundle(
  userId: string,
  title: string,
  language: string | null
): Promise<string> {
  const existingId = await findBundleByTitle(userId, title, language);
  if (existingId) return existingId;
  try {
    const created: any = await dataProvider.insertOne({
      database: DATABASE.USER_CONTENT,
      collection: COLLECTIONS.PHRASE_BUNDLE,
      // Bundles carry their language (E-07, B-09).
      doc: { title, refId: userId, ...(language ? { language } : {}) },
    });
    analytic.track("phrase-bundle_created", { source: "pending_saves" });
    if (created?._id) return created._id;
  } catch (error) {
    // Created at the same moment by another run: use that one.
    const fallbackId = await findBundleByTitle(userId, title, language);
    if (fallbackId) return fallbackId;
    throw error;
  }
  throw new Error(`Could not create the bundle "${title}"`);
}

/**
 * The bundle for one local phrase: the user's bundle that already has a
 * phrase from that page, or a bundle named by the server's suggestion for the
 * page title, or FALLBACK_BUNDLE_TITLE. Cached per page within one run.
 */
async function bundleFor(
  userId: string,
  item: PendingSave,
  language: string | null,
  cache: Map<string, string>
): Promise<string> {
  // Per page and language: a German page bundle is no bundle for English.
  const pageKey = `${item.sourceUrl || ""}\n${item.pageTitle || ""}\n${language || ""}`;
  const cached = cache.get(pageKey);
  if (cached) return cached;

  let title = FALLBACK_BUNDLE_TITLE;
  let bundleId: string | null = null;
  if (item.sourceUrl || item.pageTitle) {
    try {
      const suggestion = await functionProvider.run<any>({
        name: "getBundleSuggestionForPage",
        args: {
          refId: userId,
          pageTitle: item.pageTitle || "",
          pageUrl: item.sourceUrl || "",
          ...(language ? { language } : {}),
        },
      });
      bundleId = suggestion?.matchedBundle?._id || null;
      if (suggestion?.suggestedName?.trim()) {
        title = suggestion.suggestedName.trim();
      }
    } catch (error) {
      // Best effort: the fallback bundle is fine.
      log("pending saves: bundle suggestion failed", error);
    }
  }

  const id = bundleId || (await findOrCreateBundle(userId, title, language));
  cache.set(pageKey, id);
  return id;
}

async function run(userId: string): Promise<SyncResult> {
  const items = await listPendingSaves();
  if (!items.length) return SKIPPED;

  const owner = await acquireLock();
  if (!owner) return SKIPPED;

  const result: SyncResult = {
    sent: 0,
    failed: 0,
    left: 0,
    limitReached: false,
    skipped: false,
  };

  try {
    const deviceId = await getInstallId();
    const languageFor = await languagePicker();
    const bundles = new Map<string, string>();

    // Oldest first, so a limit keeps the newest phrases for later.
    const queue = [...items].sort((a, b) => a.savedAt - b.savedAt);
    for (const item of queue) {
      // Stop if the user signed out (or changed) during the run.
      if (signedInUserId() !== userId) break;
      await refreshLock(owner);

      try {
        const language = languageFor(item);
        const bundleId = await bundleFor(userId, item, language, bundles);
        await functionProvider.run({
          name: "createPhrase",
          args: {
            phrase: item.phrase,
            translation: item.translation,
            translation_language: item.translation_language,
            ...(deviceId ? { deviceId } : {}),
            bundleIds: [bundleId],
            refId: userId,
            type: "linguistic",
            context: item.context || "",
            direction: item.direction,
            language_info: item.language_info,
            linguistic_data: item.linguistic_data,
            chunks: item.chunks || [],
            sourceUrl: item.sourceUrl,
            // The language it is saved to (E-07); only with language profiles.
            ...(language ? { language } : {}),
          },
        });
        await removePendingSave(item.phrase);
        result.sent++;
      } catch (error) {
        if (isSaveLimitError(error)) {
          result.limitReached = true;
          break;
        }
        log("pending saves: createPhrase failed", error);
        result.failed++;
      }
    }
  } finally {
    result.left = (await listPendingSaves()).length;
    await releaseLock(owner);
  }

  analytic.track("pending-saves_synced", {
    sent: result.sent,
    failed: result.failed,
    left: result.left,
    ...(result.limitReached ? { limit_reached: true } : {}),
  });
  return result;
}

/**
 * Send every local phrase to the signed-in user's account. Safe to call often:
 * it does nothing when logged out, when the list is empty, or while another
 * run (in this page or another tab) is going.
 */
export function syncPendingSaves(): Promise<SyncResult> {
  if (running) return running;
  const userId = signedInUserId();
  if (!userId) return Promise.resolve(SKIPPED);

  running = run(userId)
    .catch((error) => {
      log("pending saves: sync failed", error);
      return SKIPPED;
    })
    .finally(() => {
      running = null;
    });
  return running;
}
