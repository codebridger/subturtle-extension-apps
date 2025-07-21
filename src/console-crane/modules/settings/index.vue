<template>
  <div
    class="flex flex-col items-center justify-start overflow-y-auto min-h-full dark:bg-blue-900"
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
        <Fieldset class="mb-6 dark:bg-blue-900" legend="Theme">
          <ThemeSwitcher />
        </Fieldset>

        <!-- Language Settings -->
        <Fieldset class="mb-6 dark:bg-blue-900" legend="Language">
          <div class="flex flex-col space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-lg dark:text-gray-100">Interface Language</span>
              <SelectTarget class="w-48" />
            </div>
          </div>
        </Fieldset>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, onMounted } from "vue";
import Fieldset from "primevue/fieldset";
import SelectTarget from "../../../common/components/inputs/SelectTarget.vue";
import ThemeSwitcher from "../../../common/components/inputs/ThemeSwitcher.vue";
import { analytic } from "../../../plugins/mixpanel";

// Inject frame size from modal
const frameSize = inject<{ width: number; height: number }>("frameSize");

// Initialize settings from localStorage
onMounted(() => {
  analytic.track("settings-page_viewed");
});
</script>

<style scoped>
/* Additional styles if needed */
</style>
