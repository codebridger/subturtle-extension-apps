import mixpanel, { Config } from "mixpanel-browser";
import { ANON_ID_KEY, newAnonymousId } from "../common/helper/install-id";

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

export { ANON_ID_KEY };

function useAnonymousId(id: string) {
  // identify() may already have run (a logged-in user whose profile loaded
  // first); never put the anonymous id back over a known user.
  if (mixpanel.get_property("$user_id")) return;
  mixpanel.register({ distinct_id: id, $device_id: id });
}

/**
 * Load (or create) the per-install anonymous id. The key and format live in
 * helper/install-id.ts, which server calls use to send it as `deviceId`.
 * Events tracked in the few milliseconds before the storage read answers
 * carry mixpanel's random per-page id. Two scripts creating the id at once on
 * the first page ever can disagree once; the last write wins from then on.
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

/**
 * Language super properties (E-13). `target_language` (the learner's own
 * language, the old name) now comes from the server profile, which fills it for
 * the users the local guess never set; `learning_language` is the active
 * language the learner studies.
 */
let targetLanguageFromServer = false;

export function registerLanguageAnalytics(state: {
  learningLanguage: string | null;
  translationLanguage: string | null;
}) {
  const props: Record<string, string> = {};
  if (state.learningLanguage) props.learning_language = state.learningLanguage;
  if (state.translationLanguage) {
    props.target_language = state.translationLanguage;
    targetLanguageFromServer = true;
  }
  if (Object.keys(props).length) mixpanel.register(props);
}

/**
 * The settings store's super properties. Once the server profile has named the
 * own language, the local value (a guess, or a stale pick) no longer
 * overwrites it.
 */
export function registerSettingsAnalytics(props: {
  target_language: string;
  theme: string;
}) {
  if (targetLanguageFromServer) {
    mixpanel.register({ theme: props.theme });
  } else {
    mixpanel.register(props);
  }
}
