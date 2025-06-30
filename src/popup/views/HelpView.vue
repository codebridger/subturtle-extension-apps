<template>
  <transition name="fade">
    <div class="h-[600px] w-[800px] bg-gradient-to-b from-gray-900 to-gray-800 overflow-y-auto">
      <!-- Inline Header with Back Button and Title -->
      <div class="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
        <router-link to="/" class="inline-flex items-center text-gray-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
          Back to Home
        </router-link>
        <h2 class="text-2xl font-bold text-white">How to Use Subturtle</h2>
        <div class="w-[100px]"></div> <!-- Spacer for centering -->
      </div>

      <!-- Subtitle -->
      <div class="text-center py-4 mb-2">
        <p class="text-gray-400">Follow these simple steps to enhance your learning experience</p>
      </div>

      <!-- Steps Timeline Layout -->
      <div class="px-8 py-4">
        <div class="relative">
          <!-- Timeline Line -->
          <div class="absolute left-8 top-0 bottom-0 w-[2px] bg-gradient-to-b from-blue-500/50 via-purple-500/50 to-emerald-500/50"></div>
          
          <!-- Step 1 -->
          <div class="relative flex mb-12">
            <div class="shrink-0 w-16 flex items-start justify-center">
              <div class="relative">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <span class="text-lg font-semibold text-white">1</span>
                </div>
              </div>
            </div>
            <div class="flex-1 bg-gradient-to-br from-blue-500/5 to-blue-600/10 backdrop-blur-lg rounded-xl p-6 border border-blue-400/20 transform transition-all hover:scale-[1.02] hover:border-blue-400/40 hover:from-blue-500/10 hover:to-blue-600/20">
              <h3 class="text-xl font-semibold text-blue-400 mb-3">Open Video & Enable Subtitles</h3>
              <p class="text-gray-300 leading-relaxed">
                Open a video on Netflix or YouTube, enable subtitles, and hover over words to see instant translations. It's that simple to get started!
              </p>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="relative flex mb-12">
            <div class="shrink-0 w-16 flex items-start justify-center">
              <div class="relative">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <span class="text-lg font-semibold text-white">2</span>
                </div>
              </div>
            </div>
            <div class="flex-1 bg-gradient-to-br from-purple-500/5 to-purple-600/10 backdrop-blur-lg rounded-xl p-6 border border-purple-400/20 transform transition-all hover:scale-[1.02] hover:border-purple-400/40 hover:from-purple-500/10 hover:to-purple-600/20">
              <h3 class="text-xl font-semibold text-purple-400 mb-3">Select Multiple Words</h3>
              <div class="space-y-3">
                <div class="flex items-center space-x-2 text-gray-300">
                  <span class="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">1</span>
                  <span>Hold <kbd class="px-2 py-1 bg-white/10 rounded text-sm">Ctrl</kbd> or <kbd class="px-2 py-1 bg-white/10 rounded text-sm">⌘ Command</kbd></span>
                </div>
                <div class="flex items-center space-x-2 text-gray-300">
                  <span class="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">2</span>
                  <span>Drag to select multiple words for translation</span>
                </div>
                <div class="flex items-center space-x-2 text-gray-300">
                  <span class="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">3</span>
                  <span>Click to save selected words for later practice</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="relative flex mb-12">
            <div class="shrink-0 w-16 flex items-start justify-center">
              <div class="relative">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <span class="text-lg font-semibold text-white">3</span>
                </div>
              </div>
            </div>
            <div class="flex-1 bg-gradient-to-br from-amber-500/5 to-amber-600/10 backdrop-blur-lg rounded-xl p-6 border border-amber-400/20 transform transition-all hover:scale-[1.02] hover:border-amber-400/40 hover:from-amber-500/10 hover:to-amber-600/20">
              <h3 class="text-xl font-semibold text-amber-400 mb-3">Save & Organize</h3>
              <div class="space-y-3">
                <div class="flex items-center space-x-2 text-gray-300">
                  <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                  <span>View detailed translations and examples</span>
                </div>
                <div class="flex items-center space-x-2 text-gray-300">
                  <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                  <span>Save important phrases to your collection</span>
                </div>
                <div class="flex items-center space-x-2 text-gray-300">
                  <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                  <span>Create custom bundles for organized learning</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 4 -->
          <div class="relative flex">
            <div class="shrink-0 w-16 flex items-start justify-center">
              <div class="relative">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <span class="text-lg font-semibold text-white">4</span>
                </div>
              </div>
            </div>
            <div class="flex-1 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 backdrop-blur-lg rounded-xl p-6 border border-emerald-400/20 transform transition-all hover:scale-[1.02] hover:border-emerald-400/40 hover:from-emerald-500/10 hover:to-emerald-600/20">
              <h3 class="text-xl font-semibold text-emerald-400 mb-4">Practice & Master</h3>
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-3">
                  <h4 class="text-lg font-medium text-emerald-400">Practice Modes</h4>
                  <div class="space-y-2">
                    <div class="flex items-center space-x-2 text-gray-300">
                      <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                      <span>Interactive flashcards</span>
                    </div>
                    <div class="flex items-center space-x-2 text-gray-300">
                      <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                      <span>AI-powered practice sessions</span>
                    </div>
                  </div>
                </div>
                <div class="space-y-3">
                  <h4 class="text-lg font-medium text-emerald-400">Track Progress</h4>
                  <div class="space-y-2">
                    <div class="flex items-center space-x-2 text-gray-300">
                      <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                      <span>Organize word bundles</span>
                    </div>
                    <div class="flex items-center space-x-2 text-gray-300">
                      <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
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
    </div>
  </transition>
</template>
