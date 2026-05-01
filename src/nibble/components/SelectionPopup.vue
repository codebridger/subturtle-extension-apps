<template>
  <div class="nibble-popup" :class="`nibble-mode-${mode}`" :style="positionStyle" @mousedown.prevent.stop @click.stop>
    <!-- Icon mode: just the Subturtle logo -->
    <button v-if="mode === 'icon'" class="nibble-icon-btn" type="button" @click="onIconClick"
      aria-label="Translate selection">
      <img :src="logoUrl" alt="Subturtle" />
    </button>

    <!-- Loading mode: same shape/position as icon, swap the logo for a spinner -->
    <div v-else-if="mode === 'loading'" class="nibble-icon-btn nibble-icon-btn--loading">
      <span class="nibble-spinner" />
    </div>

    <!-- Translated mode: full card centered on the icon's anchor -->
    <div v-else-if="mode === 'translated'" ref="cardRef" class="nibble-card">
      <button class="nibble-card__close" type="button" aria-label="Close" @click="onCloseClick">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      <div class="nibble-card__body" dir="auto">
        <p class="nibble-translation" :title="translation">{{ translation }}</p>
      </div>

      <div class="nibble-card__footer">
        <button type="button" class="nibble-save-btn" @click="onSaveClick" aria-label="View details and save"
          title="Open details · Save phrase">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="nibble-save-btn__icon"
            aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span>Save &amp; view</span>
        </button>
      </div>
    </div>

    <!-- Error mode: same card shape with error message -->
    <div v-else-if="mode === 'error'" ref="cardRef" class="nibble-card">
      <button class="nibble-card__close" type="button" aria-label="Close" @click="onCloseClick">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      <div class="nibble-card__body">
        <p class="nibble-error-text">Translation failed.</p>
      </div>

      <div class="nibble-card__footer">
        <button type="button" class="nibble-save-btn" @click="onIconClick">
          Retry
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch } from "vue";
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
const cardRef = ref<HTMLElement | null>(null);

// Anchor where the user clicked the icon. Loading reuses this for the
// 36px spinner; the card centers on iconCenter and `cardLeft`/`cardTop`
// are recomputed from the rendered card size.
const iconCenter = ref<{ x: number; y: number } | null>(null);
const cardLeft = ref<number | null>(null);
const cardTop = ref<number | null>(null);

const consoleCrane = useConsoleCraneStore();

const logoUrl = computed(() =>
  typeof chrome !== "undefined" && chrome.runtime?.getURL
    ? chrome.runtime.getURL("/assets/logo-128.png")
    : "/assets/logo-128.png"
);

const ICON_SIZE = 36;
const CARD_MAX_W = 420;
const MARGIN = 8;

const positionStyle = computed(() => {
  // Loading reuses the icon's exact slot — same 36px circle, same place.
  if (mode.value === "icon" || mode.value === "loading") {
    if (iconCenter.value) {
      const x = iconCenter.value.x - ICON_SIZE / 2;
      const y = iconCenter.value.y - ICON_SIZE / 2;
      return { top: `${y}px`, left: `${x}px` };
    }

    const r = props.rect;
    if (!r) return { display: "none" };

    let top = r.top - ICON_SIZE - MARGIN;
    if (top < MARGIN) top = r.bottom + MARGIN;

    let left = r.left + r.width / 2 - ICON_SIZE / 2;
    left = Math.max(
      MARGIN,
      Math.min(left, window.innerWidth - ICON_SIZE - MARGIN)
    );

    return { top: `${top}px`, left: `${left}px` };
  }

  // Card modes (translated / error) — placed via measured size.
  if (cardLeft.value != null && cardTop.value != null) {
    return { top: `${cardTop.value}px`, left: `${cardLeft.value}px` };
  }

  // Pre-measure: render off-screen so it doesn't flash at (0,0).
  return { top: "-9999px", left: "-9999px", visibility: "hidden" as const };
});

async function repositionCard() {
  if (mode.value !== "translated" && mode.value !== "error") return;
  if (!iconCenter.value) return;

  await nextTick();
  const el = cardRef.value;
  if (!el) return;

  const w = el.offsetWidth;
  const h = el.offsetHeight;

  let left = iconCenter.value.x - w / 2;
  left = Math.max(MARGIN, Math.min(left, window.innerWidth - w - MARGIN));

  // Anchor the card's bottom edge to the icon's bottom edge so the card
  // grows upward from where the icon was (toward the top of the viewport).
  // Clamp downward only if it would run off the top of the screen.
  let top = iconCenter.value.y + ICON_SIZE / 2 - h;
  if (top < MARGIN) top = MARGIN;
  if (top + h > window.innerHeight - MARGIN) {
    top = Math.max(MARGIN, window.innerHeight - h - MARGIN);
  }

  cardLeft.value = left;
  cardTop.value = top;
}

watch(
  () => props.text,
  (newText, oldText) => {
    if (newText !== oldText) {
      mode.value = "icon";
      translation.value = "";
      iconCenter.value = null;
      cardLeft.value = null;
      cardTop.value = null;
    }
  }
);

watch(mode, (m) => {
  if (m === "icon" || m === "loading") {
    cardLeft.value = null;
    cardTop.value = null;
    return;
  }
  repositionCard();
});

watch([translation, () => mode.value], () => {
  if (mode.value === "translated" || mode.value === "error") repositionCard();
});

async function onIconClick(e: MouseEvent) {
  // Freeze the click point so loading and the card both anchor to it,
  // independent of the underlying selection rect.
  const target = e.currentTarget as HTMLElement | null;
  const r = target?.getBoundingClientRect();
  if (r) {
    iconCenter.value = {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
    };
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

function onCloseClick() {
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
  line-height: 1.4;
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

/* ---- Icon / loading state ------------------------------------------- */

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

.nibble-icon-btn--loading {
  cursor: default;
}

.nibble-icon-btn--loading:hover {
  transform: none;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}

.nibble-icon-btn img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  display: block;
}

.nibble-spinner {
  width: 16px;
  height: 16px;
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

/* ---- Card (translated / error) -------------------------------------- */

.nibble-card {
  position: relative;
  background: #fff;
  color: #1f2937;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  min-width: 220px;
  min-height: 96px;
  width: max-content;
  max-width: min(420px, calc(100vw - 16px));
}

.nibble-card__close {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: #6b7280;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms ease, color 120ms ease;
}

.nibble-card__close:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #111827;
}

.nibble-card__close svg {
  width: 14px;
  height: 14px;
}

.nibble-card__body {
  padding: 16px 36px 12px 16px;
  flex: 1 1 auto;
  min-height: 0;
}

.nibble-card__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(0, 0, 0, 0.015);
  border-bottom-left-radius: 14px;
  border-bottom-right-radius: 14px;
}

.nibble-translation {
  margin: 0;
  color: #111827;
  font-size: 14px;
  font-weight: 500;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.45;
}

.nibble-error-text {
  margin: 0;
  color: #b91c1c;
  font-size: 14px;
}

/* ---- Save button ---------------------------------------------------- */

.nibble-save-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: none;
  border: none;
  border-radius: 9999px;
  padding: 5px 12px 5px 10px;
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
