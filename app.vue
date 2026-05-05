<script setup lang="ts">
import { useSolstice } from '~/composables/useSolstice'

const solstice = useSolstice()
</script>

<template>
  <div class="site-root" :data-solstice="solstice.active ? solstice.kind : undefined">
    <SolsticeBanner v-if="solstice.active && solstice.kind !== null && solstice.anchor !== null" :kind="solstice.kind" :anchor="solstice.anchor" />
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

.site-root > main {
  flex: 1;
  /* width: 100% forces main to fill the flex container's cross-axis. Without
     it, sparse content (e.g., count-field with all absolute-positioned cells
     contributes 0 min-content) lets the flex item collapse to its header's
     intrinsic text width — pages then render at ~200px wide on a 1900px
     viewport. */
  width: 100%;
}
</style>
