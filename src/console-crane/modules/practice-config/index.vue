<template>
  <!--
    Practice now config page (PRFAQ-001 Phase 1, ClickUp 86exnxnw7).
    Reached from word-detail's "Practice with AI" button. Picks a coach voice,
    then opens the dashboard's unified live-session gate to run a voice session.
    Free users get a monthly allocation of AI sessions (read from profile); once
    that's used up they're prompted to upgrade. When the phrase isn't saved yet,
    the real save UI is shown inline so the user can save and proceed.
  -->
  <div class="flex flex-col min-h-full px-6 py-8 dark:bg-gray-950">
    <!-- Header -->
    <div class="mb-5">
      <div class="flex items-center gap-2">
        <i class="i-solar-microphone-3-bold text-xl text-purple-500" />
        <h1 class="text-base font-semibold text-gray-900 dark:text-gray-100">Practice now</h1>
      </div>
      <p v-if="data.phrase" class="text-sm text-gray-600 dark:text-gray-300 mt-1 break-words"
        :dir="data.direction?.source">
        {{ data.phrase }}
      </p>
    </div>

    <!-- Resolving saved state -->
    <div v-if="checkingSaved" class="flex flex-1 items-center justify-center">
      <div class="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
    </div>

    <!-- Resolved state. The voice picker + duration hint are ALWAYS shown so the
         page stays consistent; only the footer below changes with the
         auth / saved / allocation state. The picker stays mounted across saving
         so the user's voice choice is preserved. -->
    <div v-else class="flex flex-col gap-5">
      <div
        class="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] p-5 shadow-sm flex flex-col gap-4">
        <span class="text-sm font-medium text-gray-800 dark:text-gray-100">Choose a coach voice</span>
        <VoicePicker v-model="voiceName" />
      </div>

      <!-- Estimated duration + credit hint -->
      <div class="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <i class="i-mdi-clock-outline" />
        <span>&#8776;3 min</span>
        <span class="text-gray-300 dark:text-gray-600">&middot;</span>
        <span>Uses some of your monthly credits</span>
      </div>

      <!-- Footer — logged out: be explicit that saving follows login before
           practice can start, so the button doesn't overpromise. -->
      <template v-if="!isLogin">
        <p class="text-center text-xs text-gray-500 dark:text-gray-400">
          Live practice needs a saved phrase. You'll log in and save it first.
        </p>
        <Button label="Log in &amp; save first" color="primary" size="lg" class="w-full" @click="handleLoginRequest">
          <template #icon><i class="mr-2 i-solar-login-3-bold" /></template>
        </Button>
      </template>

      <!-- Footer — logged in but not saved: prompt to save, then the save widget. -->
      <template v-else-if="!isSaved">
        <div class="rounded-xl border border-dashed border-purple-200 dark:border-purple-500/30 bg-purple-50/60 dark:bg-purple-500/[0.06] p-4 text-sm text-purple-800 dark:text-purple-200">
          To practice this phrase live with the AI coach, you need to save it first.
        </div>

        <!-- Step 1: invite the user to save -->
        <Button v-if="!showSaveWidget" label="Let's save it" color="primary" size="lg" class="w-full"
          @click="showSaveWidget = true">
          <template #icon><i class="mr-2 i-ep-collection" /></template>
        </Button>

        <!-- Step 2: the real save widget; on save, the footer switches to Start. -->
        <SaveWordSectionV2
          v-else
          :phrase="data.phrase || ''"
          :translation="data.translation || ''"
          :context="data.context"
          :direction="data.direction"
          :language_info="data.language_info"
          :linguistic_data="data.linguistic_data"
          :chunks="data.chunks || []"
          @saved="onSaved"
        />
      </template>

      <!-- Footer — logged in + saved: free-tier allocation note, then Start / Upgrade. -->
      <template v-else>
        <p v-if="isFreemium && freemiumAllocation" class="text-center text-xs"
          :class="isAtFreeLimit ? 'text-pink-600 dark:text-pink-300' : 'text-gray-500 dark:text-gray-400'">
          {{ isAtFreeLimit
            ? `You've used all ${sessionsTotal} free AI sessions this month.`
            : `${freeSessionsLeft} of ${sessionsTotal} free AI sessions left` }}
        </p>

        <!-- Free + out of allocation: upgrade. Otherwise: start. -->
        <Button v-if="isFreemium && isAtFreeLimit" label="Upgrade to Premium" color="primary" size="lg" class="w-full"
          @click="upgrade">
          <template #icon><i class="mr-2 pi pi-crown" /></template>
        </Button>
        <Button v-else label="Start" color="primary" size="lg" class="w-full" :is-loading="starting" @click="start">
          <template #icon><i class="mr-2 i-solar-play-bold" /></template>
        </Button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { Button } from "pilotui/elements";
