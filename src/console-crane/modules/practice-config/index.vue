<template>
  <!--
    Practice now config page (PRFAQ-001 Phase 1, ClickUp 86exnxnw7).
    Reached from word-detail's "Practice with AI" button. Offers a Text or Voice
    session with the AI coach, sized to what the user's tier actually has left
    (computePracticeAllowance — Reader has text chats but 0 voice minutes), then
    opens the matching dashboard page. When neither is available the footer
    becomes an upgrade CTA. When the phrase isn't saved yet, the real save UI is
    shown inline so the user can save and proceed.

    The footer (primary CTA) is sticky: the console-crane modal body is the
    scroll container, and on a 1440x900 window the voice grid alone pushed
    "Let's save it" / Start below the fold.
  -->
  <div class="flex flex-col min-h-full dark:bg-gray-950">
    <div class="flex flex-col flex-1 px-6 pt-8 pb-4">
      <!-- Header: "Practice now" is a small eyebrow; the phrase is the focal point. -->
      <div class="mb-6">
        <div class="flex items-center gap-1.5 mb-2">
          <i class="i-solar-chat-round-line-bold text-base text-purple-500" />
          <span class="text-[11px] uppercase tracking-wider font-semibold text-purple-500 dark:text-purple-300">Practice now</span>
        </div>
        <h1 v-if="data.phrase"
          class="text-2xl font-bold leading-snug text-gray-900 dark:text-gray-100 break-words"
          :dir="data.direction?.source">
          {{ data.phrase }}
        </h1>
      </div>

      <!-- Resolving saved state -->
      <div v-if="checkingSaved" class="flex flex-1 items-center justify-center">
        <div class="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>

      <!-- Resolved state. The mode choice is ALWAYS shown so the page stays
           consistent; only the footer changes with the auth / saved /
           allowance state. The picker stays mounted across saving so the
           user's choice is preserved. -->
      <div v-else class="flex flex-col gap-5">
        <div role="radiogroup" aria-label="Practice mode" class="grid grid-cols-2 gap-2">
          <button v-for="opt in modeOptions" :key="opt.mode" type="button" role="radio"
            :data-mode="opt.mode"
            :aria-checked="mode === opt.mode"
            :disabled="!opt.available"
            :class="[
              'mode-option flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all focus:outline-none',
              mode === opt.mode
                ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500/30 dark:bg-purple-500/10'
                : 'border-gray-200 hover:border-purple-300 dark:border-white/[0.08] dark:hover:border-purple-500/40',
              !opt.available && 'opacity-50 cursor-not-allowed hover:border-gray-200',
            ]"
            @click="pickMode(opt.mode)">
            <span class="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <i :class="opt.icon" /> {{ opt.label }}
            </span>
            <span class="text-[11px] leading-tight text-gray-500 dark:text-gray-400">{{ opt.hint }}</span>
          </button>
        </div>

        <div v-if="mode === 'voice'"
          class="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] p-5 shadow-sm flex flex-col gap-4">
          <span class="text-sm font-medium text-gray-800 dark:text-gray-100">Choose a coach voice</span>
          <VoicePicker v-model="voiceName" />
        </div>

        <!-- Logged in but not saved: explain, then (on demand) the save widget. -->
        <template v-if="isLogin && !isSaved">
          <div class="rounded-xl border border-dashed border-purple-200 dark:border-purple-500/30 bg-purple-50/60 dark:bg-purple-500/[0.06] p-4 text-sm text-purple-800 dark:text-purple-200">
            To practice this phrase with the AI coach, you need to save it first.
          </div>
          <SaveWordSectionV2
            v-if="showSaveWidget"
            :phrase="data.phrase || ''"
            :translation="data.translation || ''"
            :context="data.context"
            :direction="data.direction"
            :language_info="data.language_info"
            :linguistic_data="data.linguistic_data"
            :chunks="data.chunks || []"
            :detected_language="data.language"
            @saved="onSaved"
          />
        </template>
      </div>
    </div>

    <!-- Sticky footer: the primary CTA stays visible however tall the body is. -->
    <div v-if="!checkingSaved && !(isLogin && !isSaved && showSaveWidget)"
      class="practice-footer sticky bottom-0 z-10 flex flex-col gap-2 border-t border-gray-100 dark:border-white/[0.08] bg-white/95 dark:bg-gray-950/95 backdrop-blur px-6 py-4">
      <!-- Logged out: be explicit that saving follows login before practice
           can start, so the button doesn't overpromise. -->
      <template v-if="!isLogin">
        <p class="text-center text-xs text-gray-500 dark:text-gray-400">
          Practice needs a saved phrase. You'll log in and save it first.
        </p>
        <Button label="Log in &amp; save first" color="primary" size="lg" class="w-full" @click="handleLoginRequest">
          <template #icon><i class="mr-2 i-solar-login-3-bold" /></template>
        </Button>
      </template>

      <!-- Logged in but not saved: invite the user to save. -->
      <Button v-else-if="!isSaved" label="Let's save it" color="primary" size="lg" class="w-full"
        @click="showSaveWidget = true">
        <template #icon><i class="mr-2 i-ep-collection" /></template>
      </Button>

      <!-- Logged in + saved: nothing left on this tier → upgrade; else Start. -->
      <template v-else-if="allowance && !allowance.canText && !allowance.canVoice">
        <p class="text-center text-xs text-pink-600 dark:text-pink-300">
          You've used this month's AI practice. Upgrade for more.
        </p>
        <Button label="Upgrade" color="primary" size="lg" class="w-full" @click="upgrade">
          <template #icon><i class="mr-2 pi pi-crown" /></template>
        </Button>
      </template>
      <template v-else>
        <p v-if="usageNote" class="text-center text-xs text-gray-500 dark:text-gray-400">{{ usageNote }}</p>
        <Button :label="mode === 'text' ? 'Start text chat' : 'Start voice session'" color="primary" size="lg"
          class="w-full" :is-loading="starting" @click="start">
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
import {
  computePracticeAllowance,
  defaultPracticeMode,
  type PracticeAllowance,
  type PracticeMode,
  type SubscriptionLike,
} from "./allowance";
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
  /** Round 1 (E-08): the phrase's learning language, when known. */
  language?: string;
}

