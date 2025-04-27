<template>
  <section class="h-screen flex flex-col justify-between">
    <Carousel :value="slides">
      <template #item="{ data }">
        <img :src="data.image" class="w-full h-auto" />
        <!-- <div class="flex justify-center items-center h-80">
          {{ data.title }}
        </div> -->
      </template>
    </Carousel>
    <section class="fixed top-6 left-12 rounded-full bg-gray-900 p-2">
      <Logo size="100" onlyLogo />
    </section>
    <section
      :class="[
        'overflow-y-auto',
        'py-12 px-12',
        'flex items-center justify-between gap-4',
        'bg-gray-950',
      ]"
    >
      <section class="text-lg">
        <p class="text-gray-300">
          Learning English doesn't have to mean extra time. Now, you can easily
          do it during your daily streaming routines 😉
        </p>
      </section>

      <!-- <div class="w-12 animate-[slide_1s_ease-in-out_infinite] text-gray-300">
        <span class="i-solar-double-alt-arrow-right-bold-duotone text-2xl" />
      </div> -->

      <section class="flex justify-center">
        <Button :disabled="isLogin" label="Login" @click="openLogin">
          <template #icon> <span class="i-solar-login-3-bold" /> </template>
        </Button>
      </section>
    </section>

    <!-- <section class="flex flex-col items-center">
      <h3 class="font-bold text-gray-400">Supported websites</h3>
      <div class="flex justify-center items-center -mt-3">
        <img class="w-20" :src="getAsset('/svg/netflix_logo.svg')" />
        <img class="w-20" :src="getAsset('/svg/youtube_logo.svg')" />
      </div>
    </section> -->
  </section>
</template>

<script lang="ts" setup>
import Carousel from "primevue/carousel";
import Button from "primevue/button";
import { OpenLoginWindowMessage } from "../../common/types/messaging";
import { isLogin } from "../../plugins/modular-rest";
import { getAsset } from "../helper/assets";

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
  // {
  //   title: "Open Source",
  //   description:
  //     "Modular is open source, so you can be sure that your data is safe.",
  //   image: getAsset("/slides/slide01.png"),
  // },
];
</script>

<style scoped>
.p-button {
  background: #f91e5a !important;
  border: #f91e5a !important;
}
</style>
