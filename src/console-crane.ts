import "./trusted-types-polyfill";

import "./animation.scss";
import "./tailwind.css";

import { createApp, watch } from "vue";

import ConsoleCrane from "./console-crane/index.vue";
import { initConsoleCraneApp } from "./console-crane/initializer";
import { useConsoleCraneStore } from "./console-crane/stores/console-crane";
import { addPlugins } from "./plugins/install";
import { isLogin, loginWithLastSession } from "./plugins/modular-rest";
import { syncPendingSaves } from "./common/services/pending-saves-sync";
import { useSettingsStore } from "./common/store/settings";
import {
  emitState,
  onOpen,
  onRequestState,
} from "./common/services/console-crane-bridge";
import { log } from "./common/helper/log";
import { VERSION } from "./common/static/global";

log("ConsoleCrane using version", VERSION);

(async () => {
  const app = createApp(ConsoleCrane as any);
  const vueApp = addPlugins(app);

  const settings = useSettingsStore();
  await settings.initialize();

  loginWithLastSession();

  // Phrases saved before sign-in go to the account once a user is signed in
  // here: right after a login, or on the next page load if an earlier run was
  // cut off (save-first E-04). One console-crane runs per page; the sync's
  // lock keeps tabs from sending the same list together.
  watch(
    isLogin,
    (signedIn) => {
      if (signedIn) void syncPendingSaves();
    },
    { immediate: true }
  );

  await initConsoleCraneApp(vueApp);

  const store = useConsoleCraneStore();

  onOpen(({ page, params, active }) => {
    store.toggleConsoleCrane(page, params, active);
  });

  onRequestState(() => {
    emitState({ isActive: store.isActive });
  });

  watch(
    () => store.isActive,
    (isActive) => {
      emitState({ isActive });
    }
  );
})();
