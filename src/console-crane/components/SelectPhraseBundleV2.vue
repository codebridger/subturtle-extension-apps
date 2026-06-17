<template>
  <div ref="rootRef" class="relative w-full">
    <Select v-model="selected" :options="options" multiple custom labelKey="title" valueKey="_id"
      :placeholder="showSuggestion ? '' : 'Select Phrase Bundles to save...'" @open="onDropdownOpen"
      @close="onDropdownClose">
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
            <span v-for="(option, index) in selectedOptions" :key="index"
              class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 rounded">
              {{ resolveTitle(option, getOptionLabel) }}
              <span role="button" tabindex="0" title="Remove"
                class="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors cursor-pointer"
                @click.stop.prevent="removeSelected(option)" @mousedown.stop.prevent
                @keyup.enter.stop="removeSelected(option)">
                <i class="i-mdi-close text-[11px]" />
              </span>
            </span>
          </div>
        </div>

        <span v-else-if="!multiple" class="flex items-center gap-2">
          <span class="inline-flex items-center justify-center w-5 h-5 text-xs text-blue-600">
            ✓
          </span>
          <span class="font-medium">{{ resolveTitle(selectedOption, getOptionLabel) }}</span>
        </span>

      </template>
      <template #header>
        <InputGroup class="w-full p-2 justify-center">
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

    <!--
      Suggested bundle, shown inside the field when nothing is selected yet.
      Clearly marked as a suggestion and editable in place. The chip sits on the
      left; the rest of the field (and the caret) stays clickable to pick an
      existing bundle, which clears the suggestion.
    -->
    <div v-if="showSuggestion" class="absolute inset-y-0 left-0 right-12 flex items-center pl-3 pointer-events-none">
      <div
        class="pointer-events-auto inline-flex items-center gap-1.5 min-w-0 max-w-full rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 ring-1 ring-purple-300 dark:ring-purple-700 px-2.5 py-1"
        @click.stop>
        <i class="i-mdi-auto-fix text-sm opacity-80 shrink-0" />
        <span class="text-[10px] uppercase tracking-wide font-semibold opacity-70 shrink-0">Suggested</span>
        <template v-if="!isEditingSuggested">
          <span class="text-sm font-medium whitespace-nowrap">{{ suggestedName }}</span>
          <button type="button" class="shrink-0 opacity-70 hover:opacity-100" title="Edit name"
            @click.stop="startEditSuggested">
            <i class="i-mdi-pencil text-xs" />
          </button>
        </template>
        <input v-else ref="suggestedInput" v-model="editBuffer" type="text" dir="auto"
          class="flex-1 min-w-0 w-56 max-w-full text-sm bg-white dark:bg-gray-900 rounded px-2 py-0.5 border border-purple-300 dark:border-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
          @click.stop @keydown.stop @keyup.enter="commitEditSuggested" @blur="commitEditSuggested" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { dataProvider, authentication } from "@modular-rest/client";
import { Button } from "pilotui/elements";
import { Select, Input, InputGroup } from "pilotui";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { COLLECTIONS, DATABASE } from "../../common/static/global";
import { PhraseBundleType } from "../../common/types/phrase.type";
import { analytic } from "../../plugins/mixpanel";
import { log } from "../../common/helper/log";

const props = defineProps<{
  selectedBundles: string[];
  excludedBundleIds?: string[];
  /** AI-suggested bundle name shown in-field when no bundle is selected yet. */
  suggestedName?: string;
}>();

const emit = defineEmits({
  "update:selectedBundles": (value: string[]) => true,
  "update:suggestedName": (value: string) => true,
});

const isFetching = ref(false);
const isCreating = ref(false);

const searchedBundleName = ref("");
const options = ref<PhraseBundleType[]>([]);

// Component root — boundary for our own outside-click close (see below).
const rootRef = ref<HTMLElement | null>(null);
// Mirrors pilotui Select's internal open state via its open/close events.
const isDropdownOpen = ref(false);

// In-field suggested bundle (shown only when nothing is selected yet).
const isEditingSuggested = ref(false);
const editBuffer = ref("");
const suggestedInput = ref<HTMLInputElement | null>(null);
const showSuggestion = computed(
  () => !!props.suggestedName && (props.selectedBundles?.length || 0) === 0
);