import { decodeRouteParams } from "../../route-params";
import { findSavedPhrase } from "../../../common/services/phrase.service";
import { getSubturtleDashboardUrlWithToken } from "../../../common/static/global";
import { useProfileStore } from "../../../stores/profile";
import { isLogin } from "../../../plugins/modular-rest";
import { sendMessage } from "../../../common/helper/massage";
import { OpenLoginWindowMessage } from "../../../common/types/messaging";
import { analytic } from "../../../plugins/mixpanel";
import { DEFAULT_PRACTICE_VOICE, buildPracticeNowPath } from "./deep-link";
import SaveWordSectionV2 from "../../components/SaveWordSectionV2.vue";
import VoicePicker from "../../components/VoicePicker.vue";
import type { Chunk } from "../word-detail/types";
import type { PhraseType } from "../../../common/types/phrase.type";

interface PracticeConfigData {
  phrase?: string;
  translation?: string;
  context?: string;
  chunks?: Chunk[];
  direction?: { source: "ltr" | "rtl"; target: "ltr" | "rtl" };
  language_info?: { source: string; target: string };
  linguistic_data?: any;
}

const route = useRoute();
const profileStore = useProfileStore();

const data = computed<PracticeConfigData>(
  () => decodeRouteParams<PracticeConfigData>(route.params.data as string) || {}
);

const isFreemium = computed(() => profileStore.isFreemium);

// Free-tier live-session allocation, read from profile (same fields the
// dashboard uses). Free users may run sessions until they hit their monthly
// limit; the server enforces the real cap.
const freemiumAllocation = computed(() => profileStore.freemiumAllocation);
const sessionsTotal = computed(() => freemiumAllocation.value?.allowed_lived_sessions ?? 0);
const sessionsUsed = computed(() => freemiumAllocation.value?.allowed_lived_sessions_used ?? 0);
const freeSessionsLeft = computed(() => Math.max(0, sessionsTotal.value - sessionsUsed.value));
const isAtFreeLimit = computed(
  () => isFreemium.value && !!freemiumAllocation.value && sessionsUsed.value >= sessionsTotal.value
);

const voiceName = ref<string>(DEFAULT_PRACTICE_VOICE);

// Start without the spinner when logged out — there's nothing to look up, so we
// go straight to the voice preview + login prompt.
const checkingSaved = ref(isLogin.value);
const isSaved = ref(false);
const showSaveWidget = ref(false);
const phraseId = ref<string | null>(null);
const starting = ref(false);

/**
 * Look up whether this phrase is already saved. Only meaningful when logged in
 * (the lookup is owner-scoped); logged-out users skip straight to the voice
 * preview + login prompt.
 */
async function checkSaved() {
  if (!isLogin.value) {
    checkingSaved.value = false;
    return;
  }
  const phrase = (data.value.phrase || "").trim();
  if (!phrase) {
    checkingSaved.value = false;
    return;
  }
  checkingSaved.value = true;
  try {
    const saved = await findSavedPhrase(phrase);
    if (saved?._id) {
      isSaved.value = true;
      phraseId.value = saved._id;
    }
  } finally {
    checkingSaved.value = false;
  }
}

onMounted(() => {
  analytic.track("practice-config-page_viewed");
  if (isLogin.value) {
    // Refresh the allocation so "free sessions left" reflects sessions used.
    profileStore.fetchSubscription().catch(() => {});
  }
  checkSaved();
});

// When the user logs in from the inline prompt, fetch their allocation and
// re-check the saved state so the page progresses without a manual reload.
watch(isLogin, (loggedIn) => {
  if (!loggedIn) return;
  profileStore.fetchSubscription().catch(() => {});
  checkSaved();
});

/** Inline save completed — reveal the config card with the new phrase id. */
function onSaved(saved: PhraseType) {
  if (!saved?._id) return;
  phraseId.value = saved._id;
  isSaved.value = true;
  analytic.track("practice-now_saved-inline");
}

/** Out of free sessions — open the dashboard subscription settings in a new tab. */
function upgrade() {
  analytic.track("practice-now_upgrade-clicked");
  // login_with_token redirects here after the handoff (dashboard hashMode route).
  window.open(getSubturtleDashboardUrlWithToken("/settings/subscription"), "_blank");
}

/** Logged out — open the login window; the isLogin watch advances the page. */
function handleLoginRequest() {
  analytic.track("practice-now_login-clicked");
  sendMessage(new OpenLoginWindowMessage());
}

function start() {
  if (!phraseId.value || starting.value) return;
  starting.value = true;

  analytic.track("practice-now_started", {
    voiceName: voiceName.value,
    freemium: isFreemium.value,
  });

  const path = buildPracticeNowPath({
    phraseId: phraseId.value,
    voiceName: voiceName.value,
  });
  window.open(getSubturtleDashboardUrlWithToken(path), "_blank");

  // Brief spinner while the tab opens (mirrors HomeView.openDashboard).
  setTimeout(() => {
    starting.value = false;
  }, 500);
}
</script>
