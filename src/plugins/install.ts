import { App } from "vue";
import { createPinia } from "pinia";
import { installPilotUI } from "./pilotui";
import { router } from "../console-crane/router";
import { ensureRtlFont } from "../common/helper/rtl-font";

export function addPlugins(app: App) {
  app.use(createPinia());

  app.use(router);

  installPilotUI(app);

  // Vazirmatn for right-to-left text in every content script (E-09).
  ensureRtlFont();

  return app;
}
