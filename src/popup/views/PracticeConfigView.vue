<template>
  <ConsolePageScaffold>
    <PracticeConfigPage />
  </ConsolePageScaffold>
</template>

<script setup lang="ts">
// Popup route wrapper around the shared practice-config console module. The
// module reads { phrase, ... } from this popup route's `:data` param (encoded by
// App.vue's openConsolePage navigator) — it's router-agnostic.
import ConsolePageScaffold from "../components/ConsolePageScaffold.vue";
import PracticeConfigPage from "../../console-crane/modules/practice-config/index.vue";
</script>
