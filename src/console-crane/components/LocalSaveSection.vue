<template>
  <div class="my-2 flex flex-col items-center gap-3" data-testid="local-save">
    <!-- At the cap, sign-in replaces Save (save-first E-03). -->
    <template v-if="!isSaved && isFull">
      <div :class="CARD_CLASS" data-testid="signin-card" data-required="true">
        <p class="text-sm text-gray-700 dark:text-gray-200">{{ cardText }}</p>
        <button type="button" :class="PRIMARY_CLASS" data-testid="signin-card-signin" @click="signIn">
          <i class="text-lg i-solar-login-3-bold" />
          <span>Sign in</span>
        </button>
      </div>
    </template>

    <template v-else>
      <!-- Both choices from the first phrase on: save here, or log in to save. -->
      <div v-if="!isSaved" class="flex flex-wrap items-center justify-center gap-3" data-testid="save-choices">
        <button type="button" :class="PRIMARY_CLASS" :disabled="isSaving" data-testid="local-save-button"
          @click="saveWithoutLogin">
          <i class="text-lg i-ep-collection" />
          <span>Save without login</span>
        </button>
        <button type="button" :class="SECONDARY_CLASS" data-testid="login-to-save" @click="loginToSave">
          <i class="text-lg i-solar-login-3-bold" />
          <span>Login to save</span>
        </button>
      </div>
      <div v-else class="flex flex-col items-center gap-1" data-testid="local-saved">
        <span
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-semibold">
          <i class="text-lg i-solar-check-circle-bold text-green-500" />
          <span>Saved</span>
        </span>
        <span class="text-xs text-gray-500 dark:text-gray-400">
          Kept on this browser until you sign in.
        </span>
      </div>

      <!-- The soft sign-in card after the 3rd save, and after each later one. -->
      <div v-if="showNudge" :class="CARD_CLASS" data-testid="signin-card" data-required="false">
        <p class="text-sm text-gray-700 dark:text-gray-200">{{ cardText }}</p>
        <div class="flex items-center gap-3">
          <button type="button" :class="PRIMARY_CLASS" data-testid="signin-card-signin" @click="signIn">
            <i class="text-lg i-solar-login-3-bold" />
            <span>Sign in</span>
          </button>
          <button type="button"
            class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            data-testid="signin-card-dismiss" @click="dismiss">
            Not now
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * Save for a logged-out learner (save-first E-02, E-03).
 *
 * Two choices from the first phrase on: "Save without login" keeps the phrase
 * in chrome.storage.local (common/services/pending-saves) instead of the
 * server, and it is sent to the account after sign-in (pending-saves-sync);
 * "Login to save" opens the login window. There is no bundle choice here: the
 * sync picks the bundle from the page the phrase came from.
 *
 * Events: save-login-prompt_viewed (once per word, when the choices show),
 * save-login-prompt_clicked, save-without-login_clicked.
 *
 * From the 3rd local phrase on, each save shows a soft sign-in card ("Not now"
 * hides it until the next save). At MAX_PENDING_SAVES the card replaces Save.
 */
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { TranslateService } from "../../common/services/translate.service";
import {
  addPendingSave,
  countPendingSaves,
  findPendingSave,
  MAX_PENDING_SAVES,
  onPendingSavesChange,
  SIGNIN_NUDGE_AT,
} from "../../common/services/pending-saves";
import { sendMessage } from "../../common/helper/massage";
import { OpenLoginWindowMessage } from "../../common/types/messaging";
import { analytic } from "../../plugins/mixpanel";
import type { Chunk } from "../modules/word-detail/types";

const props = defineProps<{
  phrase: string;
  translation: string;
  context?: string;
  direction?: { source: "ltr" | "rtl"; target: "ltr" | "rtl" };
  language_info?: { source: string; target: string };
  linguistic_data?: any;
  chunks?: Chunk[];
  /** The phrase's detected language; the sync picks the target with it. */
  detected_language?: string | null;
}>();

