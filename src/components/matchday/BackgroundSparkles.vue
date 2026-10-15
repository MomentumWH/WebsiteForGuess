<script setup lang="ts">
import { onMounted, onScopeDispose, shallowRef, type CSSProperties } from 'vue'

const visible = shallowRef(true)
const particles = Array.from({ length: 108 }, (_, index) => {
  const cell = (index * 31) % 108
  const jitter = ((index * 37 + 11) % 97) / 97
  return {
    id: index,
    star: index % 9 === 0,
    style: {
      left: `${2 + (((cell % 12) + 0.2 + jitter * 0.6) / 12) * 96}%`,
      top: `${3 + ((Math.floor(cell / 12) + 0.2 + jitter * 0.6) / 9) * 94}%`,
      '--size': `${1.2 + (index % 5) * 0.35}px`,
      '--color': `var(--sparkle-${['gold', 'mint', 'pearl'][index % 3]})`,
      '--drift-x': `${(index % 2 ? 1 : -1) * (6 + (index % 5) * 3)}px`,
      '--drift-y': `${-12 - (index % 7) * 4}px`,
      '--drift-duration': `${18 + (index % 7) * 3}s`,
      '--twinkle-duration': `${4.2 + (index % 6) * 0.7}s`,
      '--delay': `${-index * 1.37}s`,
    } as CSSProperties,
  }
})

function onVisibilityChange() {
  visible.value = document.visibilityState === 'visible'
}
onMounted(() => {
  onVisibilityChange()
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onScopeDispose(() => document.removeEventListener('visibilitychange', onVisibilityChange))
</script>

<template>
  <div class="background-sparkles" :class="{ 'is-paused': !visible }" aria-hidden="true">
    <span
      v-for="particle in particles"
      :key="particle.id"
      class="sparkle-drift"
      :style="particle.style"
    >
      <i class="sparkle-light" :class="{ 'sparkle-star': particle.star }"></i>
    </span>
  </div>
</template>

<style scoped>
.background-sparkles {
  --sparkle-gold: #bc943d;
  --sparkle-mint: #67a584;
  --sparkle-pearl: #95a57d;
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  contain: strict;
  opacity: 0.62;
}
:global(html[data-matchday-theme='dark']) .background-sparkles {
  --sparkle-gold: #f0d394;
  --sparkle-mint: #a2e4c5;
  --sparkle-pearl: #e1e9d0;
  opacity: 0.88;
}
.sparkle-drift {
  position: absolute;
  width: var(--size);
  height: var(--size);
  color: var(--color);
  animation: sparkle-drift var(--drift-duration) ease-in-out var(--delay) infinite alternate;
}
.sparkle-light {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: currentColor;
  box-shadow:
    0 0 4px 1px color-mix(in srgb, currentColor 48%, transparent),
    0 0 11px 2px color-mix(in srgb, currentColor 15%, transparent);
  animation: sparkle-twinkle var(--twinkle-duration) ease-in-out var(--delay) infinite;
}
.sparkle-star::before,
.sparkle-star::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 7px;
  height: 1px;
  background: linear-gradient(90deg, transparent, currentColor, transparent);
  transform: translate(-50%, -50%);
  opacity: 0.7;
}
.sparkle-star::after {
  transform: translate(-50%, -50%) rotate(90deg);
}
.is-paused .sparkle-drift,
.is-paused .sparkle-light {
  animation-play-state: paused;
}
@keyframes sparkle-drift {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(var(--drift-x), var(--drift-y), 0);
  }
}
@keyframes sparkle-twinkle {
  0%,
  100% {
    opacity: 0.12;
    transform: scale(0.72);
  }
  45% {
    opacity: 0.8;
    transform: scale(1.12);
  }
  70% {
    opacity: 0.3;
    transform: scale(0.9);
  }
}
@media (max-width: 640px) {
  .sparkle-drift:nth-child(n + 49) {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sparkle-drift,
  .sparkle-light {
    animation: none;
  }
  .sparkle-light {
    opacity: 0.32;
  }
}
</style>
