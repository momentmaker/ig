<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue'

export interface LightboxEntry {
  url: string
  alt: string
  caption: string
}

interface Props {
  entry: LightboxEntry | null
  hasPrev?: boolean
  hasNext?: boolean
}
const props = withDefaults(defineProps<Props>(), { hasPrev: false, hasNext: false })
const emit = defineEmits<{
  close: []
  prev: []
  next: []
}>()

function onKey(e: KeyboardEvent): void {
  if (props.entry === null) return
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowLeft' && props.hasPrev) emit('prev')
  if (e.key === 'ArrowRight' && props.hasNext) emit('next')
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
})

watch(() => props.entry, (e) => {
  if (e !== null && typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden'
  }
  else if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <div v-if="entry !== null" class="lightbox" role="dialog" aria-modal="true">
    <div class="lightbox-backdrop" @click="emit('close')" />
    <button
      v-if="hasPrev"
      type="button"
      class="chevron chevron-prev"
      aria-label="previous"
      @click.stop="emit('prev')"
    >
      ←
    </button>
    <figure class="lightbox-figure">
      <div class="lightbox-photo-frame">
        <img
          :src="entry.url"
          :alt="entry.alt"
          class="lightbox-photo"
        >
      </div>
      <figcaption class="lightbox-caption">{{ entry.caption }}</figcaption>
    </figure>
    <button
      v-if="hasNext"
      type="button"
      class="chevron chevron-next"
      aria-label="next"
      @click.stop="emit('next')"
    >
      →
    </button>
    <button type="button" class="lightbox-close" aria-label="close" @click.stop="emit('close')">×</button>
  </div>
</template>

<style scoped>
.lightbox {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center;
}
.lightbox-backdrop {
  position: absolute; inset: 0;
  background: rgba(0, 0, 0, 0.85);
  cursor: pointer;
}
.lightbox-figure {
  position: relative; z-index: 1;
  margin: 0; padding: 1rem;
  display: flex; flex-direction: column; align-items: center; gap: 1rem;
  max-width: 90vw; max-height: 90vh;
}
.lightbox-photo-frame {
  width: min(80vh, 80vw);
  aspect-ratio: 1;
  clip-path: polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%);
  overflow: hidden;
  display: block;
  /* Stacked drop-shadows fake a hex outline that follows the clip-path edge.
     Four 1-pixel shadows in N/S/E/W form a continuous 1px ring. Two layers
     of three sub-pixel offsets give a softer 2px ring. */
  filter:
    drop-shadow(2px 0 0 var(--ig-yellow))
    drop-shadow(-2px 0 0 var(--ig-yellow))
    drop-shadow(0 2px 0 var(--ig-yellow))
    drop-shadow(0 -2px 0 var(--ig-yellow));
}
.lightbox-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.lightbox-caption {
  font-size: 0.85rem;
  font-variant: small-caps;
  letter-spacing: 0.1em;
  color: #f7f7f0;
}
.chevron {
  position: absolute; z-index: 2;
  top: 50%; transform: translateY(-50%);
  width: 48px; height: 48px;
  background: rgba(0, 0, 0, 0.5);
  color: #f7f7f0;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}
.chevron-prev { left: 1rem; }
.chevron-next { right: 1rem; }
.lightbox-close {
  position: absolute; top: 1rem; right: 1rem; z-index: 2;
  width: 48px; height: 48px;
  background: rgba(0, 0, 0, 0.5);
  color: #f7f7f0;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}
</style>
