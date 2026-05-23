<template>
  <!-- Main word detail component - displays dictionary information and translation for a selected word -->
  <div class="flex flex-col items-center overflow-y-auto min-h-full dark:bg-gray-950" :key="key">
    <div class="select-text flex flex-col px-6 sm:px-8 py-6 gap-4 text-gray-900 dark:text-gray-100 w-full" :style="{
      maxWidth: '720px',
    }">
      <!-- TRANSLATION CARD - Source phrase and translation in one cohesive block -->
      <section
        class="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-gray-900 overflow-hidden"
        @click.stop>
        <!-- Source phrase -->
        <div class="px-6 pt-6 pb-4" :dir="wordData?.direction?.source">
          <div class="flex items-center justify-between gap-2 mb-2">
            <p class="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-400">
              Selected
            </p>
            <!-- Opens an AI chat to ask questions or fix the highlights -->
            <button
              v-if="wordData?.translation?.phrase"
              type="button"
              title="Chat with AI to understand this phrase or change the highlighted patterns"
              class="inline-flex items-center gap-1 text-[11px] font-medium text-purple-600 dark:text-purple-300 hover:underline shrink-0"
              @click.stop="showAdviceChat = !showAdviceChat"
            >
              <i class="i-mdi-message-text-outline text-xs" />
              <span>Ask AI · explain or fix</span>
            </button>
          </div>
          <!-- Selection with reusable chunks highlighted inline -->
          <h1 :class="['font-semibold leading-tight dark:text-gray-100', titleSizeClass]">
            <template v-for="(seg, i) in selectionSegments" :key="i">
              <mark
                v-if="seg.isChunk"
                class="bg-yellow-200/70 dark:bg-yellow-400/25 rounded px-0.5 text-inherit"
                >{{ seg.text }}</mark
              >
              <template v-else>{{ seg.text }}</template>
            </template>
          </h1>
          <p
            v-if="showContext"
            class="text-xs mt-3 italic text-gray-500 dark:text-gray-400 line-clamp-2"
          >
            {{ context }}
          </p>

          <!-- In-modal advice chat for correcting chunks -->
          <div
            v-if="showAdviceChat"
            class="mt-4 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] p-3"
            dir="ltr"
            @click.stop
          >
            <div v-if="adviceThread.length" class="flex flex-col gap-2 mb-2 max-h-40 overflow-y-auto">
              <template v-for="(msg, i) in adviceThread" :key="i">
                <!-- Editing a previous user message -->
                <form
                  v-if="editingIndex === i"
                  class="self-end w-full flex items-center gap-1"
                  @submit.prevent="submitEditMessage"
                >
                  <input
                    v-model="editingText"
                    dir="auto"
                    autofocus
                    class="flex-1 min-w-0 text-sm rounded-md border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    @keyup.esc="cancelEditMessage"
                  />
                  <button type="submit" class="shrink-0 p-1.5 rounded-md text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/40" title="Save">
                    <i class="i-mdi-check text-base" />
                  </button>
                  <button type="button" class="shrink-0 p-1.5 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" title="Cancel" @click="cancelEditMessage">
                    <i class="i-mdi-close text-base" />
                  </button>
                </form>
                <!-- Normal bubble -->
                <div
                  v-else
                  dir="auto"
                  :class="[
                    'group text-sm rounded-md px-2.5 py-1.5 max-w-[90%] flex items-start gap-1.5',
                    msg.role === 'user'
                      ? 'self-end bg-purple-100 dark:bg-purple-900/40 text-gray-900 dark:text-gray-100'
                      : 'self-start bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200',
                  ]"
                >
                  <span class="min-w-0">{{ msg.text }}</span>
                  <button
                    v-if="msg.role === 'user' && !adviceLoading"
                    type="button"
                    title="Edit this message"
                    class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-purple-500 hover:text-purple-700"
                    @click="startEditMessage(i)"
                  >
                    <i class="i-mdi-pencil text-xs" />
                  </button>
                </div>
              </template>
            </div>
            <p v-else class="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Ask anything about this phrase — meaning, grammar, usage. You can also say e.g. "highlight 'had to'".
            </p>
            <form class="flex items-center gap-2" @submit.prevent="sendAdviceMessage">
              <input
                v-model="adviceInput"
                type="text"
                dir="auto"
                :disabled="adviceLoading"
                placeholder="Type a message…"
                class="flex-1 min-w-0 text-sm rounded-md border border-gray-300 dark:border-white/[0.12] bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
              <button
                type="submit"
                :disabled="adviceLoading || !adviceInput.trim()"
                class="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-purple-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-purple-700 transition-colors"
              >
                <i v-if="adviceLoading" class="i-mdi-loading animate-spin" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>

        <!-- Divider line -->
        <div class="border-t border-gray-100 dark:border-white/[0.08]"></div>

        <!-- Translation -->
        <div class="px-6 pt-4 pb-6 bg-gray-50 dark:bg-white/[0.02]" :dir="wordData?.direction?.target">
          <p class="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-400 mb-2">
            {{ targetLanguageTitle }}
          </p>
          <h2 v-if="wordData?.translation?.phrase" :class="['font-semibold leading-tight dark:text-gray-100', titleSizeClass]">
            {{ cleanText(wordData?.translation?.phrase || "") }}
          </h2>
          <div v-else-if="pending" class="space-y-2">
            <div class="h-7 w-3/4 rounded bg-gray-200 dark:bg-white/[0.08] animate-pulse"></div>
            <div class="h-7 w-1/2 rounded bg-gray-200 dark:bg-white/[0.08] animate-pulse"></div>
          </div>
          <p v-else-if="error" class="text-sm text-gray-500 dark:text-gray-400 italic">
            Translation unavailable
          </p>
        </div>
      </section>

      <!-- Phrase actions, kept right under the translation so they're easy to spot -->
      <div v-if="isLogin && wordData?.translation?.phrase" class="flex items-center gap-2 flex-wrap">
        <Button label="Practice with AI" size="sm" text @click="startPracticeWithAI">
          <template #icon>
            <i class="mr-2 i-solar-microphone-3-bold" />
          </template>
        </Button>
        <Button label="Preview flashcard" size="sm" text @click="openFlashcardPreview" />
      </div>

      <!-- Error state with retry -->
      <div
        v-if="error && !pending"
        class="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 flex items-start gap-3"
      >
        <i class="i-mdi-alert-circle-outline text-xl text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-red-800 dark:text-red-200">
            Couldn't load translation
          </p>
          <p class="text-xs text-red-700/80 dark:text-red-300/80 mt-0.5 break-words">
            {{ error }}
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-sm font-medium text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/60 transition-colors"
          @click="retryFetch"
        >
          <i class="i-mdi-refresh" />
          Retry
        </button>
      </div>

      <!-- LINGUISTIC DATA SECTION - Shows detailed linguistic information -->
      <template v-if="wordData && wordData.linguistic_data">
        <section class="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-gray-900 px-6 py-5">
          <p class="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-400 mb-3">
            Definition
          </p>

          <div
            v-for="(entry, index) in definitionEntries"
            :key="index"
            class="mb-4 last:mb-0"
          >
            <div v-if="entry.label || entry.transliteration" class="flex items-baseline justify-between gap-4 mb-1">
              <span v-if="entry.label" class="text-sm font-semibold text-gray-700 dark:text-gray-200" dir="ltr">
                {{ entry.label }}
              </span>
              <span v-else />
              <span v-if="entry.transliteration" class="text-sm italic text-gray-500 dark:text-gray-400" :dir="wordData?.direction?.target">
                {{ entry.transliteration }}
              </span>
            </div>
            <p v-if="entry.definition" class="text-base text-gray-900 dark:text-gray-100" :dir="wordData?.direction?.target">
              {{ entry.definition }}
            </p>
          </div>

          <!-- Type and formality level -->
          <div class="flex gap-2 mt-4">
            <IconButton v-if="wordData.linguistic_data.type" badge size="sm"
              :label="wordData.linguistic_data.type.toUpperCase()" />
            <IconButton v-if="wordData.linguistic_data.formality_level" badge size="sm"
              :label="wordData.linguistic_data.formality_level.toUpperCase()" />
          </div>
        </section>
      </template>

      <!-- Loading skeleton for linguistic data -->
      <template v-else-if="pending">
        <section class="w-full flex flex-col gap-3" aria-busy="true" aria-label="Loading linguistic data">
          <div v-for="n in 3" :key="n"
            class="rounded-md border border-gray-200 dark:border-white/[0.08] p-4 bg-white dark:bg-gray-900">
            <div class="h-3 w-24 bg-gray-200 dark:bg-white/[0.08] rounded animate-pulse mb-3"></div>
            <div class="h-4 w-full bg-gray-200 dark:bg-white/[0.08] rounded animate-pulse mb-2"></div>
            <div class="h-4 w-5/6 bg-gray-200 dark:bg-white/[0.08] rounded animate-pulse"></div>
          </div>
        </section>
      </template>

      <!-- Empty state when fetch succeeded but returned no linguistic data -->
      <template v-else-if="!error">
        <div class="my-8 text-sm text-center text-gray-500 dark:text-gray-300">
          No linguistic data available for "{{ cleanText(getProps().word!) }}".
        </div>
      </template>

      <!-- Save word functionality - shown after the definition -->
      <SaveWordSectionV2 v-if="isLogin && wordData?.translation?.phrase" :phrase="cleanText(getProps().word!)"
        :translation="cleanText(wordData?.translation?.phrase || '')" :context="wordData?.context"
        :direction="wordData?.direction" :language_info="wordData?.language_info"
        :linguistic_data="wordData?.linguistic_data" :chunks="wordData?.chunks || []" />

      <!-- Login prompt: only when there's a translation worth saving -->
      <button
        v-else-if="!isLogin && wordData?.translation?.phrase"
        type="button"
        class="self-center inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold shadow-sm hover:from-pink-600 hover:to-purple-700 transition"
        @click="handleLoginRequest"
      >
        <i class="text-lg i-solar-login-3-bold" />
        <span>Login to save this phrase</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject, onMounted } from "vue";
