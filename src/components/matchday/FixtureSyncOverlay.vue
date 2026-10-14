<script setup lang="ts">
import { onUnmounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import type { FootballSource } from '@/data/football'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  phase: 'idle' | 'loading' | 'success' | 'warning' | 'error'
  title: string
  description: string
  sources: FootballSource[]
}>()
const emit = defineEmits<{ dismiss: [] }>()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const titleId = useId()
const descriptionId = useId()
// Keep the last result visible while the native dialog fades out.
const content = shallowRef({ ...props })
watch(
  () => [props.phase, props.title, props.description, props.sources],
  () => {
    if (props.phase !== 'idle') content.value = { ...props }
  },
)
let previousOverflow: string | undefined

function unlockScroll() {
  if (previousOverflow === undefined) return
  document.body.style.overflow = previousOverflow
  previousOverflow = undefined
}
watch(
  [() => props.phase !== 'idle', dialog],
  ([visible]) => {
    const element = dialog.value
    if (!element) return
    if (visible && !element.open) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      element.showModal()
    } else if (!visible && element.open) {
      element.close()
      unlockScroll()
    }
  },
  { flush: 'post' },
)
onUnmounted(() => {
  dialog.value?.close()
  unlockScroll()
})

function sourceLabel(league: 'pl' | 'ucl') {
  if (content.value.phase === 'loading') return '核对中'
  const source = content.value.sources.find((item) => item.league === league)
  if (source?.state === 'success') return '已更新'
  return source?.updatedAt ? '保留缓存' : '暂未获取'
}
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="sync-overlay"
      :class="content.phase"
      :aria-labelledby="titleId"
      :aria-describedby="descriptionId"
      @cancel.prevent="emit('dismiss')"
      @close="unlockScroll"
    >
      <div class="overlay-heading">
        <span class="overlay-brand"><i></i>MATCHDAY<span> / </span>赛事同步</span>
        <button
          type="button"
          class="overlay-close"
          aria-label="关闭同步提示"
          @click="emit('dismiss')"
        >
          <AppIcon name="close" :size="17" />
        </button>
      </div>
      <div class="sync-illustration" aria-hidden="true">
        <span class="halo"></span>
        <span v-if="content.phase === 'loading'" class="orbit orbit-outer"></span>
        <span v-if="content.phase === 'loading'" class="orbit orbit-inner"></span>
        <span class="emblem">
          <AppIcon
            :name="
              content.phase === 'loading' ? 'ball' : content.phase === 'success' ? 'check' : 'info'
            "
            :size="32"
          />
        </span>
        <span class="illustration-dot dot-one"></span>
        <span class="illustration-dot dot-two"></span>
      </div>
      <div class="overlay-copy" role="status" aria-live="polite" aria-atomic="true">
        <h2 :id="titleId">{{ content.title }}</h2>
        <p :id="descriptionId">{{ content.description }}</p>
      </div>
      <div class="competition-status">
        <div v-for="league in ['pl', 'ucl'] as const" :key="league" class="competition">
          <AppIcon :name="league === 'pl' ? 'cup' : 'ball'" :size="16" />
          <span>{{ league === 'pl' ? '英超' : '欧冠' }}</span>
          <small>{{ sourceLabel(league) }}</small>
        </div>
      </div>
      <div
        class="progress-track"
        :class="{ complete: content.phase === 'success' }"
        aria-hidden="true"
      >
        <span v-if="content.phase === 'loading' || content.phase === 'success'"></span>
      </div>
      <p class="overlay-footnote">
        {{ content.phase === 'loading' ? '同步完成后自动收起' : '即将返回你的赛事工作台' }}
      </p>
    </dialog>
  </Teleport>
</template>

