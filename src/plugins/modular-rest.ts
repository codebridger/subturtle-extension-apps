import { GlobalOptions, authentication } from "@modular-rest/client";

import { sendMessage, sendMessageToTabs } from "../common/helper/massage";

import {
  GetLoginStatusMessage,
  StoreUserTokenMessage,
} from "../common/types/messaging";
import { ref } from "vue";

GlobalOptions.set({
  host: process.env.SUBTURTLE_API_URL || "",
});

export {
  authentication,
  dataProvider,
  fileProvider,
} from "@modular-rest/client";

export const isLogin = ref(authentication.isLogin);

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

      const user = await authentication.loginWithToken(res.token as string, true);
      return user;
    })
    .then((user) => {
      console.log("login success ", authentication.isLogin);
      isLogin.value = authentication.isLogin;
    })
    // if the login failed, it means token is invalid or expired.
    // so the token should be removed from the storage.
    .catch((err) => {
      console.error("login failed ", err);
      sendMessage(new StoreUserTokenMessage(null));
    });
}

export async function logout(sendAuthStatusToOtherParts = true) {
  authentication.logout();
  isLogin.value = authentication.isLogin;

  if (sendAuthStatusToOtherParts) {
    const message = new StoreUserTokenMessage(null);
    await sendMessageToTabs(message);
    sendMessage(message);
  }
}
