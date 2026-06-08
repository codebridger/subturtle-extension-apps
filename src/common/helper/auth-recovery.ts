import { authentication } from "@modular-rest/client";
import { sendMessage } from "./massage";
import { StoreUserTokenMessage } from "../types/messaging";
import { debug, error, warn } from "./log";

/**
 * Auth-recovery helper — the three pieces of "self-heal a dead session token"
 * live together here because they're only ever useful as a unit:
 *
 *   isAuthError(err)   — is this failure a stale/invalid token?
 *   reauthAnonymously()— if so, how do we recover a session?
 *   withAuthRetry(run) — the policy that wires the two: retry once on recovery.
 *
 * Why this matters: anonymous users get purged server-side, so a token
 * persisted in chrome.storage.sync can outlive its user and start returning
 * "User not found" on every call — leaving the user stuck (e.g. on
 * "Translation failed") with no way out short of a full reload.
 */

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * We can only inspect the *body* the server sent, never the HTTP status:
 * modular-rest's HTTPClient.request discards `error.response.status` and
 * re-throws only `error.response.data` wrapped as `{ hasError, error }`
 * (node_modules/@modular-rest/client/dist/class/http.js). So detection is
 * string-based against the response body.
 *
 * Two thrown shapes reach callers:
 *   - functionProvider.run re-throws the raw server body, e.g. "User not found".
 *   - dataProvider.* let the wrapper through, e.g. { hasError, error: "..." }.
 * extractMessage flattens both into one searchable string.
 *
 * The patterns below were derived from the actual modular-rest server source
 * (auth middleware → JWT verify → user lookup), not guessed. On every
 * auth-gated route (/function/run, /data-provider/*) the server reports auth
 * failures via Koa `ctx.throw`, so the BODY is a bare string: either the thrown
 * message, or — when the message is undefined — Koa's default reason phrase.
 * Verified failure → body mapping:
 *   - token valid but user row purged   → 412 "User not found"
 *   - missing / empty Authorization     → 401 "authentication is required"
 *   - lacks permission                  → 403 "access denied"
 *   - invalid/expired/wrong-sig/malformed token → 412 "Precondition Failed"
 *       ^ the jwt reason ("jwt expired" / "invalid signature" / "jwt malformed")
 *         is SWALLOWED server-side: JWT.verify rejects with the message as a
 *         *string*, so `err.message` is undefined and ctx.throw(412, undefined)
 *         falls back to Koa's reason phrase. "Precondition Failed" is therefore
 *         the ONLY on-the-wire signal for the most common stale-token case —
 *         and on these routes a bare "precondition failed" body can only come
 *         from the auth middleware (validation 412s carry a JSON body instead),
 *         so matching it does not risk a false positive.
 *
 * NOTE: /user/login & /user/loginAnonymous failures arrive as
 * {status:"error", e:{}} (the Error serializes to {} — message lost). Those are
 * deliberately NOT matched: login is an explicit user action and must not be
 * silently retried as anonymous. If the upstream server stops swallowing the
 * jwt message, the raw jsonwebtoken phrases below will start matching too.
 */
const AUTH_ERROR_PATTERNS = [
  // Bare-string bodies the server emits via ctx.throw on auth-gated routes.
  "user not found", // 412 — token valid, user row purged (the reported bug)
  "authentication", // 401 "authentication is required" (missing/empty header)
  "access denied", // 403 — authenticated but lacks permission
  "precondition failed", // 412 — invalid/expired/wrong-sig token (reason swallowed)

  // Raw jsonwebtoken messages — reach the client verbatim via /verify/token,
  // and would reach the auth path too if the server stops swallowing them.
  "jwt expired",
  "jwt malformed",
  "jwt not active",
  "invalid signature",
  "invalid token",
  "jwt", // catch-all for other jsonwebtoken phrases ("jwt must be provided", …)

  // Defensive nets — not emitted by this server today, but cheap and guard the
  // modular-rest client's own throws / intermediary proxies / gateways.
  "unauthorized",
  "forbidden",
  "token doesn't", // client-side: "Token doesn't find on local machine"
];

function extractMessage(err: unknown, depth = 0): string {
  if (err == null || depth > 3) return "";
  if (typeof err === "string") return err;
  if (typeof err === "number" || typeof err === "boolean") return String(err);
  if (typeof err === "object") {
    const o = err as Record<string, unknown>;
    // The fields modular-rest / our own throws use to carry a message.
    return [o.error, o.message, o.detail, o.reason, o.e, o.status]
      .map((v) => extractMessage(v, depth + 1))
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

/**
 * True when the error body matches a known auth/token-failure phrase.
 *
 * Deliberately conservative: business errors ("limit reached", "not enough
 * credit") must NOT match, or we'd needlessly churn a perfectly good session
 * — and a registered user could get silently degraded to anonymous.
 */
export function isAuthError(err: unknown): boolean {
  const text = extractMessage(err).toLowerCase();
  if (!text) return false;
  return AUTH_ERROR_PATTERNS.some((pattern) => text.includes(pattern));
}

// ---------------------------------------------------------------------------
// Recovery
// ---------------------------------------------------------------------------

/**
 * Establish a fresh anonymous session and persist its token to the background
 * so every bundle on the page reuses it. Returns true once a usable session is
 * in place.
 *
 * Persisting matters: subsequent mounts (other bundles on the same page, the
 * popup, page reloads) reuse this token instead of each calling
 * /user/loginAnonymous and stranding the previous anonymous user — which the
 * server then 412s / "User not found"s on the next call. The write goes to
 * chrome.storage.sync (cross-context) via the background script.
 *
 * Callers:
 *   1. modular-rest.ts loginWithLastSession's fallback — first-session
 *      bootstrap when no valid stored token exists.
 *   2. withAuthRetry (via recoverSession) — a previously-valid token went stale
 *      mid-session.
 *
 * SINGLE-FLIGHT: concurrent callers are coalesced into ONE /user/loginAnonymous
 * and all reuse its token. This is essential — when a stored token is dead, a
 * page typically fires several failing requests at once (the word-detail modal
 * runs a simple + a detailed translation plus bundle look-ups together), and
 * without coalescing each one would mint and strand its own anonymous user,
 * producing the "constant loginAnonymous calls" storm. A re-auth that starts
 * after the in-flight one settles is a fresh login (the guard resets).
 *
 * modular-rest.ts is the one that additionally refreshes the reactive isLogin
 * ref via updateIsLogin after calling this.
 */
let inflightReauth: Promise<boolean> | null = null;

export function reauthAnonymously(): Promise<boolean> {
  if (inflightReauth) return inflightReauth;
  inflightReauth = performAnonymousReauth().finally(() => {
    inflightReauth = null;
  });
  return inflightReauth;
}

async function performAnonymousReauth(): Promise<boolean> {
  try {
    await authentication.loginAsAnonymous();
    debug("Subturtle anonymous login succeeded", authentication.isLogin);

    const token = authentication.getToken;
    if (token) {
      try {
        await sendMessage(new StoreUserTokenMessage(token));
      } catch (err) {
        error(
          "Subturtle: persisting anonymous token to background failed",
          err
        );
      }
    }

    return authentication.isLogin;
  } catch (err) {
    // Raw console.error (not the [Subturtle]-prefixing helper) to preserve the
    // exact message the anon-fallback has always logged — pinned by
    // tests/auth-anon-flow.test.ts.
    console.error("Subturtle anonymous login failed", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Recovery strategy (late-bound)
// ---------------------------------------------------------------------------

/**
 * The recovery withAuthRetry runs when it sees an auth error. Defaults to the
 * bare reauthAnonymously (fresh anon token only). modular-rest.ts overrides it
 * at init via setSessionRecovery with a system-wide recovery that ALSO tears
 * the dead session down (logout broadcast + profile/isLogin/analytics reset)
 * before re-establishing anonymous — see modular-rest.ts `recoverSession`.
 *
 * Late binding (rather than importing logout from the plugin) is deliberate:
 *   - the plugin already imports reauthAnonymously from THIS module, so a
 *     direct back-import would be circular; and
 *   - this module must stay side-effect-free so translate.service — and the
 *     many UI components importing it — don't drag the plugin's content-script
 *     side effects (GlobalOptions, chrome listeners, …) into their import graph
 *     or tests. The plugin is loaded by every bundle, so the override is always
 *     applied in production; code paths that never load it (some unit tests)
 *     fall back to the bare anonymous recovery, which is sufficient there.
 */
let sessionRecovery: () => Promise<boolean> = reauthAnonymously;

export function setSessionRecovery(recover: () => Promise<boolean>): void {
  sessionRecovery = recover;
}

/**
 * Single-flight wrapper around the installed recovery. A burst of failing
 * requests (the word-detail modal fires several at once) must trigger ONE
 * recovery, not one per request — otherwise the registered-user path would run
 * logout() repeatedly and the anonymous path would still funnel through the
 * (already coalesced) reauthAnonymously. All concurrent failures await the same
 * recovery and then each retries its own call.
 */
let inflightRecovery: Promise<boolean> | null = null;

function recoverOnce(): Promise<boolean> {
  if (inflightRecovery) return inflightRecovery;
  inflightRecovery = Promise.resolve(sessionRecovery()).finally(() => {
    inflightRecovery = null;
  });
  return inflightRecovery;
}

// ---------------------------------------------------------------------------
// Retry policy
// ---------------------------------------------------------------------------

/**
 * Run a modular-rest call and, if it fails because the session token is
 * stale/invalid, recover the session and retry the call once.
 *
 * Reusable across services — any call that depends on a valid session token
 * can wrap itself in this to self-heal a dead token instead of surfacing a
 * hard failure:
 *
 *   import { withAuthRetry } from "@/common/helper/auth-recovery";
 *   const data = await withAuthRetry(() => functionProvider.run({ ... }));
 *
 * Recovery is whatever setSessionRecovery installed (system-wide logout +
 * anonymous re-auth in production). A registered user whose token is genuinely
 * dead is cleanly downgraded to anonymous across the extension.
 *
 * Guarantees:
 *   - Only retries auth-shaped errors (isAuthError is conservative), so genuine
 *     failures — network, rate limit, business errors — surface unchanged.
 *   - Retries at most ONCE, and only if recovery actually produced a usable
 *     session, so it can never loop.
 */
export async function withAuthRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!isAuthError(err)) throw err;

    warn(
      "Request hit an auth error; recovering session and retrying once.",
      err
    );

    const recovered = await recoverOnce();
    if (!recovered) throw err;

    return await run();
  }
}
