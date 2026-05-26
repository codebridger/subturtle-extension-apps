import { dataProvider, authentication } from "@modular-rest/client";
import { COLLECTIONS, DATABASE } from "../static/global";
import type { PhraseType } from "../types/phrase.type";

/**
 * Single source of truth for "has the user already saved this phrase?".
 *
 * Matches by phrase text (the saved unit) + owner only. The translation is
 * intentionally excluded: the AI returns a slightly different translation on
 * each call, so matching on it would make an already-saved phrase look unsaved.
 *
 * Returns the saved phrase document, or null when not logged in, the input is
 * empty, the phrase isn't saved, or the lookup fails.
 */
export async function findSavedPhrase(
  phrase: string
): Promise<PhraseType | null> {
  const refId = authentication.user?.id;
  const text = (phrase || "").trim();
  if (!refId || !text) return null;

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
