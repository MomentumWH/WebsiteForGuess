<script setup lang="ts">
import type { League } from '@/data/matches'

withDefaults(defineProps<{ variant?: 'compact' | 'toolbar' }>(), { variant: 'compact' })
const league = defineModel<League>({ required: true })
const filters: { value: League; label: string }[] = [
  { value: 'all', label: '全部赛事' },
  { value: 'pl', label: '英超' },
  { value: 'ucl', label: '欧冠' },
]
</script>

<template>
  <div class="league-filter" :class="variant" role="group" aria-label="按赛事筛选">
    <span
      class="selection-track"
      aria-hidden="true"
      :style="{ transform: `translateX(${filters.findIndex((f) => f.value === league) * 100}%)` }"
    ></span>
    <button
      v-for="filter in filters"
      :key="filter.value"
      type="button"
      :aria-pressed="league === filter.value"
      @click="league = filter.value"
    >
      {{ filter.label }}
    </button>
  </div>
</template>

<style scoped>
.league-filter {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 3px;
  background: var(--md-soft, #f3f5f2);
  border-radius: 7px;
}
.selection-track {
  position: absolute;
  z-index: -1;
  inset: 3px auto 3px 3px;
  width: calc((100% - 6px) / 3);
  border-radius: 5px;
  background: var(--md-surface, #fff);
  box-shadow: 0 1px 5px #233a1912;
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
.league-filter button {
  border: 0;
  background: transparent;
  padding: 6px 13px;
  border-radius: 4px;
  font-size: 14px;
  color: var(--md-secondary, #89928b);
  white-space: nowrap;
  transition: color 180ms ease;
}
.league-filter button[aria-pressed='true'] {
  color: var(--md-text, #2c5741);
  font-weight: 650;
}
.toolbar {
  background: var(--md-soft, #f0f4ec);
}
.toolbar .selection-track {
  background: var(--md-soft, #e1ecd7);
  box-shadow: 0 1px 4px #315e4210;
}
.toolbar button {
  padding: 8px 16px;
  font-size: 15px;
}
@media (max-width: 420px) {
  .league-filter button {
    padding: 6px 10px;
  }
}
</style>
