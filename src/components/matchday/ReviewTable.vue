<script setup lang="ts">
import { useTemplateRef } from 'vue'
import type { League, Match, Prediction } from '@/data/matches'
import { dateLabel, leagueName, outcome } from '@/data/matches'
import TeamBadge from './TeamBadge.vue'
import AppIcon from './AppIcon.vue'
import { useListMotion } from '@/composables/useListMotion'
import { useMatchWindow } from '@/composables/useMatchWindow'
const props = defineProps<{
  matches: Match[]
  league: League
  predictions: Record<string, Prediction>
  full?: boolean
  scope: string
}>()
const viewport = useTemplateRef<HTMLElement>('viewport')
const { visibleMatches, hasMore, showMore } = useMatchWindow(
  () => props.matches,
  () => `${props.league}:${props.full}:${props.scope}`,
  () => 25,
)
const { beforeLeave, clearLeavingSize } = useListMotion(
  viewport,
  () => `${props.league}:${visibleMatches.value.map((m) => m.id).join('|')}`,
)
defineEmits<{ detail: [match: Match]; navigate: [] }>()
</script>
<template>
  <section class="review-panel panel">
    <div class="review-heading">
      <div>
        <h3>{{ full ? '预测与赛果' : '最近复盘' }}<span class="heading-dot"></span></h3>
        <p>让每一次判断，都成为下一次的经验。</p>
      </div>
      <button v-if="!full" class="text-button" @click="$emit('navigate')">
        全部记录<AppIcon name="arrow" :size="14" /></button
      ><span v-else class="muted tiny">{{ matches.length }} 场赛事</span>
    </div>
    <div ref="viewport" class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>比赛</th>
            <th>日期 / 赛事</th>
            <th>我的预测</th>
            <th>实际赛果</th>
            <th>预测结果</th>
            <th><span class="sr-only">详情</span></th>
          </tr>
        </thead>
        <TransitionGroup
          name="review-row"
          tag="tbody"
          @before-leave="beforeLeave"
          @after-leave="clearLeavingSize"
          @before-enter="clearLeavingSize"
          @leave-cancelled="clearLeavingSize"
        >
          <tr
            v-for="(match, index) in visibleMatches"
            :key="`${league}:${match.id}`"
            :style="{ '--review-delay': `${120 + Math.min(index, 5) * 45}ms` }"
          >
            <td>
              <div class="table-teams">
                <TeamBadge :team="match.home" :size="23" /><span>{{ match.home.name }}</span
                ><small>vs</small><TeamBadge :team="match.away" :size="23" /><span>{{
                  match.away.name
                }}</span>
              </div>
            </td>
            <td>
              <span class="table-date">{{ dateLabel(match.kickoff) }}</span
              ><span class="table-league">{{ leagueName(match.league) }}</span>
            </td>
            <td>
              <div class="table-prediction">
                <b>{{
                  predictions[match.id]
                    ? `${predictions[match.id]!.home} : ${predictions[match.id]!.away}`
                    : '—'
                }}</b
                ><small v-if="predictions[match.id]?.sample">示例</small>
              </div>
            </td>
            <td>
              <b class="actual-score">{{ match.actual?.[0] }} : {{ match.actual?.[1] }}</b>
            </td>
            <td>
              <span
                class="result-pill"
                :class="{
                  exact: outcome(match, predictions[match.id]) === '比分命中',
                  direction: outcome(match, predictions[match.id]) === '胜负命中',
                }"
                ><AppIcon
                  v-if="['比分命中', '胜负命中'].includes(outcome(match, predictions[match.id]))"
                  name="check"
                  :size="11"
                />{{ outcome(match, predictions[match.id]) }}</span
              >
            </td>
            <td>
              <button
                class="detail-button"
                :aria-label="`查看${match.home.name}对${match.away.name}复盘`"
                @click="$emit('detail', match)"
              >
                <AppIcon name="chevron" :size="15" />
              </button>
            </td>
          </tr>
        </TransitionGroup>
      </table>
      <div v-if="!matches.length" class="review-empty">暂无符合条件的赛后记录，试试调整筛选。</div>
    </div>
    <button v-if="full && hasMore" class="text-button load-more" @click="showMore">
      加载更多赛果 · 已显示 {{ visibleMatches.length }} / {{ matches.length }} 场
      <AppIcon name="arrow" :size="14" />
    </button>
  </section>
