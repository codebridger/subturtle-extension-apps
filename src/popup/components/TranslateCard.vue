<template>
  <section class="space-y-4">
    <div
      class="bg-gray-50 dark:bg-white/[0.03] backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/[0.08] shadow-xl hover:border-gray-300 dark:hover:border-white/[0.12] transition-all duration-300"
    >
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-1">
        Translate any text
      </h3>
      <p class="text-gray-600 dark:text-gray-400 text-sm mb-3">
        Type or paste any phrase to see its detailed translation. Save it to your
        bundles when logged in.
      </p>

      <form class="flex gap-2" @submit.prevent="submit">
        <input
          ref="inputEl"
          v-model="inputText"
          type="text"
          :placeholder="placeholder"
          autocomplete="off"
          spellcheck="false"
          class="flex-1 px-3 py-2 rounded-md bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400/40"
        />
        <button
          type="submit"
          :disabled="!inputText.trim()"
          class="px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white text-sm font-medium shadow-lg hover:shadow-purple-500/25 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none whitespace-nowrap"
        >
          Translate
        </button>
      </form>
    </div>

    <div v-if="submittedWord" class="rounded-xl overflow-hidden">
      <WordDetailModule :word="submittedWord" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import WordDetailModule from "../../console-crane/modules/word-detail/index.vue";

const placeholder = "Type or paste any text to translate…";

const inputEl = ref<HTMLInputElement | null>(null);
const inputText = ref("");
const submittedWord = ref("");

onMounted(async () => {
  await nextTick();
  inputEl.value?.focus();
});

function submit() {
  const text = inputText.value.trim();
  if (!text) return;
  submittedWord.value = text;
}
</script>
