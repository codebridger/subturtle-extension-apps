<template>
  <div v-if="count > 0 && (!isLogin || limitReached)"
    class="flex items-center gap-3 p-3 rounded-xl border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-900/20"
    data-testid="pending-saves-banner">
    <i class="text-xl text-purple-500 i-ep-collection shrink-0" />
    <p class="flex-1 text-sm text-gray-700 dark:text-gray-200">
      <template v-if="!isLogin">
        {{ count }} {{ count === 1 ? "phrase" : "phrases" }} waiting. Sign in to keep them.
      </template>
      <template v-else>
        {{ count }} {{ count === 1 ? "phrase is" : "phrases are" }} still waiting:
        your plan's save limit is reached.
      </template>
    </p>
    <button v-if="!isLogin" type="button"
      class="shrink-0 px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold hover:from-pink-600 hover:to-purple-700 transition"
      data-testid="pending-saves-signin" @click="signIn">
      Sign in
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * Toolbar popup line for phrases saved before sign-in (save-first E-05).
 *
 * Logged out: "N phrases waiting. Sign in to keep them" with a Sign in button.
 * Signed in: the popup opening is also a "start", so it carries on a sync that
 * was cut off (save-first E-04); if the plan's save limit stopped it, the line
 * says so.
 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { isLogin } from "../../plugins/modular-rest";
import {
  countPendingSaves,
  onPendingSavesChange,
} from "../../common/services/pending-saves";
import { syncPendingSaves } from "../../common/services/pending-saves-sync";
import { OpenLoginWindowMessage } from "../../common/types/messaging";
import { analytic } from "../../plugins/mixpanel";

const count = ref(0);
const limitReached = ref(false);

async function refresh() {
  count.value = await countPendingSaves();
}

async function sync() {
  if (!isLogin.value) return;
  const result = await syncPendingSaves();
  if (!result.skipped) limitReached.value = result.limitReached;
}

const stopListening = onPendingSavesChange((n) => (count.value = n));
onBeforeUnmount(stopListening);

onMounted(async () => {
  await refresh();
  if (count.value) await sync();
});

watch(isLogin, (signedIn) => {
  if (signedIn && count.value) void sync();
});

function signIn() {
  analytic.track("pending-saves-banner_clicked", { count: count.value });
  chrome.runtime.sendMessage(new OpenLoginWindowMessage("popup"));
}
</script>
