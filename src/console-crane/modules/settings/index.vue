<template>
  <div
    class="flex flex-col items-center justify-start overflow-y-auto min-h-full dark:bg-gray-950"
  >
    <div
      class="select-text flex flex-col px-20 justify-start items-center text-gray-900 dark:text-gray-100"
      :style="{
        height: '100%',
        width: `${Math.min(780, frameSize?.width!)}px`,
      }"
    >
      <!-- Settings Header -->
      <section class="px-[40px] my-14 flex flex-col w-full">
        <div class="p-5 flex flex-col justify-center items-center">
          <h1 class="text-4xl mb-8 dark:text-gray-100">Settings</h1>
        </div>
      </section>

      <!-- Settings Content -->
      <section class="w-full mt-10 px-[40px]">
        <!-- Theme Settings -->
        <Fieldset class="mb-6 dark:bg-gray-900" legend="Theme">
          <ThemeSwitcher />
        </Fieldset>

        <!-- Language Settings -->
        <Fieldset class="mb-6 dark:bg-gray-900" legend="Language">
          <div class="flex flex-col space-y-4">
            <!-- The own language (translations are written in it). With
                 language profiles it lives on the server (E-01) and is changed
                 on the dashboard; before that, the local select as before. -->
            <div v-if="languages.isMultilingual" class="flex items-center justify-between gap-4" data-testid="settings-own-language">
              <span class="text-lg dark:text-gray-100">Your own language</span>
              <span class="text-sm text-gray-600 dark:text-gray-300" dir="auto">{{ ownLanguage }}</span>
            </div>
            <div v-else class="flex items-center justify-between">
              <span class="text-lg dark:text-gray-100">Your own language</span>
              <SelectTarget class="w-48" />
            </div>
          </div>
        </Fieldset>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted } from "vue";
import Fieldset from "../../../common/components/Fieldset.vue";
import SelectTarget from "../../../common/components/inputs/SelectTarget.vue";
import ThemeSwitcher from "../../../common/components/inputs/ThemeSwitcher.vue";
import { analytic } from "../../../plugins/mixpanel";
import { useLanguageStore } from "../../../stores/language";
import { pickerLabel } from "../../../common/language/catalog";

// The own language from the server profile (E-01).
const languages = useLanguageStore();
const ownLanguage = computed(() =>
  pickerLabel(languages.state?.translationLanguage, languages.caps)
);

// Inject frame size from modal
const frameSize = inject<{ width: number; height: number }>("frameSize");

onMounted(() => {
  analytic.track("settings-page_viewed");
});
</script>

<style scoped>
/* Additional styles if needed */
</style>
