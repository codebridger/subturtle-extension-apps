<template>
  <transition name="fade">
    <div
      class="h-[600px] w-[800px] bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 overflow-y-auto"
    >
      <!-- Inline Header with Back Button and Title -->
      <div
        class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5"
      >
        <router-link
          to="/"
          class="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clip-rule="evenodd"
            />
          </svg>
          Back to Home
        </router-link>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          How to Use Subturtle
        </h2>
        <div class="w-[100px]"></div>
        <!-- Spacer for centering -->
      </div>

      <!-- Subtitle -->
      <div class="text-center py-4 mb-2">
        <p class="text-gray-600 dark:text-gray-400">
          Three ways to capture words, one place to learn them.
        </p>
      </div>

      <div class="px-8 py-4">
        <!-- Capture section -->
        <div class="mb-8">
          <div
            class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4 px-2"
          >
            Capture
          </div>

          <div class="grid grid-cols-3 gap-4">
            <!-- Video subtitles -->
            <div
              class="flex flex-col p-5 rounded-xl backdrop-blur-lg bg-gradient-to-br from-blue-500/5 to-blue-600/10 border border-blue-400/20 hover:scale-[1.02] hover:border-blue-400/40 hover:from-blue-500/10 hover:to-blue-600/20 transition-all"
            >
              <div
                class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20"
              >
                <svg
                  class="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-blue-400 mt-3 mb-2">
                Video subtitles
              </h3>
              <p
                class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3"
              >
                Open Netflix or YouTube, turn on subtitles, and hover any word
                for an instant translation.
              </p>
              <div
                class="text-xs text-gray-600 dark:text-gray-400 mt-auto pt-2 border-t border-blue-400/10"
              >
                Click the
                <kbd
                  class="px-1.5 py-0.5 bg-gray-200 dark:bg-white/10 rounded text-xs"
                  >+</kbd
                >
                anchors on either side of a word to extend the selection one
                word at a time.
              </div>
            </div>

            <!-- Any webpage (Nibble) -->
            <div
              class="flex flex-col p-5 rounded-xl backdrop-blur-lg bg-gradient-to-br from-purple-500/5 to-purple-600/10 border border-purple-400/20 hover:scale-[1.02] hover:border-purple-400/40 hover:from-purple-500/10 hover:to-purple-600/20 transition-all"
            >
              <div
                class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20"
              >
                <svg
                  class="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"
                  />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-purple-400 mt-3 mb-2">
                Any webpage
              </h3>
              <p
                class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3"
              >
                Highlight text on any site — Wikipedia, articles, blogs. A
                floating Subturtle icon appears for an instant translation.
              </p>
              <div
                class="text-xs text-gray-600 dark:text-gray-400 mt-auto pt-2 border-t border-purple-400/10"
              >
                Click the icon, then hit
                <span class="text-purple-400 font-medium">Save & view</span>
                to open the full word details.
              </div>
            </div>

            <!-- Quick translate (Popup) -->
            <div
              class="flex flex-col p-5 rounded-xl backdrop-blur-lg bg-gradient-to-br from-amber-500/5 to-amber-600/10 border border-amber-400/20 hover:scale-[1.02] hover:border-amber-400/40 hover:from-amber-500/10 hover:to-amber-600/20 transition-all"
            >
              <div
                class="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20"
              >
                <svg
                  class="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                  />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-amber-400 mt-3 mb-2">
                Quick translate
              </h3>
              <p
                class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3"
              >
                Open this popup and type or paste any phrase. Get a translation
                instantly, no page visit needed.
              </p>
              <div
                class="text-xs text-gray-600 dark:text-gray-400 mt-auto pt-2 border-t border-amber-400/10"
              >
                Perfect for quick lookups while you're reading anywhere — even
                a paper book.
              </div>
            </div>
          </div>
        </div>

        <!-- Learn section -->
        <div class="mb-8">
          <div
            class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4 px-2"
          >
            Learn
          </div>

          <div class="relative">
            <!-- Timeline Line -->
            <div
              class="absolute left-8 top-0 bottom-0 w-[2px] bg-gradient-to-b from-emerald-500/50 to-rose-500/50"
            ></div>

            <!-- Step 1: Save & Organize -->
            <div class="relative flex mb-8">
              <div class="shrink-0 w-16 flex items-start justify-center">
                <div class="relative">
                  <div
                    class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20"
                  >
                    <span class="text-lg font-semibold text-white">1</span>
                  </div>
                </div>
              </div>
              <div
                class="flex-1 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 backdrop-blur-lg rounded-xl p-6 border border-emerald-400/20 transform transition-all hover:scale-[1.02] hover:border-emerald-400/40 hover:from-emerald-500/10 hover:to-emerald-600/20"
              >
                <h3 class="text-xl font-semibold text-emerald-400 mb-3">
                  Save & Organize
                </h3>
                <div class="space-y-3">
                  <div
                    class="flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                  >
                    <svg
                      class="w-5 h-5 text-emerald-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span>View detailed translations and examples</span>
                  </div>
                  <div
                    class="flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                  >
                    <svg
                      class="w-5 h-5 text-emerald-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span>Save important phrases to your collection</span>
                  </div>
                  <div
                    class="flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                  >
                    <svg
                      class="w-5 h-5 text-emerald-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span>Group phrases into custom bundles</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 2: Practice & Master -->
            <div class="relative flex">
              <div class="shrink-0 w-16 flex items-start justify-center">
                <div class="relative">
                  <div
                    class="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/20"
                  >
                    <span class="text-lg font-semibold text-white">2</span>
                  </div>
                </div>
              </div>
              <div
                class="flex-1 bg-gradient-to-br from-rose-500/5 to-rose-600/10 backdrop-blur-lg rounded-xl p-6 border border-rose-400/20 transform transition-all hover:scale-[1.02] hover:border-rose-400/40 hover:from-rose-500/10 hover:to-rose-600/20"
              >
                <h3 class="text-xl font-semibold text-rose-400 mb-4">
                  Practice & Master
                </h3>
                <div class="grid grid-cols-2 gap-6">
                  <div class="space-y-3">
                    <h4 class="text-lg font-medium text-rose-400">
                      Practice Modes
                    </h4>
                    <div class="space-y-2">
                      <div
                        class="flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                      >
                        <svg
                          class="w-5 h-5 text-rose-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>Interactive flashcards</span>
                      </div>
                      <div
                        class="flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                      >
                        <svg
                          class="w-5 h-5 text-rose-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>AI-powered practice sessions</span>
                      </div>
                    </div>
                  </div>
                  <div class="space-y-3">
                    <h4 class="text-lg font-medium text-rose-400">
                      Track Progress
                    </h4>
                    <div class="space-y-2">
                      <div
                        class="flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                      >
                        <svg
                          class="w-5 h-5 text-rose-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>Organize word bundles</span>
                      </div>
                      <div
                        class="flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                      >
                        <svg
                          class="w-5 h-5 text-rose-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>Monitor learning progress</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Popup tips footer -->
        <div
          class="mt-8 p-5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08]"
        >
          <h3
            class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"
          >
            From this popup you can also…
          </h3>
          <div class="space-y-2">
            <div
              class="flex items-start space-x-3 text-sm text-gray-600 dark:text-gray-400"
            >
              <svg
                class="w-4 h-4 text-gray-500 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
              <span
                >Disable Subturtle on a specific website using the per-site
                toggle.</span
              >
            </div>
            <div
              class="flex items-start space-x-3 text-sm text-gray-600 dark:text-gray-400"
            >
              <svg
                class="w-4 h-4 text-gray-500 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Change the language you're learning from videos.</span>
            </div>
            <div
              class="flex items-start space-x-3 text-sm text-gray-600 dark:text-gray-400"
            >
              <svg
                class="w-4 h-4 text-gray-500 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              <span
                >Open the dashboard to manage saved phrases and practice.</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
