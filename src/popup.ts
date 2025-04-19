import "./animation.scss";
import "./tailwind.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import rootComponent from "./popup/App.vue";
import components from "./popup/components/components";
import { getAsset } from "./popup/helper/assets";
import { router } from "./popup/router";
import { installVuePrime } from "./plugins/vue-prime";

// Set uninstall url
chrome.runtime.setUninstallURL(process.env.UNINSTALL_FORM_URL || "");

const vueApp = createApp(rootComponent as any);

installVuePrime(vueApp);

vueApp
  // add pinia
  .use(createPinia())
  // add router
  .use(router);

Object.keys(components).forEach((name) => {
  let component = (components as any)[name];
  vueApp.component(name, component);
});

vueApp.config.globalProperties = {
  ...vueApp.config.globalProperties,
  $getAsset: getAsset,
};

vueApp.mount("#app");
