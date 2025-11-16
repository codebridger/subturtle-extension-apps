<template>
  <div class="relative w-full">
    <div class="overflow-hidden rounded-xl">
      <div
        class="flex transition-transform duration-500 ease-in-out"
        :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
      >
        <div
          v-for="(slide, index) in slides"
          :key="index"
          class="min-w-full"
        >
          <slot name="item" :data="slide" />
        </div>
      </div>
    </div>

    <!-- Navigation Arrows -->
    <button
      v-if="slides.length > 1"
      @click="previous"
      class="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
      aria-label="Previous slide"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <button
      v-if="slides.length > 1"
      @click="next"
      class="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
      aria-label="Next slide"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>

    <!-- Dot Indicators -->
    <div
      v-if="slides.length > 1"
      class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
    >
      <button
        v-for="(slide, index) in slides"
        :key="index"
        @click="goToSlide(index)"
        :class="[
          'w-2 h-2 rounded-full transition-all',
          currentIndex === index ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/75'
        ]"
        :aria-label="`Go to slide ${index + 1}`"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps<{
  value: any[];
  autoplay?: boolean;
  autoplayInterval?: number;
}>();

const slides = props.value || [];
const currentIndex = ref(0);
let autoplayTimer: ReturnType<typeof setInterval> | null = null;

function next() {
  currentIndex.value = (currentIndex.value + 1) % slides.length;
}

function previous() {
  currentIndex.value = (currentIndex.value - 1 + slides.length) % slides.length;
}

function goToSlide(index: number) {
  currentIndex.value = index;
}

function startAutoplay() {
  if (props.autoplay && slides.length > 1) {
    autoplayTimer = setInterval(() => {
      next();
    }, props.autoplayInterval || 5000);
  }
}

function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
}

watch(() => props.value, (newSlides) => {
  if (newSlides && newSlides.length > 0 && currentIndex.value >= newSlides.length) {
    currentIndex.value = 0;
  }
}, { deep: true });

onMounted(() => {
  startAutoplay();
});

onBeforeUnmount(() => {
  stopAutoplay();
});
</script>

