<template>
  <section class="flex flex-col justify-between items-center h-screen w-screen">
    <logo class="my-10" only-logo />

    <template v-if="!isLogin">
      <div class="text-center w-80">
        <p class="text-gray-900 dark:text-white text-3xl">Welcome to Subturtle!</p>
        <p class="text-gray-700 dark:text-gray-300 font-thin text-xs mt-2">
          Choose your preferred method to log in or register.
        </p>
      </div>

      <div class="mb-20 flex flex-col space-y-2">
        <!-- Login with Chrome -->
        <button
          :disabled="!chromeUserRes || !chromeUserRes.token || pending"
          class="flex items-center justify-center text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="loginWithChrome"
        >
          <div
            class="p-2 py-3 flex justify-center items-center border-r-[1px] border-gray-300 dark:border-gray-700"
          >
            <span class="i-logos-chrome" />
          </div>
          <div class="flex-1 text-left px-4">With Current Chrome User</div>
        </button>

        <!-- Login with Google -->
        <button
          :disabled="pending"
          @click="loginWithGoogle"
          class="flex items-center justify-center text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div
            class="p-2 py-3 flex justify-center items-center border-r-[1px] border-gray-300 dark:border-gray-700"
          >
            <span class="i-flat-color-icons-google" />
          </div>
          <div class="flex-1 text-left px-4">With Google Account</div>
        </button>

        <!-- Login with Email & Password (dev/agent only, gated by ENABLE_PASSWORD_AUTH at build time) -->
        <template v-if="enablePasswordAuth">
          <button
            v-if="!passwordFormOpen"
            :disabled="pending"
            @click="passwordFormOpen = true"
            data-testid="open-password-form"
            class="flex items-center justify-center text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div
              class="p-2 py-3 flex justify-center items-center border-r-[1px] border-gray-300 dark:border-gray-700"
            >
              <span class="i-flat-color-icons-key" />
            </div>
            <div class="flex-1 text-left px-4">With Email & Password</div>
          </button>

          <form
            v-else
            @submit.prevent="loginWithPassword"
            data-testid="password-form"
            class="flex flex-col space-y-2 bg-gray-100 dark:bg-gray-800 rounded-md p-3"
          >
            <input
              v-model="passwordEmail"
              type="email"
              autocomplete="email"
              required
              placeholder="Email"
              data-testid="password-email"
              :disabled="pending"
              class="px-3 py-2 rounded text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <input
              v-model="passwordValue"
              type="password"
              autocomplete="current-password"
              required
              placeholder="Password"
              data-testid="password-value"
              :disabled="pending"
              class="px-3 py-2 rounded text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p
              v-if="loginError"
              data-testid="password-error"
              class="text-red-600 dark:text-red-400 text-xs"
            >
              {{ loginError }}
            </p>
            <div class="flex space-x-2">
              <button
                type="button"
                @click="closePasswordForm"
                :disabled="pending"
                data-testid="password-cancel"
                class="px-3 py-2 rounded text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                :disabled="pending || !isPasswordFormValid"
                data-testid="password-submit"
                class="flex-1 px-3 py-2 rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ pending ? "Signing in…" : "Sign in" }}
              </button>
            </div>
          </form>
        </template>
      </div>
    </template>

    <template v-else>
      <div class="text-center w-80">
        <p class="text-gray-900 dark:text-white text-3xl">Logged In Successfully!</p>
        <p class="text-gray-700 dark:text-gray-300 font-thin text-base mt-4">
          Go ahead and close this window, your adventure starts now!
        </p>
      </div>

      <button class="mb-20 text-gray-700 dark:text-gray-200 mt-10 text-lg" @click="closeWindow">
        Close
      </button>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  GetCurrentChromeUserToken,
  LoginStatusResponse,
  StoreUserTokenMessage,
} from "../../common/types/messaging";
import { sendMessage, sendMessageToTabs } from "../../common/helper/massage";
import { get } from "../helper/http";
import { joinToBaseUrl } from "../../common/helper/url";
import {
  authentication,
  loginWithLastSession,
  isLogin,
} from "../../plugins/modular-rest";

const pending = ref(false);

const chromeUserRes = ref<LoginStatusResponse | null>();

// Build-flag gated: dev/agent-only password form. Stable/prod builds omit the
// key in .env.production so this resolves to false and the form is hidden.
const enablePasswordAuth = process.env.ENABLE_PASSWORD_AUTH === "true";

const passwordFormOpen = ref(false);
const passwordEmail = ref("");
const passwordValue = ref("");
const loginError = ref<string | null>(null);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isPasswordFormValid = computed(
  () =>
    emailRegex.test(passwordEmail.value.trim()) &&
    passwordValue.value.length >= 8
);

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

async function loginWithPassword() {
  if (!isPasswordFormValid.value) return;
  pending.value = true;
  loginError.value = null;

  try {
    await authentication.login(
      {
        idType: "email",
        id: passwordEmail.value.trim(),
        password: passwordValue.value,
      },
      true
    );

    const token = authentication.getToken;
    if (!token) {
      loginError.value = "Invalid email or password.";
      return;
    }
    await handleTokenLogin(token);
    passwordValue.value = "";
  } catch (err: any) {
    // modular-rest rejects with the server response or a network error. We
    // surface a generic message for the credential-mismatch case so we don't
    // leak whether the email exists, and a network-specific message when the
    // request never reached the server.
    if (err instanceof TypeError || err?.message?.includes("Failed to fetch")) {
      loginError.value = "Could not reach the server.";
    } else if (err?.status === false || err?.error) {
      loginError.value = "Invalid email or password.";
    } else {
      loginError.value = "Something went wrong. Please try again.";
    }
  } finally {
    pending.value = false;
  }
}

function closePasswordForm() {
  passwordFormOpen.value = false;
  passwordValue.value = "";
  loginError.value = null;
}

function closeWindow() {
  window.close();
}
</script>
