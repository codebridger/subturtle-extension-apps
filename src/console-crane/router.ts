import { RouteRecordRaw, createMemoryHistory, createRouter } from "vue-router";

import WordDetailPage from "./modules/word-detail/index.vue";
import SettingsPage from "./modules/settings/index.vue";
import EmptyPage from "./modules/empty/index.vue";
import PracticeConfigPage from "./modules/practice-config/index.vue";
import FlashcardPreviewPage from "./modules/flashcard-preview/index.vue";
import { setConsoleCraneRouter } from "./navigation";

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
  {
    path: "/flashcard-preview/:data",
    name: "flashcard-preview",
    component: FlashcardPreviewPage,
  },
];

export const router = createRouter({
  history: createMemoryHistory(),
  routes: routes,
});

// Register the instance so the store can navigate without importing this module
// (which would re-introduce the circular init). See ./navigation.
setConsoleCraneRouter(router);
