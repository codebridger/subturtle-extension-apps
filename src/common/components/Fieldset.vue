<template>
  <fieldset :class="['border border-gray-200 dark:border-gray-600 rounded-md p-4', $attrs.class]">
    <legend v-if="legend" class="px-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      {{ legend }}
    </legend>
    <slot />
  </fieldset>
</template>

<script setup lang="ts">
defineProps<{
  legend?: string;
}>();
</script>

