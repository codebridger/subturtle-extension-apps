<template>
  <MultiSelect
    ref="multiSelectRef"
    option-label="title"
    option-value="_id"
    placeholder="Select a Phrase Bundle to save..."
    :selection-limit="1"
    :options="filteredOptions"
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
  excludedBundleIds?: string[];
}>();

const emit = defineEmits({
  "update:selectedBundles": (value: string[]) => true,
});

const multiSelectRef = ref();
const isFetching = ref(false);
const isCreating = ref(false);

const searchedBundleName = ref("");
const options = ref<PhraseBundleType[]>([]);

// Filter out excluded bundles from the options
const filteredOptions = computed(() => {
  if (!props.excludedBundleIds?.length) {
    return options.value;
  }

  return options.value.filter(
    (option) => !props.excludedBundleIds!.includes(option._id)
  );
});

const isCreateNewAllowed = computed(() => {
  return (
    searchedBundleName.value.length &&
    !isFetching.value &&
    options.value.every((option) => option.title !== searchedBundleName.value)
  );
});

// Watch for changes in excluded bundles and refetch if needed
watch(
  () => props.excludedBundleIds,
  () => {
    // Clear current selection if it includes excluded bundles
    if (props.excludedBundleIds?.length) {
      const newSelection = props.selectedBundles.filter(
        (bundleId) => !props.excludedBundleIds!.includes(bundleId)
      );
      if (newSelection.length !== props.selectedBundles.length) {
        emit("update:selectedBundles", newSelection);
      }
    }
  },
  { deep: true, immediate: true }
);

function createNewBundle() {
  if (isCreating.value) {
    return;
  }

  isCreating.value = true;
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

// Expose method to close the dropdown
function closeDropdown() {
  if (multiSelectRef.value) {
    multiSelectRef.value.hide();
  }
}

defineExpose({
  closeDropdown,
});
</script>

<style scoped>
:deep(.p-multiselect-label) {
  font-size: 14px !important;
  font-weight: 500;
}

:deep(.p-multiselect-trigger) {
  color: rgba(255, 255, 255, 0.8);
}

:deep(.p-multiselect:not(.p-disabled).p-focus) {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
}

:deep(.p-multiselect-header) {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px;
}

:deep(.p-multiselect-header .p-inputgroup) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.p-multiselect-header .p-inputtext) {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 8px 0 0 8px;
}

:deep(.p-multiselect-header .p-inputtext::placeholder) {
  color: rgba(255, 255, 255, 0.6);
}

:deep(.p-multiselect-header .p-button) {
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
  border: none;
  border-radius: 0 8px 8px 0;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
}

:deep(.p-multiselect-header .p-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%);
}

:deep(.p-multiselect-items) {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
}

:deep(.p-multiselect-item) {
  padding: 12px 16px;
  border-radius: 6px;
  margin: 4px 8px;
  transition: all 0.2s ease;
}

:deep(.p-multiselect-item:hover) {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.1) 0%,
    rgba(99, 102, 241, 0.05) 100%
  );
  transform: translateX(4px);
  border-left: 2px solid #6366f1;
}

:deep(.p-multiselect-item.p-highlight) {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
}

:deep(.p-multiselect-empty-message) {
  padding: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
}
</style>

<style>
.p-multiselect-panel {
  z-index: 9999 !important;
  border-radius: 12px !important;
  overflow: hidden;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15) !important;
}
</style>
