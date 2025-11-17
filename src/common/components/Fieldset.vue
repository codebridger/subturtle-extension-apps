<template>
  <div
    :class="[
      'relative border-[1px] border-solid border-gray-200 dark:border-gray-600 rounded-md p-4',
      $attrs.class,
    ]"
  >
    <h3
      v-if="legend"
      class="absolute -top-3 left-3 px-2 text-base font-bold dark:text-gray-200 bg-inherit"
    >
      {{ legend }}
    </h3>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  legend?: string;
}>();
</script>
