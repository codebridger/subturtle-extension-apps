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

import { GlobalOptions, authentication } from "@modular-rest/client";

import { sendMessage, sendMessageToTabs } from "../common/helper/massage";

import {
  GetLoginStatusMessage,
  StoreUserTokenMessage,
} from "../common/types/messaging";
import { ref } from "vue";
import { useProfileStore } from "../stores/profile";
import { analytic } from "./mixpanel";

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
      .catch((error) => {
        console.error("Error bootstrapping profile store:", error);
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
        true
      );
      return user;
    })
    .then((_user) => updateIsLogin())
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
      if (!authentication.isLogin) {
        await logout();
        return false;
      }
      return true;
    })

    .finally(() => {
      if (!authentication.isLogin) {
        authentication
          .loginAsAnonymous()
          .then(async () => {
            console.log(
              "Subturtle Anonymous login succeded",
              authentication.isLogin
            );
            // Persist the anonymous token so subsequent mounts (other bundles
            // on the same page, the popup, page reloads) reuse it instead of
            // each calling /user/loginAnonymous and stranding the previous
            // anonymous user — which the server then 412s on the next call.
            // Writes to chrome.storage.sync (cross-context) and to this
            // page's localStorage (modular-rest's own per-origin cache).
            const token = authentication.getToken;
            if (token) {
              try {
                await sendMessage(new StoreUserTokenMessage(token));
              } catch (err) {
                console.warn(
                  "Subturtle: persisting anonymous token to background failed",
                  err
                );
              }
              if (typeof localStorage !== "undefined") {
                localStorage.setItem("token", token);
              }
            }
            updateIsLogin();
          })
          .catch((err) => {
            console.error("Subturtle anonymous login failed", err);
          });
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
