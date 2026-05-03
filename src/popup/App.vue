<template>
  <div class="bg-white dark:bg-gray-950">
    <PopupLoader v-if="!ready" />
    <router-view v-else />
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { RouterView, useRouter } from "vue-router";
import PopupLoader from "./components/PopupLoader.vue";

const router = useRouter();
const ready = ref(false);
router.isReady().then(() => {
  ready.value = true;
});
</script>
