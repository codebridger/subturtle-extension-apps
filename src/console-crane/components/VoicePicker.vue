<template>
  <div>
    <div v-if="loading" class="grid grid-cols-3 gap-2">
      <div v-for="i in 6" :key="i" class="h-[88px] rounded-xl bg-gray-100 dark:bg-white/[0.06] animate-pulse" />
    </div>
    <div v-else class="grid grid-cols-3 gap-2">
      <button
        v-for="v in voices"
        :key="v.name"
        type="button"
        @click="$emit('update:modelValue', v.name)"
        :class="[
          'flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all focus:outline-none',
          modelValue === v.name
            ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500/30 dark:bg-purple-500/10'
            : 'border-gray-200 hover:border-purple-300 dark:border-white/[0.08] dark:hover:border-purple-500/40',
        ]"
      >
        <img v-if="v.avatarUrl" :src="v.avatarUrl" :alt="v.label" class="h-11 w-11 rounded-full object-cover" />
        <span
          v-else
          class="flex h-11 w-11 items-center justify-center rounded-full text-base font-semibold text-white"
          :style="{ backgroundColor: v.avatarColor || '#7C3AED' }"
        >{{ initial(v) }}</span>
        <span class="text-xs font-medium text-gray-900 dark:text-gray-100">{{ v.label }}</span>
        <span v-if="v.description" class="text-[10px] leading-tight text-gray-500 dark:text-gray-400">
          {{ v.description }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { LiveVoicesService, type CoachVoice } from "../../common/services/live-voices.service";

defineProps<{ modelValue: string }>();
defineEmits<{ "update:modelValue": [value: string] }>();

const voices = ref<CoachVoice[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    voices.value = await LiveVoicesService.instance.getVoices();
  } finally {
    loading.value = false;
  }
});

function initial(v: CoachVoice): string {
  return (v.label || v.name).charAt(0).toUpperCase();
}
</script>
