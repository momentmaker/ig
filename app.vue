<script setup lang="ts">
</script>

<template>
  <div class="site-root">
    <NuxtPage />
    <SiteFooter />
  </div>
</template>

<style>
.site-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.site-root > :first-child {
  flex: 1;
}
</style>
