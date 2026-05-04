import { ref, onMounted, onBeforeUnmount } from "vue";

const MIN_TEXT_LENGTH = 1;
const MAX_TEXT_LENGTH = 200;
const DEBOUNCE_MS = 50;

const BLOCK_TAGS = new Set([
  "P",
  "LI",
  "BLOCKQUOTE",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "ARTICLE",
  "SECTION",
  "TD",
  "DD",
  "DT",
  "FIGCAPTION",
  "DIV",
]);

const IGNORED_TAGS = new Set([
  "INPUT",
  "TEXTAREA",
  "CODE",
  "PRE",
  "SCRIPT",
  "STYLE",
]);

const NIBBLE_ROOT_ID = "subturtle-nibble-root";

function isInsideIgnored(node: Node | null): boolean {
  let el: Element | null =
    node?.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node?.parentElement ?? null;

  while (el) {
    if (el.id === NIBBLE_ROOT_ID) return true;
    if (IGNORED_TAGS.has(el.tagName)) return true;
    if (el.getAttribute && el.getAttribute("contenteditable") === "true")
      return true;
    el = el.parentElement;
  }
  return false;
}

function closestBlockText(node: Node | null): string {
  let el: Element | null =
    node?.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node?.parentElement ?? null;

  while (el) {
    if (BLOCK_TAGS.has(el.tagName)) {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (text.length > 0) return text;
    }
    el = el.parentElement;
  }
  return "";
}

export function useTextSelection() {
  const text = ref<string>("");
  const rect = ref<DOMRect | null>(null);
  const contextText = ref<string>("");
  const isVisible = ref<boolean>(false);

  let debounceTimer: number | null = null;
  let lastFingerprint = "";

  function clear() {
    text.value = "";
    rect.value = null;
    contextText.value = "";
    isVisible.value = false;
    lastFingerprint = "";
  }

  function evaluateSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      isVisible.value = false;
      return;
    }

    const selected = selection.toString().trim();
    if (
      selected.length < MIN_TEXT_LENGTH ||
      selected.length > MAX_TEXT_LENGTH
    ) {
      isVisible.value = false;
      return;
    }

    if (isInsideIgnored(selection.anchorNode)) {
      isVisible.value = false;
      return;
    }

    const range = selection.getRangeAt(0);
    const boundingRect = range.getBoundingClientRect();
    if (boundingRect.width === 0 && boundingRect.height === 0) {
      isVisible.value = false;
      return;
    }

    const fingerprint = `${selected}|${Math.round(boundingRect.top)}|${Math.round(
      boundingRect.left
    )}`;
    if (fingerprint === lastFingerprint && isVisible.value) return;
    lastFingerprint = fingerprint;

    text.value = selected;
    rect.value = boundingRect;
    contextText.value = closestBlockText(selection.anchorNode) || selected;
    isVisible.value = true;
  }

  function scheduleEvaluate() {
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
      debounceTimer = null;
      evaluateSelection();
    }, DEBOUNCE_MS);
  }

  function onSelectionChange() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      isVisible.value = false;
      lastFingerprint = "";
      return;
    }
    scheduleEvaluate();
  }

  function onMouseUp() {
    scheduleEvaluate();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") clear();
  }

  function onDocClick(e: MouseEvent) {
    const target = e.target;
    const el =
      target instanceof Element
        ? target
        : target instanceof Node
        ? target.parentElement
        : null;
    if (!el) return;
    if (el.closest(`#${NIBBLE_ROOT_ID}`)) return;
    if (window.getSelection()?.isCollapsed !== false) return;
  }

  onMounted(() => {
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onDocClick);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("selectionchange", onSelectionChange);
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("mousedown", onDocClick);
    if (debounceTimer !== null) window.clearTimeout(debounceTimer);
  });

  return {
    text,
    rect,
    contextText,
    isVisible,
    clear,
  };
}
