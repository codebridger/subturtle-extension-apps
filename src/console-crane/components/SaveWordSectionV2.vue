<template>
  <div class="my-2 bg-white dark:bg-gray-900 rounded-xl">
    <FreemiumLimitCounter v-if="showFreemiumCounter" :used="usedCount" :total="totalCount" :isAtLimit="!!isAtLimit"
      :isDisabled="!!(isSaving || isAtLimit)" @action="savePhrase" @upgrade="handleUpgrade" class="mb-4">
      <InputGroup>
        <SelectPhraseBundleV2 class="flex-1" ref="selectBundleRef" v-model:selected-bundles="selectedBundles"
          :suggested-name="useSuggested ? suggestedName : ''" @update:suggested-name="suggestedName = $event" />
        <Button :label="isAtLimit ? 'Upgrade' : saveLabel"
          :icon-name="isAtLimit ? 'pi pi-crown' : ''" size="lg" @click="isAtLimit ? handleUpgrade() : savePhrase()"
          :disabled="isAtLimit ? false : (!canSave || isSaving)" :is-loading="isSaving"
          :class="freemiumSaveActive ? ACTIVE_SAVE_CLASS : DISABLED_SAVE_CLASS">
          <template #icon>
            <i :class="isAtLimit ? 'pi pi-crown' : 'mr-4 i-ep-collection'" />
          </template>
        </Button>
      </InputGroup>
    </FreemiumLimitCounter>
    <template v-else>
      <div class="flex w-full">
        <SelectPhraseBundleV2 ref="selectBundleRef" v-model:selected-bundles="selectedBundles"
          :suggested-name="useSuggested ? suggestedName : ''" @update:suggested-name="suggestedName = $event" />
        <Button :label="saveLabel" size="lg" @click="savePhrase" :disabled="!canSave || isSaving" :is-loading="isSaving"
          :class="plainSaveActive ? ACTIVE_SAVE_CLASS : DISABLED_SAVE_CLASS">
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
  </div>
</template>

<script setup lang="ts">
import { InputGroup, Button } from "pilotui";
import SelectPhraseBundleV2 from "./SelectPhraseBundleV2.vue";
import { ref, watch, computed } from "vue";
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
// Bundle ids the phrase is already saved in (the "synced" baseline for dirty checks).
const originalBundleIds = ref<string[]>([]);

const isSaving = ref(false);

// Bundle suggestion (first save from a page).
const suggestedName = ref("");
const useSuggested = ref(false);

// Preview flashcard.
const showPreview = ref(false);

const defaultBundleStore = useDefaultBundleStore();
const profileStore = useProfileStore();

// When the user picks a real bundle, drop the suggestion.
watch(selectedBundles, (val) => {
  if (val.length) useSuggested.value = false;
});

// Removing an already-saved bundle (via the chip ×) unsaves it immediately.
let isRemovingBundle = false;
watch(selectedBundles, async (newSel) => {
  if (isRemovingBundle) return;
  if (!existedPhrase.value?._id) return;

  const removed = originalBundleIds.value.filter((id) => !newSel.includes(id));
  if (!removed.length) return;

  isRemovingBundle = true;
  try {
    await Promise.all(
      removed.map((bundleId) =>
        functionProvider.run({
          name: "removePhrase",
          args: {
            phraseId: existedPhrase.value!._id,
            bundleId,
            refId: authentication.user?.id,
          },
        })
      )
    );
    analytic.track("phrase_removed");
    originalBundleIds.value = originalBundleIds.value.filter(
      (id) => !removed.includes(id)
    );
    existingBundles.value = existingBundles.value.filter(
      (b) => !removed.includes(b._id)
    );
    await profileStore.fetchSubscription();
  } catch (error) {
    console.error("Error removing phrase from bundle:", error);
    // Revert the deselection on failure.
    selectedBundles.value = Array.from(new Set([...newSel, ...removed]));
  } finally {
    isRemovingBundle = false;
  }
});

// Dirty = there's a selected bundle that isn't saved yet (a pending addition),
// or a suggested (not-yet-created) bundle is in play. Removals are applied
// immediately (see the removal watcher), so they don't count as dirty.
const isDirty = computed(() => {
  if (useSuggested.value && suggestedName.value.trim()) return true;
  const origSet = new Set(originalBundleIds.value);
  return selectedBundles.value.some((id) => !origSet.has(id));
});

const canSave = computed(() => isDirty.value);

// Save button styling: vivid gradient when actionable, muted grey when not.
const ACTIVE_SAVE_CLASS =
  "border-none bg-gradient-to-r from-pink-500 to-purple-600 shadow-md hover:from-pink-600 hover:to-purple-700 text-white font-semibold dark:from-pink-700 dark:to-purple-900";
const DISABLED_SAVE_CLASS =
  "border-none bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 shadow-none cursor-not-allowed";

// Plain (non-freemium) Save button is active only when there are changes.
const plainSaveActive = computed(() => canSave.value && !isSaving.value);
// Freemium button doubles as "Upgrade" at the limit (always actionable then).
const freemiumSaveActive = computed(
  () => isAtLimit.value || (canSave.value && !isSaving.value)
);

// The chosen / suggested bundle is shown inside the selector field, so the
// button stays compact.
const saveLabel = computed(() => "Save");

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

