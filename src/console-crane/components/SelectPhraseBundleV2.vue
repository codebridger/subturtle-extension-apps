<template>
  <Select v-model="selected" :options="options" multiple custom labelKey="title" valueKey="_id"
    placeholder="Select Phrase Bundles to save...">
    <template #selected="{
      selectedOption,
      selectedOptions,
      multiple,
      getOptionLabel,
      selectedCount,
    }">
      <div v-if="multiple && selectedOptions.length > 0" class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-gray-500 dark:text-gray-400">Selected:</span>
        <div class="flex items-center gap-1 flex-wrap">
          <span v-for="(option, index) in selectedOptions.slice(0, 2)" :key="index"
            class="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 rounded">
            {{ getOptionLabel(option) }}
          </span>
          <span v-if="selectedCount > 2"
            class="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded">
            +{{ selectedCount - 2 }} more
          </span>
        </div>
      </div>
      <span v-else-if="!multiple" class="flex items-center gap-2">
        <span class="inline-flex items-center justify-center w-5 h-5 text-xs text-blue-600">
          ✓
        </span>
        <span class="font-medium">{{ getOptionLabel(selectedOption) }}</span>
      </span>
    </template>
    <template #header>
      <InputGroup class="w-full p-2">
        <Input v-model="searchedBundleName" tabindex="0" :disabled="isFetching" placeholder="Search bundles..." />
        <Button label="Create" color="secondary" :disabled="!isCreateNewAllowed || isFetching || isCreating"
          :is-loading="isCreating" @click="createNewBundle" />
      </InputGroup>
    </template>
    <template #each="{ option, isSelected, setSelected }">
      <div :class="[
        'px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150',
        isSelected
          ? 'bg-primary text-white hover:bg-primary/90'
          : 'text-gray-900 dark:text-gray-100',
      ]" role="option" :aria-selected="isSelected" @click="setSelected">
        {{ (option as unknown as PhraseBundleType).title }}
      </div>
    </template>
  </Select>
</template>

<script lang="ts" setup>
import { dataProvider, authentication } from "@modular-rest/client";
import { Button } from "pilotui/elements";
import { Select, Input, InputGroup } from "pilotui";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { COLLECTIONS, DATABASE } from "../../common/static/global";
import { PhraseBundleType } from "../../common/types/phrase.type";
import { analytic } from "../../plugins/mixpanel";
import { log } from "../../common/helper/log";

const props = defineProps<{
  selectedBundles: string[];
  excludedBundleIds?: string[];
}>();

const emit = defineEmits({
  "update:selectedBundles": (value: string[]) => true,
});

const isFetching = ref(false);
const isCreating = ref(false);

const searchedBundleName = ref("");
const options = ref<PhraseBundleType[]>([]);

const selected = computed<string[] | undefined>({
  get() {
    return props.selectedBundles;
  },
  set(v) {
    emit("update:selectedBundles", Array.isArray(v) ? v : []);
  },
});

// Debounce timer for search
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Filter out excluded bundles from the options when prop changes
watch(
  () => props.excludedBundleIds,
  () => {
    if (!props.excludedBundleIds?.length) return;
    const newSelection = (props.selectedBundles || []).filter(
      (bundleId) => !props.excludedBundleIds!.includes(bundleId)
    );
    if (newSelection.length !== props.selectedBundles.length) {
      emit("update:selectedBundles", newSelection);
    }
  },
  { deep: true, immediate: true }
);

const isCreateNewAllowed = computed(() => {
  const key =
    searchedBundleName.value.trim().length > 0 &&
    !isFetching.value &&
    options.value.every(
      (option) => option.title !== searchedBundleName.value.trim()
    );
  log("isCreateNewAllowed", key);
  return key;
});

function createNewBundle() {
  if (isCreating.value) return;
  isCreating.value = true;
  const title = searchedBundleName.value.trim();
  if (!title) return;

  dataProvider
    .insertOne({
      database: DATABASE.USER_CONTENT,
      collection: COLLECTIONS.PHRASE_BUNDLE,
      doc: {
        title,
        refId: authentication.user?.id,
      },
    })
    .then(() => {
      searchedBundleName.value = "";
      fetchOptions();
      analytic.track("phrase-bundle_created");
    })
    .finally(() => {
      isCreating.value = false;
    });
}

function fetchOptions() {
  if (isFetching.value) return;
  isFetching.value = true;

  const title = searchedBundleName.value.trim();
  const query: any = { refId: authentication.user?.id };
  if (title) query["title"] = { $regex: title, $options: "i" };

  return dataProvider
    .find<PhraseBundleType>({
      database: DATABASE.USER_CONTENT,
      collection: COLLECTIONS.PHRASE_BUNDLE,
      query,
      options: { sort: "-_id" },
    })
    .then((data) => {
      options.value = data;
    })
    .finally(() => {
      isFetching.value = false;
    });
}

// Watch searchedBundleName with debounce to prevent focus loss
watch(searchedBundleName, () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  searchDebounceTimer = setTimeout(() => {
    fetchOptions();
  }, 300); // 300ms debounce
});

onMounted(() => {
  fetchOptions();
});

onBeforeUnmount(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
});

// Expose method for compatibility (Select manages its own open state)
function closeDropdown() { }

defineExpose({
  closeDropdown,
});
</script>

<style scoped>
/* No special styles needed; PilotUI components include styling */
</style>