const route = useRoute();
const profileStore = useProfileStore();

const data = computed<PracticeConfigData>(
  () => decodeRouteParams<PracticeConfigData>(route.params.data as string) || {}
);

const isFreemium = computed(() => profileStore.isFreemium);

// What this tier has left, from the getSubscriptionDetails payload the profile
// store keeps (paid subscription, else the free allocation). null while
// logged out / not yet loaded.
const allowance = computed<PracticeAllowance | null>(() => {
  if (!isLogin.value) return null;
  const sub = isFreemium.value
    ? profileStore.freemiumAllocation && { ...profileStore.freemiumAllocation, is_freemium: true }
    : profileStore.activeSubscription;
  return computePracticeAllowance(sub as SubscriptionLike | null);
});

const mode = ref<PracticeMode>(defaultPracticeMode(allowance.value));
const userPickedMode = ref(false);

function isModeAvailable(m: PracticeMode, a: PracticeAllowance | null) {
  if (!a) return true;
  return m === "voice" ? a.canVoice : a.canText;
}

function pickMode(m: PracticeMode) {
  if (!isModeAvailable(m, allowance.value)) return;
  mode.value = m;
  userPickedMode.value = true;
}

// When the allowance loads (or a login lands) preselect what the user can
// actually start — unless they already chose — and never leave an
// unavailable mode selected (Reader: voice → text).
watch(allowance, (a) => {
  if (!userPickedMode.value || !isModeAvailable(mode.value, a)) {
    mode.value = defaultPracticeMode(a);
  }
});

function pluralize(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

const modeOptions = computed(() => {
  const a = allowance.value;
  return [
    {
      mode: "text" as const,
      label: "Text",
      icon: "i-solar-chat-round-dots-bold",
      available: !a || a.canText,
      hint: !a
        ? "Chat with the AI coach"
        : a.textChatsLeft === null
          ? "Unlimited chats"
          : `${pluralize(a.textChatsLeft, "chat")} left`,
    },
    {
      mode: "voice" as const,
      label: "Voice",
      icon: "i-solar-microphone-3-bold",
      available: !a || a.canVoice,
      hint: !a
        ? "Talk with the AI coach"
        : a.canVoice
          ? `${pluralize(a.voiceMinutesLeft, "min")} left`
          : "No voice minutes left",
    },
  ];
});

/** Real remaining usage for the selected mode, shown above Start. */
const usageNote = computed(() => {
  const a = allowance.value;
  if (!a) return "";
  if (mode.value === "voice") {
    return `About 3 min · ${pluralize(a.voiceMinutesLeft, "voice minute")} left`;
  }
  if (a.textChatsLeft === null) return "Unlimited text chats on your plan";
  return `${a.textChatsLeft} of ${pluralize(a.textChatsTotal ?? 0, "text chat")} left this month`;
});

const voiceName = ref<string>(DEFAULT_PRACTICE_VOICE);

// Start without the spinner when logged out — there's nothing to look up, so we
// go straight to the voice preview + login prompt.
const checkingSaved = ref(isLogin.value);
const isSaved = ref(false);
const showSaveWidget = ref(false);
const phraseId = ref<string | null>(null);
// The phrase's learning language (E-08): from the page params, the saved
// phrase, or the inline save. Undefined without language profiles.
const phraseLanguage = ref<string | undefined>(data.value.language);
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
    const saved = await findSavedPhrase(phrase, data.value.language);
    if (saved?._id) {
      isSaved.value = true;
      phraseId.value = saved._id;
      if (saved.language) phraseLanguage.value = saved.language;
    }
  } finally {
    checkingSaved.value = false;
  }
}

onMounted(() => {
  analytic.track("practice-config-page_viewed");
  if (isLogin.value) {
    // Refresh so the remaining minutes / chats reflect recent sessions.
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
  if (saved.language) phraseLanguage.value = saved.language;
  analytic.track("practice-now_saved-inline");
}

/** Nothing left on this tier — open the dashboard subscription settings in a new tab. */
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
  if (!isModeAvailable(mode.value, allowance.value)) return;
  starting.value = true;

  analytic.track("practice-now_started", {
    voiceName: voiceName.value,
    freemium: isFreemium.value,
    ...(phraseLanguage.value ? { language: phraseLanguage.value } : {}),
  });

  const path = buildPracticeNowPath({
    phraseId: phraseId.value,
    voiceName: voiceName.value,
    mode: mode.value,
    language: phraseLanguage.value,
  });
  window.open(getSubturtleDashboardUrlWithToken(path), "_blank");

  // Brief spinner while the tab opens (mirrors HomeView.openDashboard).
  setTimeout(() => {
    starting.value = false;
  }, 500);
}
</script>
