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

router.beforeEach(async (to, from) => {
  // Allow access to intro and login pages regardless of login status
  if (to.name === "intro" || to.name === "login") {
    return true;
  }

  // Try to login with last session if not already logged in
  if (!isLogin.value) {
    await loginWithLastSession();

    // After trying to login, check again if successful
    if (!isLogin.value) {
      return { name: "intro" };
    }
  }

  // If we got here, user is logged in, allow navigation
  return true;
});
