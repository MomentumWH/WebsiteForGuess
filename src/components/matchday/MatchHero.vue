<script setup lang="ts">
import type { Match, Prediction } from '@/data/matches'
import { dateLabel, timeLabel, leagueName } from '@/data/matches'
import AppIcon from './AppIcon.vue'
import TeamBadge from './TeamBadge.vue'
import MatchdayCarousel from './MatchdayCarousel.vue'
import type { HeroDestination } from '@/data/heroSlides'
defineProps<{ match?: Match; prediction?: Prediction; locked: boolean }>()
defineEmits<{ predict: [match: Match]; navigate: [destination: HeroDestination] }>()
function setInert(element: unknown, inert: boolean) {
  if (element instanceof HTMLElement) element.inert = inert
}
</script>
<template>
  <section class="hero-grid" :class="{ 'without-match': !match }">
    <MatchdayCarousel @navigate="$emit('navigate', $event)" />
    <Transition
      name="focus-match"
      mode="out-in"
      @before-leave="setInert($event, true)"
      @before-enter="setInert($event, false)"
    >
      <div v-if="match" :key="match.id" class="next-match panel">
        <div class="next-title">
          <span><span class="live-dot"></span> {{ locked ? '重点赛事' : '下一场焦点战' }}</span
          ><span class="league-pill">{{ leagueName(match.league) }}</span>
        </div>
        <div class="next-teams">
          <div>
            <TeamBadge :team="match.home" :size="62" /><strong>{{ match.home.name }}</strong
            ><small>主场</small>
          </div>
          <span class="versus">VS</span>
          <div>
            <TeamBadge :team="match.away" :size="62" /><strong>{{ match.away.name }}</strong
            ><small>客场</small>
          </div>
        </div>
        <div class="next-time">
          <AppIcon name="calendar" :size="14" /> {{ dateLabel(match.kickoff) }}
          <b>{{ timeLabel(match.kickoff) }}</b
          ><span>北京时间</span>
        </div>
        <div class="next-venue">{{ match.venue }} <span>·</span> {{ match.round }}</div>
        <button class="primary-button next-button" @click="$emit('predict', match)">
          {{
            locked
              ? '查看赛事详情'
              : prediction
                ? `已预测 ${prediction.home} : ${prediction.away} · 修改预测`
                : '预测这场比赛'
          }}<AppIcon name="arrow" :size="17" />
        </button>
      </div>
    </Transition>
  </section>
</template>
<style scoped>
.focus-match-enter-active {
  transition:
    opacity 240ms ease,
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}
.focus-match-leave-active {
  transition:
    opacity 120ms ease,
    transform 120ms ease;
  pointer-events: none;
}
.focus-match-enter-from {
  opacity: 0;
  transform: translateY(7px);
}
.focus-match-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.85fr) minmax(290px, 1fr);
  gap: 22px;
}
.hero-grid.without-match {
  grid-template-columns: 1fr;
}
.next-match {
  padding: 23px 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.next-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 650;
}
.next-title > span:first-child {
  display: flex;
  align-items: center;
  gap: 7px;
}
.live-dot {
  width: 6px;
  height: 6px;
  background: #369b6c;
  border-radius: 50%;
  box-shadow: 0 0 0 3px #eaf5ee;
}
.next-teams {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin: 23px 0 14px;
}
.next-teams > div {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  width: 90px;
}
.next-teams strong {
  font-size: 17px;
}
.next-teams small {
  font-size: 14px;
  color: var(--md-muted, #9ca59f);
}
.versus {
  font-family: Georgia, serif;
  font-size: 24px;
  color: var(--md-muted, #adb4ae);
  font-style: italic;
}
.next-time {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 14px;
  color: var(--md-secondary, #5f6d64);
}
.next-time b {
  color: var(--md-text, #34483d);
  font-size: 16px;
}
.next-time > span {
  font-size: 13px;
  color: var(--md-muted, #9aa39d);
}
.next-venue {
  text-align: center;
  color: var(--md-muted, #969f98);
  font-size: 14px;
  margin: 8px 0 19px;
}
.next-venue span {
  padding: 0 6px;
}
.next-button {
  width: 100%;
  justify-content: center;
  gap: 16px;
  font-size: 15px;
  padding: 11px;
}
@media (max-width: 1050px) {
  .hero-grid {
    grid-template-columns: 1.5fr 1fr;
  }
  .next-match {
    padding: 20px 15px;
  }
}
@media (max-width: 700px) {
  .hero-grid {
    grid-template-columns: 1fr;
  }
  .next-match {
    padding: 22px;
  }
  .next-teams {
    margin: 20px 0;
  }
  .next-title {
    font-size: 18px;
  }
}
</style>
