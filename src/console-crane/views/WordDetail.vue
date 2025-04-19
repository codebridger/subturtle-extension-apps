<template>
  <div class="flex flex-col items-center justify-start" :key="key">
    <div
      class="select-text text-gray-900 flex flex-col px-20 justify-start items-center"
      :style="{
        height: '100%',
        width: `${Math.min(780, frameSize?.width!)}px`,
      }"
    >
      <!-- WORD -->
      <section class="px-[30px] mb-24 flex flex-col w-full" @click.stop="">
        <div class="flex items-center space-x-5 p-5">
          <h1 class="text-9xl white-shadow">{{ title }}</h1>
          <h3 class="text-5xl white-shadow mt-8">{{ phonetic }}</h3>
        </div>

        <Fieldset class="w-full" :legend="targetLanguageTitle">
          <div class="text-center">
            <span class="text-7xl white-shadow">{{
              cleanText(activeTranslate!)
            }}</span>
          </div>
        </Fieldset>

        <SaveWordSection
          v-if="isLogin && activeTranslate"
          :phrase="cleanText(getProps().word!)"
          :translation="cleanText(activeTranslate!)"
        />

        <Button
          v-else
          severity="secondary"
          class="my-2 text-center"
          @click="handleLoginRequest"
        >
          <div class="w-full flex justify-center items-center">
            <i class="mr-2 text-xl i-solar-login-3-bold" />
            <span>Login To Save This Phrase</span>
          </div>
        </Button>
      </section>

      <template v-if="store">
        <!-- 
        Definition cards
      -->
        <section class="w-full mt-10">
          <tabs
            class="mb-5 justify-start pl-[30px]"
            :list="store.partsOfSpeech"
            v-model="activeTab"
          />

          <Carousel
            class="w-full"
            :value="meaning?.definitions"
            :page="0"
            v-if="meaning?.definitions.length"
            :key="getProps().word"
          >
            <template #item="{ data, index }">
              <Fieldset class="h-full" :legend="'Definition ' + (index + 1)">
                <Definition
                  class="h-full min-h-[100px]"
                  :data="data"
                  :key="activeTab + index"
                />
              </Fieldset>
            </template>
          </Carousel>
        </section>
      </template>

      <template v-else-if="pending">
        <div class="my-32 text-3xl text-center text-yellow-200">
          <span>Loading...</span>
        </div>
      </template>

      <template v-else>
        <div class="my-32 text-3xl text-center text-yellow-200">
          <span
            >There is not any definition for
            {{ cleanText(getProps().word!) }}</span
          >
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from "vue";
import { cleanText, firstUpper } from "../../common/helper/text";
import { TranslateService } from "../../common/services/translate.service";
import {
  DefinitionStore,
  Meaning,
} from "../../common/types/dictionaryapi.type";

import { analytic } from "../../plugins/mixpanel";
import { isLogin } from "../../plugins/modular-rest";
import Definition from "../components/Definition.vue";
import SaveWordSection from "../components/SaveWordSection.vue";

import Fieldset from "primevue/fieldset";
import Carousel from "primevue/carousel";
import Button from "primevue/button";

import { useRoute } from "vue-router";
import { useMarkerStore } from "../../stores/marker";
import { sendMessage } from "../../common/helper/massage";
import { OpenLoginWindowMessage } from "../../common/types/messaging";

const route = useRoute();

function getProps() {
  const data = JSON.parse(window.atob(route.params.data as string));

  return data as unknown as {
    word: string;
  };
}

const frameSize = inject<{ width: number; height: number }>("frameSize");

const store = ref<DefinitionStore | null>(null);
const markerStore = useMarkerStore();

const pending = ref(false);
const activeTab = ref("");
const meaning = ref<Meaning>();
const key = ref(new Date().getTime());

const targetLanguageTitle = computed(
  () => TranslateService.instance.targetLanguageTitle
);

const title = computed(() => {
  let word = getProps().word;
  if (store.value) word = store.value.word;
  return firstUpper(word || "");
});

const phonetic = computed(() => {
  let phonetic = "";
  if (store.value) phonetic = store.value.phonetic;
  return phonetic;
});

const activeTranslate = computed(() => {
  return markerStore.translatedWords[markerStore.selectedPhrase];
});

watch(
  () => getProps().word,
  (value) => {
    key.value = new Date().getTime();
    store.value = null;

    if (!value) return;

    analytic.track("Word clicked", { word: value });
    fetchWordDetail();
  },
  { immediate: true, deep: true }
);

watch(
  () => activeTab,
  (value, old) => {
    if (old?.value !== value.value && store.value) {
      analytic.track("Part of speech switched");
    }

    if (value.value.length) {
      meaning.value = store.value!.getPartOfSpeech(value.value);
    }
  },
  {
    immediate: true,
    deep: true,
  }
);

function fetchWordDetail() {
  pending.value = true;

  const cleaned = cleanText(getProps().word as string);

  store.value = null;

  TranslateService.instance
    .translateByDictionaryapi(cleaned)
    .then((res) => (store.value = res))
    .finally(() => (pending.value = false));
}

function handleLoginRequest() {
  sendMessage(new OpenLoginWindowMessage());
}
</script>

<style lang="scss" scoped>
.white-shadow {
  color: white;
  text-shadow: 2px 3px 0px #898999;
}
</style>
