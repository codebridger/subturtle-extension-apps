import { authentication, functionProvider } from "@modular-rest/client";
import type {
  KeepPhrasePendingReply,
  LangCode,
  LanguageCapabilities,
  LanguageState,
} from "./types";

/**
 * Thin client for the server's `language` module (API contract section 2).
 *
 * Every call goes through here so the rest of the extension never spells a
 * function name, and tests mock one module. The server functions arrive on
 * the dashboard's `dev` during round 1; until they exist the calls fail and
 * the callers fall back to today's English-only behaviour (E-12). That is why
 * the readers here never throw: they answer `null` instead.
 *
 * Deliberately NOT wrapped in withAuthRetry: a missing function answers with an
 * error body, and a recovery there would log a registered user out.
 *
 * The `user_access` functions read the account from `args.userId`: modular-rest does
 * not add it, and without it the server answers "User ID is required", so the popup
 * pill and the save window language row never showed against a real server.
 */

/** The signed-in user's id for `user_access` functions (the server checks it is theirs). */
function caller(): { userId?: string } {
  const id = authentication.user?.id;
  return id ? { userId: id } : {};
}

/** `get-language-state`, or null when the server does not have it (yet). */
export async function fetchLanguageState(): Promise<LanguageState | null> {
  try {
    const state = await functionProvider.run<LanguageState>({
      name: "get-language-state",
      args: { ...caller() },
    });
    return isLanguageState(state) ? state : null;
  } catch (_e) {
    return null;
  }
}

/** `get-language-capabilities` (public), or null when missing. */
export async function fetchLanguageCapabilities(): Promise<LanguageCapabilities | null> {
  try {
    const caps = await functionProvider.run<LanguageCapabilities>({
      name: "get-language-capabilities",
      args: {},
    });
    if (caps && Array.isArray(caps.learning) && Array.isArray(caps.own)) {
      return caps;
    }
    return null;
  } catch (_e) {
    return null;
  }
}

/** `set-active-language`. Throws on failure so the picker can say so. */
export async function setActiveLanguage(language: LangCode): Promise<LanguageState> {
  const reply = await functionProvider.run<{ state: LanguageState }>({
    name: "set-active-language",
    args: { ...caller(), language },
  });
  if (!reply || !isLanguageState(reply.state)) {
    throw new Error("The server did not return the new language state.");
  }
  return reply.state;
}

/**
 * `keep-phrase-pending`: hold a phrase for a language the learner has not
 * added yet (B-32, Q6). `phrase` takes the same fields as `createPhrase`.
 */
export async function keepPhrasePending(
  phrase: Record<string, unknown>,
  language: LangCode
): Promise<KeepPhrasePendingReply> {
  return functionProvider.run<KeepPhrasePendingReply>({
    name: "keep-phrase-pending",
    args: { ...caller(), phrase, language },
  });
}

/** A reply with the fields this client reads. */
export function isLanguageState(value: unknown): value is LanguageState {
  const v = value as LanguageState | null | undefined;
  return !!v && typeof v === "object" && Array.isArray(v.languages);
}
