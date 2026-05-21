import { RouteRecordRaw, createMemoryHistory, createRouter } from "vue-router";

import WordDetailPage from "./modules/word-detail/index.vue";
import SettingsPage from "./modules/settings/index.vue";
import EmptyPage from "./modules/empty/index.vue";
import PracticeConfigPage from "./modules/practice-config/index.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "empty",
    component: EmptyPage,
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
  {
    path: "/practice-config/:data",
    name: "practice-config",
    component: PracticeConfigPage,
  },
];

export const router = createRouter({
  history: createMemoryHistory(),
  routes: routes,
});