import { cleanText, firstUpper } from "../../../common/helper/text";
import { TranslateService } from "../../../common/services/translate.service";
import { findSavedPhrase } from "../../../common/services/phrase.service";
import { Chunk, LanguageLearningData } from "./types";

import { isLogin } from "../../../plugins/modular-rest";
import SaveWordSectionV2 from "../../components/SaveWordSectionV2.vue";
import { useConsoleCraneStore } from "../../stores/console-crane";

import { IconButton } from "pilotui/elements";
import { Button } from "pilotui";

import { useRoute } from "vue-router";
import { sendMessage } from "../../../common/helper/massage";
import { OpenLoginWindowMessage } from "../../../common/types/messaging";
import { analytic } from "../../../plugins/mixpanel";
import { decodeRouteParams } from "../../route-params";

const props = defineProps<{
  word?: string;
  context?: string;
}>();

const emit = defineEmits<{
  loading: [boolean];
}>();

const route = useRoute();

onMounted(() => {
  analytic.track("word-detail-page_viewed");
});

/**
 * Resolve word + context inputs. Prefers explicit props (used by the popup
 * bundle, which mounts this module without a route param). Falls back to
 * the base64-encoded `:data` route param used by the console-crane router.
 */
function getProps() {
  if (props.word) {
    return { word: props.word, context: props.context ?? "" };
  }

  const data = decodeRouteParams<{ word: string; context?: string }>(
    route.params.data as string
  );

  return data;
}

