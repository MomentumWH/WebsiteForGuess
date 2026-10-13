<script setup lang="ts">
import { shallowRef } from 'vue'
import type { Team } from '@/data/matches'
withDefaults(defineProps<{ team: Team; size?: number }>(), { size: 42 })
const failed = shallowRef(false)
const localBadges = [
  'arsenal',
  'city',
  'chelsea',
  'liverpool',
  'tottenham',
  'bayern',
  'madrid',
  'atletico',
  'porto',
]
</script>
<template>
  <span class="team-badge" :style="{ width: `${size}px`, height: `${size}px` }"
    ><img
      v-if="!failed && localBadges.includes(team.id)"
      :src="`/images/${team.id}.${['city', 'chelsea'].includes(team.id) ? 'svg' : 'png'}`"
      :alt="`${team.name}队徽`"
      @error="failed = true"
    /><span v-else class="badge-fallback" :style="{ background: team.color }">{{
      team.short
    }}</span></span
  >
</template>
<style scoped>
.team-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.team-badge img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.badge-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: white;
  font-size: 15px;
  font-weight: 800;
  clip-path: polygon(10% 0, 90% 0, 95% 65%, 50% 100%, 5% 65%);
}
</style>