<style scoped>
.sync-overlay {
  position: fixed;
  inset: 0;
  box-sizing: border-box;
  width: min(420px, calc(100vw - 40px));
  max-height: calc(100dvh - 40px);
  margin: auto;
  padding: 22px 30px 23px;
  overflow: auto;
  border: 1px solid var(--md-border, #e3ebdc);
  border-radius: 20px;
  color: var(--md-text, #315e42);
  background:
    radial-gradient(ellipse at 50% 27%, var(--md-soft, #edf4e5), transparent 62%),
    var(--md-soft, #fcfdf9);
  box-shadow:
    0 28px 100px #0f291d33,
    0 4px 16px #152e1912;
  font-family: inherit;
  text-align: center;
  opacity: 0;
  transform: translateY(10px) scale(0.97);
  transition:
    opacity 220ms ease,
    transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
    display 280ms allow-discrete,
    overlay 280ms allow-discrete;
}
.sync-overlay[open] {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.sync-overlay::backdrop {
  background: #142b2280;
  backdrop-filter: blur(6px) saturate(0.8);
  opacity: 0;
  transition:
    opacity 240ms ease,
    display 280ms allow-discrete,
    overlay 280ms allow-discrete;
}
.sync-overlay[open]::backdrop {
  opacity: 1;
}
@starting-style {
  .sync-overlay[open] {
    opacity: 0;
    transform: translateY(10px) scale(0.97);
  }
  .sync-overlay[open]::backdrop {
    opacity: 0;
  }
}
.overlay-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.overlay-brand {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--md-secondary, #809174);
}
.overlay-brand i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #7da15d;
}
.overlay-brand > span {
  color: var(--md-muted, #c3ccbc);
}
.overlay-close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-right: -8px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--md-secondary, #8a9882);
  cursor: pointer;
}
.overlay-close:hover {
  color: var(--md-text, #315e42);
  background: var(--md-soft, #eaf1e3);
}
.overlay-close:focus-visible {
  outline: 2px solid var(--md-accent, #7d9b5d);
  outline-offset: 3px;
}
.sync-illustration {
  position: relative;
  display: grid;
  place-items: center;
  width: 126px;
  height: 126px;
  margin: 23px auto 21px;
}
.halo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid var(--md-border, #dce8d1);
  background: var(--md-soft, #e9f2e088);
}
.emblem {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 1px solid var(--md-border, #deead3);
  background: var(--md-soft, #fcfdf9);
  box-shadow: 0 4px 18px #5673390a;
}
.orbit {
  position: absolute;
  border: 2px solid transparent;
  border-radius: 50%;
}
.orbit-outer {
  inset: 0;
  border-top-color: var(--md-accent, #759e55);
  border-right-color: var(--md-accent, #b9d299);
  animation: sync-orbit 2.5s linear infinite;
}
.orbit-inner {
  inset: 12px;
  border-bottom-color: var(--md-accent, #9bbd7f);
  animation: sync-orbit 3.2s linear infinite reverse;
}
.illustration-dot {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #9cba7b;
}
.dot-one {
  top: 13px;
  left: 0;
}
.dot-two {
  right: -6px;
  bottom: 23px;
  width: 3px;
  height: 3px;
  background: var(--md-selected, #bfd1ac);
}
.overlay-copy h2 {
  margin: 0;
  font-size: 23px;
  font-weight: 650;
  letter-spacing: -0.3px;
  color: var(--md-text, #284f36);
}
.overlay-copy p {
  max-width: 290px;
  margin: 10px auto 0;
  font-size: 16px;
  line-height: 1.9;
  color: var(--md-secondary, #83917c);
}
.competition-status {
  display: flex;
  gap: 10px;
  margin: 25px 0 22px;
}
.competition {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  padding: 11px 12px;
  border: 1px solid var(--md-border, #e4ebdd);
  border-radius: 8px;
  background: var(--md-glass, #ffffffa6);
  font-size: 15px;
}
.competition > svg {
  color: var(--md-muted, #91a77d);
}
.competition small {
  margin-left: auto;
  font-size: 13px;
  color: var(--md-muted, #95a08c);
  white-space: nowrap;
}
.progress-track {
  height: 3px;
  border-radius: 3px;
  background: var(--md-soft, #e8eedf);
  overflow: hidden;
}
.progress-track span {
  display: block;
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, transparent, #9dbe7d, #517d45, transparent);
  animation: sync-sweep 1.8s ease-in-out infinite;
}
.progress-track.complete span {
  width: 100%;
  animation: none;
  background: #91b573;
}
.overlay-footnote {
  margin: 12px 0 0;
  font-size: 14px;
  color: var(--md-muted, #a0ab96);
}
.success .emblem svg {
  stroke-dasharray: 30;
  animation: sync-check 380ms ease-out both;
}
.warning .emblem,
.error .emblem {
  color: var(--md-warning, #ac8749);
  border-color: var(--md-border, #eadfc7);
  background: var(--md-soft, #fffcf5);
}
@keyframes sync-orbit {
  to {
    transform: rotate(360deg);
  }
}
@keyframes sync-sweep {
  from {
    transform: translateX(-110%);
  }
  to {
    transform: translateX(360%);
  }
}
@keyframes sync-check {
  from {
    stroke-dashoffset: 30;
  }
  to {
    stroke-dashoffset: 0;
  }
}
@media (max-width: 520px) {
  .sync-overlay {
    padding: 18px 22px 22px;
    border-radius: 17px;
  }
  .sync-illustration {
    margin-top: 18px;
  }
  .overlay-copy h2 {
    font-size: 22px;
  }
  .competition {
    gap: 5px;
    padding: 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sync-overlay,
  .sync-overlay::backdrop {
    transition: none;
  }
  .sync-overlay *,
  .sync-overlay *::before {
    animation: none !important;
  }
  .progress-track span {
    width: 100%;
    opacity: 0.6;
  }
}
</style>
