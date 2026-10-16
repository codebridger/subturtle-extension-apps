<template>
  <div class="my-2 bg-white dark:bg-gray-900 rounded-xl">
    <!-- Result of a save (design X6), or of the two choices for a language
         not added yet (X7, X8, with Undo): in place, and the learner stays on
         the video. -->
    <div
      v-if="outcomeBox"
      role="status"
      data-testid="save-outcome"
      :data-kind="outcomeBox.kind"
      class="flex flex-col items-start gap-3 p-4 rounded-xl border"
      :class="outcomeBox.kind === 'kept'
        ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-400 dark:border-sky-500/50'
        : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-400 dark:border-emerald-500/50'"
    >
      <span
        class="w-12 h-12 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center"
        :class="outcomeBox.kind === 'kept' ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400'"
      >
        <i class="text-3xl" :class="outcomeBox.kind === 'kept' ? 'i-solar-inbox-line-bold-duotone' : 'i-solar-check-circle-bold'" />
      </span>
      <span class="text-base font-black text-gray-900 dark:text-white">{{ outcomeCopy.title }}</span>
      <span class="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-relaxed" dir="auto">{{ outcomeCopy.text }}</span>
      <span class="flex flex-wrap gap-2">
        <button v-if="canGoBackToVideo" type="button" data-testid="back-to-video"
          class="px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-bold"
          @click="$emit('back')">Back to my video</button>
        <button v-if="outcomeBox.kind === 'kept'" type="button" data-testid="add-language-now"
          class="px-4 py-2 rounded-full bg-white dark:bg-white/[0.08] border border-gray-200 dark:border-white/[0.12] text-gray-900 dark:text-white text-sm font-bold"
          @click="openAddLanguage(outcomeBox.language)">Add {{ languageName(outcomeBox.language, languages.caps) }} now</button>
        <button v-else-if="offerPractice && outcomeBox.phraseId" type="button" data-testid="practise-now"
          class="px-4 py-2 rounded-full bg-white dark:bg-white/[0.08] border border-gray-200 dark:border-white/[0.12] text-gray-900 dark:text-white text-sm font-bold"
          @click="$emit('practice', { phraseId: outcomeBox.phraseId, language: outcomeBox.language })">Practise it now</button>
        <button v-if="outcomeCopy.canUndo" type="button" data-testid="undo"
          class="px-3 py-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-white/[0.06] text-sm font-bold disabled:opacity-50"
          :disabled="isUndoing" @click="undo">Undo</button>
      </span>
    </div>

    <!-- Change: choose the language for this phrase only (design X5). -->
    <div v-else-if="pickerOpen && languages.state" data-testid="save-language-picker" class="flex flex-col gap-3">
      <span class="flex flex-col gap-0.5">
        <span class="text-[10px] uppercase tracking-wider font-semibold text-gray-400">This phrase</span>
        <span class="text-base font-black text-gray-900 dark:text-white">Save it to which language?</span>
      </span>
      <span class="text-sm font-semibold text-gray-500 dark:text-gray-400">
        Only this phrase changes. The language you are in stays the same.
      </span>
      <LanguagePicker :state="languages.state" :caps="languages.caps" :current="row?.target" :show-add="false"
        @pick="pickLanguage" />
      <button type="button" class="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/[0.08] text-gray-900 dark:text-white text-sm font-bold"
        @click="pickerOpen = false">Back to the phrase</button>
    </div>

    <template v-else>
      <!-- Language row (E-05): hidden until the server has language
           profiles (E-12). -->
      <SaveLanguageRow v-if="row" class="mb-3" :row="row" :caps="languages.caps" :can-change="canChange"
        :busy="isSaving || isKeeping" @change="pickerOpen = true" @save-active="saveToActive" @keep="keepForDetected"
        @add="openAddLanguage(row.detected)" />

      <p v-if="actionError" role="alert" class="mt-0 mb-3 text-sm font-semibold text-red-600 dark:text-red-400">
        {{ actionError }}
      </p>

      <!-- The bundle picker and Save. Not shown while the learner must choose
           between the two buttons of a language not added (E-06). -->
      <template v-if="!row || row.kind !== 'missing'">
      <FreemiumLimitCounter v-if="showFreemiumCounter" :used="usedCount" :total="totalCount" :isAtLimit="!!isAtLimit"
        :isDisabled="!!(isSaving || isAtLimit)" @action="savePhrase()" @upgrade="handleUpgrade" class="mb-4">
        <InputGroup>
          <SelectPhraseBundleV2 class="flex-1" ref="selectBundleRef" v-model:selected-bundles="selectedBundles" :language="targetLanguage"
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
          <SelectPhraseBundleV2 ref="selectBundleRef" v-model:selected-bundles="selectedBundles" :language="targetLanguage"
            :suggested-name="useSuggested ? suggestedName : ''" @update:suggested-name="suggestedName = $event" />
          <Button :label="saveLabel" size="lg" @click="savePhrase()" :disabled="!canSave || isSaving" :is-loading="isSaving"
            :class="plainSaveActive ? ACTIVE_SAVE_CLASS : DISABLED_SAVE_CLASS">
            <template #icon>
              <i class="mr-4 i-ep-collection" />
            </template>
          </Button>
        </div>
      </template>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { InputGroup, Button } from "pilotui";
