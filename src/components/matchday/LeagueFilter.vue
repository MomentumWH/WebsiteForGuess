<script setup lang="ts">
import type { League } from '@/data/matches'
import LiquidGlassTabs from './LiquidGlassTabs.vue'

withDefaults(defineProps<{ variant?: 'compact' | 'toolbar'; label?: string }>(), {
  variant: 'compact',
  label: '按赛事筛选',
})
const league = defineModel<League>({ required: true })
const filters: { value: League; label: string }[] = [
  { value: 'all', label: '全部赛事' },
  { value: 'pl', label: '英超' },
  { value: 'ucl', label: '欧冠' },
]
</script>

<template>
  <LiquidGlassTabs
    v-model="league"
    class="league-filter"
    :items="filters"
    :variant="variant"
    :label="label"
  />
</template>
