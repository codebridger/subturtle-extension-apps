<template>
  <div class="my-2 bg-white dark:bg-gray-900 rounded-xl">
    <!-- Suggested bundle chip (first save from this page) -->
    <div v-if="useSuggested" class="mb-3 flex items-center gap-2 flex-wrap">
      <span class="text-[11px] uppercase tracking-wider font-semibold text-gray-400">Suggested:</span>
      <input
        v-if="isEditingSuggested"
        v-model="suggestedName"
        type="text"
        class="text-sm rounded-md border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-900 px-2 py-1 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400"
        @keyup.enter="isEditingSuggested = false"
        @blur="isEditingSuggested = false"
      />
      <button
        v-else
        type="button"
        class="inline-flex items-center gap-1.5 text-sm rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 px-3 py-1 hover:bg-purple-200 dark:hover:bg-purple-900/60"
        @click="isEditingSuggested = true"
      >
        <span>{{ suggestedName }}</span>
        <i class="i-mdi-pencil text-xs opacity-70" />
      </button>
    </div>

    <FreemiumLimitCounter v-if="showFreemiumCounter" :used="usedCount" :total="totalCount" :isAtLimit="!!isAtLimit"
      :isDisabled="!!(isSaving || isAtLimit)" @action="savePhrase" @upgrade="handleUpgrade" class="mb-4">
      <InputGroup>
        <SelectPhraseBundleV2 class="flex-1" ref="selectBundleRef" v-model:selected-bundles="selectedBundles"
          :excluded-bundle-ids="existingBundles.map((b) => b._id)" />
        <Button :label="isAtLimit ? 'Upgrade' : saveLabel"
          :icon-name="isAtLimit ? 'pi pi-crown' : ''" size="lg" @click="isAtLimit ? handleUpgrade() : savePhrase()"
          :disabled="!canSave || isSaving" :is-loading="isSaving"
          class="border-none bg-gradient-to-r from-pink-500 to-purple-600 shadow-md hover:from-pink-600 hover:to-purple-700 text-white font-semibold dark:from-pink-700 dark:to-purple-900">
          <template #icon>
            <i :class="isAtLimit ? 'pi pi-crown' : 'mr-4 i-ep-collection'" />
          </template>
        </Button>
      </InputGroup>
    </FreemiumLimitCounter>
    <template v-else>
      <div class="flex w-full">
        <SelectPhraseBundleV2 ref="selectBundleRef" v-model:selected-bundles="selectedBundles"
          :excluded-bundle-ids="existingBundles.map((b) => b._id)" />
        <Button :label="saveLabel" size="lg" @click="savePhrase" :disabled="!canSave || isSaving" :is-loading="isSaving"
          class="border-none bg-gradient-to-r from-pink-500 to-purple-600 shadow-md hover:from-pink-600 hover:to-purple-700 text-white font-semibold dark:from-pink-700 dark:to-purple-900">
          <template #icon>
            <i class="mr-4 i-ep-collection" />
          </template>
        </Button>
      </div>
    </template>

    <!-- Practice now + Preview flashcard -->
    <div class="mt-2 flex items-center gap-2 flex-wrap">
      <Button label="Practice now" size="sm" text @click="startPracticeNow">
        <template #icon>
          <i class="mr-2 i-solar-microphone-3-bold" />
        </template>
      </Button>
      <Button v-if="previewSentence" :label="showPreview ? 'Hide preview' : 'Preview flashcard'" size="sm" text
        @click="showPreview = !showPreview" />
    </div>

    <div v-if="showPreview && previewSentence"
      class="mt-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] p-3">
      <p class="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-1.5">Preview · fill in the blank</p>
      <p class="text-sm text-gray-900 dark:text-gray-100" :dir="direction?.source">{{ previewSentence }}</p>
    </div>

    <!-- Existing Bundles as Fieldset -->
    <Fieldset v-if="existingBundles.length > 0" class="saved-bundles-fieldset bg-white dark:bg-gray-900"
      legend="Saved in">
      <div class="flex flex-wrap gap-1.5">
        <Button v-for="bundle in existingBundles" :key="bundle._id" :label="bundle.title" chip rounded="full" size="sm"
          @chip-click="removePhraseFromBundle(bundle._id)" class="saved-chip" />
      </div>
    </Fieldset>
  </div>
