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
    <span class="footer-license">CC0 photos · <a href="https://github.com/momentmaker/ig" target="_blank" rel="noopener noreferrer" class="footer-source" aria-label="view source on github">MIT code</a></span>
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

.footer-back-link,
.footer-source {
  color: var(--ig-fg-faint);
  text-decoration: none;
  transition: color 0.15s ease;
}

.footer-back-link:hover,
.footer-back-link:focus-visible,
.footer-source:hover,
.footer-source:focus-visible {
  color: var(--ig-yellow);
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
