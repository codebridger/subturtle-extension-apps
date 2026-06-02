<template>
  <ConsolePageScaffold>
    <FlashcardPreviewPage />
  </ConsolePageScaffold>
</template>

<script setup lang="ts">
// Popup route wrapper around the shared flashcard-preview console module. The
// module reads its data from this popup route's `:data` param — router-agnostic.
import ConsolePageScaffold from "../components/ConsolePageScaffold.vue";
import FlashcardPreviewPage from "../../console-crane/modules/flashcard-preview/index.vue";
</script>
