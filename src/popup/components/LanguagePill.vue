<template>
  <button
    type="button"
    data-testid="language-pill"
    class="language-pill inline-flex items-center gap-2 h-11 pl-1.5 pr-3 rounded-full bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.12] text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-white/[0.2] transition-colors"
    :aria-label="ariaLabel"
    :aria-expanded="expanded"
    @click="$emit('open')"
  >
    <span
      class="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 flex items-center justify-center text-xs font-black"
    >
      <i v-if="!code" class="i-solar-login-3-bold text-base" />
      <template v-else>{{ chip }}</template>
    </span>
    <span class="flex flex-col items-start leading-tight">
      <span class="text-sm font-extrabold">{{ name }}</span>
      <span v-if="sub" class="text-[11px] font-bold text-gray-500 dark:text-gray-400">{{ sub }}</span>
    </span>
    <i v-if="code" class="i-solar-alt-arrow-down-linear text-base text-gray-500 dark:text-gray-400" />
  </button>
</template>

<script setup lang="ts">
/**
 * The language pill (E-03, design Part-LanguagePill): the one place the learner
 * sees and changes the active language. The level is where they started (chat
 * test, or A1), never a measured level. Without a code it is the signed-out
 * "Sign in" pill (E-02).
 */
import { computed } from "vue";
import { languageChip } from "../../common/language/catalog";

const props = defineProps<{
  /** Active language code; empty for the signed-out "Sign in" pill. */
  code?: string;
  /** English name, or "Sign in". */
  name: string;
  /** "A1" */
  level?: string;
  /** "Saves go here" */
  caption?: string;
  expanded?: boolean;
}>();

defineEmits<{ open: [] }>();

const chip = computed(() => languageChip(props.code));

const sub = computed(() => {
  if (!props.code) return props.caption || "";
  const level = props.level ? `Starting at ${props.level}` : "";
  return [props.caption, level].filter(Boolean).join(" · ");
});

const ariaLabel = computed(() =>
  props.code
    ? `Change language. Learning ${props.name}${props.level ? `, starting at ${props.level}` : ""}`
    : props.name
);
</script>