import SelectPhraseBundleV2 from "./SelectPhraseBundleV2.vue";
import SaveLanguageRow from "./SaveLanguageRow.vue";
import LanguagePicker from "../../common/components/LanguagePicker.vue";
import { ref, watch, computed, nextTick } from "vue";
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
import { findSavedPhrase } from "../../common/services/phrase.service";
import type { Chunk } from "../modules/word-detail/types";
import { useLanguageStore } from "../../stores/language";
import { keepPhrasePending } from "../../common/language/api";
import { languageName } from "../../common/language/catalog";
import {
  activeLanguages,
  addLanguagePath,
  languageFilter,
  resolveSaveRow,
} from "../../common/language/state";
import { saveOutcomeCopy, type SaveOutcome } from "../../common/language/save-copy";

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
  /**
   * Round 1 (E-05): the language the server detected for the phrase
   * (`detectedLanguage` from translateWithContext). Only read when the server
   * has language profiles.
   */
  detected_language?: string | null;
  /** Show "Practise it now" in the result (the word-detail page handles it). */
  offerPractice?: boolean;
  /** Show "Back to my video" in the result (content scripts, not the popup). */
  canGoBackToVideo?: boolean;
}>();

const emit = defineEmits<{
  /** Fired after a successful save, carrying the created phrase document. */
  saved: [PhraseType];
  /** "Practise it now" in the result. */
  practice: [{ phraseId: string; language: string }];
  /** "Back to my video" in the result. */
  back: [];
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

const defaultBundleStore = useDefaultBundleStore();
const profileStore = useProfileStore();

// ---------------------------------------------------------------------------
// Languages (round 1: E-05, E-06, E-07). All of it is off (row null, target
// null, requests as before) until the server has language profiles (E-12).
// ---------------------------------------------------------------------------
const languages = useLanguageStore();
/** The language the learner picked for this phrase with Change. */
const override = ref<string | null>(null);
const pickerOpen = ref(false);
const outcome = ref<SaveOutcome | null>(null);
const actionError = ref("");
const isKeeping = ref(false);
const isUndoing = ref(false);
/**
 * The learner chose "Save to <active>" for a language not added yet, and no
 * bundle was ready, so the picker shows: the Save that follows is still that
 * choice (X8, with Undo back to the two choices).
 */
const choseInstead = ref(false);

const row = computed(() =>
  languages.isMultilingual && languages.state
    ? resolveSaveRow({
        state: languages.state,
        caps: languages.caps,
        detected: props.detected_language,
        override: override.value,
      })
    : null
);
/** Where Save writes; null in the dark phase, and while the learner must choose. */
const targetLanguage = computed<string | null>(() => row.value?.target ?? null);
const canChange = computed(() => activeLanguages(languages.state).length > 1);
const outcomeBox = computed(() => outcome.value);
const outcomeCopy = computed(() =>
  outcomeBox.value
    ? saveOutcomeCopy(outcomeBox.value, props.phrase, languages.caps)
    : { title: "", text: "", canUndo: false }
);

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
// button stays compact. With language profiles it names the language
// ("Save to German", E-05).
const saveLabel = computed(() =>
  targetLanguage.value
    ? `Save to ${languageName(targetLanguage.value, languages.caps)}`
    : "Save"
);

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

// A new phrase starts with no choice and no result.
watch(
  () => [props.phrase, props.translation],
  () => {
    override.value = null;
    outcome.value = null;
    actionError.value = "";
    pickerOpen.value = false;
    choseInstead.value = false;
  },
  { immediate: true }
);

/**
 * Preselect bundles for the phrase in its target language: the bundles it is
 * already saved in, else this page's bundle, else a suggested name, else the
 * last-used bundles. Re-runs when the phrase or its language changes; only
 * the latest run writes.
 */
let selectionSeq = 0;
let selectionRun: Promise<void> = Promise.resolve();

async function prepareSelection() {
  const seq = ++selectionSeq;
  selectedBundles.value = [];
  useSuggested.value = false;
  suggestedName.value = "";

  // A language not added yet: nothing to preselect until the learner chooses.
  if (row.value && !row.value.target) {
    existedPhrase.value = null;
    existingBundles.value = [];
    originalBundleIds.value = [];
    return;
  }
  const language = targetLanguage.value;

  await loadExistingBundles();
  if (seq !== selectionSeq) return;

  // Already-saved phrase: nothing to default.
  if (existingBundles.value.length > 0) return;

  // Per-page suggestion (matched bundle from this page, or an AI name).
  // Cached per URL and language by the service, so this is at most one server
  // call per page and language.
  const suggestion = await BundleSuggestionService.instance.getForCurrentPage(language);
  if (seq !== selectionSeq) return;

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

  // 3. Last-used bundles (existing behaviour), per language.
  const defaults = await defaultBundleStore.getDefaultBundles(language);
  if (seq !== selectionSeq) return;
  selectedBundles.value = defaults;
}

watch(
  () => [props.phrase, props.translation, targetLanguage.value],
  () => {
    selectionRun = prepareSelection();
  },
  { immediate: true }
);

/**
 * Load the bundles the phrase is already saved in, set the dirty baseline, and
 * preselect them in the selector so they show as chips. Returns true when the
 * phrase already exists (is saved somewhere).
 */
async function loadExistingBundles(): Promise<boolean> {
  if (!props.phrase || !props.translation) return false;

  try {
    // Shared lookup (matches by phrase + owner; translation excluded on purpose).
    // Per language (E-07); no language on a server without language profiles.
    existedPhrase.value = await findSavedPhrase(props.phrase, targetLanguage.value);

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
      query: {
        refId: authentication.user?.id,
        title,
        ...(targetLanguage.value ? { language: languageFilter(targetLanguage.value) } : {}),
      },
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
        doc: {
          title,
          refId: authentication.user?.id,
          // Bundles carry their language (E-07, B-09).
          ...(targetLanguage.value ? { language: targetLanguage.value } : {}),
        },
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

/** The createPhrase fields for this phrase (also what keep-phrase-pending takes). */
function phraseArgs(): Record<string, any> {
  return {
    phrase: props.phrase.trim(),
    translation: props.translation.trim(),
    translation_language: TranslateService.instance.targetLanguage.trim(),
    refId: authentication.user?.id,
    type: "linguistic",
    context: props.context || "",
    direction: props.direction,
    language_info: props.language_info,
    linguistic_data: props.linguistic_data,
    chunks: props.chunks || [],
    sourceUrl: typeof location !== "undefined" ? location.href : undefined,
  };
}

/** Bundle titles for the result line. */
function bundleTitles(ids: string[], suggested: string): string[] {
  return ids
    .map((id) => selectBundleRef.value?.titleFor?.(id) || "")
    .map((t, i) => t || (i === 0 ? suggested : ""))
    .filter(Boolean);
}

/**
 * @param kind "savedInstead" when the learner chose "Save to <active>" for a
 *   language not added yet: the result shows in place with Undo (X8). By
 *   default it is that choice when the learner made it and then picked a
 *   bundle, else a normal save (X6).
 */
async function savePhrase(kind?: "saved" | "savedInstead") {
  if (!canSave.value || isSaving.value) return;
  if (kind !== "saved" && kind !== "savedInstead") {
    kind = choseInstead.value ? "savedInstead" : "saved";
  }
  isSaving.value = true;
  actionError.value = "";

  try {
    const suggestedTitle = useSuggested.value ? suggestedName.value.trim() : "";
    const language = targetLanguage.value;

    // Save adds the phrase to newly selected (not-yet-saved) bundles.
    // Removals are applied immediately by the removal watcher.
    const finalSelected = await resolveBundleIds();
    const originalSet = new Set(originalBundleIds.value);
    const toAdd = finalSelected.filter((id) => !originalSet.has(id));

    if (!toAdd.length) {
      isSaving.value = false;
      return;
    }

    const result = await functionProvider
      .run<PhraseType>({
        name: "createPhrase",
        args: {
          ...phraseArgs(),
          bundleIds: toAdd,
          // Round 1 (E-07): the language it is saved to. Only with language
          // profiles; an old server resolves it itself (B-25).
          ...(language ? { language } : {}),
        },
      })
      .then((result) => {
        analytic.track("phrase_saved", {
          freemium: profileStore.isFreemium,
          ...(language ? { language, language_row: row.value?.kind } : {}),
        });
        return result;
      });
    existedPhrase.value = result;

    // Remember the bundles now in use as defaults for future saves.
    // Fire-and-forget: a failed write only costs the preselection next time.
    if (finalSelected.length) void defaultBundleStore.setDefaultBundles(finalSelected, language);

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

    // "Saved to Dark S1 · German" with Back to my video and Practise it now
    // (E-05, design X6 / X8). Without language profiles the window stays as
    // before: the bundle picker with the saved bundles.
    const savedLanguage = (result as any)?.language || language;
    if (savedLanguage) {
      const titles = bundleTitles(toAdd, suggestedTitle);
      const done: SaveOutcome = {
        kind,
        language: savedLanguage,
        bundleTitles: titles,
        bundleIds: toAdd,
        phraseId: result?._id,
      };
      outcome.value = done;
    }

    // The re-synced document, else what createPhrase returned (a lookup that
    // has not caught up yet must not hide the save from the page).
    const savedDoc = existedPhrase.value ?? result;
    if (savedDoc) {
      emit("saved", savedDoc);
    }

    if (selectBundleRef.value?.closeDropdown) {
      selectBundleRef.value.closeDropdown();
    }
  } catch (error) {
    console.error("Error saving phrase:", error);
    if (kind === "savedInstead") {
      actionError.value = "We could not save the phrase. Please try again.";
    }
  } finally {
    isSaving.value = false;
  }
}

/** Change: this phrase goes to another of the learner's languages (X5). */
function pickLanguage(code: string) {
  pickerOpen.value = false;
  choseInstead.value = false;
  override.value = code;
  analytic.track("save_language_changed", {
    detected: row.value?.detected,
    to: code,
  });
}

/**
 * "Save to <active>" for a language not added yet (E-06, X8). Saves at once
 * when the bundle preselection finds a bundle; otherwise the bundle picker
 * shows with the language chosen, and Save finishes it.
 */
async function saveToActive() {
  if (!row.value) return;
  const active = row.value.active;
  override.value = active;
  choseInstead.value = true;
  analytic.track("save_language_missing_choice", {
    choice: "save_to_active",
    detected: row.value.detected,
    to: active,
  });
  await nextTick();
  await selectionRun;
  if (canSave.value) await savePhrase("savedInstead");
}

/** "Keep for <detected>" (E-06, B-32, X7): pending on the server for 30 days. */
async function keepForDetected() {
  const language = row.value?.detected;
  if (!language || isKeeping.value) return;
  isKeeping.value = true;
  actionError.value = "";
  try {
    const reply = await keepPhrasePending(phraseArgs(), language);
    outcome.value = { kind: "kept", language, phraseId: reply?.phraseId };
    analytic.track("phrase_kept_pending", { language });
  } catch (error) {
    console.error("Error keeping phrase:", error);
    actionError.value = "We could not keep the phrase. Please try again.";
  } finally {
    isKeeping.value = false;
  }
}

/**
 * Undo a result of the two choices (X7, X8): back to the two choices.
 * - kept: remove the pending phrase (it is in no bundle and no review).
 * - saved instead: take it out of the bundles it was just added to; the
 *   server deletes the phrase when no bundle holds it.
 */
async function undo() {
  const done = outcome.value;
  if (!done || isUndoing.value) return;
  isUndoing.value = true;
  actionError.value = "";
  try {
    if (done.kind === "kept") {
      if (done.phraseId) {
        await dataProvider.removeOne({
          database: DATABASE.USER_CONTENT,
          collection: COLLECTIONS.PHRASE,
          query: { _id: done.phraseId, refId: authentication.user?.id, status: "pending" },
        });
      }
    } else if (done.phraseId) {
      await Promise.all(
        (done.bundleIds || []).map((bundleId) =>
          functionProvider.run({
            name: "removePhrase",
            args: { phraseId: done.phraseId, bundleId, refId: authentication.user?.id },
          })
        )
      );
      await profileStore.fetchSubscription().catch(() => {});
    }
    analytic.track("save_language_undo", { kind: done.kind, language: done.language });
    outcome.value = null;
    override.value = null;
    choseInstead.value = false;
  } catch (error) {
    console.error("Error undoing:", error);
    actionError.value = "We could not undo that. Please try again.";
  } finally {
    isUndoing.value = false;
  }
}

/** "Add German on the dashboard" (Q7): the add steps, with the language picked. */
function openAddLanguage(language?: string | null) {
  analytic.track("language_add_opened", { surface: "save_window", language });
  window.open(getSubturtleDashboardUrlWithToken(addLanguagePath(language)), "_blank");
}

function handleUpgrade() {
  window.open(getSubturtleDashboardUrlWithToken(), "_blank");
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
