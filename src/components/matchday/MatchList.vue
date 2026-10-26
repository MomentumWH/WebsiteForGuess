<script setup lang="ts">
import { useTemplateRef } from 'vue'
import type { League, Match, Prediction } from '@/data/matches'
import AppIcon from './AppIcon.vue'
import MatchFixtureCard from './MatchFixtureCard.vue'
import LeagueFilter from './LeagueFilter.vue'
import { useListMotion } from '@/composables/useListMotion'
import { useFixtureTimeline } from '@/composables/useFixtureTimeline'
const props = defineProps<{
  matches: Match[]
  predictions: Record<string, Prediction>
  now: number
  loading: boolean
  preview?: boolean
  query: string
}>()
const league = defineModel<League>('league', { required: true })
const onlyArsenal = defineModel<boolean>('onlyArsenal', { required: true })
defineEmits<{ predict: [match: Match]; detail: [match: Match]; viewAll: [] }>()
const viewport = useTemplateRef<HTMLElement>('viewport')
const current = useTemplateRef<HTMLElement>('current')
// 注释修改时间：2026-10-22
// 用途与逻辑：初始化赛程时间线，传入响应式比赛、筛选标识与预览数量，协调分页和当前位置。
const {
  past,
  prepending,
  future,
  groups,
  hasEarlier,
  hasMore,
  showEarlier,
  showMore,
  scrollToCurrent,
  showPast,
  onScroll,
} = useFixtureTimeline(
  () => props.matches,
  () => `${league.value}:${onlyArsenal.value}:${props.query}:${props.preview}`,
  () => (props.preview ? 6 : 24),
  viewport,
  current,
)
// 注释修改时间：2026-10-22
// 用途与逻辑：初始化列表离场动画，使用联赛及当前比赛编号序列标识列表变化。
const { beforeLeave, clearLeavingSize } = useListMotion(
  viewport,
  () => `${league.value}:${[...past.value, ...future.value].map((m) => m.id).join('|')}`,
)
</script>
<template>
  <section class="matches-section panel">
    <div class="section-heading">
      <div>
        <h3>
          赛程安排 <span class="count-label">{{ matches.length }}</span>
        </h3>
        <p>
          {{ onlyArsenal ? '当前显示阿森纳赛程' : '当前显示全部球队赛程' }} · 已完赛
          {{ groups.past.length }} 场 · 未完赛 {{ groups.future.length }} 场
        </p>
      </div>
      <span class="muted tiny">北京时间 UTC+8</span>
    </div>
    <div class="match-filters">
      <LeagueFilter v-model="league" /><label class="arsenal-toggle"
        ><input v-model="onlyArsenal" type="checkbox" /><span class="toggle-track"></span
        >只看阿森纳</label
      >
    </div>
    <div v-if="groups.past.length" class="timeline-controls">
      <button class="past-shortcut" @click="showPast">
        <AppIcon name="arrow" :size="13" />向上查看已完赛场次
        <span>{{ groups.past.length }}</span></button
      ><button v-if="groups.future.length" @click="scrollToCurrent">
        回到近期赛程<AppIcon name="chevron" :size="12" />
      </button>
    </div>
    <div
      ref="viewport"
      class="fixture-viewport"
      role="region"
      tabindex="0"
      aria-label="比赛赛程，上方为已完赛场次，下方为近期赛程"
      @scroll.passive="onScroll"
    >
      <div v-if="groups.past.length" class="history-section">
        <button v-if="hasEarlier" class="earlier-fixtures" @click="showEarlier">
          加载更早赛果 · 已显示 {{ past.length }} / {{ groups.past.length }} 场
        </button>
        <div class="timeline-heading">
          <AppIcon name="history" :size="14" /><strong>已完赛</strong
          ><span>{{ hasEarlier ? `最近 ${past.length} 场` : '本赛季已完赛场次' }}</span>
        </div>
        <TransitionGroup
          name="fixture"
          tag="div"
          class="match-cards history-cards"
          :class="{ 'is-prepending': prepending }"
          @before-leave="beforeLeave"
          @after-leave="clearLeavingSize"
          @before-enter="clearLeavingSize"
          @leave-cancelled="clearLeavingSize"
        >
          <MatchFixtureCard
            v-for="(match, index) in past"
            :key="`${league}:${match.id}`"
            :match="match"
            :prediction="predictions[match.id]"
            :now="now"
            :style="{ '--fixture-delay': `${120 + Math.min(index, 5) * 45}ms` }"
            @predict="$emit('predict', $event)"
            @detail="$emit('detail', $event)"
          />
        </TransitionGroup>
      </div>
      <div ref="current" class="current-section" :class="{ 'has-future': groups.future.length }">
        <div
          v-if="groups.past.length && groups.future.length"
          class="timeline-heading current-heading"
        >
          <span class="current-dot"></span><strong>近期赛程</strong><span>向上滚动回看赛果</span>
        </div>
        <TransitionGroup
          name="fixture"
          tag="div"
          class="match-cards upcoming-cards"
          @before-leave="beforeLeave"
          @after-leave="clearLeavingSize"
          @before-enter="clearLeavingSize"
          @leave-cancelled="clearLeavingSize"
        >
          <MatchFixtureCard
            v-for="(match, index) in future"
            :key="`${league}:${match.id}`"
            :match="match"
            :prediction="predictions[match.id]"
            :now="now"
            :style="{ '--fixture-delay': `${120 + Math.min(index, 5) * 45}ms` }"
            @predict="$emit('predict', $event)"
            @detail="$emit('detail', $event)"
          />
          <div v-if="!matches.length" :key="`${league}:empty`" class="empty-state">
            <AppIcon name="calendar" :size="32" />
            <h4>{{ loading ? '正在同步官方赛程' : '暂无符合条件的赛事' }}</h4>
            <p>
              {{ loading ? '同步完成后会自动显示。' : '试试切换联赛、清空搜索，或点击同步赛程。' }}
            </p>
          </div>
        </TransitionGroup>
      </div>
    </div>
    <button
      v-if="preview && (hasMore || hasEarlier)"
      class="all-fixtures"
      @click="$emit('viewAll')"
    >
      查看全部 {{ matches.length }} 场赛程 <AppIcon name="arrow" :size="13" />
    </button>
    <button v-else-if="hasMore" class="all-fixtures" @click="showMore">
      加载更多赛程 · 未完赛已显示 {{ future.length }} / {{ groups.future.length }} 场<AppIcon
        name="arrow"
        :size="13"
      />
    </button>
    <div class="schedule-note">
      <AppIcon name="info" :size="13" /><span>上方回看赛果，下方浏览赛程；开赛前可修改预测。</span
      ><span class="demo-note">英超 / UEFA 官网</span>
    </div>
  </section>
