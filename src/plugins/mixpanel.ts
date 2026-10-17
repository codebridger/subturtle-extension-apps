import mixpanel, { Config } from "mixpanel-browser";
import {
  ANON_ID_KEY,
  getInstallId,
  newAnonymousId,
  rememberInstallId,
} from "../common/helper/install-id";

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
 * chrome.storage.local (the install id), applied below.
 *
 * IDENTITY (simplified ID merge: an event with both `$device_id` and
 * `$user_id` links the install to the user; `$identify` is not needed):
 *   - every page, logged out: distinct_id = $device_id = install id;
 *   - every page, logged in: distinct_id = $user_id = user id, $device_id =
 *     install id, with register() only (setAnalyticsUser). identify() would
 *     send `$identify` on every page, because each page starts fresh;
 *   - only at the real login (LoginView): one identify() and one people.set
 *     (identifyAtLogin);
 *   - `$device_id` is only ever the install id: mixpanel's own random per-page
 *     id (set by init() and reset()) is removed, so it can never tie a random
 *     id to a person.
 *
 * PRIVACY: the extension runs on other people's sites. The host page's URL and
 * referrer are never sent (`property_blacklist`). An event that needs the site
 * sends its own explicit property (for example `platform`).
 */
let config: Partial<Config> = {
  debug: process.env.NODE_ENV != "production",
  // aws proxy link
  api_host: process.env.MIXPANEL_API_HOST || undefined,
  api_method: "POST",
  disable_persistence: true,
  batch_requests: false,
  property_blacklist: [
    "$current_url",
    "$referrer",
    "$referring_domain",
    "$initial_referrer",
    "$initial_referring_domain",
  ],
};

mixpanel.init(process.env.MIXPANEL_PROJECT_TOKEN as string, config);
// init() sets $device_id to a random per-page id; only the install id may be one.
mixpanel.unregister("$device_id");

/**
 * Shared property names, the same in every app (dashboard, mobile, server,
 * landing later): `app` is the type of app, `app_version` its version.
 *
 * The extension version, the same value `extension_installed` /
 * `extension_updated` send as `app_version` (install-tracking.ts): the full
 * `version_name` on dev builds, else `version`. Undefined without an
 * extension context (a content script left behind by an update), where
 * getManifest throws.
 */
export function extensionVersion(): string | undefined {
  try {
    const manifest = chrome.runtime.getManifest();
    return manifest.version_name || manifest.version || undefined;
  } catch {
    return undefined;
  }
}

/** Super properties every event carries. Registered again after reset(). */
function registerSuperProperties() {
  const version = extensionVersion();
  mixpanel.register({
    app: "chrome-extension",
    ...(version ? { app_version: version } : {}),
  });
}
registerSuperProperties();
export const analytic = mixpanel;

export { ANON_ID_KEY };

/** The install id once read from storage, and the signed-in user, if any. */
let installId: string | undefined;
let userId: string | undefined;

/** Apply the identity rules above to mixpanel's super properties. */
function applyIdentity() {
  if (userId) {
    mixpanel.register({
      distinct_id: userId,
      $user_id: userId,
      ...(installId ? { $device_id: installId } : {}),
    });
  } else if (installId) {
    mixpanel.register({ distinct_id: installId, $device_id: installId });
  }
}

function useAnonymousId(id: string) {
  installId = id;
  applyIdentity();
}

/**
 * Load (or create) the per-install anonymous id. The key and format live in
 * helper/install-id.ts, which server calls use to send it as `deviceId`.
 * Events tracked in the few milliseconds before the storage read answers
 * carry mixpanel's random per-page distinct_id and no $device_id, so they tie
 * nothing together. Two scripts creating the id at once on the first page
 * ever can disagree once; the last write wins from then on.
 */
function applyStoredAnonymousId() {
  try {
    chrome.storage.local.get(ANON_ID_KEY, (data) => {
      // A failed read must not mint a new id (see install-id.ts).
      if (chrome.runtime?.lastError) return;
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

/**
 * Page load with a signed-in user (every bundle, leader or not): register the
 * user with no `$identify` and no profile update. The install id stays the
 * `$device_id`.
 */
export function setAnalyticsUser(id: string | undefined | null) {
  if (!id) return;
  userId = id;
  applyIdentity();
}

/**
 * The real moment of login (LoginView, where `user_logged-in` is tracked):
 * one `$identify` from the install id to the user, and one profile update.
 *
 * identify() only sends `$identify` when the distinct_id changes, and the
 * session restore that ran just before has already registered the user. So
 * the install id is put back first.
 */
export async function identifyAtLogin(
  id: string | undefined | null,
  email?: string | null
) {
  if (!id) return;
  const stored = await getInstallId();
  if (stored) installId = stored;
  if (installId) {
    mixpanel.unregister("$user_id");
    mixpanel.register({ distinct_id: installId, $device_id: installId });
  }
  mixpanel.identify(id);
  userId = id;
  applyIdentity();
  if (email) mixpanel.people.set({ $email: email });
}

applyStoredAnonymousId();
// Server calls send this id as deviceId; read it now, while storage works.
rememberInstallId();

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
  const wasIdentified = !!userId || !!mixpanel.get_property("$user_id");
  userId = undefined;
  mixpanel.reset();
  // reset() sets a random $device_id again, and clears super properties.
  mixpanel.unregister("$device_id");
  registerSuperProperties();
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
