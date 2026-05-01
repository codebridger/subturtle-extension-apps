import "./trusted-types-polyfill";

import "./animation.scss";
import "./tailwind.css";

import { createApp } from "vue";

import generalComponents from "./common/components/components";
import ConsoleCrane from "./console-crane/index.vue";

import IndexVue from "./nibble/Index.vue";
import { initNibbleApp } from "./nibble/initializer";
import { addPlugins } from "./plugins/install";
import { loginWithLastSession } from "./plugins/modular-rest";
import { useSettingsStore } from "./common/store/settings";
import { cleanText } from "./common/helper/text";
import { log } from "./common/helper/log";
import { VERSION } from "./common/static/global";

log("Nibble using version", VERSION);

(async () => {
  const app = createApp(IndexVue as any);
  const vueApp = addPlugins(app);

  const settings = useSettingsStore();
  await settings.initialize();

  if (settings.isNibbleDisabledForHost(location.hostname)) {
    log("Nibble disabled for host:", location.hostname);
    return;
  }

  loginWithLastSession();

  const components = {
    ...generalComponents,
    ConsoleCrane,
  };

  Object.keys(components).forEach((name) => {
    const component = (components as any)[name];
    vueApp.component(name, component);
  });

  vueApp.config.globalProperties.$filters = {
    cleanText,
  };

  await initNibbleApp(vueApp);
})();
