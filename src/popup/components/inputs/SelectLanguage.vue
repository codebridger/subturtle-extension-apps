<template>
  <label
    for="countries"
    class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-400"
    >{{ label }}</label
  >
  <select
    v-model="lang"
    @change="commit"
    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
  >
    <!-- <option selected>Choose a language</option> -->
    <option v-for="(lang, i) of list" :key="i" :value="lang.code">
      {{ lang.title }}
    </option>
  </select>
</template>

<script lang="ts">
import { defineComponent } from "@vue/runtime-core";
import { SUPPORTED_LANGUES } from "../../../common/static/langueges.static";

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