// Injected frame size from parent component to control responsive layout
const frameSize = inject<{ width: number; height: number }>("frameSize");

// Main state variables
const wordData = ref<LanguageLearningData | null>(null); // Stores detailed linguistic data

const pending = ref(false); // Loading state
const error = ref<string | null>(null); // Translation error message, null when ok
const key = ref(new Date().getTime()); // Key for forcing component refresh

// Mirror loading state to parent so popup callers can show a button spinner.
watch(pending, (val) => emit("loading", val));

// Gets the title of the target language (e.g., "Spanish", "French")
const targetLanguageTitle = computed(
  () => TranslateService.instance.languageTitle
);

// Formats the word with proper capitalization
const title = computed(() => {
  return firstUpper(cleanText(getProps().word) || "");
});

const context = computed(() => {
  // Prefer the stored source sentence (saved phrases) over the live selection.
  return wordData.value?.context || getProps().context || "";
});

/** Open the AI practice config page for this phrase. */
function startPracticeWithAI() {
  analytic.track("practice-now_opened");
  useConsoleCraneStore().toggleConsoleCrane(
    "practice-config",
    {
      phrase: cleanText(getProps().word || ""),
      context: context.value,
      chunks: wordData.value?.chunks || [],
    },
    true
  );
}

/** Open the flashcard cloze preview page for this phrase. */
function openFlashcardPreview() {
  analytic.track("flashcard-preview_opened");
  useConsoleCraneStore().toggleConsoleCrane(
    "flashcard-preview",
    {
      phrase: cleanText(getProps().word || ""),
      translation: cleanText(wordData.value?.translation?.phrase || ""),
      context: context.value,
      chunks: wordData.value?.chunks || [],
      direction: wordData.value?.direction,
    },
    true
  );
}