</template>

<script setup lang="ts">
import { InputGroup, Button } from "pilotui";
import Fieldset from "../../common/components/Fieldset.vue";
import SelectPhraseBundleV2 from "./SelectPhraseBundleV2.vue";
import { onMounted, ref, watch, computed } from "vue";
import {
  authentication,
  dataProvider,
  functionProvider,
} from "@modular-rest/client";
import {
  COLLECTIONS,
  DATABASE,
  getSubturtleDashboardUrlWithToken,
} from "../../common/static/global";
import { TranslateService } from "../../common/services/translate.service";
import { PhraseType, PhraseBundleType } from "../../common/types/phrase.type";
import { useDefaultBundleStore } from "../../stores/default-bundle";
import { useProfileStore } from "../../stores/profile";
import FreemiumLimitCounter from "./FreemiumLimitCounter.vue";
import { analytic } from "../../plugins/mixpanel";
import { useConsoleCraneStore } from "../stores/console-crane";
import { BundleSuggestionService } from "../../common/services/bundle-suggestion.service";
import type { Chunk } from "../modules/word-detail/types";

const props = defineProps<{
  phrase: string;
  translation: string;
  context?: string;
  direction?: {
    source: "ltr" | "rtl";
    target: "ltr" | "rtl";
  };
  language_info?: {
    source: string;
    target: string;
  };
  linguistic_data?: any;
  chunks?: Chunk[];
}>();

const selectBundleRef = ref();
const selectedBundles = ref<string[]>([]);
const existingBundles = ref<PhraseBundleType[]>([]);
const existedPhrase = ref<PhraseType | null>(null);
const allBundles = ref<PhraseBundleType[]>([]);

const isSaving = ref(false);
const isRemoving = ref(false);

// Bundle suggestion (first save from a page).
const suggestedName = ref("");
const useSuggested = ref(false);
const isEditingSuggested = ref(false);

// Preview flashcard.
const showPreview = ref(false);

const defaultBundleStore = useDefaultBundleStore();
const profileStore = useProfileStore();
const consoleCraneStore = useConsoleCraneStore();

// When the user picks a real bundle, drop the suggestion.
watch(selectedBundles, (val) => {
  if (val.length) useSuggested.value = false;
});

const canSave = computed(
  () =>
    selectedBundles.value.length > 0 ||
    (useSuggested.value && !!suggestedName.value.trim())
);

const saveLabel = computed(() => {
  if (useSuggested.value && suggestedName.value.trim()) {
    return `Save to ${suggestedName.value.trim()}`;
  }
  if (selectedBundles.value.length === 1) {
    const title = allBundles.value.find(
      (b) => b._id === selectedBundles.value[0]
    )?.title;
    if (title) return `Save to ${title}`;
  }
  if (!selectedBundles.value.length) return "Add to Bundles";
  return `Add to ${selectedBundles.value.length} Bundle${
    selectedBundles.value.length > 1 ? "s" : ""
  }`;
});

// Build the L3+ style cloze preview by blanking the first chunk inside the context.
const previewSentence = computed(() => {
  const chunk = props.chunks?.[0]?.text?.trim();
  const sentence = (props.context || "").trim();
  if (!chunk || !sentence) return "";
  const idx = sentence.toLowerCase().indexOf(chunk.toLowerCase());
  if (idx === -1) return "";
  return (
    sentence.slice(0, idx) + "_____" + sentence.slice(idx + chunk.length)
  );
});

const showFreemiumCounter = computed(
  () => !!(profileStore.isFreemium && profileStore.freemiumAllocation)
);
const usedCount = computed(
  () => profileStore.freemiumAllocation?.allowed_save_words_used || 0
);
const totalCount = computed(
  () => profileStore.freemiumAllocation?.allowed_save_words || 0
);
const isAtLimit = computed(
  () => showFreemiumCounter.value && usedCount.value >= totalCount.value
);

