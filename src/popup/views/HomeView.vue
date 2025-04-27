<template>
  <transition name="fade">
    <div
      class="min-h-[600px] w-[800px] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-y-auto"
    >
      <!-- Hero Section -->
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

      <!-- Main Content -->
      <div class="px-8 py-6 space-y-6">
        <!-- Control Panel -->
        <div
          class="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] shadow-xl"
        >
          <div class="flex items-stretch gap-8">
            <!-- Language Selection -->
            <div class="flex-1">
              <h3 class="text-lg font-medium text-white my-4">
                Target Language
              </h3>
              <div class="flex flex-col space-y-4 items-start justify-between">
                <span class="text-gray-400 text-sm whitespace-nowrap">
                  Choose which language you want to learn
                </span>
                <div class="flex-1">
                  <select-target label="Select" />
                </div>
              </div>
            </div>

            <!-- Separator -->
            <div
              class="w-px bg-gradient-to-b from-white/[0.05] via-white/10 to-white/[0.05]"
            ></div>

            <!-- Dashboard Section -->
            <div class="flex-2">
              <h3 class="text-lg font-medium text-white my-4">
                Access Your Dashboard
              </h3>
              <div class="flex flex-col space-y-4 items-start justify-between">
                <p class="text-gray-400 text-sm">
                  Manage your saved phrases and track your progress
                </p>
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
        </div>

        <!-- Help Section -->
        <div class="text-center py-4">
          <router-link
            to="/help"
            class="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors duration-200 group"
          >
            <span class="text-2xl font-medium">How to use Subturtle?</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 help-icon-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M12 21a9 9 0 100-18 9 9 0 000 18z"
              />
            </svg>
          </router-link>
        </div>

        <!-- Platforms Section -->
        <div
          class="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/[0.08]"
        >
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-white">Supported Platforms</h3>
            <div class="flex items-center gap-8">
              <a
                href="https://www.netflix.com"
                target="_blank"
                class="transform hover:scale-105 transition-transform duration-300 opacity-80 hover:opacity-100"
              >
                <img
                  class="h-8"
                  :src="getAsset('/svg/netflix_logo.svg')"
                  alt="Netflix"
                />
              </a>
              <a
                href="https://www.youtube.com"
                target="_blank"
                class="transform hover:scale-105 transition-transform duration-300 opacity-80 hover:opacity-100"
              >
                <img
                  class="h-8"
                  :src="getAsset('/svg/youtube_logo.svg')"
                  alt="YouTube"
                />
              </a>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex justify-center pt-4">
          <div
            v-if="isLogin"
            class="group cursor-pointer"
            @click="handleLogout()"
          >
            <span
              class="text-gray-400 group-hover:text-gray-300 text-sm transition-colors duration-200"
            >
              Want to sign out?
              <span
                class="text-red-400 group-hover:text-red-300 underline decoration-dotted underline-offset-4 ml-1"
              >
                Logout
              </span>
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

/* Custom scrollbar styling */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

/* Smooth hover transitions */
a,
button {
  transition: all 0.2s ease-in-out;
}

/* Scale animation */
@keyframes scale {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

.hover\:scale-102:hover {
  transform: scale(1.02);
}

.help-icon-pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
