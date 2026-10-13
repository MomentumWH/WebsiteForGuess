<script setup lang="ts">
import type { Match, Prediction } from '@/data/matches'
import { dateLabel, timeLabel, leagueName } from '@/data/matches'
import AppIcon from './AppIcon.vue'
import TeamBadge from './TeamBadge.vue'
defineProps<{ match: Match; prediction?: Prediction; locked: boolean }>()
defineEmits<{ predict: [match: Match]; navigate: [] }>()
function setInert(element: unknown, inert: boolean) {
  if (element instanceof HTMLElement) element.inert = inert
}
</script>
<template>
  <section class="hero-grid">
    <div class="hero-banner">
      <div class="hero-shade"></div>
      <div class="hero-content">
        <span class="eyebrow"><span class="small-dot"></span> FOR THE GAME. FOR THE GUNNERS.</span>
        <h2>热爱比赛，<br />也相信你的判断<span>。</span></h2>
        <p>从赛前的直觉，到终场的答案。<br />记录每一次预测，读懂每一场比赛。</p>
        <button class="hero-button" @click="$emit('predict', match)">
          {{ locked ? '查看比赛' : '做出我的预测' }}<AppIcon name="arrow" :size="18" />
        </button>
      </div>
      <span class="hero-watermark">NORTH LONDON<br />IS OUR HOME.</span>
      <div class="hero-bottom">
        <span><AppIcon name="pin" :size="13" /> HOME OF THE GUNNERS</span
        ><span>EST. 1886 <i></i></span>
      </div>
    </div>
    <Transition
      name="focus-match"
      mode="out-in"
      @before-leave="setInert($event, true)"
      @before-enter="setInert($event, false)"
    >
      <div :key="match.id" class="next-match panel">
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
.hero-banner {
  position: relative;
  overflow: hidden;
  border-radius: 15px;
  min-height: 314px;
  background: #164535 url('/images/stadium.webp') 70% 53% / cover;
  color: white;
}
.hero-shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      90deg,
      rgba(9, 49, 37, 0.97) 0%,
      rgba(9, 49, 37, 0.87) 32%,
      rgba(9, 49, 37, 0.16) 100%
    ),
    linear-gradient(0deg, rgba(4, 34, 24, 0.8), transparent 40%);
}
.hero-content {
  position: relative;
  padding: 30px 32px 44px;
}
.eyebrow {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1.8px;
  color: #c6dcd0;
  display: flex;
  gap: 8px;
  align-items: center;
}
.small-dot {
  height: 5px;
  width: 5px;
  border-radius: 50%;
  background: #b5ef6d;
}
h2 {
  font-size: 38px;
  line-height: 1.5;
  letter-spacing: 1px;
  margin: 14px 0 10px;
  font-weight: 700;
}
h2 span {
  color: #b5ef6d;
}
.hero-content p {
  font-size: 15px;
  line-height: 1.9;
  color: #cedbd3;
  letter-spacing: 0.4px;
}
.hero-button {
  background: #d8f6a9;
  border: 0;
  border-radius: 6px;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  gap: 24px;
  color: #173e2c;
  font-size: 15px;
  font-weight: 650;
  margin-top: 21px;
}
.hero-button:hover {
  background: #c7ee8d;
}
.hero-watermark {
  position: absolute;
  right: 24px;
  bottom: 52px;
  font-family: 'Arial Narrow', Impact, sans-serif;
  letter-spacing: 2px;
  line-height: 1.15;
  font-size: 24px;
  color: #fff8;
  text-align: right;
  font-weight: 700;
}
.hero-bottom {
  position: absolute;
  bottom: 17px;
  left: 32px;
  right: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  letter-spacing: 1px;
  color: #c8dbce;
}
.hero-bottom span {
  display: flex;
  align-items: center;
  gap: 5px;
}
.hero-bottom i {
  width: 20px;
  height: 2px;
  background: #d8f6a9;
  display: inline-block;
  margin-left: 5px;
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
  color: #9ca59f;
}
.versus {
  font-family: Georgia, serif;
  font-size: 24px;
  color: #adb4ae;
  font-style: italic;
}
.next-time {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 14px;
  color: #5f6d64;
}
.next-time b {
  color: #34483d;
  font-size: 16px;
}
.next-time > span {
  font-size: 13px;
  color: #9aa39d;
}
.next-venue {
  text-align: center;
  color: #969f98;
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
@media (min-width: 1500px) {
  .hero-banner {
    min-height: 340px;
  }
  .hero-content {
    padding: 36px 38px;
  }
  h2 {
    font-size: 43px;
  }
  .hero-content p {
    font-size: 16px;
  }
}
@media (max-width: 1050px) {
  .hero-grid {
    grid-template-columns: 1.5fr 1fr;
  }
  .hero-content {
    padding: 25px;
  }
  h2 {
    font-size: 32px;
  }
  .next-match {
    padding: 20px 15px;
  }
  .hero-watermark {
    display: none;
  }
}
@media (max-width: 700px) {
  .hero-grid {
    grid-template-columns: 1fr;
  }
  .hero-banner {
    min-height: 310px;
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
