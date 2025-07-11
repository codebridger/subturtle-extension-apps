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
    profileStore.bootstrap().catch((error) => {
      console.error("Error bootstrapping profile store:", error);
    });

    analytic.identify(authentication.user?.id);

    analytic.track("user_logged-in");
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
    .then((user) => {
      console.log("login success ", authentication.isLogin);
      updateIsLogin();

      return isLogin.value;
    })
    // if the login failed, it means token is invalid or expired.
    // so the token should be removed from the storage.
    .catch(async (err) => {
      console.error("Subturtle login failed ", err);
      sendMessage(new StoreUserTokenMessage(null));
    })
    .finally(() => {
      if (!authentication.isLogin) {
        authentication
          .loginAsAnonymous()
          .then((user) => {
            console.log(
              "Subturtle Anonymous login succeded",
              authentication.isLogin
            );
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
