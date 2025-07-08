<template>
  <section class="h-screen flex flex-col overflow-auto">
    <div class="relative flex justify-center items-center w-full">
      <div class="w-[650px]">
        <Carousel :value="slides">
          <template #item="{ data }">
            <div class="w-full h-full relative">
              <img
                :src="data.image"
                class="w-full h-full object-cover rounded-xl"
              />

              <!-- Slider overlay header -->
              <div
                class="absolute top-12 flex justify-between left-0 right-0 px-12"
              >
                <h1 class="text-xl font-extrabold text-white mb-2">
                  Subturtle
                </h1>
                <section class="rounded-full bg-gray-900 p-2">
                  <Logo size="20" onlyLogo />
                </section>
              </div>
            </div>
          </template>
        </Carousel>
      </div>
    </div>

    <section
      class="px-12 flex flex-col gap-4 bg-gray-950 flex-1 justify-center"
    >
      <!-- Description -->
      <div>
        <h2 class="text-gray-300 text-lg font-semibold text-primary">
          Turn captions into conversations.
        </h2>
        <p class="text-gray-300 text-base mb-6">
          Your favorite shows are now your personal language coaches. Learn
          words in their true context as you stream, then practice speaking them
          with our AI.
        </p>
      </div>

      <!-- Login button -->
      <div class="flex flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <label class="text-gray-300 text-sm">My language</label>
          <SelectTarget class="w-28" />
        </div>
        <Button :disabled="isLogin" label="Login" @click="openLogin">
          <template #icon> <span class="i-solar-login-3-bold" /> </template>
        </Button>
      </div>
    </section>
  </section>
</template>

<script lang="ts" setup>
import Carousel from "primevue/carousel";
import Button from "primevue/button";
import { OpenLoginWindowMessage } from "../../common/types/messaging";
import { isLogin } from "../../plugins/modular-rest";
import { getAsset } from "../helper/assets";
import { watch } from "vue";
import { useRouter } from "vue-router";
import SelectTarget from "../components/inputs/SelectTarget.vue";

const router = useRouter();

function openLogin() {
  chrome.runtime.sendMessage(new OpenLoginWindowMessage());
}

const slides = [
  {
    title: "Welcome to Modular!",
    description: "Modular is a new way to manage your online accounts.",
    image: getAsset("/slides/slide02.png"),
  },
  {
    title: "Secure",
    description:
      "Modular uses the latest security standards to keep your data safe.",
    image: getAsset("/slides/slide01.png"),
  },
];

watch(isLogin, (value) => {
  if (value == true) {
    router.push("/");
  }
});
</script>

<style scoped>
.p-button {
  background: #f91e5a !important;
  border: #f91e5a !important;
}

section::-webkit-scrollbar {
  display: none;
}
</style>
