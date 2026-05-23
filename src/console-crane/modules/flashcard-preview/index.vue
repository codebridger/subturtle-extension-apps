<template>
  <!--
    Flashcard preview page.
    An isolated frame (reached from the save modal's "Preview flashcard" button)
    that previews EVERY card this phrase generates across Leitner levels:
      - Recognition card (Levels 1-2, shipped): phrase -> translation. Always present.
      - Fill-in-the-blank / cloze card (Levels 3-5, proposed in PRFAQ-001 Phase 1):
        the source sentence with a confirmed chunk blanked. One per confirmed
        chunk found in the sentence; may be zero.
  -->
  <div class="flex flex-col min-h-full px-6 py-8 dark:bg-gray-950">
    <div class="mb-5">
      <div class="flex items-center gap-2">
        <i class="i-mdi-cards-outline text-xl text-purple-500" />
        <h1 class="text-base font-semibold text-gray-900 dark:text-gray-100">Flashcard preview</h1>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        The cards this phrase generates across Leitner levels.
      </p>
    </div>

    <div v-if="cards.length" class="flex flex-col gap-4">
      <div v-for="(card, i) in cards" :key="i"
        class="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] p-5 shadow-sm">
        <!-- Card type + the Leitner levels it's used at -->
        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="text-xs font-semibold text-gray-700 dark:text-gray-200">{{ card.title }}</span>
          <span
            class="text-[10px] uppercase tracking-wide font-semibold text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 rounded-full px-2 py-0.5 shrink-0">
            {{ card.levels }}
          </span>
        </div>

        <!-- Front -->
        <p class="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-1.5">
          {{ card.kind === "cloze" ? "Fill in the blank" : "Front" }}
        </p>
        <p class="text-base leading-relaxed text-gray-900 dark:text-gray-100" :dir="data.direction?.source">
          {{ card.front }}
        </p>

        <!-- Back -->
        <div class="mt-4 pt-3 border-t border-dashed border-gray-200 dark:border-white/[0.08]">
          <p class="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-1.5">Back</p>
          <p v-if="card.answer" class="text-sm font-medium text-gray-900 dark:text-gray-100" :dir="data.direction?.source">
            {{ card.answer }}
          </p>
          <p v-if="data.translation" class="text-sm text-purple-600 dark:text-purple-300 mt-0.5"
            :dir="data.direction?.target">{{ data.translation }}</p>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center flex-1 text-center text-gray-500 dark:text-gray-400">
      <i class="i-mdi-cards-outline text-3xl mb-3 opacity-60" />
      <p class="text-sm max-w-xs">No preview available for this selection yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { decodeRouteParams } from "../../route-params";
import type { Chunk } from "../word-detail/types";

interface PreviewData {
  phrase?: string;
  translation?: string;
  context?: string;
  chunks?: Chunk[];
  direction?: { source: "ltr" | "rtl"; target: "ltr" | "rtl" };
}

interface PreviewCard {
  kind: "recognition" | "cloze";
  title: string;
  /** Leitner levels this card type is reviewed at. */
  levels: string;
  /** Card front (prompt). */
  front: string;
  /** Revealed unit on the back (the blanked chunk, for cloze cards). */
  answer?: string;
}

const route = useRoute();

const data = computed<PreviewData>(
  () => decodeRouteParams<PreviewData>(route.params.data as string) || {}
);

const cards = computed<PreviewCard[]>(() => {
  const list: PreviewCard[] = [];
  const phrase = data.value.phrase?.trim() || "";
  const sentence = (data.value.context || "").trim();

  // Recognition card — always available (Levels 1-2, shipped today).
  if (phrase) {
    list.push({
      kind: "recognition",
      title: "Recognition",
      levels: "Levels 1–2",
      front: phrase,
    });
  }

  // Fill-in-the-blank cards — one per confirmed chunk found in the source
  // sentence (Levels 3-5, proposed in PRFAQ-001 Phase 1). The first occurrence
  // of each chunk is blanked.
  for (const chunk of data.value.chunks || []) {
    const unit = (chunk.text || "").trim();
    if (!unit || !sentence) continue;
    const idx = sentence.toLowerCase().indexOf(unit.toLowerCase());
    if (idx === -1) continue;
    list.push({
      kind: "cloze",
      title: "Fill in the blank",
      levels: "Levels 3–5",
      front: sentence.slice(0, idx) + "_____" + sentence.slice(idx + unit.length),
      answer: unit,
    });
  }

  return list;
});
</script>
