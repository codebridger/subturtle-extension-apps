import { RouteRecordRaw, createRouter, createWebHashHistory } from "vue-router";
import {
  authentication,
  isLogin,
  loginWithLastSession,
} from "../plugins/modular-rest";
import HomeView from "./views/HomeView.vue";
import LoginView from "./views/LoginView.vue";
import IntroView from "./views/IntroView.vue";
import HelpView from "./views/HelpView.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: HomeView,
  },
  {
    path: "/login",
    name: "login",
    component: LoginView,
  },
  {
    path: "/intro",
    name: "intro",
    component: IntroView,
  },
  {
    path: "/help",
    name: "help",
    component: HelpView,
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes: routes,
});

router.beforeEach(async (to) => {
  // Intro and login pages bypass the silent re-auth attempt entirely.
  if (to.name === "intro" || to.name === "login") {
    return true;
  }

  // Best-effort silent re-auth so logged-in users hit a populated state on
  // first paint. We deliberately do NOT redirect on failure — the home view
  // (and the new translation card on it) is reachable for logged-out users;
  // auth-gated UI inside HomeView is hidden via `v-if="isLogin"`.
  if (!isLogin.value) {
    await loginWithLastSession();
  }

  return true;
});
