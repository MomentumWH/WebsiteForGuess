<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { heroSlides, type HeroDestination } from '@/data/heroSlides'
import { useHeroCarousel } from '@/composables/useHeroCarousel'
import AppIcon from './AppIcon.vue'

defineEmits<{ navigate: [destination: HeroDestination] }>()
const root = useTemplateRef<HTMLElement>('root')
const {
  activeIndex,
  progressKey,
  autoplay,
  canAutoplay,
  reducedMotion,
  hovered,
  focused,
  interval,
  select,
  next,
  previous,
  toggleAutoplay,
} = useHeroCarousel(root, heroSlides.length)

// 注释修改时间：2026-10-22
// 用途与逻辑：处理轮播焦点离开，仅在新焦点不属于轮播容器时解除聚焦状态。
function onFocusOut(event: FocusEvent) {
  // 检查下一个焦点是否仍位于轮播内部，只有真正离开容器才解除聚焦。
  if (!(event.relatedTarget instanceof HTMLElement) || !root.value?.contains(event.relatedTarget)) {
    focused.value = false
  }
}
</script>

<template>
  <section
    ref="root"
    class="hero-carousel"
    :class="[`scene-${heroSlides[activeIndex]!.id}`, { 'is-playing': canAutoplay }]"
    :style="{ '--slide-duration': `${interval}ms` }"
    aria-label="探索赛事工作台"
    aria-roledescription="轮播图"
    @pointerenter="hovered = $event.pointerType === 'mouse'"
    @pointerleave="hovered = false"
    @focusin="focused = true"
    @focusout="onFocusOut"
    @keydown.left.prevent="previous"
    @keydown.right.prevent="next"
  >
    <div class="carousel-backdrop" aria-hidden="true"></div>
    <header class="carousel-header">
      <span class="carousel-brand"><i></i> FOR THE GAME. FOR THE GUNNERS.</span>
      <div class="carousel-controls">
        <button
          class="carousel-control autoplay-control"
          type="button"
          :aria-label="autoplay ? '暂停自动轮播' : '开始自动轮播'"
          :aria-pressed="autoplay"
          :title="autoplay ? '暂停自动轮播' : '开始自动轮播'"
          @click="toggleAutoplay"
        >
          <AppIcon :name="autoplay ? 'pause' : 'play'" :size="13" />
        </button>
        <span class="slide-counter" aria-hidden="true">0{{ activeIndex + 1 }} / 04</span>
        <button
          class="carousel-control previous-control"
          type="button"
          aria-label="上一张"
          @click="previous"
        >
          <AppIcon name="chevron" :size="15" />
        </button>
        <button class="carousel-control" type="button" aria-label="下一张" @click="next">
          <AppIcon name="chevron" :size="15" />
        </button>
      </div>
    </header>

    <div class="carousel-stage">
      <article
        v-for="(slide, index) in heroSlides"
        :key="slide.id"
        class="carousel-slide"
        :class="{ 'is-active': activeIndex === index }"
        :inert="activeIndex !== index"
        :aria-hidden="activeIndex !== index"
        :aria-label="`${index + 1} / ${heroSlides.length} · ${slide.label}`"
        aria-roledescription="幻灯片"
      >
        <span class="slide-eyebrow">{{ slide.eyebrow }}</span>
        <h2 class="slide-title">
          {{ slide.title[0] }}<br /><span>{{ slide.title[1] }}</span>
        </h2>
        <p class="slide-description">{{ slide.description[0] }}<br />{{ slide.description[1] }}</p>
        <button
          class="slide-link"
          type="button"
          :aria-label="`前往${slide.label}`"
          @click="$emit('navigate', slide.id)"
        >
          {{ slide.action }}<AppIcon name="arrow" :size="18" />
        </button>
        <span class="slide-caption"><AppIcon name="pin" :size="12" />{{ slide.caption }}</span>

        <svg class="slide-art" viewBox="0 0 180 210" fill="none" aria-hidden="true">
          <template v-if="slide.id === 'predict'">
            <circle cx="90" cy="92" r="63" />
            <circle cx="90" cy="92" r="42" />
            <circle cx="90" cy="92" r="21" />
            <path class="art-accent" d="m90 92 63-63m-27 0h27v27" />
            <path d="M42 181h96M57 191h66" />
          </template>
          <template v-else-if="slide.id === 'squad'">
            <rect x="25" y="12" width="130" height="186" rx="3" />
            <path d="M25 105h130M65 12v26h50V12M65 198v-26h50v26" />
            <circle cx="90" cy="105" r="18" />
            <g class="art-players">
              <circle cx="90" cy="180" r="5" />
              <circle cx="43" cy="141" r="5" />
              <circle cx="75" cy="150" r="5" />
              <circle cx="106" cy="150" r="5" />
              <circle cx="137" cy="141" r="5" />
              <circle cx="55" cy="98" r="5" />
              <circle cx="90" cy="112" r="5" />
              <circle cx="125" cy="98" r="5" />
              <circle cx="48" cy="59" r="5" />
              <circle cx="90" cy="45" r="5" />
              <circle cx="132" cy="59" r="5" />
            </g>
          </template>
          <template v-else-if="slide.id === 'review'">
            <rect x="32" y="20" width="120" height="172" rx="10" />
            <path d="M64 20v-8h56v8M58 71h58M58 112h58M58 153h58" />
            <path class="art-accent" d="m119 61 8 8 17-20m-25 53 8 8 17-20m-25 53 8 8 17-20" />
          </template>
          <template v-else>
            <path d="M24 35v145h135M24 135h135M24 90h135M24 45h135" />
            <path class="art-accent" d="m34 148 31-35 30 14 48-66" />
            <circle cx="34" cy="148" r="5" />
            <circle cx="65" cy="113" r="5" />
            <circle cx="95" cy="127" r="5" />
            <circle cx="143" cy="61" r="5" />
          </template>
        </svg>
      </article>
    </div>

    <div class="carousel-navigation" role="group" aria-label="选择轮播内容">
      <button
        v-for="(slide, index) in heroSlides"
        :key="slide.id"
        class="slide-selector"
        :class="{ 'is-selected': activeIndex === index }"
        type="button"
        :aria-label="`显示${slide.label}介绍`"
        :aria-pressed="activeIndex === index"
        @click="select(index)"
      >
        <span class="selector-track"
          ><i
            :key="`${activeIndex}-${progressKey}`"
            :class="{ 'has-progress': activeIndex === index && !reducedMotion }"
          ></i
        ></span>
        <span class="selector-label"
          ><AppIcon :name="slide.icon" :size="14" />{{ slide.label }}</span
        >
      </button>
    </div>
    <span class="sr-only" :aria-live="canAutoplay ? 'off' : 'polite'" aria-atomic="true">
      第 {{ activeIndex + 1 }} 张，共 {{ heroSlides.length }} 张：{{
        heroSlides[activeIndex]!.label
      }}
    </span>
  </section>
