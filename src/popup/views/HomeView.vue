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
                Learn English by streaming your&nbsp;
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
      <div class="p-6 space-y-6">
        <!-- Control Panel -->
        <div
          class="bg-white/[0.03] backdrop-blur-xl rounded-xl p-4 border border-white/[0.08] shadow-xl hover:border-white/[0.12] transition-all duration-300"
        >
          <div class="flex items-stretch gap-8">
            <!-- Language Selection -->
            <div class="flex-1 relative group">
              <h3
                class="text-lg font-medium mb-4 text-white flex items-center gap-2"
              >
                Target Language
                <div class="tooltip-container">
                  <span
                    class="text-gray-400 hover:text-gray-300 cursor-help text-sm"
                    >(?)</span
                  >
                  <div class="tooltip">
                    Select the language you want to learn from videos
                  </div>
                </div>
              </h3>
              <div class="flex flex-col space-y-4 items-start justify-between">
                <span
                  class="text-gray-400 text-sm whitespace-nowrap group-hover:text-gray-300 transition-colors"
                >
                  Choose the language to help English by
                </span>
                <div class="flex-1 w-full">
                  <select-target label="Select" class="w-full" />
                </div>
              </div>
            </div>

            <!-- Separator -->
            <div
              class="w-px bg-gradient-to-b from-white/[0.05] via-white/10 to-white/[0.05]"
            ></div>

            <!-- Dashboard Section -->
            <div class="flex-2">
              <h3 class="text-lg font-medium text-white mb-4">
                Access Your Dashboard
              </h3>
              <div class="flex flex-col space-y-4 items-start justify-between">
                <p class="text-gray-400 text-sm">
                  Manage your saved phrases and track your progress
                </p>
                <button
                  v-if="isLogin"
                  @click="openDashboard"
                  :disabled="isLoading"
                  class="dashboard-btn bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-medium py-2 px-6 rounded-full transition-all transform hover:scale-105 shadow-lg hover:shadow-purple-500/25 text-sm flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    v-if="isLoading"
                    class="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <svg
                    v-else
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
                  {{ isLoading ? "Opening..." : "Open Dashboard" }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Interactive Help Section -->
        <div class="flex flex-col items-center">
          <router-link
            to="/help"
            class="group w-full bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 hover:from-blue-500/10 hover:via-purple-500/10 hover:to-pink-500/10 rounded-xl px-4 py-6 border border-blue-400/20 hover:border-purple-400/30 transition-all duration-300 transform hover:scale-[1.02]"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="bg-blue-500/10 rounded-xl">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span
                  class="text-2xl font-medium bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text"
                  >How to use Subturtle?</span
                >
              </div>
              <div
                class="flex items-center gap-1 text-gray-400 group-hover:text-purple-300 transition-colors duration-300"
              >
                <span class="text-sm">Click Here</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>
            </div>
          </router-link>
        </div>

        <!-- Platforms Section -->
        <div
          class="bg-white/[0.03] backdrop-blur-xl rounded-xl px-4 py-6 border border-white/[0.08]"
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
                  class="h-11"
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
                  class="h-11"
                  :src="getAsset('/svg/youtube_logo.svg')"
                  alt="YouTube"
                />
              </a>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex justify-center">
          <div v-if="isLogin" class="relative group">
            <button
              @click="showLogoutConfirm = true"
              class="text-gray-400 group-hover:text-gray-300 text-sm transition-colors duration-200"
            >
              Want to
              <span
                class="text-red-400 group-hover:text-red-300 underline decoration-dotted underline-offset-4 ml-1"
              >
                &nbsp;Log out?
              </span>
            </button>

            <!-- Logout Confirmation -->
            <div
              v-if="showLogoutConfirm"
              class="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-xl p-4 shadow-xl border border-white/10 w-64"
            >
              <p class="text-sm text-gray-300 mb-3">
                Are you sure you want to log out?
              </p>
              <div class="flex justify-end gap-2">
                <button
                  @click="showLogoutConfirm = false"
                  class="px-3 py-1 text-sm text-gray-400 hover:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  @click="confirmLogout"
                  class="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import { getAsset } from "../helper/assets";
import { isLogin, logout } from "../../plugins/modular-rest";
import { useRouter } from "vue-router";
import { SUBTURTLE_DASHBOARD_URL } from "../../common/static/global";

const router = useRouter();
const isLoading = ref(false);
const showLogoutConfirm = ref(false);

async function openDashboard() {
  isLoading.value = true;
  try {
    window.open(SUBTURTLE_DASHBOARD_URL, "_blank");
  } finally {
    // Short delay to show loading state
    setTimeout(() => {
      isLoading.value = false;
    }, 500);
  }
}

function confirmLogout() {
  logout();
  router.push("/intro");
}

watch(isLogin, (newVal) => {
  if (newVal == false) {
    router.push("/intro");
  }
});
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

/* Tooltip styles */
.tooltip-container {
  position: relative;
  display: inline-block;
}

.tooltip {
  visibility: hidden;
  position: absolute;
  z-index: 1;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  text-align: center;
  border-radius: 6px;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s;
}

.tooltip-container:hover .tooltip {
  visibility: visible;
  opacity: 1;
}

/* Enhanced hover effects */
.dashboard-btn:hover {
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
}

/* Loading animation */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
