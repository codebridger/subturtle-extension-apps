import { App } from "vue";
import { createPinia } from "pinia";
import { installPilotUI } from "./pilotui";
import { router } from "../console-crane/router";

export function addPlugins(app: App) {
  app.use(createPinia());

  app.use(router);

  installPilotUI(app);

  return app;
}
