<script setup lang="ts">
import { useTemplateRef } from 'vue'
import type { League, Match, Prediction } from '@/data/matches'
import { dateLabel, timeLabel, leagueName, isMatchLocked, matchStatusLabel } from '@/data/matches'
import AppIcon from './AppIcon.vue'
import TeamBadge from './TeamBadge.vue'
import LeagueFilter from './LeagueFilter.vue'
import { useListMotion } from '@/composables/useListMotion'
const props = defineProps<{
  matches: Match[]
  predictions: Record<string, Prediction>
  now: number
  loading: boolean
  total: number
}>()
const league = defineModel<League>('league', { required: true })
const onlyArsenal = defineModel<boolean>('onlyArsenal', { required: true })
defineEmits<{ predict: [match: Match]; viewAll: [] }>()
const viewport = useTemplateRef<HTMLElement>('viewport')
const { beforeLeave, clearLeavingSize } = useListMotion(
  viewport,
  () => `${league.value}:${props.matches.map((m) => m.id).join('|')}`,
)
</script>
<template>
  <section class="matches-section panel">
    <div class="section-heading">
      <div>
        <h3>
          赛程安排 <span class="count-label">{{ total }}</span>
        </h3>
        <p>下一次哨响之前，写下你的答案。</p>
      </div>
      <span class="muted tiny">北京时间 UTC+8</span>
    </div>
    <div class="match-filters">
      <LeagueFilter v-model="league" />
      <label class="arsenal-toggle"
        ><input v-model="onlyArsenal" type="checkbox" /><span class="toggle-track"></span
        >只看阿森纳</label
      >
    </div>
    <div ref="viewport" class="fixture-viewport">
      <TransitionGroup
        name="fixture"
        tag="div"
        class="match-cards"
        @before-leave="beforeLeave"
        @after-leave="clearLeavingSize"
        @before-enter="clearLeavingSize"
        @leave-cancelled="clearLeavingSize"
      >
        <article
          v-for="(match, index) in matches"
          :key="`${league}:${match.id}`"
          class="match-card"
          :style="{ '--fixture-delay': `${120 + Math.min(index, 5) * 45}ms` }"
        >
          <div class="card-top">
            <span class="competition" :class="match.league"
              ><AppIcon :name="match.league === 'pl' ? 'cup' : 'ball'" :size="13" />{{
                leagueName(match.league)
              }}<i>·</i>{{ match.round }}</span
            ><span class="fixture-date"
              >{{ dateLabel(match.kickoff) }}<b>{{ timeLabel(match.kickoff) }}</b></span
            >
          </div>
          <div class="fixture-teams">
            <div>
              <TeamBadge :team="match.home" :size="38" /><span>{{ match.home.name }}</span
              ><small>主</small>
            </div>
            <span class="fixture-vs">vs</span>
            <div>
              <TeamBadge :team="match.away" :size="38" /><span>{{ match.away.name }}</span
              ><small>客</small>
            </div>
          </div>
          <div class="card-bottom">
            <span :class="{ predicted: predictions[match.id] }"
              ><AppIcon :name="predictions[match.id] ? 'check' : 'clock'" :size="13" />{{
                predictions[match.id]
                  ? `我的预测 ${predictions[match.id]!.home} : ${predictions[match.id]!.away}`
                  : matchStatusLabel(match, now)
              }}</span
            ><button
              :class="{ 'already-predicted': predictions[match.id] }"
              @click="$emit('predict', match)"
            >
              {{ isMatchLocked(match, now) ? '查看' : predictions[match.id] ? '修改' : '预测'
              }}<AppIcon name="chevron" :size="12" />
            </button>
          </div>
        </article>
        <div v-if="!matches.length" :key="`${league}:empty`" class="empty-state">
          <AppIcon name="calendar" :size="32" />
          <h4>{{ loading ? '正在同步官方赛程' : '暂无符合条件的赛事' }}</h4>
          <p>
            {{ loading ? '同步完成后会自动显示。' : '试试切换联赛、清空搜索，或点击同步赛程。' }}
          </p>
        </div>
      </TransitionGroup>
    </div>
    <button v-if="total > matches.length" class="all-fixtures" @click="$emit('viewAll')">
      查看全部 {{ total }} 场赛程 <AppIcon name="arrow" :size="13" />
    </button>
    <div class="schedule-note">
      <AppIcon name="info" :size="13" /><span>开赛前可随时修改，开赛后自动锁定预测。</span
      ><span class="demo-note">英超 / UEFA 官网</span>
    </div>
  </section>
