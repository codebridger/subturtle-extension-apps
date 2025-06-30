<template>
  <transition>
    <div
      class="fixed bg-[#000000cc] z-[9999] w-screen h-screen"
      @click.self="close"
      v-if="modelValue"
    >
      <section
        class="absolute rounded-md mx-auto my-32 top-0 left-0 right-0 bottom-0 bg-white dark:bg-blue-900"
        :style="modalStyle"
        ref="modalContentContainer"
      >
        <!-- Close button -->
        <div class="absolute right-[32px] left-[calc(100%-16px)] top-[-16px]">
          <Button rounded severity="secondary" @click="close" size="small">
            <template #icon>
              <span
                class="i-mdi-close text-gray-700 dark:text-white scale-[2]"
              />
            </template>
          </Button>
        </div>

        <!-- Content -->
        <div class="overflow-hidden w-full h-full" v-if="contentSize.width">
          <slot :width="contentSize.width" :height="contentSize.height" />
        </div>
      </section>
    </div>
  </transition>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import {
  ref,
  watch,
  onMounted,
  nextTick,
  provide,
  computed,
  onUnmounted,
} from "vue";
import { wait } from "../../common/helper/promise";

const emit = defineEmits(["update:modelValue"]);
const props = defineProps({
  modelValue: Boolean,
});

const modalContentContainer = ref<HTMLElement | null>(null);
const contentSize = ref({ width: 0, height: 0 });
const windowWidth = ref(window.innerWidth);

provide("frameSize", contentSize);

// Responsive modal style computation
const modalStyle = computed(() => {
  const maxWidth = 800;
  let margin = 60; // Default margin in pixels

  // Adjust margins based on screen size
  if (windowWidth.value < 768) {
    margin = 20; // Smaller margins on mobile
  } else if (windowWidth.value < 1024) {
    margin = 40; // Medium margins on tablets
  }

  const availableWidth = windowWidth.value - margin * 2;
  const width = Math.min(maxWidth, availableWidth);

  return {
    maxWidth: `${maxWidth}px`,
    width: `${width}px`,
  };
});

function updateContentSize() {
  if (!modalContentContainer.value) return;

  contentSize.value = {
    width: modalContentContainer.value.clientWidth,
    height: modalContentContainer.value.clientHeight,
  };
}

function handleResize() {
  windowWidth.value = window.innerWidth;
  nextTick(updateContentSize);
}

const defaultBodyOverflowY = ref("");

onMounted(() => {
  defaultBodyOverflowY.value = document.body.style.overflowY;
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      document.body.style.overflowY = "hidden";
    } else {
      wait(0.1).then(() => {
        document.body.style.overflowY = defaultBodyOverflowY.value;
      });
    }

    nextTick(updateContentSize);
  }
);

function close() {
  emit("update:modelValue", false);
}
</script>

<style lang="scss" scoped>
.gradient-background {
  background-image: linear-gradient(
    to right top,
    #d16ba5,
    #c777b9,
    #ba83ca,
    #aa8fd8,
    #9a9ae1,
    #8aa7ec,
    #79b3f4,
    #69bff8,
    #52cffe,
    #41dfff,
    #46eefa,
    #5ffbf1
  );
}
</style>