watch(
  () => [props.phrase, props.translation],
  async () => {
    selectedBundles.value = [];
    useSuggested.value = false;
    suggestedName.value = "";
    showPreview.value = false;

    await loadExistingBundles();

    // Already-saved phrase: nothing to default.
    if (existingBundles.value.length > 0) return;

    // Per-page suggestion (matched bundle from this page, or an AI name).
    // Cached per URL by the service, so this is at most one server call per page.
    const suggestion = await BundleSuggestionService.instance.getForCurrentPage();

    // 1. An existing bundle from this same page.
    if (suggestion.matchedBundle) {
      selectedBundles.value = [suggestion.matchedBundle._id];
      return;
    }

    // 2. A suggested name from the page title (first save from this page).
    if (suggestion.suggestedName) {
      suggestedName.value = suggestion.suggestedName;
      useSuggested.value = true;
      return;
    }

    // 3. Last-used bundles (existing behaviour).
    selectedBundles.value = defaultBundleStore.getDefaultBundles();
  },
  { immediate: true, deep: true }
);

onMounted(() => {
  loadExistingBundles();
  loadAllBundles();
});

async function loadAllBundles() {
  try {
    allBundles.value = await dataProvider.find<PhraseBundleType>({
      database: DATABASE.USER_CONTENT,
      collection: COLLECTIONS.PHRASE_BUNDLE,
      query: { refId: authentication.user?.id },
      options: { sort: "-_id" },
    });
  } catch (error) {
    console.error("Error loading bundles:", error);
  }
}

async function loadExistingBundles() {
  if (!props.phrase || !props.translation) return;

  try {
    // First, find the phrase
    existedPhrase.value = await dataProvider
      .findOne({
        database: DATABASE.USER_CONTENT,
        collection: COLLECTIONS.PHRASE,
        query: {
          refId: authentication.user?.id,
          phrase: props.phrase.trim(),
          translation: props.translation.trim(),
        },
      })
      .then((doc) => doc as PhraseType | null);

    if (!existedPhrase.value) {
      existingBundles.value = [];
      return;
    }

    // Find all bundles that contain this phrase
    const bundles = await dataProvider.find<PhraseBundleType>({
      database: DATABASE.USER_CONTENT,
      collection: COLLECTIONS.PHRASE_BUNDLE,
      query: {
        refId: authentication.user?.id,
        phrases: {
          $in: [existedPhrase.value._id],
        },
      },
      options: {
        sort: "-_id",
      },
    });

    existingBundles.value = bundles;
  } catch (error) {
    console.error("Error loading existing bundles:", error);
    existingBundles.value = [];
  }
}

async function removePhraseFromBundle(bundleId: string) {
  if (!existedPhrase.value || isRemoving.value) return;

  isRemoving.value = true;

  try {
    // Use the same approach as the dashboard - call the removePhrase function
    await functionProvider
      .run({
        name: "removePhrase",
        args: {
          phraseId: existedPhrase.value._id,
          bundleId: bundleId,
          refId: authentication.user?.id,
        },
      })
      .then(() => {
        analytic.track("phrase_removed");
      });

    // Reload existing bundles to update UI
    await loadExistingBundles();
    // Refresh freemium counter
    await profileStore.fetchSubscription();
  } catch (error) {
    console.error("Error removing phrase from bundle:", error);
  } finally {
    isRemoving.value = false;
  }
}

/**
 * Resolve the bundle ids to save into. When the user kept the suggested bundle,
 * create it now and return its id. Returns an empty array if nothing to save.
 */
async function resolveBundleIds(): Promise<string[]> {
  if (selectedBundles.value.length) return selectedBundles.value;

  if (useSuggested.value && suggestedName.value.trim()) {
    const created = await dataProvider.insertOne({
      database: DATABASE.USER_CONTENT,
      collection: COLLECTIONS.PHRASE_BUNDLE,
      doc: { title: suggestedName.value.trim(), refId: authentication.user?.id },
    });
    analytic.track("phrase-bundle_created");
    const id = (created as any)?._id;
    return id ? [id] : [];
  }

  return [];
}

