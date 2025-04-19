import { RouteRecordRaw, createMemoryHistory, createRouter } from "vue-router";

import WordDetailPage from "./views/WordDetail.vue";

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
];

export const router = createRouter({
  history: createMemoryHistory(),
  routes: routes,
});
