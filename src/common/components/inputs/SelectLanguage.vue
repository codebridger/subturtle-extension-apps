<template>
  <div class="flex items-center space-x-2 w-full">
    <label
      v-if="label"
      for="countries"
      class="text-sm font-medium text-gray-400 whitespace-nowrap"
      >{{ label }}</label
    >
    <div class="relative flex-1">
      <select
        v-model="lang"
        @change="commit"
        class="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full p-2 shadow-sm appearance-none"
      >
        <!-- Shown until a language is stored. Never pre-select one: the old
             hard-coded "en" made the popup claim "English" while nothing was
             saved and translations went out with no target language. -->
        <option value="" disabled>Choose your language</option>
        <option v-for="(lang, i) of list" :key="i" :value="lang.code">
          {{ lang.title }}
        </option>
      </select>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"
      >
        <svg
          class="fill-current h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
        >
          <path
            d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { SUPPORTED_LANGUES } from "../../static/langueges.static";

// Define types
interface Language {
  title: string;
  code: string;
}

interface Props {
  modelValue?: string;
  label?: string;
}

interface Emits {
  (e: "update:modelValue", value: string): void;
}

// Define props and emits
const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  label: "",
});

const emit = defineEmits<Emits>();

// Reactive data — mirrors the stored value; "" renders the placeholder.
const lang = ref<string>(props.modelValue || "");

// Computed properties
const list = computed<Language[]>(() => SUPPORTED_LANGUES);

// Watchers
watch(
  () => props.modelValue,
  (value) => {
    lang.value = value || "";
  },
  { immediate: true }
);

// Methods
const commit = (): void => {
  if (!lang.value) return;
  emit("update:modelValue", lang.value);
};
</script>

<style></style>
