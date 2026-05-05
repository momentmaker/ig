<script setup lang="ts">
import type { SolsticeKind } from '~/utils/solstice'

interface Props {
  kind: SolsticeKind
  anchor: string
}
const props = defineProps<Props>()

const KIND_LABEL: Record<SolsticeKind, string> = {
  vernal: 'vernal equinox',
  summer: 'summer solstice',
  autumnal: 'autumnal equinox',
  winter: 'winter solstice',
}

const label = KIND_LABEL[props.kind]
</script>

<template>
  <aside class="solstice-banner" role="note">
    <span class="mile">{{ label }}</span>
    <span class="dot">·</span>
    <time :datetime="anchor">{{ anchor }}</time>
  </aside>
</template>

<style scoped>
.solstice-banner {
  display: flex;
  gap: 0.6rem;
  align-items: baseline;
  justify-content: center;
  padding: 0.6rem 1rem;
  font-size: 0.8rem;
  font-variant: small-caps;
  letter-spacing: 0.15em;
  color: var(--ig-fg-faint);
  border-bottom: 1px solid rgba(127, 127, 127, 0.2);
}
.dot { opacity: 0.5; }
</style>
