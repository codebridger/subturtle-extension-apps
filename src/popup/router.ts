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
import PracticeConfigView from "./views/PracticeConfigView.vue";
import FlashcardPreviewView from "./views/FlashcardPreviewView.vue";

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
  // Console pages, hosted in the popup router so they render as full popup pages
  // (not a modal). Reached from WordDetailModule's phrase actions via the
  // openConsolePage navigator provided in App.vue. `:data` is the encoded params.
  {
    path: "/practice-config/:data",
    name: "practice-config",
    component: PracticeConfigView,
  },
  {
    path: "/flashcard-preview/:data",
    name: "flashcard-preview",
    component: FlashcardPreviewView,
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
