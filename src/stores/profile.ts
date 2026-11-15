import {
  authentication,
  dataProvider,
  functionProvider,
} from "@modular-rest/client";
import { computed, ref } from "vue";
import { defineStore } from "pinia";

import {
  COLLECTIONS,
  DATABASE,
  type FreemiumAllocationType,
  type ProfileType,
  type SubscriptionType,
} from "../../../dashboard-app/frontend/types/database.type";
import { log } from "../common/helper/log";
import type {
  LanguageCapabilities,
  LanguageState,
} from "../common/language/types";
import { useLanguageStore } from "./language";

export const useProfileStore = defineStore("profile", () => {
  const authUser = computed(() => authentication.user);
  const isLogin = computed(() => authentication.isLogin);

  // profile
  const userDetail = ref<ProfileType>();
  const profilePicture = computed(() => userDetail.value?.gPicture || "");
  const email = computed(() => authUser.value?.email);

  // subscription
  const isFreemium = ref(false);
  const isSubscriptionFetching = ref(true);
  const activeSubscription = ref<SubscriptionType | null>(null);
  const freemiumAllocation = ref<FreemiumAllocationType | null>(null);

  function fetchSubscription() {
    isSubscriptionFetching.value = true;

    return functionProvider
      .run<SubscriptionType | FreemiumAllocationType>({
        name: "getSubscriptionDetails",
        args: {
          userId: authUser.value?.id,
        },
      })
      .then((res) => {
        isFreemium.value = res.is_freemium;

        if (!res.is_freemium) {
          activeSubscription.value = res;
        } else {
          freemiumAllocation.value = res as FreemiumAllocationType;
        }

        log("fetchSubscription, res", JSON.stringify(res));
      })
      .catch((res) => {
        console.error("Error fetching subscription:", res);
        throw res;
      })
      .finally(() => {
        isSubscriptionFetching.value = false;
      });
  }

  // Languages live in their own store (stores/language.ts); the profile
  // bootstrap loads them and the session snapshot carries them.
  const languageStore = useLanguageStore();

  function logout() {
    authentication.logout();
    userDetail.value = undefined;
    languageStore.clear();
  }

  function getProfileInfo() {
    return dataProvider
      .findOne<ProfileType>({
        database: DATABASE.USER_CONTENT,
        collection: COLLECTIONS.PROFILE,
        query: {
          refId: authentication.user?.id,
        },
      })
      .then((profile) => {
        userDetail.value = profile;
        log("getProfileInfo, userDetail", JSON.stringify(userDetail.value));
        return profile;
      })
      .catch((error) => {
        console.error("Error fetching profile info:", error);
        throw error;
      });
  }

  // bootstrap the profile store
  function bootstrap() {
    return Promise.all([
      // Fetch profile info
      getProfileInfo(),
      // Fetch subscription details
      fetchSubscription(),
      // Languages (never rejects)
      languageStore.fetchLanguages(),
    ]);
  }

  /**
   * Take over a bootstrap another bundle on the page already ran (see
   * loginWithLastSession in plugins/modular-rest.ts) instead of fetching again.
   */
  function adoptBootstrap(snapshot: {
    profile?: ProfileType;
    isFreemium: boolean;
    activeSubscription: SubscriptionType | null;
    freemiumAllocation: FreemiumAllocationType | null;
    languageState?: LanguageState | null;
    languageCaps?: LanguageCapabilities | null;
  }) {
    userDetail.value = snapshot.profile;
    isFreemium.value = snapshot.isFreemium;
    activeSubscription.value = snapshot.activeSubscription;
    freemiumAllocation.value = snapshot.freemiumAllocation;
    isSubscriptionFetching.value = false;
    languageStore.setCaps(snapshot.languageCaps ?? null);
    languageStore.setState(snapshot.languageState ?? null);
  }

  function loginWithLastSession() {
    return authentication
      .loginWithLastSession()
      .then(() => {
        return bootstrap();
      })
      .catch((error) => null);
  }

  return {
    authUser,
    userDetail,
    isLogin,
    profilePicture,
    email,

    activeSubscription,
    isSubscriptionFetching,
    isFreemium,
    freemiumAllocation,
    fetchSubscription,

    logout,
    getProfileInfo,
    loginWithLastSession,
    bootstrap,
    adoptBootstrap,
  };
});