</template>
<style scoped>
.load-more {
  justify-content: center;
  width: 100%;
  padding: 16px;
}
.review-panel {
  padding: 23px 23px 7px;
}
.review-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.review-heading h3 {
  font-size: 19px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}
.heading-dot {
  width: 5px;
  height: 5px;
  background: #a7bf8a;
  border-radius: 50%;
}
.review-heading p {
  font-size: 14px;
  color: var(--md-muted, #98a097);
  margin-top: 6px;
}
.text-button {
  border: 0;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--md-secondary, #8a9688);
  font-size: 14px;
}
.text-button:hover {
  color: var(--md-text, #276043);
}
.table-scroll {
  overflow-x: auto;
  overflow-y: hidden;
}
tbody {
  position: relative;
}
.review-row-move {
  transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
}
.review-row-enter-active {
  pointer-events: none;
  transition:
    opacity 320ms ease,
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: var(--review-delay, 0ms);
}
.review-row-leave-active {
  position: absolute;
  pointer-events: none;
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}
.review-row-enter-from {
  opacity: 0;
  transform: translateY(14px);
}
.review-row-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  white-space: nowrap;
}
th {
  font-size: 13px;
  color: var(--md-muted, #98a096);
  font-weight: 400;
  padding: 10px 10px;
  background: var(--md-soft, #f7f9f5);
}
th:first-child {
  border-radius: 5px 0 0 5px;
  padding-left: 13px;
}
th:last-child {
  border-radius: 0 5px 5px 0;
}
td {
  padding: 14px 10px;
  border-bottom: 1px solid var(--md-border, #f0f2eb);
  font-size: 14px;
}
tr:last-child td {
  border-bottom: 0;
}
.table-teams {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.table-teams small {
  font-size: 13px;
  color: var(--md-muted, #b0b7ac);
  margin: 0 5px;
}
.table-date {
  color: var(--md-secondary, #768571);
  margin-right: 7px;
}
.table-league {
  font-size: 12px;
  color: var(--md-muted, #9ca492);
  padding: 2px 5px;
  background: var(--md-soft, #f1f4ec);
  border-radius: 3px;
}
.table-prediction {
  display: flex;
  align-items: center;
  gap: 5px;
}
.table-prediction b,
.actual-score {
  font-family: 'Bahnschrift', sans-serif;
  font-size: 17px;
  letter-spacing: 1px;
  font-weight: 500;
  color: var(--md-text, #52624f);
}
.table-prediction small {
  font-size: 11px;
  color: var(--md-muted, #adb5a6);
}
.actual-score {
  color: var(--md-text, #253e2b);
}
.result-pill {
  background: var(--md-soft, #f4f2ed);
  color: var(--md-warning, #a29782);
  font-size: 12px;
  padding: 4px 7px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.result-pill.exact {
  background: var(--md-soft, #eaf3e4);
  color: var(--md-secondary, #528343);
}
.result-pill.direction {
  background: var(--md-soft, #edf2e6);
  color: var(--md-secondary, #849260);
}
.detail-button {
  border: 0;
  background: transparent;
  display: flex;
  color: var(--md-muted, #9ca996);
  padding: 5px;
  border-radius: 4px;
}
.detail-button:hover {
  background: var(--md-soft, #edf4e8);
  color: var(--md-text, #276043);
}
.review-empty {
  text-align: center;
  padding: 35px;
  font-size: 16px;
  color: var(--md-secondary, #8c9987);
}
@media (max-width: 700px) {
  .review-panel {
    padding: 20px 15px 7px;
  }
  .table-teams {
    gap: 6px;
  }
  td {
    padding: 15px 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  /* Match the fixture grid: keep a gentle fade when spatial motion is reduced. */
  .review-row-enter-active {
    transition: opacity 280ms ease !important;
    transition-delay: min(var(--review-delay, 0ms), 220ms) !important;
  }
  .review-row-leave-active {
    transition: opacity 120ms ease !important;
  }
  .review-row-enter-from,
  .review-row-leave-to {
    transform: none;
  }
}
</style>
