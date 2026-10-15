<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import type { Team } from '@/data/matches'
import { teamBadgeSources } from '@/data/teamBadges'
const props = withDefaults(defineProps<{ team: Team; size?: number }>(), { size: 42 })
const attempt = shallowRef(0)
const sources = computed(() => teamBadgeSources(props.team))
const imageUrl = computed(() => sources.value[attempt.value])
watch(
  [() => props.team, () => sources.value.join('\n')],
  () => {
    attempt.value = 0
  },
  { flush: 'sync' },
)
</script>
<template>
  <span class="team-badge" :style="{ width: `${size}px`, height: `${size}px` }"
    ><img
      v-if="imageUrl"
      :key="imageUrl"
      :src="imageUrl"
      :alt="`${team.name}队徽`"
      decoding="async"
      referrerpolicy="no-referrer"
      @error="attempt++"
    /><span
      v-else
      class="badge-fallback"
      :style="{ background: team.color }"
      role="img"
      :aria-label="`${team.name}队徽暂不可用`"
      :title="`${team.name}队徽暂不可用`"
      >{{ team.short }}</span
    ></span
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
