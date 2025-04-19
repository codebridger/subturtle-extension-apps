<template>
  <div class="flex items-center select-none scale-50">
    <div class="relative flex items-center justify-center w-[96px] h-[96px]">
      <img
        ref="keyBtnEl"
        width="96"
        height="96"
        class="absolute top-0 left-0"
        src="https://img.icons8.com/nolan/96/cmd.png"
        alt="cmd"
      />
    </div>
    <div class="relative w-0">
      <div
        ref="markerlineEl"
        class="absolute h-full bg-[#2824ff65] opacity-50"
      ></div>
      <img
        ref="iconCursorEl"
        class="icon-text-cursor z-[1]"
        src="https://img.icons8.com/color/96/text-cursor.png"
        alt="text-cursor"
      />
    </div>
    <h1 ref="phraseEl">SELECT MULTIPLE WORDS</h1>
  </div>
</template>

<script setup lang="ts">
import anime from "animejs/lib/anime.es.js";
import { watch, ref, onMounted } from "vue";

const props = defineProps({
  active: {
    type: Boolean,
    default: false,
  },
});

const animateBeats = ref<anime.AnimeInstance[]>([]);
const phraseEl = ref<HTMLElement>();
const keyBtnEl = ref<HTMLElement>();
const iconCursorEl = ref<HTMLElement>();
const markerlineEl = ref<HTMLElement>();

watch(
  () => props.active,
  (active) => {
    if (active == true) animateBeats.value.forEach((anime) => anime.play());
    if (!active) animateBeats.value.forEach((anime) => anime.seek(0));
  }
);

onMounted(() => {
  const phraseElWidth = phraseEl.value?.clientWidth || 0;
  const iconCursorElWidth = iconCursorEl.value?.clientWidth || 0;

  animateBeats.value = [
    // Key Button
    // Add pingpong effect to the key button, in y-axis
    //
    anime({
      targets: keyBtnEl.value,
      translateY: 3,
      scale: 0.85,
      easing: "easeInOutSine",
      autoplay: false,
      duration: 150,
    }),

    // Cursor Icon
    //
    anime({
      targets: iconCursorEl.value,
      opacity: [0, 1],
      easing: "easeInOutQuad",
      duration: 100,
      delay: 400,
      autoplay: false,
    }),
    anime({
      targets: iconCursorEl.value,
      translateX: [
        -iconCursorElWidth / 2 + "px",
        phraseElWidth + iconCursorElWidth / 2 + "px",
      ],
      easing: "easeInOutQuad",
      delay: 400,
      autoplay: false,
    }),

    // Markerline
    //
    anime({
      targets: markerlineEl.value,
      width: ["0px", phraseElWidth + iconCursorElWidth + "px"],
      easing: "easeInOutQuad",
      delay: 400,
      autoplay: false,
    }),
  ];
});
</script>

<style scoped>
.icon-text-cursor {
  min-height: 50px;
  min-width: 50px;
  width: 5px;
  height: 50px;
}
</style>