</template>

<style scoped>
.hero-carousel {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border-radius: 15px;
  color: #f5f8ef;
  background: #12392c;
  --slide-accent: #d8f6a9;
}
.carousel-backdrop {
  position: absolute;
  z-index: -1;
  inset: 0;
  background:
    linear-gradient(90deg, #092f25f5, #092f25d6 45%, #092f2573),
    url('/images/stadium.webp') 70% 53% / cover;
}
.scene-squad {
  --slide-accent: #e7e3ad;
}
.scene-review {
  --slide-accent: #bde5dd;
}
.scene-stats {
  --slide-accent: #c8d9ff;
}
.carousel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 26px 0;
}
.carousel-brand {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  letter-spacing: 1.3px;
  color: #c8dbca;
}
.carousel-brand i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--slide-accent);
  flex-shrink: 0;
}
.carousel-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.carousel-control {
  display: grid;
  place-items: center;
  width: 28px;
  height: 30px;
  border: 1px solid #d8ebc626;
  border-radius: 5px;
  background: #163e2c66;
  color: #d7e3ce;
}
.carousel-control:hover {
  background: #d8ebc622;
  color: white;
}
.previous-control svg {
  transform: rotate(180deg);
}
.autoplay-control {
  border-color: transparent;
}
.slide-counter {
  font:
    12px Bahnschrift,
    sans-serif;
  letter-spacing: 1px;
  color: #c1d4b9;
  margin: 0 5px;
  white-space: nowrap;
}
.carousel-stage {
  display: grid;
  flex: 1;
  margin: 15px 26px 20px;
}
.carousel-slide {
  position: relative;
  grid-area: 1 / 1;
  min-width: 0;
  padding: 0 0 4px;
  opacity: 0;
  transform: translateX(20px);
  pointer-events: none;
  visibility: hidden;
  transition:
    opacity 420ms ease,
    transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
    visibility 520ms;
}
.carousel-slide.is-active {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
  visibility: visible;
}
.slide-eyebrow {
  display: block;
  color: var(--slide-accent);
  font-size: 11px;
  letter-spacing: 2px;
  font-weight: 600;
}
.slide-title {
  position: relative;
  z-index: 1;
  margin: 12px 0 10px;
  font-size: 32px;
  line-height: 1.42;
  letter-spacing: 0.4px;
  font-weight: 650;
}
.slide-title span {
  color: var(--slide-accent);
}
.slide-description {
  position: relative;
  z-index: 1;
  color: #c4d6cb;
  font-size: 14px;
  line-height: 1.9;
}
.slide-link {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--slide-accent);
  color: #173e2c;
  padding: 10px 14px;
  margin-top: 17px;
  font-size: 15px;
  font-weight: 650;
}
.slide-link::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
}
.slide-link:hover {
  background: #f0ffdb;
  box-shadow: 0 3px 20px #092b2450;
}
.slide-link:focus-visible::after {
  border: 2px solid var(--slide-accent);
  border-radius: 8px;
  outline-offset: 5px;
}
.slide-caption {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 13px;
  color: #a7bfa9;
  font-size: 11px;
  letter-spacing: 0.5px;
}
.slide-art {
  position: absolute;
  right: -5px;
  bottom: 16px;
  width: 142px;
  height: 166px;
  stroke: var(--slide-accent);
  stroke-width: 1.3;
  opacity: 0.2;
  transform: rotate(-8deg);
  pointer-events: none;
}
.art-accent {
  stroke-width: 3;
}
.art-players {
  fill: var(--slide-accent);
}
.carousel-navigation {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  padding: 0 26px 18px;
}
.slide-selector {
  min-width: 0;
  border: 0;
  background: transparent;
  color: #b6c9b9;
  padding: 3px 0;
  text-align: left;
}
.selector-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  white-space: nowrap;
}
.selector-track {
  display: block;
  height: 2px;
  margin-bottom: 10px;
  background: #d5e8c533;
  overflow: hidden;
}
.selector-track i {
  display: block;
  width: 100%;
  height: 100%;
  background: transparent;
  transform-origin: left;
}
.is-selected {
  color: var(--slide-accent);
}
.is-selected .selector-track i {
  background: var(--slide-accent);
}
.is-selected .has-progress {
  animation: slide-progress var(--slide-duration) linear both;
  animation-play-state: paused;
}
.is-playing .is-selected .has-progress {
  animation-play-state: running;
}
.slide-selector:hover {
  color: #f2ffe3;
}
@keyframes slide-progress {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
@media (min-width: 1500px) {
  .carousel-header {
    padding: 24px 32px 0;
  }
  .carousel-stage {
    margin: 18px 32px 22px;
  }
  .slide-title {
    font-size: 38px;
  }
  .slide-description {
    font-size: 15px;
  }
  .carousel-navigation {
    padding: 0 32px 22px;
  }
  .slide-art {
    width: 175px;
    height: 205px;
    opacity: 0.26;
  }
}
@media (min-width: 701px) and (max-width: 1200px) {
  .carousel-brand {
    max-width: 150px;
    font-size: 9px;
  }
  .carousel-header {
    padding-inline: 20px;
  }
  .carousel-stage {
    margin-inline: 20px;
  }
  .carousel-navigation {
    padding-inline: 20px;
    gap: 10px;
  }
  .selector-label {
    font-size: 12px;
    gap: 4px;
  }
  .selector-label svg {
    display: none;
  }
  .slide-art {
    opacity: 0.12;
  }
  .slide-title {
    font-size: 28px;
  }
}
@media (max-width: 700px) {
  .carousel-header {
    padding: 17px 21px 0;
    gap: 6px;
  }
  .carousel-brand {
    max-width: 145px;
    font-size: 9px;
    letter-spacing: 1px;
  }
  .carousel-stage {
    margin: 20px 21px;
  }
  .slide-title {
    font-size: 28px;
  }
  .slide-description {
    font-size: 13px;
  }
  .slide-eyebrow {
    font-size: 10px;
  }
  .slide-art {
    width: 125px;
    height: 145px;
    opacity: 0.14;
  }
  .carousel-navigation {
    gap: 12px;
    padding: 0 21px 19px;
  }
  .selector-label {
    font-size: 12px;
  }
  .selector-label svg {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .carousel-slide {
    transition: none;
    transform: none;
  }
  .has-progress {
    animation: none !important;
  }
}
</style>
