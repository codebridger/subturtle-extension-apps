<template>
  <div
    class="rounded-md px-6 py-7 text-gray-600 relative flex items-start space-x-8"
  >
    <!-- ICON 
    -->
    <div>
      <translate-button class="" v-model="showTranslate" />
    </div>

    <section class="flex-1 text-white">
      <p class="font-medium text-4xl" :dir="dir">{{ definition }}</p>
      <Divider class="my-5" />
      <p class="italic text-2xl mt-3" :dir="dir">{{ example }}</p>

      <Divider class="my-10" v-if="antonyms.length || synonyms.length" />

      <div v-if="antonyms.length">
        <p class="text-2xl">
          <span class="font-bold">Antonyms: </span><span>{{ antonyms }}</span>
        </p>
      </div>

      <div v-if="synonyms.length">
        <p class="text-2xl">
          <span class="font-bold">Synonyms: </span><span>{{ synonyms }}</span>
        </p>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/runtime-core";
import { getDir, rtls } from "../../common/helper/text";
import { CLOSE_ICON, TRANSLATE_ICON } from "../../common/icons/icons";
import { TranslateService } from "../../common/services/translate.service";
import { Definition } from "../../common/types/dictionaryapi.type";
import { analytic } from "../../plugins/mixpanel";
import Divider from "primevue/divider";

export default defineComponent({
  components: {
    Divider,
  },

  props: {
    data: { type: Object as PropType<Definition>, required: true },
  },

  data() {
    return {
      sourceLanguage: "en",
      showTranslate: false,
      translatedDefinition: "",
      translatedExample: "",
    };
  },

  watch: {
    showTranslate(value) {
      if (value == true && !this.translatedDefinition.length) {
        this.translate();
      }
    },
  },

  computed: {
    translateIcon() {
      return TRANSLATE_ICON;
    },

    closeIcon() {
      return CLOSE_ICON;
    },

    definition() {
      if (this.showTranslate && this.translatedDefinition.length) {
        return this.translatedDefinition;
      } else return this.data?.definition;
    },

    example() {
      if (this.showTranslate && this.translatedExample.length) {
        return this.translatedExample;
      } else return this.data?.example;
    },

    antonyms() {
      let antonyms = "";

      if (this.data?.antonyms && this.data?.antonyms.length) {
        antonyms = this.data?.antonyms.join(", ");
      }

      return antonyms;
    },

    synonyms() {
      let synonyms = "";

      if (this.data?.synonyms && this.data?.synonyms.length) {
        synonyms = this.data?.synonyms.join(", ");
      }

      return synonyms;
    },

    dir() {
      if (this.showTranslate && this.translatedDefinition.length) {
        return getDir();
      } else return this.sourceDir;
    },

    sourceDir() {
      let dir = rtls.indexOf(this.sourceLanguage) != -1 ? "rtl" : "ltr";
      return dir;
    },
  },

  methods: {
    translate() {
      let lines = [this.data?.definition, this.data?.example];

      TranslateService.instance
        .translateByGoogle(lines)
        .then(({ list, lang }) => {
          this.sourceLanguage = lang;

          lines.forEach((result, i) => {
            // Translated line
            if (i == 0) {
              this.translatedDefinition = list[i];
            }
            // Translated Word
            else {
              this.translatedExample = list[i] || "";
            }
          });
        });

      analytic.track("Definition translated");
    },
  },
});
</script>

<style></style>
