import { RouteRecordRaw, createMemoryHistory, createRouter } from "vue-router";

import WordDetailPage from "./modules/word-detail/index.vue";
import SettingsPage from "./modules/settings/index.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "empty",
    component: { template: "<div></div>" },
  },
  {
    path: "/word-detail/:data",
    name: "word-detail",
    component: WordDetailPage,
  },
  {
    path: "/settings",
    name: "settings",
    component: SettingsPage,
  },
];

export const router = createRouter({
  history: createMemoryHistory(),
  routes: routes,
});
