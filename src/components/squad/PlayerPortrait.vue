<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import type { SquadPlayer } from '@/data/squad'
const props = defineProps<{ player: SquadPlayer }>()
const failed = shallowRef(false)
// 注释修改时间：2026-10-22
// 用途与逻辑：重置头像加载失败标记，监听头像地址变化以允许新图片重新尝试加载。
watch(
  () => props.player.image,
  () => {
    // 头像地址更新后允许重新加载，避免沿用旧图片的失败状态。
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
  background: linear-gradient(145deg, var(--md-soft, #eef1e5), var(--md-soft, #dbe5d2));
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
  color: var(--md-text, #416045);
}
</style>