</template>
<style scoped>
.all-fixtures {
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
.matches-section {
  padding: 23px 23px 0;
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
.match-cards {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.match-card {
  border: 1px solid var(--md-border, #e9ede6);
  border-radius: 9px;
  overflow: hidden;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    translate 0.2s;
  background: var(--md-surface, white);
}
.match-card:hover {
  border-color: var(--md-accent, #a3bcaa);
  translate: 0 -2px;
  box-shadow: 0 5px 16px #315e420b;
}
.fixture-viewport {
  overflow: hidden;
  padding: 3px;
  margin: -3px;
}
.fixture-move {
  transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
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
.card-top {
  padding: 13px 12px 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.competition {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--md-purple, #76667c);
  white-space: nowrap;
}
.competition.ucl {
  color: var(--md-blue, #53648e);
}
.competition i {
  font-style: normal;
  color: var(--md-muted, #b0b6b0);
}
.fixture-date {
  font-size: 13px;
  color: var(--md-muted, #9ba39b);
  display: flex;
  gap: 7px;
}
.fixture-date b {
  font-weight: 500;
  color: var(--md-secondary, #69766c);
}
.fixture-teams {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 15px 6px;
}
.fixture-teams > div {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 7px;
  min-width: 50px;
}
.fixture-teams > div > span:nth-child(2) {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}
.fixture-teams small {
  color: var(--md-muted, #a4aaa4);
  font-size: 12px;
  margin-top: -4px;
}
.fixture-vs {
  color: var(--md-muted, #b4bbb3);
  font-size: 16px;
  font-family: Georgia, serif;
  font-style: italic;
  align-self: flex-start;
  margin-top: 12px;
}
.card-bottom {
  border-top: 1px solid var(--md-border, #f0f2ed);
  padding: 9px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}
.card-bottom > span {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--md-muted, #9aa299);
}
.card-bottom > span.predicted {
  color: var(--md-secondary, #39825e);
}
.card-bottom > button {
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 2px;
  color: var(--md-text, #276043);
  background: var(--md-soft, #edf5e9);
  border: 0;
  border-radius: 4px;
  padding: 4px 6px;
}
.card-bottom > button:hover {
  background: var(--md-soft, #dcecd4);
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
  .card-bottom {
    padding: 9px 6px;
  }
  .card-top {
    padding: 12px 8px 0;
  }
  .competition {
    font-size: 12px;
  }
}
@media (max-width: 800px) {
  .match-cards {
    grid-template-columns: 1fr;
  }
  .card-top {
    flex-direction: row;
    justify-content: space-between;
    padding: 15px;
  }
  .fixture-teams {
    padding: 15px 30px;
  }
  .fixture-teams > div {
    flex-direction: row;
    gap: 10px;
  }
  .card-bottom {
    padding: 12px 15px;
  }
  .card-bottom > span,
  .card-bottom > button {
    font-size: 15px;
  }
  .fixture-teams > div > span:nth-child(2) {
    font-size: 17px;
  }
  .fixture-vs {
    align-self: center;
    margin: 0;
  }
  .fixture-teams small {
    margin: 0;
  }
  .competition,
  .fixture-date {
    font-size: 14px;
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
  /* Keep the filter change visible without spatial motion. Override the global
     reduced-motion reset only for these short opacity transitions. */
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
