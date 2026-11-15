<template>
  <!-- The language list over the popup (design PopupSwitcher, X2). Close and
       every row return to the popup, so the list is never a dead end. -->
  <div class="fixed inset-0 z-50" data-testid="language-switcher">
    <button
      type="button"
      class="absolute inset-0 w-full h-full bg-gray-900/40 dark:bg-black/60 cursor-default"
      aria-label="Close the language list"
      tabindex="-1"
      @click="$emit('close')"
    />
    <section
      role="dialog"
      aria-labelledby="languageSwitcherTitle"
      class="absolute left-3 right-3 top-[76px] max-h-[calc(100%-96px)] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-4 flex flex-col gap-2.5"
    >
      <div class="flex items-center justify-between">
        <h2 id="languageSwitcherTitle" class="m-0 text-base font-black text-gray-900 dark:text-white">
          Save phrases to
        </h2>
        <button
          type="button"
          class="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
          aria-label="Close"
          @click="$emit('close')"
        >
          <i class="i-solar-close-circle-linear text-2xl" />
        </button>
      </div>

      <LanguagePicker
        :state="state"
        :caps="caps"
        :busy="!!switching"
        @pick="pick"
        @add="openDashboard(addLanguagePath(), 'language_add_opened')"
        @upgrade="openDashboard(DASHBOARD_PATHS.subscription, 'language_limit_upgrade_clicked')"
        @manage="openDashboard(DASHBOARD_PATHS.languages, 'language_limit_manage_clicked')"
      />

      <p v-if="error" role="alert" class="m-0 text-xs font-semibold text-red-600 dark:text-red-400">
        {{ error }}
      </p>
      <p class="mt-0.5 mb-0 text-xs font-semibold text-gray-500 dark:text-gray-400 leading-relaxed">
        A sentence in another language you learn is saved to that language, and
        the save window shows it before you save.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import LanguagePicker from "../../common/components/LanguagePicker.vue";
import { setActiveLanguage } from "../../common/language/api";
import { DASHBOARD_PATHS, addLanguagePath } from "../../common/language/state";
import { primaryCode } from "../../common/language/catalog";
import type { LanguageCapabilities, LanguageState } from "../../common/language/types";
import { useLanguageStore } from "../../stores/language";
import { sendMessageToTabs } from "../../common/helper/massage";
import { LanguageStateChangedMessage } from "../../common/types/messaging";
import { getSubturtleDashboardUrlWithToken } from "../../common/static/global";
import { analytic } from "../../plugins/mixpanel";

const props = defineProps<{
  state: LanguageState;
  caps?: LanguageCapabilities | null;
}>();

const emit = defineEmits<{ close: [] }>();

const languages = useLanguageStore();
const switching = ref<string | null>(null);
const error = ref("");

/**
 * Switch the active language (E-03). The server is the source of truth; the
 * new state goes to this popup's store and to every open tab, so the next
 * save and translation there follow it without a reload. `set-active-language`
 * sends the `language_switched` event itself (B-28), so this popup does not.
 */
async function pick(code: string) {
  const from = props.state.learningLanguage;
  if (primaryCode(code) === primaryCode(from)) {
    emit("close");
    return;
  }
  switching.value = code;
  error.value = "";
  try {
    const next = await setActiveLanguage(code);
    languages.setState(next);
    sendMessageToTabs(new LanguageStateChangedMessage(JSON.parse(JSON.stringify(next))));
    emit("close");
  } catch (e) {
    console.error("Could not switch language:", e);
    error.value = "We could not switch the language. Please try again.";
  } finally {
    switching.value = null;
  }
}

function openDashboard(path: string, event: string) {
  analytic.track(event, { surface: "popup" });
  window.open(getSubturtleDashboardUrlWithToken(path), "_blank");
}
</script>