// If a selected id isn't in the loaded options (e.g. a bundle just created on
// save, or a server-matched bundle), refetch so its title resolves instead of
// showing the raw id.
watch(
  () => props.selectedBundles,
  (ids) => {
    if (!ids?.length || isFetching.value) return;
    const known = new Set(options.value.map((o) => o._id));
    if (ids.some((id) => !known.has(id))) fetchOptions();
  },
  { deep: true }
);

/**
 * Resolve a selected entry to its bundle title. pilotui hands back the option
 * object when picked from the dropdown, but the raw value (id) when the value
 * was preselected externally — so look the id up in the loaded options and fall
 * back to the slot's label helper.
 */
function resolveTitle(
  option: any,
  getOptionLabel: (o: any) => string
): string {
  if (option && typeof option === "object") {
    return option.title ?? getOptionLabel(option);
  }
  const found = options.value.find((o) => o._id === option);
  return found ? found.title : getOptionLabel(option);
}

/**
 * Normalise a selection entry to a bundle id. pilotui stores the whole option
 * object when picked from the dropdown but the raw id when set externally.
 */
function toId(entry: any): string {
  return entry && typeof entry === "object" ? entry._id : entry;
}

/** Deselect a bundle chip (removes it from the selection / makes it dirty). */
function removeSelected(option: any) {
  const targetId = toId(option);
  emit(
    "update:selectedBundles",
    (props.selectedBundles || []).filter((x) => toId(x) !== targetId)
  );
}

function startEditSuggested() {
  editBuffer.value = props.suggestedName || "";
  isEditingSuggested.value = true;
  nextTick(() => suggestedInput.value?.focus());
}

function commitEditSuggested() {
  const value = editBuffer.value.trim();
  if (value) emit("update:suggestedName", value);
  isEditingSuggested.value = false;
}

