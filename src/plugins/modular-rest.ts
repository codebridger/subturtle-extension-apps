// IMPORTANT: must precede any import that may touch localStorage at module load.
// Content scripts run in an "isolated world" that shares localStorage with the
// host page. The dashboard at *.subturtle.app and localhost:3000 (dev) uses
// `token` as its own localStorage key for the user's session — when the
// extension's modular-rest client (or our explicit cache write below) writes
// the extension's anonymous token there, it clobbers the dashboard user's
// session and bounces them to /auth/login on the next reload or new tab.
//
// Block 'token' writes/removes from the content-script side on those origins.
// The extension already persists tokens to chrome.storage.sync via the
// background script, so losing the per-page localStorage cache only costs
// one extra /user/loginAnonymous call per content-script mount on dashboard
// origins — it does NOT break extension auth.
function isDashboardOrigin(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const port = window.location.port;
  return (
    (host === "localhost" && port === "3000") ||
    host === "subturtle.app" ||
    host === "www.subturtle.app" ||
    host === "dashboard.subturtle.app" ||
    host === "www.dashboard.subturtle.app"
  );
}

if (typeof Storage !== "undefined" && isDashboardOrigin()) {
  const origSet = Storage.prototype.setItem;
  const origRm = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (k: string, v: string) {
    // Only suppress writes to localStorage on the dashboard, never sessionStorage.
    if (this === window.localStorage && k === "token") return;
    return origSet.call(this, k, v);
  };
  Storage.prototype.removeItem = function (k: string) {
    if (this === window.localStorage && k === "token") return;
    return origRm.call(this, k);
  };
}

// Announce extension presence to the dashboard so it can hide the "install
// the extension" nudge. window.postMessage crosses the content-script /
// page-world boundary; the message is scoped to the page's own origin.
if (typeof window !== "undefined" && isDashboardOrigin()) {
  const announcePresence = () => {
    try {
      window.postMessage(
        {
          source: "subturtle-extension",
          type: "presence",
          version: chrome.runtime.getManifest().version,
        },
        window.location.origin
      );
    } catch (_e) {
      // postMessage can fail in odd sandboxed iframes — non-fatal.
    }
  };

  // Announce immediately in case the dashboard listener is already attached.
  announcePresence();

  // Respond to dashboard pings in case the dashboard mounts after us.
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (data?.source === "subturtle-dashboard" && data?.type === "ping") {
      announcePresence();
    }
  });
}

import { GlobalOptions, authentication } from "@modular-rest/client";

import { sendMessage, sendMessageToTabs } from "../common/helper/massage";

import {
  GetLoginStatusMessage,
  StoreUserTokenMessage,
} from "../common/types/messaging";
import { ref } from "vue";
import { useProfileStore } from "../stores/profile";
import { analytic } from "./mixpanel";
import { debug, error, log } from "../common/helper/log";
import {
  reauthAnonymously,
  setSessionRecovery,
} from "../common/helper/auth-recovery";

GlobalOptions.set({
  host: process.env.SUBTURTLE_API_URL || "",
});

export {
  authentication,
  dataProvider,
  fileProvider,
} from "@modular-rest/client";

export const isLogin = ref(false);

function updateIsLogin() {
  const loginInfo =
    authentication.isLogin && authentication.user?.type.toLowerCase() == "user";
  isLogin.value = loginInfo;

  // If user is logged in, fetch membership and freemium details
  if (loginInfo) {
    const profileStore = useProfileStore();

    return profileStore.bootstrap()
      .then(() => {
        analytic.identify(authentication.user?.id);
        analytic.people.set({
          $email: authentication.user?.email,
        });

        return true;
      })
      .catch((errorDetail) => {
        error("Error bootstrapping profile store:", errorDetail);
        return false;
      });
  }
  else {
    return false;
  }
}

