<template>
  <transition name="fade">
    <div
      class="h-[600px] w-[800px] bg-gradient-to-b from-gray-900 to-gray-800 overflow-y-auto"
    >
      <!-- Hero Section - More Compact -->
      <div class="relative overflow-hidden">
        <div
          class="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"
        ></div>
        <div class="relative px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <h1 class="text-xl font-bold text-white mb-1">
                Learn English streaming your&nbsp;
                <span
                  class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400"
                >
                  favorite shows
                </span>
              </h1>
              <p class="text-gray-300 text-sm max-w-md">
                From subtitles to fluency. Learn from real-life, native content.
              </p>
            </div>
            <div class="transform hover:scale-105 transition-transform">
              <logo></logo>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content - Optimized for Popup -->
      <div class="p-6">
        <!-- Dashboard Button Card -->
        <div
          class="bg-white/5 backdrop-blur-lg rounded-xl p-4 mb-4 border border-white/10"
        >
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-white">
                Access Your Dashboard
              </h2>
              <p class="text-gray-400 text-sm">
                Manage your saved phrases and track your progress
              </p>
            </div>
            <div>
              <button
                v-if="isLogin"
                @click="openDashboard"
                class="dashboard-btn bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-medium py-2 px-6 rounded-full transition-all transform hover:scale-105 shadow-lg hover:shadow-purple-500/25 text-sm flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Open Dashboard
              </button>
            </div>
          </div>
        </div>

        <!-- How to use Subturtle? Header -->
        <h2 class="text-2xl text-center font-semibold text-white my-8">
          How to use Subturtle?
        </h2>

        <!-- Features Grid - 5 Steps -->
        <div class="grid grid-cols-2 gap-4 mb-4">
          <!-- Step 1: Language Selection Card -->
          <div
            class="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10"
          >
            <h3
              class="text-base font-semibold text-white mb-3 flex items-center"
            >
              <span
                class="w-6 h-6 bg-indigo-500/20 rounded-full flex items-center justify-center text-sm mr-2"
              >
                1
              </span>
              Select Target Language
            </h3>
            <div class="flex items-center space-x-3">
              <span class="text-gray-400 text-sm">Choose language:</span>
              <div class="flex-1 z-10">
                <select-target />
              </div>
            </div>
          </div>

          <!-- Step 2: Basic Usage -->
          <div
            class="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10"
          >
            <h3
              class="text-base font-semibold text-white mb-2 flex items-center"
            >
              <span
                class="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-sm mr-2"
              >
                2
              </span>
              Open Video & Enable Subtitles
            </h3>
            <p class="text-gray-400 text-sm">
              Open a video on Netflix or YouTube, enable subtitles, and hover
              over words to see translations.
            </p>
          </div>

          <!-- Step 3: Multiple Word Translation Card -->
          <div
            class="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10"
          >
            <h3
              class="text-base font-semibold text-white mb-2 flex items-center"
            >
              <span
                class="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-sm mr-2"
              >
                3
              </span>
              Select Multiple Words
            </h3>
            <ul class="text-gray-400 text-sm space-y-1">
              <li class="flex items-center">
                <span class="w-1 h-1 bg-purple-400 rounded-full mr-1.5"></span>
                Hold&nbsp;<span class="font-bold">Ctrl</span> &nbsp;or&nbsp;
                <span class="font-bold">Command</span>
              </li>
              <li class="flex items-center">
                <span class="w-1 h-1 bg-purple-400 rounded-full mr-1.5"></span>
                Drag to select words
              </li>
              <li class="flex items-center">
                <span class="w-1 h-1 bg-purple-400 rounded-full mr-1.5"></span>
                Click to save for practice
              </li>
            </ul>
          </div>

          <!-- Step 4: Phrase Management Card -->
          <div
            class="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10"
          >
            <h3
              class="text-base font-semibold text-white mb-2 flex items-center"
            >
              <span
                class="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center text-sm mr-2"
              >
                4
              </span>
              Save & Organize
            </h3>
            <ul class="text-gray-400 text-sm space-y-1">
              <li class="flex items-center">
                <span class="w-1 h-1 bg-amber-400 rounded-full mr-1.5"></span>
                Click phrase to see details
              </li>
              <li class="flex items-center">
                <span class="w-1 h-1 bg-amber-400 rounded-full mr-1.5"></span>
                Save phrases for practice
              </li>
              <li class="flex items-center">
                <span class="w-1 h-1 bg-amber-400 rounded-full mr-1.5"></span>
                Create custom bundles
              </li>
            </ul>
          </div>

          <!-- Step 5: Practice Section -->
          <div
            class="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10 col-span-2"
          >
            <div class="flex items-start gap-4">
              <div class="flex-1">
                <h3
                  class="text-base font-semibold text-white mb-3 flex items-center"
                >
                  <span
                    class="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center text-sm mr-2"
                  >
                    5
                  </span>
                  Practice & Master
                </h3>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <h4 class="text-sm font-medium text-emerald-400 mb-2">
                      Practice Modes
                    </h4>
                    <ul class="text-gray-400 text-sm space-y-1">
                      <li class="flex items-center">
                        <span
                          class="w-1 h-1 bg-emerald-400 rounded-full mr-1.5"
                        ></span>
                        Flashcard mode
                      </li>
                      <li class="flex items-center">
                        <span
                          class="w-1 h-1 bg-emerald-400 rounded-full mr-1.5"
                        ></span>
                        AI teacher practice
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 class="text-sm font-medium text-emerald-400 mb-2">
                      Manage & Track
                    </h4>
                    <ul class="text-gray-400 text-sm space-y-1">
                      <li class="flex items-center">
                        <span
                          class="w-1 h-1 bg-emerald-400 rounded-full mr-1.5"
                        ></span>
                        Manage bundles
                      </li>
                      <li class="flex items-center">
                        <span
                          class="w-1 h-1 bg-emerald-400 rounded-full mr-1.5"
                        ></span>
                        Track progress
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Supported Platforms -->
        <div
          class="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10 mb-4"
        >
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-white">
              Supported Platforms
            </h3>
            <div class="flex items-center space-x-6">
              <div class="transform hover:scale-105 transition-transform">
                <a href="https://www.netflix.com" target="_blank">
                  <img
                    class="h-8"
                    :src="getAsset('/svg/netflix_logo.svg')"
                    alt="Netflix"
                /></a>
              </div>
              <div class="transform hover:scale-105 transition-transform">
                <a href="https://www.youtube.com" target="_blank">
                  <img
                    class="h-8"
                    :src="getAsset('/svg/youtube_logo.svg')"
                    alt="YouTube"
                /></a>
              </div>
            </div>
          </div>
        </div>

        <!-- Login/Logout Buttons -->
        <div class="flex flex-col gap-3">
          <div
            v-if="isLogin"
            class="text-gray-400 hover:text-white text-sm transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Want to sign out?</span>
            <span
              @click="handleLogout()"
              class="text-red-400 hover:text-red-300 underline decoration-dotted underline-offset-4"
            >
              Logout
            </span>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import { getAsset } from "../helper/assets";
import { isLogin, logout } from "../../plugins/modular-rest";
import { useRouter } from "vue-router";
import { SUBTURTLE_DASHBOARD_URL } from "../../common/static/global";

const router = useRouter();

function openDashboard() {
  window.open(SUBTURTLE_DASHBOARD_URL, "_blank");
}

function handleLogout() {
  logout();
  router.push("/intro");
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Custom scrollbar for the popup */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

/* Animated gradient for dashboard button */
.dashboard-btn {
  background-size: 200% 200%;
  animation: gradient 3s ease infinite;
}

@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>
