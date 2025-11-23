import { waitUntil } from "../../common/helper/promise";
import { AppInitializer } from "../../common/types/general.type";
import { SUBTILE_CONTAINER_CLASS } from "./static";

import msTeamComponent from "./Index.vue";

export const msTeam: AppInitializer = {
  website: {
    host: "teams.microsoft.com",
    path: "/light-meetings/launch",
  },
  component: msTeamComponent as any,
  start: async (app) => {
    await waitUntil(() => !!document.querySelector(SUBTILE_CONTAINER_CLASS));

    let appDiv = document.createElement("div");
    appDiv.id = "subturtle-app";

    document.body.insertAdjacentElement("afterbegin", appDiv);

    app.mount(appDiv);
    return app;
  },
};
