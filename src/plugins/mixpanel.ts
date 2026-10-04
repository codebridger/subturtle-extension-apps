import mixpanel, { Config } from "mixpanel-browser";

/**
 * NO STORAGE ON THE HOST PAGE. This module runs inside content scripts, where
 * `document.cookie` and `localStorage` belong to whatever site the user is on.
 * mixpanel-browser's defaults persist its state in a `mp_<token>_mixpanel`
 * cookie on that site's domain (sent to the site's own servers with every
 * request) and queue events under `__mpq_*` keys in its localStorage. So:
 *   - `disable_persistence` keeps super properties and ids in memory only;
 *   - `batch_requests: false` sends each event immediately, with no queue.
 *
 * Identity survives page loads through an anonymous id kept in
 * chrome.storage.local, applied below. A logged-in user is still identified by
 * `analytic.identify(user.id)` after the profile loads (plugins/modular-rest.ts).
 */
let config: Partial<Config> = {
  debug: process.env.NODE_ENV != "production",
  // aws proxy link
  api_host: process.env.MIXPANEL_API_HOST || undefined,
  api_method: "POST",
  disable_persistence: true,
  batch_requests: false,
};

mixpanel.init(process.env.MIXPANEL_PROJECT_TOKEN as string, config);

mixpanel.register({
  app: "chrome-extension",
});
export const analytic = mixpanel;

export const ANON_ID_KEY = "analyticsAnonymousId";

/** crypto.randomUUID is missing on plain-http pages; getRandomValues is not. */
function newAnonymousId(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function useAnonymousId(id: string) {
  // identify() may already have run (a logged-in user whose profile loaded
  // first); never put the anonymous id back over a known user.
  if (mixpanel.get_property("$user_id")) return;
  mixpanel.register({ distinct_id: id, $device_id: id });
}

/**
 * Load (or create) the per-install anonymous id. Events tracked in the few
 * milliseconds before the storage read answers carry mixpanel's random
 * per-page id. Two scripts creating the id at once on the first page ever
 * can disagree once; the last write wins from then on.
 */
function applyStoredAnonymousId() {
  try {
    chrome.storage.local.get(ANON_ID_KEY, (data) => {
      let id = data?.[ANON_ID_KEY] as string | undefined;
      if (!id) {
        id = newAnonymousId();
        chrome.storage.local.set({ [ANON_ID_KEY]: id });
      }
      useAnonymousId(id);
    });
  } catch {
    // No extension context (e.g. invalidated after an update): stay per-page.
  }
}
applyStoredAnonymousId();

/**
 * Logout. When a registered user was identified, forget them and start a fresh
 * anonymous identity — what `mixpanel.reset()` did when its state lived in the
 * cookie — so activity after logout isn't linked to their account.
 *
 * logout() also runs when there was never a user (no stored token yet, or a
 * stale anonymous one, see loginWithLastSession). Rotating then would mint a
 * new "user" in analytics on every such page load, so the device keeps its
 * anonymous id and only the in-memory state is cleared.
 */
export function resetAnalyticsIdentity() {
  const wasIdentified = !!mixpanel.get_property("$user_id");
  mixpanel.reset();
  if (!wasIdentified) {
    applyStoredAnonymousId();
    return;
  }
  const id = newAnonymousId();
  try {
    chrome.storage.local.set({ [ANON_ID_KEY]: id });
  } catch {
    // See applyStoredAnonymousId.
  }
  useAnonymousId(id);
}
