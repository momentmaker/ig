<script setup lang="ts">
import { currentYear } from '~/utils/longNow'

const year = currentYear()
</script>

<template>
  <footer class="site-footer">
    <a href="https://fz.ax" class="footer-back-link">← fz.ax</a>
    <span class="long-now-line">
      <span class="long-now-zero">0</span>{{ year }} · the long now
    </span>
    <span class="footer-license">CC0 photos · MIT code</span>
  </footer>
</template>

<style scoped>
.site-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1rem;
  font-size: 0.85rem;
  color: var(--ig-fg-faint);
  border-top: 1px solid var(--ig-fg-faint);
  margin-top: 4rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.footer-back-link {
  color: var(--ig-fg-faint);
}

.footer-back-link:hover {
  color: var(--ig-blue);
}

.long-now-line {
  letter-spacing: 0.05em;
}

@media (max-width: 600px) {
  .site-footer {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }
}
</style>