async function savePhrase() {
  isSaving.value = true;

  try {
    const bundleIds = await resolveBundleIds();
    if (!bundleIds.length) {
      isSaving.value = false;
      return;
    }

    // Use the enhanced server function with linguistic type
    const result = await functionProvider
      .run<PhraseType>({
        name: "createPhrase",
        args: {
          phrase: props.phrase.trim(),
          translation: props.translation.trim(),
          translation_language: TranslateService.instance.targetLanguage.trim(),
          bundleIds,
          refId: authentication.user?.id,
          type: "linguistic", // Specify linguistic type
          // Add linguistic-specific data from the word detail context
          context: props.context || "",
          direction: props.direction,
          language_info: props.language_info,
          linguistic_data: props.linguistic_data,
          chunks: props.chunks || [],
          sourceUrl: typeof location !== "undefined" ? location.href : undefined,
        },
      })
      .then((result) => {
        analytic.track("phrase_saved", {
          freemium: profileStore.isFreemium,
        });

        return result;
      });

    // Update the existedPhrase reference if it's a new phrase
    existedPhrase.value = result;

    // Store the bundles used as new defaults for future saves
    defaultBundleStore.setDefaultBundles(bundleIds);

    // This page now has a saved phrase + bundle; drop the cached suggestion so
    // the next open matches the bundle instead of re-suggesting a name.
    if (typeof location !== "undefined") {
      BundleSuggestionService.instance.clear(location.href);
    }

    // Clear selection and reload existing bundles
    selectedBundles.value = [];
    useSuggested.value = false;
    await Promise.all([loadExistingBundles(), loadAllBundles()]);
    // Refresh freemium counter
    await profileStore.fetchSubscription();

    // Close the dropdown after successful save
    if (selectBundleRef.value?.closeDropdown) {
      selectBundleRef.value.closeDropdown();
    }
  } catch (error) {
    console.error("Error saving phrase:", error);
  } finally {
    isSaving.value = false;
  }
}

function handleUpgrade() {
  window.open(getSubturtleDashboardUrlWithToken(), "_blank");
}

/**
 * Open the Practice now config page inside the console-crane modal.
 * The full config card ships in subtask 86exnxnw7; this navigates to its route.
 */
function startPracticeNow() {
  analytic.track("practice-now_opened");
  consoleCraneStore.toggleConsoleCrane(
    "practice-config",
    {
      phrase: props.phrase,
      context: props.context || "",
      chunks: props.chunks || [],
      bundleId: selectedBundles.value[0] || null,
    },
    true
  );
}
</script>

<style scoped>
:deep(.p-button.p-button-outlined) {
  color: var(--surface-border-color) !important;
}

:deep(.saved-bundles-fieldset) {
  margin-top: 6px;
  margin-bottom: 6px;
}

:deep(.saved-bundles-fieldset .p-fieldset-content) {
  padding: 8px 12px;
}

:deep(.saved-bundles-fieldset .p-fieldset-legend) {
  padding: 4px 8px;
  font-size: 0.75rem;
  font-weight: 500;
}

:deep(.saved-chip) {
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
  color: white;
  border: none;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 14px;
  box-shadow: 0 1px 4px rgba(59, 130, 246, 0.2);
  transition: all 0.2s ease;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

:deep(.saved-chip:hover) {
  transform: translateY(-0.5px);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%);
}

:deep(.saved-chip .p-chip-remove-icon) {
  margin-left: 6px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.75rem;
  transition: color 0.2s ease;
}

:deep(.saved-chip .p-chip-remove-icon:hover) {
  color: white;
  transform: scale(1.1);
}

:deep(.p-inputgroup) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

:deep(.p-inputgroup .p-multiselect) {
  border-radius: 12px 0 0 12px !important;
  border-right: none !important;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-right: none;
}

:deep(.p-inputgroup .p-button) {
  border-radius: 0 12px 12px 0 !important;
  border-left: none !important;
}

:deep(.p-inputgroup .p-button) {
  padding: 12px 20px;
  font-weight: 600;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
}

:deep(.p-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(139, 92, 246, 0.35);
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%);
}

:deep(.p-button:disabled) {
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}

/* Loading state */
:deep(.p-button .p-button-loading-icon) {
  margin-right: 8px;
}

/* Smooth transitions for all interactive elements */
* {
  transition: all 0.2s ease;
}
</style>
