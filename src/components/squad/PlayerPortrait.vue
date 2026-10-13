<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import type { SquadPlayer } from '@/data/squad'
const props = defineProps<{ player: SquadPlayer }>()
const failed = shallowRef(false)
watch(
  () => props.player.image,
  () => {
    failed.value = false
  },
)
</script>
<template>
  <span class="player-portrait">
    <img
      v-if="player.image && !failed"
      :src="player.image"
      :alt="player.name"
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      @error="failed = true"
    />
    <span v-else class="portrait-fallback" aria-hidden="true">{{
      player.number ?? player.shortName.slice(0, 2).toUpperCase()
    }}</span>
  </span>
</template>
<style scoped>
.player-portrait {
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(145deg, #eef1e5, #dbe5d2);
  border-radius: 50%;
  aspect-ratio: 1;
}
.player-portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}
.portrait-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-family: Georgia, serif;
  font-size: calc(1.1em - 0.4px);
  color: #416045;
}
</style>
