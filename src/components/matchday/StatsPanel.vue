<script setup lang="ts">
import type { Stats } from '@/data/matches'
import AppIcon from './AppIcon.vue'
defineProps<{ stats: Stats; pl: Stats; ucl: Stats; expanded?: boolean }>()
defineEmits<{ navigate: [] }>()
</script>
<template>
  <section class="stats-panel panel" :class="{ expanded }">
    <div class="stats-heading">
      <h3>预测表现</h3>
      <span>已完赛样本</span>
    </div>
    <div class="donut-area">
      <div class="donut" :style="{ '--rate': `${stats.rate}%` }">
        <div>
          <strong
            >{{ stats.completed ? stats.rate : '—' }}<small v-if="stats.completed">%</small></strong
          ><span>胜平负命中率</span>
        </div>
      </div>
      <span class="donut-caption">{{
        stats.completed
          ? `${stats.completed} 场已结算 · ${stats.correct} 场方向命中`
          : '还没有已结算的预测'
      }}</span>
    </div>
    <div class="stats-legend">
      <span
        ><i class="green"></i>比分命中 <b>{{ stats.exact }}</b></span
      ><span
        ><i class="lime"></i>仅方向命中 <b>{{ stats.correct - stats.exact }}</b></span
      ><span
        ><i></i>未命中 <b>{{ stats.completed - stats.correct }}</b></span
      >
    </div>
    <div class="league-stat">
      <span><i class="league-dot pl"></i>英超</span>
      <div class="stat-bar"><i :style="{ width: `${pl.rate}%` }"></i></div>
      <b>{{ pl.completed ? `${pl.rate}%` : '—' }}</b>
    </div>
    <div class="league-stat">
      <span><i class="league-dot ucl"></i>欧冠</span>
      <div class="stat-bar"><i :style="{ width: `${ucl.rate}%` }"></i></div>
      <b>{{ ucl.completed ? `${ucl.rate}%` : '—' }}</b>
    </div>
    <p v-if="expanded" class="calculation-note">
      胜平负命中包含比分完全命中；仅统计已预测且已完赛的赛事。精确比分命中率
      {{ stats.completed ? `${stats.exactRate}%` : '暂无' }}，{{ stats.pending }} 场预测等待开赛。
    </p>
    <button v-else class="stats-link" @click="$emit('navigate')">
      查看完整数据<AppIcon name="arrow" :size="14" />
    </button>
  </section>
</template>
<style scoped>
.stats-panel {
  padding: 23px 23px 0;
}
.stats-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stats-heading h3 {
  font-size: 19px;
  font-weight: 700;
}
.stats-heading > span {
  color: #9aa298;
  font-size: 13px;
}
.donut-area {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 19px 0 16px;
}
.donut {
  width: 133px;
  height: 133px;
  border-radius: 50%;
  background: conic-gradient(#367958 0 var(--rate), #eef1e8 var(--rate) 100%);
  display: grid;
  place-items: center;
  transform: rotate(-90deg);
}
.donut > div {
  width: 108px;
  height: 108px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transform: rotate(90deg);
}
.donut strong {
  font-size: 38px;
  letter-spacing: -1.5px;
  font-family: 'Bahnschrift', 'DIN Alternate', sans-serif;
  font-weight: 500;
  line-height: 1.2;
}
.donut strong small {
  font-size: 20px;
  margin-left: 2px;
}
.donut div > span {
  font-size: 13px;
  color: #8c978c;
  margin-top: 4px;
}
.donut-caption {
  font-size: 13px;
  color: #9ca49b;
  margin-top: 12px;
}
.stats-legend {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  font-size: 12px;
  padding-bottom: 18px;
  border-bottom: 1px solid #eff1eb;
}
.stats-legend span {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #8c978b;
  white-space: nowrap;
}
.stats-legend i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #e4e9dd;
}
.stats-legend i.green {
  background: #367958;
}
.stats-legend i.lime {
  background: #a7c483;
}
.stats-legend b {
  font-weight: 600;
  color: #5d6b5e;
}
.league-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 15px;
  font-size: 13px;
}
.league-stat > span {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 40px;
  color: #687669;
}
.league-dot {
  height: 5px;
  width: 5px;
  border-radius: 50%;
  background: #806884;
}
.league-dot.ucl {
  background: #7388ac;
}
.stat-bar {
  flex: 1;
  height: 5px;
  border-radius: 4px;
  background: #f0f2eb;
  overflow: hidden;
}
.stat-bar i {
  display: block;
  background: #829e79;
  height: 100%;
  border-radius: 4px;
}
.league-stat > b {
  font-size: 13px;
  font-weight: 500;
  color: #6b796b;
  width: 29px;
  text-align: right;
}
.stats-link {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 19px;
  padding: 14px 0;
  border: 0;
  border-top: 1px solid #eff1eb;
  background: transparent;
  font-size: 14px;
  color: #6d806b;
}
.stats-link:hover {
  color: #225a3c;
}
.calculation-note {
  color: #7f8f7d;
  font-size: 16px;
  line-height: 1.8;
  padding: 24px 0;
}
.expanded {
  padding: 26px;
  max-width: 700px;
  margin: auto;
}
.expanded .donut {
  width: 200px;
  height: 200px;
}
.expanded .donut > div {
  width: 165px;
  height: 165px;
}
.expanded .donut strong {
  font-size: 52px;
}
.expanded .stats-legend {
  font-size: 16px;
}
.expanded .league-stat {
  font-size: 16px;
  margin-top: 22px;
}
</style>
