<script setup lang="ts">
import NavTop from '@/views/frame/NavTop.vue'
import HomeBody from '@/views/frame/HomeBody.vue'
</script>

<template>
  <div class="home-view">
    <NavTop />
    <main class="home-view__body">
      <HomeBody />
    </main>
  </div>
</template>

<style scoped lang="scss">
.home-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  &__body {
    flex: 1;
  }
}
</style>
