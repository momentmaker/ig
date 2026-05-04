<script setup lang="ts">
interface Props {
  name: string
  metric: string
  href: string
  backdropUrl?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  backdropUrl: null,
})
</script>

<template>
  <a :href="props.href" class="practice-tile">
    <span class="tile-clip hex-clip">
      <img
        v-if="props.backdropUrl"
        :src="props.backdropUrl"
        :alt="`latest ${props.name}`"
        class="tile-backdrop"
      >
      <span class="tile-content">
        <span class="tile-name small-caps">{{ props.name }}</span>
        <span class="tile-metric">{{ props.metric }}</span>
      </span>
    </span>
  </a>
</template>

<style scoped>
.practice-tile {
  display: inline-block;
  width: var(--ig-tile-size-desktop);
  height: var(--ig-tile-size-desktop);
  position: relative;
  text-decoration: none;
  color: var(--ig-fg);
  transition: transform 0.3s ease;
}

.practice-tile:hover {
  transform: scale(1.02);
}

.tile-clip {
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
  background: var(--ig-yellow);
  overflow: hidden;
}

.tile-backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.6;
}

.tile-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  z-index: 1;
}

.tile-name {
  font-size: 1.5rem;
  letter-spacing: 0.15em;
}

.small-caps {
  font-variant: small-caps;
  text-transform: lowercase;
}

.tile-metric {
  font-size: 0.95rem;
  color: var(--ig-fg);
  opacity: 0.7;
}

@media (max-width: 600px) {
  .practice-tile {
    width: var(--ig-tile-size-mobile);
    height: var(--ig-tile-size-mobile);
  }
}
</style>
