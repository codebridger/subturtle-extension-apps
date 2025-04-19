import { waitUntil } from "../../common/helper/promise";
import { AppInitializer } from "../../common/types/general.type";
import { SUBTITLE_CLASS } from "./static";

import rootComponent from "./Index.vue";
import { analytic } from "../../plugins/mixpanel";

export const serviceName = "Service-name";

export const initConfig: AppInitializer = {
  website: {
    host: "*.com",
    path: "/*",
  },
  component: rootComponent,
  start: async (app) => {
    await waitUntil(() => !!document.querySelector(SUBTITLE_CLASS));

    // Init Analytic
    //
    analytic.track(serviceName);

    let appDiv = document.createElement("div");

    // Insert the app div somewhere in the page
    // @TODO: Find a better way to do this

    appDiv.id = "app";
    appDiv.style.position = "relative";
    appDiv.style.zIndex = "9999";

    app.mount(appDiv);

    return app;
  },
};