const PRIMARY_CLASS =
  "inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold shadow-sm hover:from-pink-600 hover:to-purple-700 transition disabled:opacity-60";
const SECONDARY_CLASS =
  "inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-purple-400 dark:border-purple-500/60 text-purple-700 dark:text-purple-200 text-sm font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/30 transition";
const CARD_CLASS =
  "w-full flex flex-col items-center gap-3 p-4 rounded-xl border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-900/20 text-center";

const count = ref(0);
const isSaved = ref(false);
const isSaving = ref(false);
// The soft card: shown after a save once count >= SIGNIN_NUDGE_AT, hidden by "Not now".
const nudgeOpen = ref(false);

const isFull = computed(() => count.value >= MAX_PENDING_SAVES);
const showNudge = computed(
  () => nudgeOpen.value && count.value >= SIGNIN_NUDGE_AT
);
const cardVisible = computed(
  () => showNudge.value || (!isSaved.value && isFull.value)
);
const cardText = computed(
  () =>
    `Sign in to keep your ${count.value} phrases and review them tomorrow.`
);

// The two choices (save here / log in). Not shown at the cap or once saved.
const showChoices = computed(() => !isSaved.value && !isFull.value);
let choicesTracked = false;

/** save-login-prompt_viewed: once per word, after the saved state is known. */
function trackChoicesView() {
  if (choicesTracked || !showChoices.value) return;
  choicesTracked = true;
  analytic.track("save-login-prompt_viewed");
}

async function refresh() {
  const [found, n] = await Promise.all([
    findPendingSave(props.phrase),
    countPendingSaves(),
  ]);
  isSaved.value = !!found;
  count.value = n;
  trackChoicesView();
}

watch(
  () => props.phrase,
  () => {
    nudgeOpen.value = false;
    choicesTracked = false;
    refresh();
  },
  { immediate: true }
);

// Another tab saved, or the sync sent the list after sign-in.
const stopListening = onPendingSavesChange(() => refresh());
onBeforeUnmount(stopListening);

watch(cardVisible, (visible) => {
  if (!visible) return;
  analytic.track("save-signin-card_viewed", {
    count: count.value,
    required: !showNudge.value,
  });
});

/**
 * The page the phrase came from, kept now because the sync runs later from
 * another page. The toolbar popup is our own page, not a source: skip it.
 */
function pageOfSave(): { sourceUrl?: string; pageTitle?: string } {
  if (typeof location === "undefined" || !/^https?:$/.test(location.protocol)) {
    return {};
  }
  return { sourceUrl: location.href, pageTitle: document.title };
}

async function save() {
  if (isSaving.value || !props.phrase || !props.translation) return;
  isSaving.value = true;
  try {
    const result = await addPendingSave({
      phrase: props.phrase,
      translation: props.translation,
      translation_language: TranslateService.instance.targetLanguage.trim(),
      context: props.context || "",
      direction: props.direction,
      language_info: props.language_info,
      linguistic_data: props.linguistic_data,
      chunks: props.chunks || [],
      detected_language: props.detected_language ?? null,
      ...pageOfSave(),
    });
    count.value = result.count;
    if (result.status === "full") return;

    isSaved.value = true;
    if (result.status === "added") {
      analytic.track("phrase_saved", { logged_in: false });
    }
    nudgeOpen.value = true;
  } catch (error) {
    console.error("Error saving phrase locally:", error);
  } finally {
    isSaving.value = false;
  }
}

function saveWithoutLogin() {
  analytic.track("save-without-login_clicked", { count: count.value });
  return save();
}

function loginToSave() {
  analytic.track("save-login-prompt_clicked");
  sendMessage(new OpenLoginWindowMessage("save_prompt")).catch(() => {});
}

function signIn() {
  analytic.track("save-signin-card_clicked", { count: count.value });
  sendMessage(new OpenLoginWindowMessage("save_prompt")).catch(() => {});
}

function dismiss() {
  analytic.track("save-signin-card_dismissed", { count: count.value });
  nudgeOpen.value = false;
}
</script>
