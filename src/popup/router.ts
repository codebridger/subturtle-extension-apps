import { RouteRecordRaw, createRouter, createWebHashHistory } from "vue-router";
import { isLogin, loginWithLastSession } from "../plugins/modular-rest";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("./views/HomeView.vue"),
  },
  {
    path: "/login",
    name: "login",
    component: () => import("./views/LoginView.vue"),
  },
  {
    path: "/intro",
    name: "intro",
    component: () => import("./views/IntroView.vue"),
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes: routes,
});

router.beforeEach(async (to, from, next) => {
  if (!isLogin.value) {
    await loginWithLastSession();
  }

  if (to.name === "login") next();
  else if (to.name !== "intro" && !isLogin.value) next({ name: "intro" });
  else next();
});
