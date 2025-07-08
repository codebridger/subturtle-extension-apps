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

<script lang="ts">
import { defineComponent } from "@vue/runtime-core";
import { SUPPORTED_LANGUES } from "../../static/langueges.static";

export default defineComponent({
  props: {
    modelValue: String,
    label: String,
  },

  emits: ["update:modelValue"],

  data() {
    return {
      lang: "en",
    };
  },

  computed: {
    list() {
      return SUPPORTED_LANGUES;
    },
  },

  watch: {
    modelValue: {
      immediate: true,
      handler(value) {
        if (!value) return;
        this.lang = value;
      },
    },
  },

  methods: {
    commit() {
      this.$emit("update:modelValue", this.lang);
    },
  },
});
</script>

<style></style>
