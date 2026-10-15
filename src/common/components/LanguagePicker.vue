<template>
  <!-- Shared language picker (design Part-LanguagePicker). Used to switch the
       active language (popup, E-03) and to choose where one phrase is saved
       (save window Change, E-05). The parent decides what a pick does, so
       every flow returns to where it started. -->
  <div class="flex flex-col gap-2.5" data-testid="language-picker">
    <button
      v-for="row in rows"
      :key="row.code"
      type="button"
      class="min-h-[64px] px-3 py-2.5 rounded-xl flex items-center gap-3 text-left transition-colors"
      :class="row.isCurrent
        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-500'
        : 'bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.1] hover:border-gray-300 dark:hover:border-white/[0.2]'"
      :aria-current="row.isCurrent ? 'true' : 'false'"
      :disabled="busy"
      :data-testid="`language-row-${row.code}`"
      @click="$emit('pick', row.code)"
    >
      <span
        class="w-11 h-11 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
        :class="row.isCurrent
          ? 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-300'
          : 'bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-200'"
      >{{ row.chip }}</span>
      <span class="flex-1 min-w-0 flex flex-col">
        <span class="text-sm font-extrabold text-gray-900 dark:text-white">{{ row.label }}</span>
        <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">{{ row.meta }}</span>
      </span>
      <i v-if="row.isCurrent" class="i-solar-check-circle-bold text-2xl text-emerald-600 dark:text-emerald-400 shrink-0" />
    </button>

    <template v-if="showAdd">
      <button
        v-if="!limit.atLimit"
        type="button"
        data-testid="language-add"
        class="min-h-[56px] px-3.5 rounded-xl border-[1.5px] border-dashed border-gray-300 dark:border-white/[0.2] flex items-center gap-3 text-left text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-white/[0.3]"
        @click="$emit('add')"
      >
        <i class="i-solar-add-circle-bold text-2xl text-pink-600 dark:text-pink-400 shrink-0" />
        <span class="flex-1 flex flex-col leading-tight">
          <span class="text-sm font-extrabold">Add a language</span>
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">Opens your dashboard to set it up</span>
        </span>
        <span class="text-xs font-bold text-gray-500 dark:text-gray-400">{{ limit.usedText }}</span>
      </button>

      <!-- Plan limit (E-14, Q14): the add row becomes a card. Starter never
           offers a swap. -->
      <div
        v-else
        data-testid="language-limit"
        class="px-3.5 py-3 rounded-xl bg-pink-50 dark:bg-pink-500/10 flex flex-col gap-2.5"
      >
        <span class="flex items-start gap-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 leading-snug">
          <i class="i-solar-crown-bold-duotone text-xl text-pink-600 dark:text-pink-400 shrink-0" />
          {{ limit.limitText }}
        </span>
        <span class="flex gap-2">
          <button
            type="button"
            class="px-3 py-1.5 rounded-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold"
            @click="$emit('upgrade')"
          >{{ limit.upgradeLabel }}</button>
          <button
            v-if="limit.canManage"
            type="button"
            class="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.12] text-gray-800 dark:text-gray-100 text-xs font-bold"
            @click="$emit('manage')"
          >Manage</button>
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { languageChip, pickerLabel, primaryCode } from "../language/catalog";
import { activeLanguages, pickerMeta, planLimit } from "../language/state";
import type { LanguageCapabilities, LanguageState } from "../language/types";

const props = withDefaults(
  defineProps<{
    state: LanguageState;
    caps?: LanguageCapabilities | null;
    /** The ticked row: the active language, or the phrase's language. */
    current?: string | null;
    /** Show "Add a language" (or the plan-limit card). */
    showAdd?: boolean;
    /** Disable the rows while a switch is on its way. */
    busy?: boolean;
  }>(),
  { caps: null, current: null, showAdd: true, busy: false }
);

defineEmits<{
  pick: [code: string];
  add: [];
  upgrade: [];
  manage: [];
}>();

const rows = computed(() => {
  const current = primaryCode(props.current || props.state.learningLanguage);
  return activeLanguages(props.state).map((l) => ({
    code: l.code,
    chip: languageChip(l.code),
    label: pickerLabel(l.code, props.caps),
    meta: pickerMeta(l),
    isCurrent: primaryCode(l.code) === current,
  }));
});

const limit = computed(() => planLimit(props.state));
</script>
