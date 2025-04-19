import { waitUntil } from "../../common/helper/promise";
import { AppInitializer } from "../../common/types/general.type";
import { SUBTITLE_CLASS } from "./static";

import netflixComponent from "./Index.vue";
import { analytic } from "../../plugins/mixpanel";

export const netflix: AppInitializer = {
  website: {
    host: "netflix.com",
    path: "/watch",
  },
  component: netflixComponent,
  start: async (app) => {
    await waitUntil(() => !!document.querySelector(SUBTITLE_CLASS));

    // Init Analytic
    //
    analytic.track("Netflix");

    let appDiv = document.createElement("div");
    let videoContainer = document.querySelector(".watch-video");

    videoContainer?.insertBefore(appDiv, videoContainer.firstChild);

    appDiv.id = "app";
    appDiv.style.position = "relative";
    appDiv.style.zIndex = "9999";

    app.mount(appDiv);

    return app;
  },
};
