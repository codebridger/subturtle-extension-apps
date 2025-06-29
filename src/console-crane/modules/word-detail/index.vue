<template>
  <!-- Main word detail component - displays dictionary information and translation for a selected word -->
  <div
    class="flex flex-col items-center justify-start overflow-y-auto"
    :key="key"
  >
    <div
      class="select-text text-gray-900 flex flex-col px-20 justify-start items-center"
      :style="{
        height: '100%',
        width: `${Math.min(780, frameSize?.width!)}px`,
      }"
    >
      <!-- WORD HEADER SECTION - Displays the word, phonetic pronunciation, and translation -->
      <section class="px-[40px] my-14 flex flex-col w-full" @click.stop>
        <div
          class="p-5 flex flex-col justify-center items-center"
          :dir="wordData?.direction?.source"
        >
          <h1 class="text-6xl white-shadow mb-2">{{ title }}</h1>
          <p class="text-base max-w-96 italic text-gray-50">
            {{ context }}
          </p>
        </div>

        <!-- Translation box showing the word in target language -->
        <Fieldset class="mb-2" :legend="targetLanguageTitle">
          <h1
            class="text-5xl white-shadow text-center mb-8"
            :dir="wordData?.direction?.target"
          >
            {{ cleanText(wordData?.translation?.phrase || "") }}
          </h1>
        </Fieldset>

        <!-- Save word functionality - only shown to logged in users -->
        <SaveWordSectionV2
          v-if="isLogin && wordData?.translation?.phrase"
          :phrase="cleanText(getProps().word!)"
          :translation="cleanText(wordData?.translation?.phrase || '')"
          :context="wordData?.context"
          :direction="wordData?.direction"
          :language_info="wordData?.language_info"
          :linguistic_data="wordData?.linguistic_data"
        />

        <!-- Login prompt if user is not logged in -->
        <Button
          v-else
          severity="secondary"
          class="my-2 text-center"
          @click="handleLoginRequest"
        >
          <div class="w-full flex justify-center items-center">
            <i class="mr-2 text-xl i-solar-login-3-bold" />
            <span>Login To Save This Phrase</span>
          </div>
        </Button>
      </section>

      <!-- LINGUISTIC DATA SECTION - Shows detailed linguistic information -->
      <template v-if="wordData && wordData.linguistic_data">
        <section class="w-full mt-10 px-[40px]">
          <!-- Main definition card -->
          <Fieldset class="mb-2" legend="Definition">
            <p
              class="text-2xl text-white mb-6"
              :dir="wordData?.direction?.target"
            >
              {{ wordData.linguistic_data.definition }}
            </p>

            <!-- Type and formality level -->
            <div class="flex text-2xl gap-2">
              <Badge
                v-if="wordData.linguistic_data.type"
                :value="wordData.linguistic_data.type.toUpperCase()"
                severity="info"
                size="large"
              />
              <Badge
                v-if="wordData.linguistic_data.formality_level"
                :value="wordData.linguistic_data.formality_level.toUpperCase()"
                severity="warning"
                size="large"
              />
            </div>
          </Fieldset>

          <Fieldset class="mb-2" legend="Phonetic">
            <div class="flex justify-between">
              <p class="text-2xl text-gray-300 italic">
                {{ wordData?.linguistic_data?.phonetic.ipa || "" }}
              </p>
              <p
                class="text-2xl text-white italic mb-2"
                :dir="wordData?.direction?.target"
              >
                {{ wordData.linguistic_data.phonetic.transliteration }}
              </p>
            </div>
          </Fieldset>

          <!-- Example sentences -->
          <Fieldset
            class="mb-2"
            v-if="
              wordData.linguistic_data.examples &&
              wordData.linguistic_data.examples.length
            "
            legend="Examples"
          >
            <div
              v-for="(example, index) in wordData.linguistic_data.examples"
              :key="index"
              class="mb-4"
            >
              <p
                class="text-2xl text-white italic mb-2"
                :dir="wordData?.direction?.target"
              >
                {{ example.target }}
              </p>
              <p
                class="text-2xl text-gray-300 italic"
                :dir="wordData?.direction?.source"
              >
                {{ example.source }}
              </p>
              <Divider
                v-if="index < wordData.linguistic_data.examples.length - 1"
              />
            </div>
          </Fieldset>

          <!-- Related expressions -->
          <Fieldset
            class="mb-2"
            v-if="
              wordData.linguistic_data.related_expressions &&
              wordData.linguistic_data.related_expressions.length
            "
            legend="Related Expressions"
          >
            <div class="p-4">
              <div
                v-for="(expression, index) in wordData.linguistic_data
                  .related_expressions"
                :key="index"
                class="mb-4"
              >
                <p
                  class="text-2xl text-white mb-2"
                  :dir="wordData?.direction?.target"
                >
                  {{ expression.target }}
                </p>
                <p
                  class="text-2xl text-gray-300 italic"
                  :dir="wordData?.direction?.source"
                >
                  {{ expression.source }}
                </p>
                <Divider
                  v-if="
                    index <
                    wordData.linguistic_data.related_expressions.length - 1
                  "
                />
              </div>
            </div>
          </Fieldset>
        </section>
      </template>

      <!-- Loading state while fetching word data -->
      <template v-else-if="pending">
        <div class="my-32 text-3xl text-center text-yellow-200">
          <span>Loading...</span>
        </div>
      </template>

      <!-- Error state when no definitions are found -->
      <template v-else>
        <div class="my-32 text-3xl text-center text-yellow-200">
          <span
            >There is not any linguistic data for
            {{ cleanText(getProps().word!) }}</span
          >
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from "vue";
import { cleanText, firstUpper } from "../../../common/helper/text";
import { TranslateService } from "../../../common/services/translate.service";
import { LanguageLearningData } from "./types";

