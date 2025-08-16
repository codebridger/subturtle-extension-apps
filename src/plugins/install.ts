import { App } from "vue";
import { createPinia } from "pinia";
import { installVuePrime } from "./vue-prime/content-script-side";
import { installPilotUI } from "./pilotui";
import { router } from "../console-crane/router";

export function addPlugins(app: App) {
  app.use(createPinia());

  app.use(router);

  installVuePrime(app);

  installPilotUI(app);

  return app;
}