chrome.runtime.onMessage.addListener((request, _sender) => {
  console.log("Content-S: New Message", request);

  // Store user token
  if (StoreUserTokenMessage.is(request)) {
    if (request.token === null) {
      logout(false);
    } else {
      loginWithLastSession();
    }
  }
});

export async function loginWithLastSession() {

  // Check if the user is logged in
  // If the user is logged in, try to login with the token as last session.
  await sendMessage(new GetLoginStatusMessage())
    .then(async (res) => {
      if (!GetLoginStatusMessage.checkResponse(res)) return;

      const user = await authentication.loginWithToken(
        res.token as string,
        // token will be stored on background service, so we don't need to store it here
        false
      );

      debug("retrieved user from last login: ", user);

      if (user.type == "anonymous") {
        authentication.logout();
        return false;
      } else {
        return updateIsLogin();
      }

    })
    .then(async (_isRegisteredUser) => {
      // updateIsLogin's truthy result means "registered user with a real
      // account". Anonymous users return false here even though they hold a
      // perfectly valid session — so don't conflate "not a registered user"
      // with "login failed". Only broadcast logout when the underlying token
      // truly couldn't be validated (authentication.isLogin === false).
      // Without this guard, every fresh popup open would `logout()` the anon
      // session, clearing chrome.storage.sync and broadcasting null to every
      // tab — and the next translate from any content script then 412s
      // because its Authorization header is empty.
      if (!_isRegisteredUser && !authentication.isLogin) {
        await logout();
        return false;
      }
      return true;
    })
    .finally(async () => {
      if (!authentication.isLogin) {
        debug("Login with last session failed, trying anonymous login");
        // Establish + persist an anonymous session (shared primitive), then
        // refresh the reactive isLogin ref. This is the first-session
        // bootstrap; the same reauthAnonymously also backs translate's
        // mid-session token self-heal (see TranslateService.withAuthRetry).
        const ok = await reauthAnonymously();
        if (ok) updateIsLogin();
      }
    });
}

export async function logout(sendAuthStatusToOtherParts = true) {
  authentication.logout();

  // Clear profile store data
  const profileStore = useProfileStore();
  profileStore.logout();

  updateIsLogin();

  analytic.reset();

  if (sendAuthStatusToOtherParts) {
    const message = new StoreUserTokenMessage(null);
    sendMessageToTabs(message);
    await sendMessage(message);
  }
}

/**
 * Session recovery used by withAuthRetry when a request fails on a dead/stale
 * token (translate is the canonical caller). Always ends by establishing a
 * fresh anonymous session so the retry has a usable token.
 *
 * For a REGISTERED user whose token died, it first tears the dead session down
 * via logout(): resets the profile store, the reactive isLogin ref and the
 * analytics identity, removes the stored token from the background, and
 * broadcasts StoreUserTokenMessage(null) to every tab. (The cross-tab
 * broadcast is a no-op from a content script — which has no chrome.tabs — but
 * fires fully from the popup.) That cleanly downgrades them to anonymous across
 * the whole extension instead of leaving a phantom logged-in UI behind.
 *
 * For an ANONYMOUS session (the common stale-anon-token case — `user` is null,
 * since loginAsAnonymous never sets a user), the logout teardown is skipped:
 * there's no registered identity to reset and no reason to broadcast a logout
 * that would re-roll every other tab's anon session. A contained
 * reauthAnonymously is enough.
 *
 * logout() alone is NOT enough — it leaves no token, so the retry would just
 * fail again; reauthAnonymously() is what makes the session usable.
 */
export async function recoverSession(): Promise<boolean> {
  if (authentication.user?.type?.toLowerCase() === "user") {
    await logout();
  }
  return reauthAnonymously();
}

// Upgrade withAuthRetry's recovery from the bare reauthAnonymously default to
// the system-wide recoverSession above. modular-rest is imported by every
// bundle before any translate runs, so this override is always in effect in
// production; unit tests that don't load this plugin keep the bare default.
setSessionRecovery(recoverSession);
