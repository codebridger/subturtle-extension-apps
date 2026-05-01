<template>
  <!-- Main word detail component - displays dictionary information and translation for a selected word -->
  <div class="flex flex-col items-center overflow-y-auto min-h-full dark:bg-gray-950" :key="key">
    <div class="select-text flex flex-col px-6 sm:px-8 py-6 gap-4 text-gray-900 dark:text-gray-100 w-full" :style="{
      maxWidth: '720px',
    }">
      <!-- TRANSLATION CARD - Source phrase and translation in one cohesive block -->
      <section
        class="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-gray-900 overflow-hidden"
        @click.stop>
        <!-- Source phrase -->
        <div class="px-6 pt-6 pb-4" :dir="wordData?.direction?.source">
          <p class="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-400 mb-2">
            Selected
          </p>
          <h1 :class="['font-semibold leading-tight dark:text-gray-100', titleSizeClass]">
            {{ title }}
          </h1>
          <p
            v-if="showContext"
            class="text-xs mt-3 italic text-gray-500 dark:text-gray-400 line-clamp-2"
          >
            {{ context }}
          </p>
        </div>

        <!-- Divider line -->
        <div class="border-t border-gray-100 dark:border-white/[0.08]"></div>

        <!-- Translation -->
        <div class="px-6 pt-4 pb-6 bg-gray-50 dark:bg-white/[0.02]" :dir="wordData?.direction?.target">
          <p class="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-400 mb-2">
            {{ targetLanguageTitle }}
          </p>
          <h2 v-if="wordData?.translation?.phrase" :class="['font-semibold leading-tight dark:text-gray-100', titleSizeClass]">
            {{ cleanText(wordData?.translation?.phrase || "") }}
          </h2>
          <div v-else-if="pending" class="space-y-2">
            <div class="h-7 w-3/4 rounded bg-gray-200 dark:bg-white/[0.08] animate-pulse"></div>
            <div class="h-7 w-1/2 rounded bg-gray-200 dark:bg-white/[0.08] animate-pulse"></div>
          </div>
          <p v-else-if="error" class="text-sm text-gray-500 dark:text-gray-400 italic">
            Translation unavailable
          </p>
        </div>
      </section>

      <!-- Error state with retry -->
      <div
        v-if="error && !pending"
        class="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 flex items-start gap-3"
      >
        <i class="i-mdi-alert-circle-outline text-xl text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-red-800 dark:text-red-200">
            Couldn't load translation
          </p>
          <p class="text-xs text-red-700/80 dark:text-red-300/80 mt-0.5 break-words">
            {{ error }}
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-sm font-medium text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/60 transition-colors"
          @click="retryFetch"
        >
          <i class="i-mdi-refresh" />
          Retry
        </button>
      </div>

      <!-- Save word functionality - only shown to logged in users -->
      <SaveWordSectionV2 v-if="isLogin && wordData?.translation?.phrase" :phrase="cleanText(getProps().word!)"
        :translation="cleanText(wordData?.translation?.phrase || '')" :context="wordData?.context"
        :direction="wordData?.direction" :language_info="wordData?.language_info"
        :linguistic_data="wordData?.linguistic_data" />

      <!-- Login prompt: only when there's a translation worth saving -->
      <button
        v-else-if="!isLogin && wordData?.translation?.phrase"
        type="button"
        class="self-center inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold shadow-sm hover:from-pink-600 hover:to-purple-700 transition"
        @click="handleLoginRequest"
      >
        <i class="text-lg i-solar-login-3-bold" />
        <span>Login to save this phrase</span>
      </button>

      <!-- LINGUISTIC DATA SECTION - Shows detailed linguistic information -->
      <template v-if="wordData && wordData.linguistic_data">
        <section class="w-full flex flex-col gap-3">
          <!-- Main definition card -->
          <Fieldset class="dark:bg-gray-900" legend="Definition">
            <p class="text-base mb-3 text-gray-900 dark:text-gray-100" :dir="wordData?.direction?.target">
              {{ wordData.linguistic_data.definition }}
            </p>

            <!-- Type and formality level -->
            <div class="flex gap-2">
              <IconButton v-if="wordData.linguistic_data.type" badge size="sm"
                :label="wordData.linguistic_data.type.toUpperCase()" />
              <IconButton v-if="wordData.linguistic_data.formality_level" badge size="sm"
                :label="wordData.linguistic_data.formality_level.toUpperCase()" />
            </div>
          </Fieldset>

          <Fieldset class="dark:bg-gray-900" legend="Phonetic">
            <div class="flex justify-between gap-4">
              <p class="text-base italic text-gray-500 dark:text-gray-300">
                {{ wordData?.linguistic_data?.phonetic.ipa || "" }}
              </p>
              <p class="text-base italic text-gray-900 dark:text-gray-100" :dir="wordData?.direction?.target">
                {{ wordData.linguistic_data.phonetic.transliteration }}
              </p>
            </div>
          </Fieldset>

          <!-- Example sentences -->
          <Fieldset class="dark:bg-gray-900" v-if="
            wordData.linguistic_data.examples &&
            wordData.linguistic_data.examples.length
          " legend="Examples">
            <div v-for="(example, index) in wordData.linguistic_data.examples" :key="index" class="mb-3 last:mb-0">
              <p class="text-base mb-1 text-gray-900 dark:text-gray-100" :dir="wordData?.direction?.target">
                {{ example.target }}
              </p>
              <p class="text-sm italic text-gray-500 dark:text-gray-300" :dir="wordData?.direction?.source">
                {{ example.source }}
              </p>
              <Divider v-if="index < wordData.linguistic_data.examples.length - 1" />
            </div>
          </Fieldset>

          <!-- Related expressions -->
          <Fieldset class="dark:bg-gray-900" v-if="
            wordData.linguistic_data.related_expressions &&
            wordData.linguistic_data.related_expressions.length
          " legend="Related Expressions">
            <div v-for="(expression, index) in wordData.linguistic_data
              .related_expressions" :key="index" class="mb-3 last:mb-0">
              <p class="text-base mb-1 text-gray-900 dark:text-gray-100" :dir="wordData?.direction?.target">
                {{ expression.target }}
              </p>
              <p class="text-sm italic text-gray-500 dark:text-gray-300" :dir="wordData?.direction?.source">
                {{ expression.source }}
              </p>
              <Divider v-if="
                index <
                wordData.linguistic_data.related_expressions.length - 1
              " />
            </div>
          </Fieldset>
        </section>
      </template>

      <!-- Loading skeleton for linguistic data -->
      <template v-else-if="pending">
        <section class="w-full flex flex-col gap-3" aria-busy="true" aria-label="Loading linguistic data">
          <div v-for="n in 3" :key="n"
            class="rounded-md border border-gray-200 dark:border-white/[0.08] p-4 bg-white dark:bg-gray-900">
            <div class="h-3 w-24 bg-gray-200 dark:bg-white/[0.08] rounded animate-pulse mb-3"></div>
            <div class="h-4 w-full bg-gray-200 dark:bg-white/[0.08] rounded animate-pulse mb-2"></div>
            <div class="h-4 w-5/6 bg-gray-200 dark:bg-white/[0.08] rounded animate-pulse"></div>
          </div>
        </section>
      </template>

      <!-- Empty state when fetch succeeded but returned no linguistic data -->
      <template v-else-if="!error">
        <div class="my-8 text-sm text-center text-gray-500 dark:text-gray-300">
          No linguistic data available for "{{ cleanText(getProps().word!) }}".
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject, onMounted } from "vue";
import { cleanText, firstUpper } from "../../../common/helper/text";
import { TranslateService } from "../../../common/services/translate.service";
import { LanguageLearningData } from "./types";