</template>
<style scoped>
.matches-section {
  padding: 23px 23px 0;
  min-width: 0;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.section-heading h3 {
  font-size: 19px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}
.count-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--md-secondary, #6f7c73);
  background: var(--md-soft, #f0f3ef);
  border-radius: 5px;
  padding: 2px 6px;
}
.section-heading p {
  font-size: 14px;
  color: var(--md-muted, #98a099);
  margin-top: 6px;
}
.match-filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 22px 0 18px;
  gap: 10px;
}
.arsenal-toggle {
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
  cursor: pointer;
  color: var(--md-secondary, #748077);
  position: relative;
}
.arsenal-toggle input {
  position: absolute;
  opacity: 0;
  width: 27px;
  height: 18px;
  cursor: pointer;
}
.toggle-track {
  width: 25px;
  height: 14px;
  border-radius: 10px;
  background: var(--md-soft, #d5dcd5);
  padding: 2px;
  display: inline-flex;
  transition: background 0.2s;
}
.toggle-track:before {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--md-surface, #fff);
  transition: transform 0.2s;
}
.arsenal-toggle input:checked + .toggle-track {
  background: #327557;
}
.arsenal-toggle input:checked + .toggle-track:before {
  transform: translateX(11px);
}
.arsenal-toggle input:focus-visible + .toggle-track {
  outline: 2px solid var(--md-accent, #327557);
  outline-offset: 3px;
}
.timeline-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin: -2px 0 12px;
}
.timeline-controls button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: 0;
  padding: 5px 0;
  color: var(--md-secondary, #748077);
  font-size: 13px;
  cursor: pointer;
}
.timeline-controls .past-shortcut {
  color: var(--md-accent, #327557);
}
.past-shortcut svg {
  transform: rotate(-90deg);
}
.past-shortcut > span {
  font-size: 11px;
  border-radius: 4px;
  padding: 2px 5px;
  background: var(--md-soft, #f0f3ef);
}
.fixture-viewport {
  position: relative;
  height: clamp(360px, 60vh, 620px);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 3px 8px 3px 3px;
  margin: -3px -8px -3px -3px;
  scrollbar-width: thin;
  scrollbar-color: var(--md-accent, #a1b99c) transparent;
  overflow-anchor: none;
}
.fixture-viewport:focus-visible {
  outline: 2px solid var(--md-accent, #327557);
  outline-offset: 4px;
  border-radius: 5px;
}
.timeline-heading {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: var(--md-secondary, #748077);
  padding: 11px 0 14px;
}
.timeline-heading > span:last-child {
  margin-left: auto;
  font-size: 12px;
  color: var(--md-muted, #98a099);
}
.current-heading {
  border-top: 1px dashed var(--md-border, #e1e8dc);
  padding-top: 16px;
}
.current-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--md-accent, #327557);
}
.history-section {
  padding-bottom: 18px;
}
.has-future {
  min-height: 100%;
}
.match-cards {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
}
.fixture-move {
  transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}
.is-prepending :deep(.fixture-move),
.is-prepending :deep(.fixture-enter-active) {
  transition: none !important;
}
.fixture-enter-active {
  pointer-events: none;
  transition:
    opacity 320ms ease,
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: var(--fixture-delay, 0ms);
}
.fixture-leave-active {
  position: absolute;
  pointer-events: none;
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}
.fixture-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.97);
}
.fixture-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
.all-fixtures,
.earlier-fixtures {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  border: 0;
  background: var(--md-soft, #f1f6ed);
  color: var(--md-text, #315f49);
  border-radius: 6px;
  padding: 10px;
  margin: 16px 0;
  font-size: 15px;
  cursor: pointer;
}
.earlier-fixtures {
  font-size: 13px;
  margin-top: 0;
}
.schedule-note {
  border-top: 1px solid var(--md-border, #eff1ec);
  margin-top: 19px;
  padding: 13px 0;
  display: flex;
  gap: 5px;
  align-items: center;
  color: var(--md-muted, #9aa199);
  font-size: 13px;
}
.schedule-note > svg {
  flex-shrink: 0;
}
.demo-note {
  margin-left: auto;
  white-space: nowrap;
}
.empty-state {
  grid-column: 1/-1;
  text-align: center;
  padding: 44px 15px;
  color: var(--md-muted, #95a194);
}
.empty-state svg {
  margin-bottom: 10px;
}
.empty-state h4 {
  font-size: 18px;
  color: var(--md-secondary, #596b5a);
}
.empty-state p {
  font-size: 16px;
  margin-top: 8px;
}
@media (max-width: 1050px) {
  .matches-section {
    padding: 19px 16px 0;
  }
  .match-cards {
    gap: 8px;
  }
}
@media (max-width: 800px) {
  .match-cards {
    grid-template-columns: 1fr;
  }
  .fixture-viewport {
    height: clamp(320px, 65dvh, 570px);
  }
  .demo-note {
    display: none;
  }
}
@media (max-width: 420px) {
  .section-heading > .tiny {
    display: none;
  }
  .arsenal-toggle {
    font-size: 13px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .fixture-enter-active {
    transition: opacity 280ms ease !important;
    transition-delay: min(var(--fixture-delay, 0ms), 220ms) !important;
  }
  .fixture-leave-active {
    transition: opacity 120ms ease !important;
  }
  .fixture-enter-from,
  .fixture-leave-to {
    transform: none;
  }
}
</style>
