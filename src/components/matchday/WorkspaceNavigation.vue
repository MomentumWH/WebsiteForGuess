<script setup lang="ts">
import { useTemplateRef } from 'vue'
import AppIcon from './AppIcon.vue'
import { useLiquidGlassNav } from '@/composables/useLiquidGlassNav'

const props = defineProps<{ active: string; pendingCount: number }>()
const navigation = [
  { id: 'overview', name: '赛事总览', icon: 'grid' },
  { id: 'predict', name: '比分预测', icon: 'target' },
  { id: 'squad', name: '球队阵容', icon: 'squad' },
  { id: 'review', name: '预测复盘', icon: 'history' },
  { id: 'stats', name: '数据统计', icon: 'chart' },
] as const
defineEmits<{ select: [section: (typeof navigation)[number]['id']] }>()
const nav = useTemplateRef<HTMLElement>('nav')

// 创建时间：2026-10-28；调用记录：GPT-20261028-001
// 用途与逻辑：向玻璃导航动效提供最新选中栏目，装饰状态与父级页面导航保持单向同步。
function selectedSection() {
  return props.active
}
const { activeRect, activeStyle, hoverStyle, enterPointer, movePointer, focusButton, clearHover } =
  useLiquidGlassNav(nav, selectedSection)
</script>

<template>
  <nav
    ref="nav"
    class="nav-list liquid-glass-nav"
    aria-label="工作台栏目"
    @pointerleave="clearHover"
  >
    <span
      v-if="activeRect"
      class="nav-glass nav-glass-active"
      :style="activeStyle"
      aria-hidden="true"
      ><span class="nav-glass-lens"></span
    ></span>
    <span class="nav-glass nav-glass-hover" :style="hoverStyle" aria-hidden="true"
      ><span class="nav-glass-lens"></span
    ></span>
    <button
      v-for="item in navigation"
      :key="item.id"
      type="button"
      class="nav-button"
      :class="{ active: active === item.id }"
      :data-nav-id="item.id"
      :aria-label="item.name"
      :title="item.name"
      :aria-current="active === item.id ? 'page' : undefined"
      @click="$emit('select', item.id)"
      @pointerenter="enterPointer"
      @pointermove="movePointer"
      @focus="focusButton"
      @blur="clearHover"
    >
      <AppIcon :name="item.icon" :size="19" /><span class="nav-text">{{ item.name }}</span
      ><span v-if="item.id === 'predict'" class="nav-count">{{ pendingCount }}</span
      ><span v-if="active === item.id" class="nav-active-dot" aria-hidden="true"></span>
    </button>
  </nav>
</template>