import { isLogin } from "../../../plugins/modular-rest";
import SaveWordSectionV2 from "../../components/SaveWordSectionV2.vue";

import Fieldset from "../../../common/components/Fieldset.vue";
import Divider from "../../../common/components/Divider.vue";
import { IconButton } from "pilotui/elements";

import { useRoute } from "vue-router";
import { sendMessage } from "../../../common/helper/massage";
import { OpenLoginWindowMessage } from "../../../common/types/messaging";
import { analytic } from "../../../plugins/mixpanel";
import { decodeRouteParams } from "../../stores/console-crane";

const route = useRoute();

onMounted(() => {
  analytic.track("word-detail-page_viewed");
});

/**
 * Extracts word data from the route parameter
 * The data is base64 encoded in the URL
 */
function getProps() {
  const data = decodeRouteParams<{ word: string; context?: string }>(
    route.params.data as string
  );

  return data;
}

// Injected frame size from parent component to control responsive layout
const frameSize = inject<{ width: number; height: number }>("frameSize");

// Main state variables
const wordData = ref<LanguageLearningData | null>(null); // Stores detailed linguistic data

const pending = ref(false); // Loading state
const error = ref<string | null>(null); // Translation error message, null when ok
const key = ref(new Date().getTime()); // Key for forcing component refresh

// Gets the title of the target language (e.g., "Spanish", "French")
const targetLanguageTitle = computed(
  () => TranslateService.instance.languageTitle
);

// Formats the word with proper capitalization
const title = computed(() => {
  return firstUpper(cleanText(getProps().word) || "");
});

const context = computed(() => {
  return getProps().context || "";
});

// Hide the context line when it's just a duplicate / superset of the selection itself.
const showContext = computed(() => {
  const c = context.value.trim().toLowerCase();
  const t = cleanText(getProps().word || "").trim().toLowerCase();
  if (!c) return false;
  if (!t) return true;
  return c !== t && !c.includes(t.slice(0, Math.max(8, t.length - 4)));
});

// Scale title down for long phrases so a sentence-length selection doesn't dominate the modal.
const titleSizeClass = computed(() => {
  const len = (title.value || "").length;
  if (len > 60) return "text-xl";
  if (len > 30) return "text-2xl";
  if (len > 14) return "text-3xl";
  return "text-4xl";
});

/**
 * Watch for changes to the word in URL parameters
 * Resets the component and fetches new word details
 */
watch(
  () => getProps().word,
  (value) => {
    key.value = new Date().getTime();
    wordData.value = null;
    error.value = null;

    if (!value) return;

    fetchWordDetail();
  },
  { immediate: true, deep: true }
);

/**
 * Fetches detailed linguistic data for the word
 * Uses context if available
 */
function fetchWordDetail() {
  pending.value = true;
  error.value = null;
  wordData.value = null;

  const props = getProps();
  const cleaned = cleanText(props.word as string);
  const context = props.context || "";

  TranslateService.instance
    .fetchDetailedTranslation(cleaned, context)
    .then((data) => {
      wordData.value = data;
    })
    .catch((err) => {
      console.error("Failed to fetch translation:", err);
      const message =
        err?.message ||
        err?.body?.message ||
        "We couldn't fetch the translation. Please try again.";
      error.value = message;
      analytic.track("word-detail-page_translation-error", { message });
    })
    .finally(() => (pending.value = false));
}

function retryFetch() {
  analytic.track("word-detail-page_retry-clicked");
  fetchWordDetail();
}

/**
 * Handles login request when user clicks login button
 * Opens login window via messaging system
 */
function handleLoginRequest() {
  sendMessage(new OpenLoginWindowMessage());
}
</script>

<style lang="scss" scoped>
.white-shadow {
  color: white;
  text-shadow: 2px 3px 0px #898999;
}
</style>
