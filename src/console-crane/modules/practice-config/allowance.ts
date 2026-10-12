/**
 * What the user can actually start from "Practice now", derived from the
 * `getSubscriptionDetails` payload the profile store already fetches.
 *
 * Mirrors the server's gates (dashboard-app, subscription/service.ts):
 *  - Voice: `computeVoiceBalance` — base grant (`entitlements.voiceMinutesGranted`
 *    or `voice_minutes_total`) minus `voice_minutes_used`, plus the
 *    `minutes_remaining` of non-expired top-up packs (`active_top_ups`). Free
 *    (Starter) users are additionally capped by `allowed_lived_sessions`.
 *    Reader has 0 included minutes, so without a top-up voice is unavailable —
 *    the 2026-10-12 report's TIER_LIMIT_REACHED.
 *  - Text: `assertAndConsumeTextChat` — `allowed_text_chats` per month; null on
 *    a paid subscription means unlimited (Learner / Coach); free users fall
 *    back to FREEMIUM_DEFAULT_TEXT_CHATS.
 *
 * The server still enforces the real caps; this only decides what to offer.
 */

/** Server config FREEMIUM_DEFAULT_TEXT_CHATS / FREEMIUM_DEFAULT_VOICE_MINUTES. */
const FREEMIUM_DEFAULT_TEXT_CHATS = 5;
const FREEMIUM_DEFAULT_VOICE_MINUTES = 5;

export type PracticeMode = "text" | "voice";

export interface PracticeAllowance {
  /** Voice minutes left (base + top-ups). */
  voiceMinutesLeft: number;
  /** Text chats left this month; null = unlimited. */
  textChatsLeft: number | null;
  /** Monthly text-chat cap; null = unlimited. */
  textChatsTotal: number | null;
  canVoice: boolean;
  canText: boolean;
}

/** Loose shape — the payload is either a SubscriptionType or a freemium allocation. */
export interface SubscriptionLike {
  is_freemium?: boolean;
  voice_minutes_total?: number;
  voice_minutes_used?: number;
  entitlements?: { voiceMinutesGranted?: number } | null;
  active_top_ups?: { minutes_remaining?: number }[] | null;
  allowed_text_chats?: number | null;
  allowed_text_chats_used?: number;
  allowed_lived_sessions?: number;
  allowed_lived_sessions_used?: number;
}

export function computePracticeAllowance(
  sub: SubscriptionLike | null | undefined
): PracticeAllowance | null {
  if (!sub) return null;
  const free = !!sub.is_freemium;

  // Voice
  const base =
    sub.entitlements?.voiceMinutesGranted ??
    sub.voice_minutes_total ??
    (free ? FREEMIUM_DEFAULT_VOICE_MINUTES : 0);
  const used = sub.voice_minutes_used ?? 0;
  const topUps = (sub.active_top_ups ?? []).reduce(
    (sum, p) => sum + Math.max(0, p?.minutes_remaining ?? 0),
    0
  );
  const voiceMinutesLeft = Math.max(0, base - used) + topUps;

  const sessionsCapped =
    free &&
    typeof sub.allowed_lived_sessions === "number" &&
    (sub.allowed_lived_sessions_used ?? 0) >= sub.allowed_lived_sessions;

  // Text
  const textChatsTotal =
    sub.allowed_text_chats ?? (free ? FREEMIUM_DEFAULT_TEXT_CHATS : null);
  const textChatsLeft =
    textChatsTotal === null
      ? null
      : Math.max(0, textChatsTotal - (sub.allowed_text_chats_used ?? 0));

  return {
    voiceMinutesLeft,
    textChatsLeft,
    textChatsTotal,
    canVoice: voiceMinutesLeft > 0 && !sessionsCapped,
    canText: textChatsLeft === null || textChatsLeft > 0,
  };
}

/**
 * The mode to preselect: voice while there are minutes for it (the richer
 * experience), otherwise text. With an unknown allowance (logged out / still
 * loading) we preselect text, since every tier with an allowance has it.
 */
export function defaultPracticeMode(
  allowance: PracticeAllowance | null
): PracticeMode {
  return allowance?.canVoice ? "voice" : "text";
}
