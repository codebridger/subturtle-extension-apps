<template>
  <Select v-model="selected" :options="options" custom labelKey="title" valueKey="_id"
    placeholder="Select a Phrase Bundle to save...">
    <template #header>
      <div class="p-4">
        <label class="font-medium text-900 block mb-2">
          Search or create a new bundle:
        </label>
        <InputGroup>
          <Input v-model="searchedBundleName" :disabled="isFetching" placeholder="Search bundles..." />
          <Button label="Create" color="secondary" :disabled="!isCreateNewAllowed" :is-loading="isCreating"
            @click="createNewBundle" />
        </InputGroup>
      </div>
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
import { Select, Input } from "pilotui";
import InputGroup from "../../common/components/InputGroup.vue";
import { Button } from "pilotui/elements";

import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

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

const selected = computed<string | undefined>({
  get() {
    return props.selectedBundles.length > 0 ? props.selectedBundles[0] : undefined;
  },
  set(v) {
    emit("update:selectedBundles", v ? [v] : []);
  },
});

// Debounce timer for search
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const isCreateNewAllowed = computed(() => {
  return (
    searchedBundleName.value.trim().length > 0 &&
    !isFetching.value &&
    options.value.every((option) => option.title !== searchedBundleName.value.trim())
  );
});

function createNewBundle() {
  if (isCreating.value) {
    return;
  }

  const title = searchedBundleName.value.trim();

  dataProvider
    .insertOne({
      database: DATABASE.USER_CONTENT,
      collection: COLLECTIONS.PHRASE_BUNDLE,
      doc: {
        title: title,
        refId: authentication.user?.id,
      },
    })
    .then(() => {
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
  }
  isFetching.value = true;

  const title = searchedBundleName.value.trim();
  const query: any = { refId: authentication.user?.id };
  if (title) query["title"] = { $regex: title, $options: "i" };

  return dataProvider
    .find<PhraseBundleType>({
      database: DATABASE.USER_CONTENT,
      collection: COLLECTIONS.PHRASE_BUNDLE,
      query,
      options: {
        sort: "-_id",
      },
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
</script>
