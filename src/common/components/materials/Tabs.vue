<template>
  <InputGroup>
    <Button
      v-for="tab of list"
      :key="tab"
      :outlined="active != tab"
      @click.stop="activateTab(tab)"
    >
      {{ title(tab) }}
    </Button>
  </InputGroup>
</template>

<script lang="ts">
import Button from "primevue/button";
import InputGroup from "primevue/inputgroup";
import { defineComponent } from "vue";

export default defineComponent({
  components: {
    Button,
    InputGroup,
  },

  props: {
    list: {},
    modelValue: String,
  },

  data() {
    return {
      active: "",
    };
  },

  watch: {
    list: {
      immediate: true,
      deep: true,
      handler(list, old) {
        if (!list || !list.length) return;
        if (JSON.stringify(list) == JSON.stringify(old)) return;

        this.activateTab(list[0]);
      },
    },
  },

  methods: {
    activateTab(tab) {
      this.active = tab;
      this.$emit("update:modelValue", tab);
    },

    title(tab) {
      let parts = tab.toLowerCase().split("");
      parts[0] = tab[0].toUpperCase();
      return parts.join("");
    },
  },
});
</script>

<style scoped>
:deep(.p-button.p-button-outlined) {
  color: var(--surface-border-color);
}
:deep(.p-button:focus) {
  box-shadow: unset;
}
</style>
