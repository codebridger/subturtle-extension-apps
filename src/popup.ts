import "./animation.scss";
import "./tailwind.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import rootComponent from "./popup/App.vue";
import components from "./popup/components/components";
import { getAsset } from "./popup/helper/assets";
import { router } from "./popup/router";
import { useSettingsStore } from "./common/store/settings";
import { installPilotUI } from "./plugins/pilotui";

// Set uninstall url
chrome.runtime.setUninstallURL(process.env.UNINSTALL_FORM_URL || "");

let vueApp = createApp(rootComponent as any);

vueApp
  // add pinia
  .use(createPinia())
  // add router
  .use(router);

// Initialize settings
const settingsStore = useSettingsStore();
settingsStore.initialize();

// add pilotui
vueApp = installPilotUI(vueApp);

Object.keys(components).forEach((name) => {
  let component = (components as any)[name];
  vueApp.component(name, component);
});

vueApp.config.globalProperties = {
  ...vueApp.config.globalProperties,
  $getAsset: getAsset,
};

vueApp.mount("#app");