/**
 * Entries for the Definition fieldset. Each entry pairs a label (chunk text)
 * with its pronunciation and meaning. When chunks exist, one entry per chunk;
 * otherwise a single entry with the whole-phrase definition + transliteration.
 */
const definitionEntries = computed<
  { label: string; transliteration: string; definition: string }[]
>(() => {
  const chunks = wordData.value?.chunks || [];
  const chunkEntries = chunks
    .filter((c) => (c.definition && c.definition.trim()) || (c.transliteration && c.transliteration.trim()))
    .map((c) => ({
      label: c.text,
      transliteration: c.transliteration || "",
      definition: c.definition || "",
    }));
  if (chunkEntries.length) return chunkEntries;

  return [
    {
      label: "",
      transliteration:
        wordData.value?.linguistic_data?.phonetic?.transliteration || "",
      definition: wordData.value?.linguistic_data?.definition || "",
    },
  ];
});

/**
 * Split the displayed selection into segments, marking the spans that match a
 * confirmed chunk so they can be highlighted inline. Matching is
 * case-insensitive and uses the first occurrence of each chunk's text.
 */
const selectionSegments = computed<{ text: string; isChunk: boolean }[]>(() => {
  const text = title.value || "";
  const chunks = wordData.value?.chunks || [];
  if (!text || !chunks.length) return [{ text, isChunk: false }];

  // Collect non-overlapping [start, end) ranges for each chunk.
  const ranges: { start: number; end: number }[] = [];
  const lower = text.toLowerCase();
  for (const chunk of chunks) {
    const needle = (chunk.text || "").trim().toLowerCase();
    if (!needle) continue;
    let from = 0;
    while (from <= lower.length) {
      const idx = lower.indexOf(needle, from);
      if (idx === -1) break;
      const end = idx + needle.length;
      const overlaps = ranges.some((r) => idx < r.end && end > r.start);
      if (!overlaps) {
        ranges.push({ start: idx, end });
        break;
      }
      from = idx + 1;
    }
  }

  if (!ranges.length) return [{ text, isChunk: false }];
  ranges.sort((a, b) => a.start - b.start);

  const segments: { text: string; isChunk: boolean }[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) {
      segments.push({ text: text.slice(cursor, r.start), isChunk: false });
    }
    segments.push({ text: text.slice(r.start, r.end), isChunk: true });
    cursor = r.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isChunk: false });
  }
  return segments;
});

// --- AI advice chat ---
type AdviceMessage = { role: "user" | "assistant"; text: string };

const showAdviceChat = ref(false);
const adviceInput = ref("");
const adviceLoading = ref(false);
const adviceThread = ref<AdviceMessage[]>([]);

// Inline editing of a previous user message.
const editingIndex = ref<number | null>(null);
const editingText = ref("");

/**
 * Send one user message given a conversation `history` (the turns that precede
 * it). Pushes the user turn and the assistant response onto the thread.
 */
async function runAdvice(message: string, history: AdviceMessage[]) {
  if (!message || adviceLoading.value) return;

  adviceThread.value.push({ role: "user", text: message });
  adviceLoading.value = true;

  try {
    const advice = await TranslateService.instance.fetchTranslationAdvice({
      phrase: cleanText(getProps().word || ""),
      context: context.value,
      message,
      currentChunks: wordData.value?.chunks || [],
      history,
    });

    // Reply text (the primary output) is shown when present.
    if (advice.reply) {
      adviceThread.value.push({ role: "assistant", text: advice.reply });
    }
    // Chunk edits are applied silently; add a note only if there was no reply.
    if (advice.chunks && wordData.value) {
      wordData.value.chunks = advice.chunks;
      if (!advice.reply) {
        adviceThread.value.push({
          role: "assistant",
          text: advice.chunks.length
            ? "Updated the highlighted patterns."
            : "Cleared the highlighted patterns.",
        });
      }
    }
    analytic.track("translation-advice_used");
  } catch (err) {
    adviceThread.value.push({
      role: "assistant",
      text: "Sorry, something went wrong. Please try again.",
    });
    console.error("Translation advice error:", err);
  } finally {
    adviceLoading.value = false;
  }
}

