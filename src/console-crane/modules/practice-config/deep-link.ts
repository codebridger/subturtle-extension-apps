/**
 * "Practice now" -> dashboard deep-link.
 *
 * Practice now is a single-phrase voice or text session. Voice hands the saved
 * phrase to the dashboard's live-session gate (`/practice/live-session`); text
 * goes straight to the text page (`/practice/live-session-text`) with
 * `mode: "text"`, so a tier without voice minutes (Reader) never touches the
 * voice path. Both carry a base64-encoded LiveSessionRequest with a `phrases`
 * source — the same descriptor the dashboard's bundle review builds.
 * The phrase is always saved first, so it's referenced by id; all values are
 * ASCII, so plain base64 is enough.
 */

/** The eight Gemini voices, mirroring the dashboard's voice list. */
export const PRACTICE_NOW_VOICES = [
  "Kore",
  "Puck",
  "Charon",
  "Fenrir",
  "Aoede",
  "Leda",
  "Orus",
  "Zephyr",
] as const;

export const DEFAULT_PRACTICE_VOICE = "Kore";

export interface PracticeNowOptions {
  /** The saved phrase's `_id`. */
  phraseId: string;
  /** The chosen coach voice (one of {@link PRACTICE_NOW_VOICES}). */
  voiceName?: string;
  /** Conversation transport; defaults to voice. */
  mode?: "voice" | "text";
}

/**
 * The dashboard-relative path the new tab lands on after the token handoff:
 * the unified live-session gate, carrying a single-phrase request.
 */
export function buildPracticeNowPath({
  phraseId,
  voiceName,
  mode = "voice",
}: PracticeNowOptions): string {
  const request = {
    aiCharacter: voiceName || DEFAULT_PRACTICE_VOICE,
    mode,
    source: { kind: "phrases", phraseIds: [phraseId] },
    returnTo: "/board",
  };
  const session = btoa(JSON.stringify(request));
  const params = new URLSearchParams();
  params.set("session", session);
  const page = mode === "text" ? "live-session-text" : "live-session";
  return `/practice/${page}?${params.toString()}`;
}
