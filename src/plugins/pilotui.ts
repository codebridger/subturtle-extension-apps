import type { App } from "vue";

import vueComponents from "pilotui";
import "pilotui/style.css";

export const installPilotUI = (app: App) => {
  app.use(vueComponents as any, { prefix: "CL", dontInstallPinia: true });

  return app;
};
