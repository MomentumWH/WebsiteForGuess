<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useCursorLaserTrail } from '@/composables/useCursorLaserTrail'

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
useCursorLaserTrail(canvas)
</script>

<template>
  <Teleport to="body">
    <canvas ref="canvas" class="cursor-laser-trail" aria-hidden="true"></canvas>
  </Teleport>
</template>

<style scoped>
.cursor-laser-trail {
  position: fixed;
  inset: 0;
  z-index: 200;
  width: 100%;
  height: 100%;
  pointer-events: none;
  contain: strict;
}
</style>