/**
 * Load the bundles the phrase is already saved in, set the dirty baseline, and
 * preselect them in the selector so they show as chips. Returns true when the
 * phrase already exists (is saved somewhere).
 */
async function loadExistingBundles(): Promise<boolean> {
  if (!props.phrase || !props.translation) return false;

  try {
    // Match by phrase (+ owner) only. The translation can vary between AI calls,
    // so including it here would make an already-saved phrase look unsaved.
    existedPhrase.value = await dataProvider
      .findOne({
        database: DATABASE.USER_CONTENT,
        collection: COLLECTIONS.PHRASE,
        query: {
          refId: authentication.user?.id,
          phrase: props.phrase.trim(),
        },
      })
      .then((doc) => doc as PhraseType | null);

    if (!existedPhrase.value) {
      existingBundles.value = [];
      originalBundleIds.value = [];
      selectedBundles.value = [];
      return false;
    }

    const bundles = await dataProvider.find<PhraseBundleType>({
      database: DATABASE.USER_CONTENT,
      collection: COLLECTIONS.PHRASE_BUNDLE,
      query: {
        refId: authentication.user?.id,
        phrases: { $in: [existedPhrase.value._id] },
      },
      options: { sort: "-_id" },
    });

    existingBundles.value = bundles;
    originalBundleIds.value = bundles.map((b) => b._id);
    // Preselect the saved bundles so they appear inside the selector.
    selectedBundles.value = [...originalBundleIds.value];
    return originalBundleIds.value.length > 0;
  } catch (error) {
    console.error("Error loading existing bundles:", error);
    existingBundles.value = [];
    originalBundleIds.value = [];
    return false;
  }
}

/** Find an existing bundle of the user with this exact title, or null. */
async function findBundleByTitle(title: string): Promise<string | null> {
  try {
    const existing = await dataProvider.findOne<PhraseBundleType>({
      database: DATABASE.USER_CONTENT,
      collection: COLLECTIONS.PHRASE_BUNDLE,
      query: { refId: authentication.user?.id, title },
    });
    return (existing as any)?._id || null;
  } catch {
    return null;
  }
}

/**
 * Resolve the bundle ids to save into. When the user kept the suggested bundle,
 * reuse an existing bundle with the same name if one exists (the refId+title
 * index is unique), otherwise create it. Returns [] if nothing to save.
 */
async function resolveBundleIds(): Promise<string[]> {
  if (selectedBundles.value.length) return selectedBundles.value;

  if (useSuggested.value && suggestedName.value.trim()) {
    const title = suggestedName.value.trim();

    // Reuse an existing same-named bundle (avoids E11000 duplicate key).
    const existingId = await findBundleByTitle(title);
    if (existingId) return [existingId];

    try {
      const created = await dataProvider.insertOne({
        database: DATABASE.USER_CONTENT,
        collection: COLLECTIONS.PHRASE_BUNDLE,
        doc: { title, refId: authentication.user?.id },
      });
      analytic.track("phrase-bundle_created");
      const id = (created as any)?._id;
      return id ? [id] : [];
    } catch (error) {
      // A duplicate may have been created concurrently — fall back to it.
      const fallbackId = await findBundleByTitle(title);
      if (fallbackId) return [fallbackId];
      throw error;
    }
  }

  return [];
}

async function savePhrase() {
  if (!canSave.value || isSaving.value) return;
  isSaving.value = true;

  try {
    // Save adds the phrase to newly selected (not-yet-saved) bundles.
    // Removals are applied immediately by the removal watcher.
    const finalSelected = await resolveBundleIds();
    const originalSet = new Set(originalBundleIds.value);
    const toAdd = finalSelected.filter((id) => !originalSet.has(id));

    if (!toAdd.length) {
      isSaving.value = false;
      return;
    }

    existedPhrase.value = await functionProvider
      .run<PhraseType>({
        name: "createPhrase",
        args: {
          phrase: props.phrase.trim(),
          translation: props.translation.trim(),
          translation_language: TranslateService.instance.targetLanguage.trim(),
          bundleIds: toAdd,
          refId: authentication.user?.id,
          type: "linguistic",
          context: props.context || "",
          direction: props.direction,
          language_info: props.language_info,
          linguistic_data: props.linguistic_data,
          chunks: props.chunks || [],
          sourceUrl: typeof location !== "undefined" ? location.href : undefined,
        },
      })
      .then((result) => {
        analytic.track("phrase_saved", { freemium: profileStore.isFreemium });
        return result;
      });

    // Remember the bundles now in use as defaults for future saves.
    if (finalSelected.length) defaultBundleStore.setDefaultBundles(finalSelected);

    // This page now has a saved phrase; drop the cached suggestion so the next
    // open matches the bundle instead of re-suggesting a name.
    if (typeof location !== "undefined") {
      BundleSuggestionService.instance.clear(location.href);
    }

    // Re-sync the baseline + selection from the server.
    useSuggested.value = false;
    suggestedName.value = "";
    await loadExistingBundles();
    await profileStore.fetchSubscription();

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
async function startPracticeNow() {
  analytic.track("practice-now_opened");
  // Lazy import to avoid a circular dependency:
  // SaveWordSectionV2 -> console-crane store -> router -> word-detail -> SaveWordSectionV2.
  const { useConsoleCraneStore } = await import("../stores/console-crane");
  useConsoleCraneStore().toggleConsoleCrane(
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
