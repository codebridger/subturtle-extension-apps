import type { App } from "vue";

import vueComponents from "@codebridger/lib-vue-components";
import "@codebridger/lib-vue-components/style.css";

export const installPilotUI = (app: App) => {
  app.use(vueComponents as any, { prefix: "CL", dontInstallPinia: true });

  return app;
};
