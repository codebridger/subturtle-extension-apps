<template>
  <div class="my-2 bg-white dark:bg-blue-900 rounded-xl">
    <FreemiumLimitCounter
      v-if="showFreemiumCounter"
      :used="usedCount"
      :total="totalCount"
      :isAtLimit="!!isAtLimit"
      :isDisabled="!!(isSaving || isAtLimit)"
      @action="savePhrase"
      @upgrade="handleUpgrade"
      class="mb-4"
    >
      <Inputgroup class="mb-3 !border-none">
        <SelectPhraseBundleV2
          class="!border-none"
          ref="selectBundleRef"
          v-model:selected-bundles="selectedBundles"
          :excluded-bundle-ids="existingBundles.map((b) => b._id)"
        />
        <Button
          :label="
            isAtLimit
              ? 'Upgrade'
              : !selectedBundles.length
              ? 'Add to Bundles'
              : `Add to ${selectedBundles.length} Bundle${
                  selectedBundles.length > 1 ? 's' : ''
                }`
          "
          :icon="isAtLimit ? 'pi pi-crown' : 'pi pi-plus'"
          size="large"
          @click="isAtLimit ? handleUpgrade() : savePhrase()"
          :disabled="!selectedBundles.length || isSaving"
          :loading="isSaving"
          class="border-none bg-gradient-to-r from-pink-500 to-purple-600 shadow-md hover:from-pink-600 hover:to-purple-700 text-white font-semibold dark:from-pink-700 dark:to-purple-900"
        >
          <template #icon>
            <i :class="isAtLimit ? 'pi pi-crown' : 'mr-4 i-ep-collection'" />
          </template>
        </Button>
      </Inputgroup>
    </FreemiumLimitCounter>
    <template v-else>
      <Inputgroup class="mb-3">
        <SelectPhraseBundleV2
          ref="selectBundleRef"
          v-model:selected-bundles="selectedBundles"
          :excluded-bundle-ids="existingBundles.map((b) => b._id)"
        />
        <Button
          :label="
            !selectedBundles.length
              ? 'Add to Bundles'
              : `Add to ${selectedBundles.length} Bundle${
                  selectedBundles.length > 1 ? 's' : ''
                }`
          "
          size="large"
          @click="savePhrase"
          :disabled="!selectedBundles.length || isSaving"
          :loading="isSaving"
          class="border-none bg-gradient-to-r from-pink-500 to-purple-600 shadow-md hover:from-pink-600 hover:to-purple-700 text-white font-semibold dark:from-pink-700 dark:to-purple-900"
        >
          <template #icon>
            <i class="mr-4 i-ep-collection" />
          </template>
        </Button>
      </Inputgroup>
    </template>
    <!-- Existing Bundles as Fieldset -->
    <Fieldset
      v-if="existingBundles.length > 0"
      class="saved-bundles-fieldset bg-white dark:bg-blue-900"
      legend="Saved in"
    >
      <div class="flex flex-wrap gap-1.5">
        <Chip
          v-for="bundle in existingBundles"
          :key="bundle._id"
          :label="bundle.title"
          removable
          @remove="removePhraseFromBundle(bundle._id)"
          class="saved-chip"
        />
      </div>
    </Fieldset>
  </div>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import Inputgroup from "primevue/inputgroup";
import Chip from "primevue/chip";
import Fieldset from "primevue/fieldset";
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
}>();

const selectBundleRef = ref();
const selectedBundles = ref<string[]>([]);
const existingBundles = ref<PhraseBundleType[]>([]);
const existedPhrase = ref<PhraseType | null>(null);

const isSaving = ref(false);
const isRemoving = ref(false);

const defaultBundleStore = useDefaultBundleStore();
const profileStore = useProfileStore();

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
    await loadExistingBundles();

    // Auto-select previous bundles for new phrases (not already saved)
    if (existingBundles.value.length === 0) {
      const defaultBundles = defaultBundleStore.getDefaultBundles();
      selectedBundles.value = defaultBundles;
    }
  },
  { immediate: true, deep: true }
);

onMounted(() => {
  loadExistingBundles();
});

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

async function savePhrase() {
  if (!selectedBundles.value.length) return;

  isSaving.value = true;

  try {
    // Use the enhanced server function with linguistic type
    const result = await functionProvider
      .run<PhraseType>({
        name: "createPhrase",
        args: {
          phrase: props.phrase.trim(),
          translation: props.translation.trim(),
          translation_language: TranslateService.instance.targetLanguage.trim(),
          bundleIds: selectedBundles.value,
          refId: authentication.user?.id,
          type: "linguistic", // Specify linguistic type
          // Add linguistic-specific data from the word detail context
          context: props.context || "",
          direction: props.direction,
          language_info: props.language_info,
          linguistic_data: props.linguistic_data,
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

    // Store selected bundles as new defaults for future saves
    defaultBundleStore.setDefaultBundles(selectedBundles.value);

    // Clear selection and reload existing bundles
    selectedBundles.value = [];
    await loadExistingBundles();
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
