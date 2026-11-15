<template>
  <div
    data-testid="save-language-row"
    :data-kind="row.kind"
    class="flex flex-col gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.04]"
  >
    <div class="flex items-center gap-2.5">
      <span
        class="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-black"
        :class="row.kind === 'missing'
          ? 'bg-white dark:bg-gray-900 text-sky-600 dark:text-sky-400 border-[1.5px] border-dashed border-sky-600 dark:border-sky-400'
          : 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300'"
      >{{ chip }}</span>
      <span class="flex-1 min-w-0 flex flex-col leading-tight">
        <span class="text-sm font-extrabold text-gray-900 dark:text-white">{{ copy.title }}</span>
        <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">{{ copy.detail }}</span>
      </span>
      <button
        v-if="row.kind !== 'missing' && canChange"
        type="button"
        data-testid="save-language-change"
        class="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.12] text-gray-800 dark:text-gray-100 text-xs font-bold"
        @click="$emit('change')"
      >Change</button>
    </div>

    <!-- Language not added yet (E-06, Q6): two choices, and the learner stays
         where they are. A small link adds the language on the dashboard. -->
    <template v-if="row.kind === 'missing'">
      <div class="flex gap-2">
        <button
          type="button"
          data-testid="save-to-active"
          class="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.12] text-gray-900 dark:text-white text-sm font-bold disabled:opacity-50"
          :disabled="busy"
          @click="$emit('save-active')"
        >Save to {{ activeName }}</button>
        <button
          type="button"
          data-testid="keep-pending"
          class="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-sm font-bold disabled:opacity-50"
          :disabled="busy"
          @click="$emit('keep')"
        >Keep for {{ detectedName }}</button>
      </div>
      <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 leading-snug">
        Keep holds the phrase until you add {{ detectedName }}. Or
        <a
          href="#"
          data-testid="add-language-link"
          class="font-extrabold text-indigo-500 dark:text-indigo-400 no-underline hover:underline"
          @click.prevent="$emit('add')"
        >add {{ detectedName }} on the dashboard</a>.
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * The save window's language row (E-05, E-06; design Part-LanguageRow):
 * the detected language, where the phrase will be saved, and Change. When the
 * detected language is one the learner has not added, it offers "Save to
 * <active>" or "Keep for <detected>" instead.
 */
import { computed } from "vue";
import { languageChip, languageName } from "../../common/language/catalog";
import { saveRowCopy, type SaveRow } from "../../common/language/state";
import type { LanguageCapabilities } from "../../common/language/types";

const props = withDefaults(
  defineProps<{
    row: SaveRow;
    caps?: LanguageCapabilities | null;
    /** Change is offered when the learner has more than one language. */
    canChange?: boolean;
    busy?: boolean;
  }>(),
  { caps: null, canChange: true, busy: false }
);

defineEmits<{
  change: [];
  "save-active": [];
  keep: [];
  add: [];
}>();

const copy = computed(() => saveRowCopy(props.row, props.caps));
const chip = computed(() =>
  languageChip(props.row.kind === "missing" ? props.row.detected : props.row.target)
);
const activeName = computed(() => languageName(props.row.active, props.caps));
const detectedName = computed(() => languageName(props.row.detected, props.caps));
</script>