import { analytic } from "../../../plugins/mixpanel";
import { isLogin } from "../../../plugins/modular-rest";
import SaveWordSectionV2 from "../../components/SaveWordSectionV2.vue";

import Fieldset from "primevue/fieldset";
import Divider from "primevue/divider";
import Button from "primevue/button";
import Badge from "primevue/badge";

import { useRoute } from "vue-router";
import { useMarkerStore } from "../../../stores/marker";
import { sendMessage } from "../../../common/helper/massage";
import { OpenLoginWindowMessage } from "../../../common/types/messaging";

const route = useRoute();

/**
 * Extracts word data from the route parameter
 * The data is base64 encoded in the URL
 */
function getProps() {
  const data = JSON.parse(window.atob(route.params.data as string));

  return data as unknown as {
    word: string;
    context?: string;
  };
}

// Injected frame size from parent component to control responsive layout
const frameSize = inject<{ width: number; height: number }>("frameSize");

// Main state variables
const wordData = ref<LanguageLearningData | null>(null); // Stores detailed linguistic data

const pending = ref(false); // Loading state
const key = ref(new Date().getTime()); // Key for forcing component refresh

// Gets the title of the target language (e.g., "Spanish", "French")
const targetLanguageTitle = computed(
  () => TranslateService.instance.targetLanguageTitle
);

// Formats the word with proper capitalization
const title = computed(() => {
  return firstUpper(cleanText(getProps().word) || "");
});

const context = computed(() => {
  return getProps().context || "";
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

    if (!value) return;

    analytic.track("Word clicked", { word: value });
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

  const props = getProps();
  const cleaned = cleanText(props.word as string);
  const context = props.context || "";

  wordData.value = null;

  TranslateService.instance
    .fetchDetailedTranslation(cleaned, context)
    .then((data) => {
      try {
        wordData.value = data;
      } catch (error) {
        console.error("Failed to parse response:", error);
      }
    })
    .finally(() => (pending.value = false));
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
