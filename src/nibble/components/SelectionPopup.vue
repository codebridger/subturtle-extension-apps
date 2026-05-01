<template>
  <div
    class="nibble-popup"
    :class="`nibble-mode-${mode}`"
    :style="positionStyle"
    @mousedown.prevent.stop
    @click.stop
  >
    <!-- Icon mode: just the Subturtle logo -->
    <button
      v-if="mode === 'icon'"
      class="nibble-icon-btn"
      type="button"
      @click="onIconClick"
      aria-label="Translate selection"
    >
      <img :src="logoUrl" alt="Subturtle" />
    </button>

    <!-- Loading mode: spinner -->
    <div v-else-if="mode === 'loading'" class="nibble-loading">
      <span class="nibble-spinner" />
      <span class="nibble-loading-label">Translating…</span>
    </div>

    <!-- Translated mode: translation + save -->
    <div v-else-if="mode === 'translated'" class="nibble-translated">
      <span class="nibble-translation" :title="translation">{{
        translation
      }}</span>
      <button
        type="button"
        class="nibble-save-btn"
        @click="onSaveClick"
        aria-label="View details and save"
        title="Open details · Save phrase"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="nibble-save-btn__icon"
          aria-hidden="true"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        <span>Save &amp; view</span>
      </button>
    </div>

    <!-- Error mode: a soft retry -->
    <div v-else-if="mode === 'error'" class="nibble-error">
      <span>Translation failed.</span>
      <button type="button" class="nibble-save-btn" @click="onIconClick">
        Retry
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { TranslateService } from "../../common/services/translate.service";
import { useConsoleCraneStore } from "../../console-crane/stores/console-crane";

const props = defineProps<{
  text: string;
  rect: DOMRect | null;
  context: string;
}>();

const emit = defineEmits<{
  (e: "dismiss"): void;
}>();

type Mode = "icon" | "loading" | "translated" | "error";

const mode = ref<Mode>("icon");
const translation = ref<string>("");
const frozenLeft = ref<number | null>(null);
const frozenTop = ref<number | null>(null);

const consoleCrane = useConsoleCraneStore();

const logoUrl = computed(() =>
  typeof chrome !== "undefined" && chrome.runtime?.getURL
    ? chrome.runtime.getURL("/assets/logo-128.png")
    : "/assets/logo-128.png"
);

const POPUP_W_ICON = 36;
const POPUP_H_ICON = 36;
const POPUP_MAX_W_TEXT = 520;
const MARGIN = 8;

const positionStyle = computed(() => {
  const isExpanded = mode.value !== "icon";

  // Expanded modes anchor to where the icon was clicked, so the pill
  // grows out from that point instead of re-centering on the selection
  // (which shifted the click point off-screen for long phrases).
  if (isExpanded && frozenLeft.value != null && frozenTop.value != null) {
    const maxAvailableRight = window.innerWidth - MARGIN;
    const maxLeft = maxAvailableRight - POPUP_MAX_W_TEXT;
    const left = Math.max(MARGIN, Math.min(frozenLeft.value, maxLeft));

    return {
      top: `${frozenTop.value}px`,
      left: `${left}px`,
      maxWidth: `${Math.min(
        POPUP_MAX_W_TEXT,
        window.innerWidth - left - MARGIN
      )}px`,
    };
  }

  const r = props.rect;
  if (!r) return { display: "none" };

  const w = POPUP_W_ICON;
  const h = POPUP_H_ICON;

  let top = r.top - h - MARGIN;
  if (top < MARGIN) top = r.bottom + MARGIN;

  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(MARGIN, Math.min(left, window.innerWidth - w - MARGIN));

  return {
    top: `${top}px`,
    left: `${left}px`,
  };
});

watch(
  () => props.text,
  (newText, oldText) => {
    if (newText !== oldText) {
      mode.value = "icon";
      translation.value = "";
      frozenLeft.value = null;
      frozenTop.value = null;
    }
  }
);

async function onIconClick(e: MouseEvent) {
  // Freeze the pill's anchor at the icon's current screen position so
  // expanding to loading/translated keeps the click point in place.
  const target = e.currentTarget as HTMLElement | null;
  const r = target?.getBoundingClientRect();
  if (r) {
    frozenLeft.value = r.left - 6;
    frozenTop.value = r.top;
  }

  mode.value = "loading";
  try {
    const result = await TranslateService.instance.fetchSimpleTranslation(
      props.text,
      props.context
    );
    translation.value = String(result ?? "").trim();
    mode.value = translation.value ? "translated" : "error";
  } catch {
    mode.value = "error";
  }
}

function onSaveClick() {
  consoleCrane.toggleConsoleCrane(
    "word-detail",
    {
      word: props.text,
      context: props.context,
    },
    true
  );
  window.getSelection()?.removeAllRanges();
  emit("dismiss");
}
</script>

<style scoped>
.nibble-popup {
  position: fixed;
  z-index: 2147483647;
  pointer-events: auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.2;
  user-select: none;
  animation: nibble-fade-in 120ms ease-out;
}

@keyframes nibble-fade-in {
  from {
    opacity: 0;
    transform: translateY(2px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.nibble-icon-btn {
  width: 36px;
  height: 36px;
  padding: 4px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.nibble-icon-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
}

.nibble-icon-btn img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  display: block;
}

.nibble-loading,
.nibble-translated,
.nibble-error {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 8px 14px;
  background: #fff;
  color: #1f2937;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 18px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  width: max-content;
  max-width: 100%;
}

.nibble-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(0, 0, 0, 0.12);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: nibble-spin 0.8s linear infinite;
  flex: none;
}

@keyframes nibble-spin {
  to {
    transform: rotate(360deg);
  }
}

.nibble-loading-label {
  color: #6b7280;
  font-size: 13px;
  white-space: nowrap;
}

.nibble-translation {
  color: #111827;
  font-weight: 500;
  flex: 1 1 auto;
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.35;
}

.nibble-save-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  border: none;
  border-radius: 9999px;
  padding: 4px 10px 4px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(90deg, #6366f1 0%, #a855f7 100%);
  cursor: pointer;
  transition: filter 120ms ease;
}

.nibble-save-btn:hover {
  filter: brightness(1.05);
}

.nibble-save-btn__icon {
  width: 12px;
  height: 12px;
  flex: none;
}
</style>
