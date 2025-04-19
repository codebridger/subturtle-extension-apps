<template>
  <section class="flex flex-col justify-between items-center h-screen w-screen">
    <logo class="my-10" only-logo />

    <template v-if="!isLogin">
      <div class="text-center w-80">
        <p class="text-white text-3xl">Welcome to Subturtle!</p>
        <p class="text-gray-300 font-thin text-xs mt-2">
          Choose your preferred method to log in or register.
        </p>
      </div>

      <div class="mb-20 flex flex-col space-y-2">
        <!-- Login with Chrome -->
        <button
          :disabled="!chromeUserRes || !chromeUserRes.token || pending"
          class="flex items-center justify-center text-white bg-gray-800 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="loginWithChrome"
        >
          <div
            class="p-2 py-3 flex justify-center items-center border-r-[1px] border-gray-900"
          >
            <span class="i-logos-chrome" />
          </div>
          <div class="flex-1 text-left px-4">With Current Chrome User</div>
        </button>

        <!-- Login with Google -->
        <button
          :disabled="pending"
          @click="loginWithGoogle"
          class="flex items-center justify-center text-white bg-gray-800 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div
            class="p-2 py-3 flex justify-center items-center border-r-[1px] border-gray-900"
          >
            <span class="i-flat-color-icons-google" />
          </div>
          <div class="flex-1 text-left px-4">With Google Account</div>
        </button>

        <!-- Login with Phone -->
        <button
          disabled
          class="flex items-center justify-center text-white bg-gray-800 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div
            class="p-2 py-3 flex justify-center items-center border-r-[1px] border-gray-900"
          >
            <span class="i-flat-color-icons-phone" />
          </div>
          <div class="flex-1 text-left px-4">With Phone Number</div>
        </button>
      </div>
    </template>

    <template v-else>
      <div class="text-center w-80">
        <p class="text-white text-3xl">Logged In Successfully!</p>
        <p class="text-gray-300 font-thin text-base mt-4">
          Go ahead and close this window, your adventure starts now!
        </p>
      </div>

      <button class="mb-20 text-gray-200 mt-10 text-lg" @click="closeWindow">
        Close
      </button>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  GetCurrentChromeUserToken,
  LoginStatusResponse,
  StoreUserTokenMessage,
} from "../../common/types/messaging";
import { sendMessage, sendMessageToTabs } from "../../common/helper/massage";
import { get } from "../helper/http";
import { joinToBaseUrl } from "../../common/helper/url";
import { loginWithLastSession, isLogin } from "../../plugins/modular-rest";

const pending = ref(false);

const chromeUserRes = ref<LoginStatusResponse | null>();

onMounted(async () => {
  chromeUserRes.value = await sendMessage<LoginStatusResponse>(
    new GetCurrentChromeUserToken()
  ).catch((err) => null);
});

async function loginWithChrome() {
  pending.value = true;

  if (GetCurrentChromeUserToken.checkResponse(chromeUserRes)) {
    const url = joinToBaseUrl(
      `/auth/google/token-login?token=${chromeUserRes.token}`
    );

    const { status, token } = await get(url, {
      token: chromeUserRes.token,
    }).catch((err) => {
      console.log("err", err);
      return { status: "error", token: null };
    });

    if (status == "success") {
      await handleTokenLogin(token);
    }
  }

  pending.value = false;
}

async function loginWithGoogle() {
  pending.value = true;

  await authorizeFromGoogleOAuthThroughAuthFlowAPI()
    .then((accessToken) => {
      return get(
        joinToBaseUrl(
          `/auth/google/access-token-login?access_token=${accessToken}`
        )
      );
    })
    .then(({ token }) => handleTokenLogin(token))
    .catch((err) => {
      console.log("err", err);
    })
    .finally(() => {
      pending.value = false;
    });
}

function authorizeFromGoogleOAuthThroughAuthFlowAPI() {
  const redirectURL = chrome.identity.getRedirectURL();

  console.log("redirectURL", redirectURL);

  // Client ID of web application (from Google Developer Console), not google extension.
  // Remove the ".apps.googleusercontent.com" part from the client ID
  // Ref: https://developers.google.com/identity/sign-in/web/server-side-flow#step_3_initialize_the_googleauth_object
  //
  const clientID = process.env.GOOGLE_OAUTH_CLIENT_ID;

  const scopes = ["openid", "email", "profile"];
  let authURL = "https://accounts.google.com/o/oauth2/auth";
  authURL += `?client_id=${clientID}`;
  authURL += `&response_type=token`;
  authURL += `&redirect_uri=${encodeURIComponent(redirectURL)}`;
  authURL += `&scope=${encodeURIComponent(scopes.join(" "))}`;

  return launchWebAuthFlow(authURL);
}

async function handleTokenLogin(token: string) {
  const message = new StoreUserTokenMessage(token);

  await sendMessage(message);
  sendMessageToTabs(message);
  await loginWithLastSession();
}

function launchWebAuthFlow(authURL) {
  return new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        interactive: true,
        url: authURL,
      },
      (responseUrl) => {
        console.log("responseUrl", responseUrl);

        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(responseUrl as string);
        }
      }
    );
  }).then((responseUrl: string) => {
    const url = new URL(responseUrl);
    const hash = url.hash.substr(1);
    const params = new URLSearchParams(hash);

    const access_token = params.get("access_token");

    if (access_token) {
      return access_token;
    } else {
      throw new Error("No access_token found");
    }
  });
}

function closeWindow() {
  window.close();
}
</script>
