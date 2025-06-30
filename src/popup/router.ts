import { RouteRecordRaw, createRouter, createWebHashHistory } from "vue-router";
import {
  authentication,
  isLogin,
  loginWithLastSession,
} from "../plugins/modular-rest";

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
  {
    path: "/help",
    name: "help",
    component: () => import("./views/HelpView.vue"),
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