<style scoped>
.liquid-glass-nav {
  --glass-fill: #e4efd391;
  --glass-edge: #ffffffc9;
  --glass-rim: #55764226;
  --glass-glow: #ffffffb8;
  --glass-shadow: #2b503315;
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
:global(html[data-matchday-theme='dark'] .liquid-glass-nav) {
  --glass-fill: #d3edcf18;
  --glass-edge: #e2f3d94f;
  --glass-rim: #c8e6bc16;
  --glass-glow: #e6ffdf40;
  --glass-shadow: #00000030;
}
.liquid-glass-nav::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -2;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 94% 24%, #b3d89715, transparent 60%),
    radial-gradient(ellipse at 4% 84%, #9ac9c80d, transparent 65%);
}
.nav-glass {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 11px;
  pointer-events: none;
}
.nav-glass-active {
  z-index: -1;
  transition:
    transform 560ms cubic-bezier(0.22, 1, 0.36, 1),
    width 280ms ease,
    height 280ms ease;
}
.nav-glass-lens {
  position: absolute;
  inset: 0;
  display: block;
  overflow: hidden;
  border-radius: inherit;
  border: 1px solid var(--glass-edge);
  background:
    linear-gradient(112deg, #ffffff25, transparent 42%, #d4e9bb12 70%, #ffffff12), var(--glass-fill);
  box-shadow:
    inset 0 1px 0 #ffffff38,
    inset 0 -1px 0 var(--glass-rim),
    inset 1px 0 0 #ffffff17,
    0 5px 16px var(--glass-shadow);
  backdrop-filter: blur(14px) saturate(1.55);
  -webkit-backdrop-filter: blur(14px) saturate(1.55);
  transform-origin: center;
}
.nav-glass-active .nav-glass-lens::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, #ffffff45, transparent 32%, transparent 68%, #d6eabd25);
  opacity: 0.55;
}
.nav-glass-hover {
  z-index: 0;
  opacity: 0;
  transition:
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 220ms ease,
    width 220ms ease,
    height 220ms ease;
}
.nav-glass-hover .nav-glass-lens {
  border-color: var(--glass-rim);
  background:
    radial-gradient(
      ellipse 115px 70px at var(--glass-pointer-x, 50%) var(--glass-pointer-y, 50%),
      var(--glass-glow),
      transparent 80%
    ),
    linear-gradient(120deg, #c9e3b422, #d1e6dc12 60%, #ffffff12);
  box-shadow:
    inset 0 1px 0 #ffffff30,
    inset 0 -1px 0 var(--glass-rim),
    0 6px 18px var(--glass-shadow);
  transform: perspective(420px) rotateX(var(--glass-tilt-x, 0deg))
    rotateY(var(--glass-tilt-y, 0deg));
  transition: transform 160ms ease-out;
}
.nav-button {
  display: flex;
  gap: 12px;
  align-items: center;
  border: 0;
  background: transparent;
  min-height: 43px;
  border-radius: 11px;
  padding: 0 13px;
  color: var(--md-secondary, #87917f);
  font-family: inherit;
  font-size: 16px;
  text-align: left;
  position: relative;
  z-index: 1;
  touch-action: manipulation;
}
.nav-button:hover,
.nav-button:focus-visible {
  color: var(--md-text, #3a6340);
}
.nav-button.active {
  color: var(--md-text, #446b37);
  font-weight: 650;
}
.nav-button > svg {
  flex-shrink: 0;
  transition: filter 220ms ease;
}
.nav-button:hover > svg,
.nav-button.active > svg {
  filter: drop-shadow(0 0 5px #b5d69435);
}
.nav-active-dot {
  margin-left: auto;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--md-accent, #5c823f);
  box-shadow: 0 0 8px #b8d58b52;
}
.nav-count {
  margin-left: auto;
  font-size: 13px;
  background: var(--md-soft, #f0f3eb);
  padding: 1px 6px;
  border-radius: 4px;
  color: var(--md-muted, #9fa88f);
}
.nav-button.active .nav-count {
  display: none;
}
@supports not (backdrop-filter: blur(1px)) {
  .nav-glass-active .nav-glass-lens {
    background: var(--md-selected, #e9f0df);
  }
}
@media (max-width: 800px) {
  .liquid-glass-nav {
    width: 100%;
    gap: 12px;
  }
  .nav-button {
    padding: 0;
    justify-content: center;
    width: 45px;
    height: 45px;
  }
  .nav-text,
  .nav-count,
  .nav-active-dot {
    display: none;
  }
}
@media (max-width: 550px) {
  .liquid-glass-nav {
    flex-direction: row;
    justify-content: space-around;
    gap: 0;
  }
  .nav-button {
    width: 70px;
    min-width: 0;
    height: 52px;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: var(--md-muted, #9ca98b);
  }
  .nav-text {
    display: block;
    font-size: 12px;
    white-space: nowrap;
  }
  .nav-button.active {
    color: var(--md-text, #315b3a);
  }
}
@media (prefers-reduced-motion: reduce) {
  .nav-glass-active,
  .nav-glass-hover,
  .nav-glass-hover .nav-glass-lens,
  .nav-button,
  .nav-button > svg {
    transition: none;
  }
  .nav-glass-hover .nav-glass-lens {
    transform: none;
  }
}
@media (forced-colors: active) {
  .nav-glass {
    display: none;
  }
  .nav-button.active {
    outline: 2px solid Highlight;
    outline-offset: -2px;
  }
}
</style>