function sendAdviceMessage() {
  const message = adviceInput.value.trim();
  if (!message || adviceLoading.value) return;
  // Full conversation so far is the history for this new turn.
  const history = adviceThread.value.map((m) => ({ ...m }));
  adviceInput.value = "";
  runAdvice(message, history);
}

function startEditMessage(index: number) {
  if (adviceLoading.value) return;
  editingIndex.value = index;
  editingText.value = adviceThread.value[index]?.text || "";
}

function cancelEditMessage() {
  editingIndex.value = null;
  editingText.value = "";
}

/**
 * Commit an edited user message: drop that message and everything after it,
 * then re-run the AI from the edited point with the preceding history.
 */
function submitEditMessage() {
  const index = editingIndex.value;
  if (index === null || adviceLoading.value) return;

  const message = editingText.value.trim();
  if (!message) return;

  const history = adviceThread.value.slice(0, index).map((m) => ({ ...m }));
  adviceThread.value = adviceThread.value.slice(0, index);
  editingIndex.value = null;
  editingText.value = "";

  runAdvice(message, history);
}

// Show the surrounding source sentence. Hide it only when it's empty or
// identical to the selection itself (a sentence that contains the selection is
// exactly what we want to show).
const showContext = computed(() => {
  const c = context.value.trim();
  const t = cleanText(getProps().word || "").trim();
  if (!c) return false;
  return c.toLowerCase() !== t.toLowerCase();
});

// Scale title down for long phrases so a sentence-length selection doesn't dominate the modal.
const titleSizeClass = computed(() => {
  const len = (title.value || "").length;
  if (len > 60) return "text-xl";
  if (len > 30) return "text-2xl";
  if (len > 14) return "text-3xl";
  return "text-4xl";
});

/**
 * Watch for changes to the word in URL parameters
 * Resets the component and fetches new word details
 */
watch(
  () => getProps().word,
  (value) => {
    key.value = new Date().getTime();
    wordData.value = null;
    error.value = null;

    if (!value) return;

    fetchWordDetail();
  },
  { immediate: true, deep: true }
);

/**
 * Fetches detailed linguistic data for the word
 * Uses context if available
 */
async function fetchWordDetail() {
  pending.value = true;
  error.value = null;
  wordData.value = null;

  const props = getProps();
  const cleaned = cleanText(props.word as string);
  const context = props.context || "";

  try {
    // If the phrase is already saved, build the view from the stored document
    // (translation + linguistic data + chunks) instead of spending an AI call.
    const saved = (await findSavedPhrase(cleaned)) as any;
    if (saved && saved.linguistic_data) {
      wordData.value = {
        phrase: saved.phrase,
        context: saved.context || context,
        direction: saved.direction,
        translation: { phrase: saved.translation, context: "" },
        language_info: saved.language_info,
        linguistic_data: saved.linguistic_data,
        chunks: saved.chunks || [],
      } as LanguageLearningData;
      return;
    }

    wordData.value = await TranslateService.instance.fetchDetailedTranslation(
      cleaned,
      context
    );
  } catch (err: any) {
    console.error("Failed to fetch translation:", err);
    const message =
      err?.message ||
      err?.body?.message ||
      "We couldn't fetch the translation. Please try again.";
    error.value = message;
    analytic.track("word-detail-page_translation-error", { message });
  } finally {
    pending.value = false;
  }
}

function retryFetch() {
  analytic.track("word-detail-page_retry-clicked");
  fetchWordDetail();
}

/**
 * Handles login request when user clicks login button
 * Opens login window via messaging system
 */
function handleLoginRequest() {
  sendMessage(new OpenLoginWindowMessage());
}
</script>

<style lang="scss" scoped>
.white-shadow {
  color: white;
  text-shadow: 2px 3px 0px #898999;
}
</style>
