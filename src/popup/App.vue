<template>
  <div class="bg-white dark:bg-gray-950">
    <router-view />
  </div>
</template>

<script lang="ts" setup>
import { RouterView } from "vue-router";
</script>

<style>
body {
  width: 800px;
  height: 600px;
  overflow: hidden !important;
}

html {
  overflow: hidden !important;
}
</style>
