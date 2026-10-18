import { dataProvider, authentication } from "@modular-rest/client";
import { COLLECTIONS, DATABASE } from "../static/global";
import type { PhraseType } from "../types/phrase.type";
import { isRegisteredUser, whenSessionReady } from "../helper/auth-recovery";

/**
 * Single source of truth for "has the user already saved this phrase?".
 *
 * Matches by phrase text (the saved unit) + owner only. The translation is
 * intentionally excluded: the AI returns a slightly different translation on
 * each call, so matching on it would make an already-saved phrase look unsaved.
 *
 * Signed out it sends nothing: the anonymous account has no saved phrases and
 * may not read the collection (the server answers 403, or 401 without a
 * token). It first waits for the page's session bootstrap, so a lookup made
 * while a signed-in user's session is still loading is not skipped by mistake.
 *
 * Returns the saved phrase document, or null when not signed in, the input is
 * empty, the phrase isn't saved, or the lookup fails.
 */
export async function findSavedPhrase(
  phrase: string
): Promise<PhraseType | null> {
  const text = (phrase || "").trim();
  if (!text) return null;

  await whenSessionReady();
  const refId = authentication.user?.id;
  if (!isRegisteredUser() || !refId) return null;

  try {
    const doc = await dataProvider.findOne<PhraseType>({
      database: DATABASE.USER_CONTENT,
      collection: COLLECTIONS.PHRASE,
      query: { refId, phrase: text },
    });
    return (doc as PhraseType) || null;
  } catch {
    return null;
  }
}
