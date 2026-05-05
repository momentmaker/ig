<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, ref, nextTick } from 'vue'

export interface LightboxEntry {
  url: string
  alt: string
  caption: string
  whisper?: string
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

const closeRef = ref<HTMLButtonElement | null>(null)
const prevRef = ref<HTMLButtonElement | null>(null)
const nextRef = ref<HTMLButtonElement | null>(null)

function focusables(): HTMLButtonElement[] {
  return [closeRef.value, prevRef.value, nextRef.value].filter((el): el is HTMLButtonElement => el !== null)
}

function onTrap(e: KeyboardEvent): void {
  if (e.key !== 'Tab') return
  const items = focusables()
  if (items.length === 0) return
  e.preventDefault()
  const idx = items.indexOf(document.activeElement as HTMLButtonElement)
  const next = e.shiftKey
    ? items[(idx <= 0 ? items.length - 1 : idx - 1)]!
    : items[(idx === items.length - 1 ? 0 : idx + 1)]!
  next.focus()
}

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
  if (typeof document !== 'undefined') document.removeEventListener('keydown', onTrap)
})

watch(() => props.entry, async (e) => {
  if (e !== null && typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onTrap)
    await nextTick()
    closeRef.value?.focus()
  }
  else if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
    document.removeEventListener('keydown', onTrap)
  }
}, { immediate: true })
</script>

<template>
  <div v-if="entry !== null" class="lightbox" role="dialog" aria-modal="true">
    <div class="lightbox-backdrop" @click="emit('close')" />
    <button
      v-if="hasPrev"
      ref="prevRef"
      type="button"
      class="chevron chevron-prev"
      aria-label="previous"
      @click.stop="emit('prev')"
    >
      ←
    </button>
    <figure class="lightbox-figure">
      <div class="lightbox-photo-outer">
        <div class="lightbox-photo-frame">
          <img
            :src="entry.url"
            :alt="entry.alt"
            class="lightbox-photo"
          >
        </div>
      </div>
      <figcaption class="lightbox-caption">{{ entry.caption }}</figcaption>
      <p v-if="entry.whisper" class="lightbox-whisper">{{ entry.whisper }}</p>
    </figure>
    <button
      v-if="hasNext"
      ref="nextRef"
      type="button"
      class="chevron chevron-next"
      aria-label="next"
      @click.stop="emit('next')"
    >
      →
    </button>
    <button ref="closeRef" type="button" class="lightbox-close" aria-label="close" @click.stop="emit('close')">×</button>
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
/* Outer hex is the yellow ring (background color showing through the gap). */
.lightbox-photo-outer {
  width: min(80vh, 80vw);
  aspect-ratio: 1;
  background: var(--ig-yellow);
  clip-path: var(--hex-clip-square);
  display: flex;
  align-items: center;
  justify-content: center;
}
/* Inner hex slightly smaller — same proportional clip on a 99% box. The
   gap between outer and inner reveals the yellow ring. */
.lightbox-photo-frame {
  width: calc(100% - 6px);
  height: calc(100% - 6px);
  clip-path: var(--hex-clip-square);
  overflow: hidden;
  display: block;
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
.lightbox-whisper {
  margin: 0;
  font-size: 0.95rem;
  font-style: italic;
  color: rgba(247, 247, 240, 0.85);
  max-width: 80vw;
  text-align: center;
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
@media (hover: none) {
  .chevron, .lightbox-close {
    width: 56px;
    height: 56px;
    font-size: 1.75rem;
  }
}
</style>
