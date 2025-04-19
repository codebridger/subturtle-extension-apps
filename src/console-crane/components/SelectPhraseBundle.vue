<template>
  <MultiSelect
    option-label="title"
    option-value="_id"
    placeholder="Select a Phrase Bundle to save..."
    :selection-limit="1"
    :options="options"
    :loading="isFetching"
    :model-value="props.selectedBundles"
    @update:model-value="emit('update:selectedBundles', $event)"
  >
    <template #header="{ options, value }">
      <div class="p-4">
        <label class="font-medium text-900 block mb-2">
          Search or create a new bundle:
        </label>

        <InputGroup>
          <InputText
            v-model="searchedBundleName"
            @update:model-value="fetchOptions"
          />
          <Button
            label="Create"
            severity="secondary"
            :disabled="!isCreateNewAllowed"
            :loading="isCreating"
            @click="createNewBundle"
          />
        </InputGroup>
      </div>
    </template>
  </MultiSelect>
</template>

<script lang="ts" setup>
import { dataProvider, authentication } from "@modular-rest/client";
import MultiSelect from "primevue/multiselect";
import InputText from "primevue/inputtext";
import InputGroup from "primevue/inputgroup";
import Button from "primevue/button";

import { computed, onMounted, ref, watch } from "vue";

import { COLLECTIONS, DATABASE } from "../../common/static/global";
import { PhraseBundleType } from "../../common/types/phrase.type";

const props = defineProps<{
  selectedBundles: string[];
}>();

const emit = defineEmits({
  "update:selectedBundles": (value: string[]) => true,
});

const isFetching = ref(false);
const isCreating = ref(false);

const searchedBundleName = ref("");
const options = ref<PhraseBundleType[]>([]);

const isCreateNewAllowed = computed(() => {
  return (
    searchedBundleName.value.length &&
    !isFetching.value &&
    options.value.every((option) => option.title !== searchedBundleName.value)
  );
});

function createNewBundle() {
  if (isCreating.value) {
    return;
  }

  const title = searchedBundleName.value;

  dataProvider
    .insertOne({
      database: DATABASE.USER_CONTENT,
      collection: COLLECTIONS.PHRASE_BUNDLE,
      doc: {
        title: title,
        refId: authentication.user?.id,
      },
    })
    .then((newBundle) => {
      searchedBundleName.value = "";
      fetchOptions();
    })
    .finally(() => {
      isCreating.value = false;
    });
}

function fetchOptions() {
  if (isFetching.value) {
    return;
  } else {
    isFetching.value = true;
  }

  const title = searchedBundleName.value;
  const query = {
    refId: authentication.user?.id,
  };

  if (searchedBundleName.value) {
    query["title"] = { $regex: title, $options: "i" };
  }

  return dataProvider
    .find<PhraseBundleType>({
      database: DATABASE.USER_CONTENT,
      collection: COLLECTIONS.PHRASE_BUNDLE,
      query: query,
      options: {
        sort: "-_id",
      },
    })
    .then((data) => {
      options.value = data;
    })
    .finally(async () => {
      isFetching.value = false;
    });
}

onMounted(() => {
  fetchOptions();
});
</script>

<style scoped>
:deep(.p-multiselect-label) {
  font-size: 14px !important;
}
</style>

<style>
.p-multiselect-panel {
  z-index: 9999 !important;
}
</style>
