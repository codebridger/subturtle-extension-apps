/**
 * Login funnel analytics helpers (E-03), used by LoginView.
 *
 * `user_logged-in` and `login_failed` carry `source` (where the login started)
 * and, for a failure, `reason`. The funnel is
 * save-login-prompt_viewed → save-login-prompt_clicked → user_logged-in
 * (source save_prompt) → phrase_saved.
 */
import type { LoginSource } from "../../common/types/messaging";

export type LoginFailReason = "window_closed" | "google_error" | "server_error";

const LOGIN_SOURCES: readonly LoginSource[] = ["save_prompt", "practice", "popup"];

/**
 * The `source` query on the login window's route. Anything missing or unknown
 * is "popup": the login view opened straight from the toolbar popup.
 */
export function loginSourceFrom(value: unknown): LoginSource {
  return LOGIN_SOURCES.includes(value as LoginSource)
    ? (value as LoginSource)
    : "popup";
}

/**
 * Why the Google step failed. chrome.identity reports a closed or cancelled
 * consent window as `chrome.runtime.lastError` "The user did not approve
 * access."; everything else (no token in the redirect, a page that could not
 * load) is a Google-side error.
 */
export function googleFailReason(err: unknown): LoginFailReason {
  const message = String((err as any)?.message ?? err ?? "");
  return /did not approve|cancel|closed/i.test(message)
    ? "window_closed"
    : "google_error";
}
