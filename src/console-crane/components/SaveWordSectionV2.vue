<template>
  <div class="my-2">
    <!-- Save to Additional Bundles -->
    <Inputgroup class="mb-3">
      <SelectPhraseBundleV2
        ref="selectBundleRef"
        v-model:selected-bundles="selectedBundles"
        :excluded-bundle-ids="existingBundles.map((b) => b._id)"
      />

      <Button
        :label="!selectedBundles.length ? 'Add to Bundle' : 'Add'"
        size="large"
        @click="savePhrase"
        :disabled="!selectedBundles.length"
        :loading="isSaving"
      >
        <template #icon>
          <i class="mr-4 i-ep-collection" />
        </template>
      </Button>
    </Inputgroup>

    <!-- Existing Bundles as Chips -->
    <div v-if="existingBundles.length > 0">
      <div class="flex flex-wrap gap-2">
        <Chip
          v-for="bundle in existingBundles"
          :key="bundle._id"
          :label="bundle.title"
          removable
          @remove="removePhraseFromBundle(bundle._id)"
          class="bg-green-100 text-green-800 border border-green-200"
        />
      </div>
      <small class="text-gray-500 mt-1 block"
        >{{ existingBundles.length }} bundle(s) contain this phrase</small
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import Inputgroup from "primevue/inputgroup";
import Chip from "primevue/chip";
import SelectPhraseBundleV2 from "./SelectPhraseBundleV2.vue";
import { onMounted, ref, watch } from "vue";
import {
  authentication,
  dataProvider,
  functionProvider,
} from "@modular-rest/client";
import { COLLECTIONS, DATABASE } from "../../common/static/global";
import { TranslateService } from "../../common/services/translate.service";
import { PhraseType, PhraseBundleType } from "../../common/types/phrase.type";
import { useDefaultBundleStore } from "../../stores/default-bundle";
import { log } from "../../common/helper/log";

const props = defineProps<{
  phrase: string;
  translation: string;
}>();

const selectBundleRef = ref();
const selectedBundles = ref<string[]>([]);
const existingBundles = ref<PhraseBundleType[]>([]);
const existedPhrase = ref<PhraseType | null>(null);

const isSaving = ref(false);
const isRemoving = ref(false);

const defaultBundleStore = useDefaultBundleStore();

watch(
  () => [props.phrase, props.translation],
  () => {
    selectedBundles.value = [];
    loadExistingBundles();
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
    await functionProvider.run({
      name: "removePhrase",
      args: {
        phraseId: existedPhrase.value._id,
        bundleId: bundleId,
        refId: authentication.user?.id,
      },
    });

    // Reload existing bundles to update UI
    await loadExistingBundles();
  } catch (error) {
    console.error("Error removing phrase from bundle:", error);
  } finally {
    isRemoving.value = false;
  }
}

function updateBundles(bundleIds: string[], phraseId: string) {
  const promiseList = [
    ...bundleIds.map((bundleId) => {
      return dataProvider.updateOne({
        database: DATABASE.USER_CONTENT,
        collection: COLLECTIONS.PHRASE_BUNDLE,
        query: {
          _id: bundleId,
          refId: authentication.user?.id,
        },
        update: {
          $push: {
            phrases: phraseId,
          },
        },
      });
    }),
  ];

  return Promise.all(promiseList).then(() => {
    // Update default bundles but don't overwrite existing ones
    const currentDefaults = defaultBundleStore.getDefaultBundles();
    const newDefaults = [...new Set([...currentDefaults, ...bundleIds])];
    defaultBundleStore.setDefaultBundles(newDefaults);
  });
}

async function savePhrase() {
  if (!selectedBundles.value.length) return;

  isSaving.value = true;

  const query = {
    refId: authentication.user?.id!,
    phrase: props.phrase.trim(),
    translation: props.translation.trim(),
    translation_language: TranslateService.instance.targetLanguage.trim(),
  };

  const dataBase = {
    database: DATABASE.USER_CONTENT,
    collection: COLLECTIONS.PHRASE,
  };

  try {
    let phraseId: string;

    if (existedPhrase.value) {
      phraseId = existedPhrase.value._id;
    } else {
      // Create new phrase
      const newPhrase = await dataProvider
        .insertOne({
          ...dataBase,
          doc: query,
        })
        .then((data) => data as PhraseType);

      phraseId = newPhrase._id;
      existedPhrase.value = newPhrase;
    }

    // Add phrase to selected bundles
    await updateBundles(selectedBundles.value, phraseId);

    // Clear selection and reload existing bundles
    selectedBundles.value = [];
    await loadExistingBundles();

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
</script>

<style scoped>
:deep(.p-button.p-button-outlined) {
  color: var(--surface-border-color) !important;
}

:deep(.p-chip) {
  font-size: 0.875rem;
}

:deep(.p-chip .p-chip-remove-icon) {
  margin-left: 0.5rem;
}
</style>
