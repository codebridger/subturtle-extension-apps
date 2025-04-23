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
      <section class="px-[30px] mb-24 flex flex-col w-full" @click.stop="">
        <div class="flex items-center space-x-5 p-5">
          <h1 class="text-9xl white-shadow">{{ title }}</h1>
          <h3 class="text-5xl white-shadow mt-8">
            {{ wordData?.linguistic_data?.pronunciation || "" }}
          </h3>
        </div>

        <!-- Translation box showing the word in target language -->
        <Fieldset class="w-full" :legend="targetLanguageTitle">
          <div class="text-center">
            <span
              class="text-7xl white-shadow"
              :dir="wordData?.direction?.target"
              >{{ cleanText(wordData?.translation?.phrase || "") }}</span
            >
          </div>
        </Fieldset>

        <!-- Save word functionality - only shown to logged in users -->
        <SaveWordSection
          v-if="isLogin && wordData?.translation?.phrase"
          :phrase="cleanText(getProps().word!)"
          :translation="cleanText(wordData?.translation?.phrase || '')"
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
        <section class="w-full mt-10">
          <!-- Main definition card -->
          <Fieldset class="w-full mb-5" legend="Definition">
            <div class="p-4">
              <p
                class="text-4xl text-white mb-6"
                :dir="wordData?.direction?.target"
              >
                {{ wordData.linguistic_data.definition }}
              </p>

              <!-- Type and formality level -->
              <div class="flex justify-between text-2xl mb-4">
                <Badge
                  v-if="wordData.linguistic_data.type"
                  :value="wordData.linguistic_data.type"
                  severity="info"
                />
                <Badge
                  v-if="wordData.linguistic_data.formality_level"
                  :value="wordData.linguistic_data.formality_level"
                  severity="warning"
                />
              </div>

              <!-- Additional notes sections when available -->
              <div v-if="wordData.linguistic_data.usage_notes" class="mb-4">
                <h3 class="font-bold text-3xl mb-2">Usage Notes</h3>
                <p
                  class="text-white text-2xl"
                  :dir="wordData?.direction?.target"
                >
                  {{ wordData.linguistic_data.usage_notes }}
                </p>
              </div>

              <div v-if="wordData.linguistic_data.grammar_notes" class="mb-4">
                <h3 class="font-bold text-3xl mb-2">Grammar Notes</h3>
                <p
                  class="text-white text-2xl"
                  :dir="wordData?.direction?.target"
                >
                  {{ wordData.linguistic_data.grammar_notes }}
                </p>
              </div>

              <div v-if="wordData.linguistic_data.cultural_notes" class="mb-4">
                <h3 class="font-bold text-3xl mb-2">Cultural Context</h3>
                <p
                  class="text-white text-2xl"
                  :dir="wordData?.direction?.target"
                >
                  {{ wordData.linguistic_data.cultural_notes }}
                </p>
              </div>

              <div
                v-if="wordData.linguistic_data.literal_translation"
                class="mb-4"
              >
                <h3 class="font-bold text-3xl mb-2">Literal Translation</h3>
                <p
                  class="text-white text-2xl"
                  :dir="wordData?.direction?.target"
                >
                  {{ wordData.linguistic_data.literal_translation }}
                </p>
              </div>
            </div>
          </Fieldset>

          <!-- Example sentences -->
          <Fieldset
            v-if="
              wordData.linguistic_data.examples &&
              wordData.linguistic_data.examples.length
            "
            class="w-full mb-5"
            legend="Examples"
          >
            <div class="p-4">
              <div
                v-for="(example, index) in wordData.linguistic_data.examples"
                :key="index"
                class="mb-4"
              >
                <p
                  class="text-3xl text-white mb-2"
                  :dir="wordData?.direction?.source || 'ltr'"
                >
                  {{ example.source }}
                </p>
                <p
                  class="text-2xl text-gray-300 italic"
                  :dir="wordData?.direction?.target"
                >
                  {{ example.target }}
                </p>
                <Divider
                  v-if="index < wordData.linguistic_data.examples.length - 1"
                />
              </div>
            </div>
          </Fieldset>

          <!-- Related expressions -->
          <Fieldset
            v-if="
              wordData.linguistic_data.related_expressions &&
              wordData.linguistic_data.related_expressions.length
            "
            class="w-full"
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
                  class="text-3xl text-white mb-2"
                  :dir="wordData?.direction?.source"
                >
                  {{ expression.source }}
                </p>
                <p
                  class="text-2xl text-gray-300 italic"
                  :dir="wordData?.direction?.target"
                >
                  {{ expression.target }}
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
import SaveWordSection from "../../components/SaveWordSection.vue";

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
const markerStore = useMarkerStore(); // Global store for markers and translations

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
        wordData.value.phrase = cleaned;
        wordData.value.context = "";
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
