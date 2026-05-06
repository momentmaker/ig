<script setup lang="ts">
interface Props {
  prevHref?: string | null
  allHref: string
  allLabel: string
  nextHref?: string | null
}
withDefaults(defineProps<Props>(), { prevHref: null, nextHref: null })
</script>

<template>
  <nav class="permalink-nav">
    <a v-if="prevHref !== null" :href="prevHref" class="nav-link">← previous</a>
    <a :href="allHref" class="nav-link">all {{ allLabel }}</a>
    <a v-if="nextHref !== null" :href="nextHref" class="nav-link">next →</a>
  </nav>
</template>

<style scoped>
.permalink-nav { display: flex; gap: 1.5rem; align-items: center; }
.nav-link {
  font-size: 0.85rem;
  font-variant: small-caps;
  letter-spacing: 0.1em;
  color: var(--ig-fg-faint);
  text-decoration: none;
}
.nav-link:hover,
.nav-link:focus-visible { color: var(--ig-yellow); }
</style>
