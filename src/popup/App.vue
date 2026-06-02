<template>
  <div class="bg-white dark:bg-gray-950">
    <PopupLoader v-if="!ready" />
    <router-view v-else v-slot="{ Component }">
      <!-- Keep Home alive so returning from a console page (Back) restores the
           existing translation + action buttons instead of a blank input. -->
      <keep-alive include="HomeView">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script lang="ts" setup>
import { ref, provide } from "vue";
import { RouterView, useRouter } from "vue-router";
import PopupLoader from "./components/PopupLoader.vue";
import { encodeRouteParams } from "../console-crane/route-params";

const router = useRouter();
const ready = ref(false);
router.isReady().then(() => {
  ready.value = true;
});

// The console pages (practice-config, flashcard-preview) live in THIS popup
// router and render as full popup pages — there is no modal on the popup page.
// WordDetailModule (reused from console-crane) injects this navigator and pushes
// the popup router. In the console-crane content script there is no provider, so
// the same module falls back to its store-driven modal — see
// src/console-crane/modules/word-detail/index.vue.
provide("openConsolePage", (page: string, params: Record<string, any>) => {
  router.push({ name: page, params: { data: encodeRouteParams(params) } });
});
</script>