const selected = computed<string[] | undefined>({
  get() {
    return props.selectedBundles;
  },
  set(v) {
    // pilotui pushes option objects on dropdown pick; always emit plain ids so
    // the parent (and createPhrase) only ever sees bundle id strings.
    emit("update:selectedBundles", Array.isArray(v) ? v.map(toId) : []);
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

/**
 * Close the pilotui Select dropdown.
 *
 * pilotui's Select owns its open state internally and exposes no close method or
 * `open` prop — the only outside-driven close it offers is its own document
 * click handler, which bails whenever the click lands inside ANY `.relative`
 * ancestor (Select.vue `handleClickOutside`). Inside the ConsoleCrane modal —
 * where almost everything sits under a Tailwind `relative` wrapper — that guard
 * matches on nearly every click, so the dropdown effectively never closes.
 *
 * We drive pilotui's own close path instead by dispatching the Escape key its
 * trigger button already handles (`handleKeydown` → `closeDropdown`). It's
 * idempotent: closing an already-closed dropdown is a no-op, so this can't
 * accidentally re-open. Used both for our outside-click handler and by
 * SaveWordSectionV2 after a successful save.
 */
function closeDropdown() {
  const trigger = rootRef.value?.querySelector<HTMLButtonElement>(
    'button[aria-haspopup="true"]'
  );
  trigger?.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
  );
}

/**
 * Close the dropdown when the user clicks anywhere outside this component.
 * Replaces pilotui's `.relative`-based outside detection, which misfires inside
 * the modal (see closeDropdown). We only act while open and only for clicks that
 * land outside our root, so in-dropdown interactions (multi-select toggles,
 * search, create, chip removal, suggestion edit) are untouched.
 */
function handleOutsidePointer(event: Event) {
  if (!isDropdownOpen.value) return;
  const root = rootRef.value;
  if (root && !root.contains(event.target as Node)) {
    closeDropdown();
  }
}

/**
 * Size and place the open dropdown so it never runs past the modal frame
 * (ClickUp 86exzbh61 follow-up). The save section sits near the bottom of the
 * ConsoleCrane modal, so pilotui's fixed downward max-h-96 panel spilled below
 * the visible frame — forcing a modal scroll on top of the list's own scroll.
 *
 * pilotui has no placement API, so on open we measure the trigger against the
 * nearest scroll frame and set inline styles on its absolutely-positioned panel:
 * flip it upward when it can't fully open downward and there's more room above,
 * and cap its height to the available space (minus a gap) in whichever direction
 * it opens. The list scrolls internally within that cap (see scoped styles).
 */
function positionDropdown() {
  const root = rootRef.value;
  if (!root) return;
  const panel = root.querySelector<HTMLElement>('[role="listbox"]');
  const trigger = root.querySelector<HTMLElement>('button[aria-haspopup="true"]');
  if (!panel || !trigger) return;

  const GAP = 12; // breathing room between the panel and the frame edge
  const MAX = 336; // pilotui's max-h-96 (24rem → 336px after the rem→px rewrite)

  const frameEl =
    root.closest<HTMLElement>(".overflow-y-auto") ?? document.documentElement;
  const frame = frameEl.getBoundingClientRect();
  const t = trigger.getBoundingClientRect();

  const below = frame.bottom - t.bottom - GAP;
  const above = t.top - frame.top - GAP;

  // Flip up only when the list can't fully open downward and there's more room
  // above; otherwise keep the natural downward placement.
  const openUp = below < MAX && above > below;
  const avail = Math.max(0, openUp ? above : below);

  panel.style.maxHeight = `${Math.min(MAX, avail)}px`;
  if (openUp) {
    panel.style.top = "auto";
    panel.style.bottom = "calc(100% + 4px)";
    panel.style.marginTop = "0";
  } else {
    // Clear any prior upward placement (panel is reused across reposition runs).
    panel.style.top = "";
    panel.style.bottom = "";
    panel.style.marginTop = "";
  }
}

// Reposition the open dropdown when the viewport or modal body changes size /
// scrolls; torn down again on close so the listeners only live while open.
let removeReposition: (() => void) | null = null;

function onDropdownOpen() {
  isDropdownOpen.value = true;
  nextTick(positionDropdown);

  if (removeReposition) return;
  const handler = () => positionDropdown();
  const frameEl: Window | HTMLElement =
    rootRef.value?.closest<HTMLElement>(".overflow-y-auto") ?? window;
  window.addEventListener("resize", handler);
  frameEl.addEventListener("scroll", handler, { passive: true });
  removeReposition = () => {
    window.removeEventListener("resize", handler);
    frameEl.removeEventListener("scroll", handler);
  };
}

function onDropdownClose() {
  isDropdownOpen.value = false;
  removeReposition?.();
  removeReposition = null;
}

onMounted(() => {
  fetchOptions();
  document.addEventListener("pointerdown", handleOutsidePointer);
});

onBeforeUnmount(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  document.removeEventListener("pointerdown", handleOutsidePointer);
  removeReposition?.();
});

defineExpose({
  closeDropdown,
});
</script>

<style scoped>
/*
  SelectPhraseBundleV2 sits next to the lg "Save" button in SaveWordSectionV2.
  The pilotui Select renders its visible trigger button at the bottom of a
  4-level wrapper chain, two links of which are display:block — so without help
  the trigger lands a few px shorter than Save and the selector field looks
  smaller (ClickUp 86exw6kme follow-up). Lay the root out as a flex row and
  stretch every link of the chain so the trigger fills the full row height and
  lines up with Save, in both the plain and freemium (InputGroup) save layouts.
  The suggested-bundle chip is position:absolute, so flex layout doesn't move it.

  The chain selectors lean on pilotui's internal markup (Select root → .relative
  → .relative.w-full → button); if a pilotui upgrade changes that nesting this is
  a cosmetic few-px regression, not a functional break.
*/
.relative.w-full {
  display: flex;
}

/* Select root (already a column flex box) + the two block wrappers below it:
   grow to the row height and pass that height down as column flex boxes. */
.relative.w-full > :deep(.flex.flex-col),
.relative.w-full :deep(.flex.flex-col > .relative),
.relative.w-full :deep(.flex.flex-col > .relative > .relative) {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
}

/* The visible trigger button fills the stretched chain. */
.relative.w-full :deep(.flex.flex-col > .relative > .relative > button) {
  flex: 1 1 auto;
}

/*
  Keep the open dropdown panel inside its own max-height instead of spilling the
  bundle list out of the modal (ClickUp 86exzbh61). pilotui only gives the
  option list an internal scroll in `confirm` mode; in the `custom` mode we use
  here the list container is a plain `flex-1` with no overflow, so a long list
  grows past the panel's max-height and out of the modal. Make the panel a flex
  column and let the list region scroll within it.

  Targets pilotui's internal markup (the absolutely-positioned listbox panel and
  its `flex-1` body); a pilotui nesting change would make this a cosmetic
  regression, not a functional break.
*/
.relative.w-full :deep([role="listbox"]) {
  display: flex;
  flex-direction: column;
}

.relative.w-full :deep([role="listbox"] > .flex-1) {
  min-height: 0;
  overflow-y: auto;
}
</style>
