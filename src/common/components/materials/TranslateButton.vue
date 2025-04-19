<template>
  <div class="translate-icon">
    <div @click="toggle">
      <img v-if="!active" :src="translateIcon" />
      <img v-if="active" :src="closeIcon" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { CLOSE_ICON, TRANSLATE_ICON } from "../../icons/icons";

export default defineComponent({
  props: ["modelValue"],

  data() {
    return {
      active: false,
    };
  },

  watch: {
    modelValue(value) {
      this.active = value;
    },
  },

  computed: {
    translateIcon() {
      return TRANSLATE_ICON;
    },

    closeIcon() {
      return CLOSE_ICON;
    },
  },

  methods: {
    toggle() {
      this.active = !this.active;
      this.$emit("update:modelValue", this.active);
    },
  },
});
</script>

<style lang="scss" scoped>
.translate-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  opacity: 0.5;
  transition: all ease-in 200ms;

  &:hover {
    opacity: 1;
  }

  img {
    cursor: pointer;
    width: 24px;
  }
}
</style>
