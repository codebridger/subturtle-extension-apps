<template>
  <div class="select-none" :style="style">
    <img
      class="w-full"
      :src="$getAsset(onlyLogo ? 'logo-240.png' : 'logotype.png')"
    />
  </div>
</template>

<script>
export default {
  props: {
    size: { type: Number, default: 100 },
    onlyLogo: { type: Boolean, default: false },
  },

  computed: {
    style() {
      return {
        width: this.size + "px",
        // height: this.size + "px",
      };
    },
  },
};
</script>
