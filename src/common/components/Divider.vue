<template>
  <hr :class="['border-gray-200 dark:border-gray-600', orientation === 'vertical' ? 'border-l h-full w-0' : 'border-t w-full', $attrs.class]" />
</template>

<script setup lang="ts">
defineProps<{
  orientation?: 'horizontal' | 'vertical';
}>();
</script>

