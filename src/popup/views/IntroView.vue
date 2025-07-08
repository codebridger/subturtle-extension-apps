<template>
  <section class="h-screen flex flex-col overflow-hidden">
    <div class="relative flex justify-center items-center w-full">
      <div class="w-[650px]">
        <Carousel :value="slides">
          <template #item="{ data }">
            <img
              :src="data.image"
              class="w-full h-full object-cover rounded-xl"
            />
            <!-- <div class="flex justify-center items-center h-80">
            {{ data.title }}
          </div> -->
          </template>
        </Carousel>

        <section class="absolute top-6 left-20 rounded-full bg-gray-900 p-2">
          <Logo size="100" onlyLogo />
        </section>
      </div>
    </div>

    <section
      class="px-12 flex flex-col justify-start items-end gap-8 bg-gray-950 flex-1"
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

      <section class="flex flex-row items-center justify-end gap-4">
        <SelectTarget class="w-28" />
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
  // {
  //   title: "Open Source",
  //   description:
  //     "Modular is open source, so you can be sure that your data is safe.",
  //   image: getAsset("/slides/slide01.png"),
  // },
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
