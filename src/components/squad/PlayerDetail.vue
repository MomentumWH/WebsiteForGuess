<script setup lang="ts">
import { computed } from 'vue'
import {
  metricText,
  positions,
  type PlayerSummary,
  type Metric,
  type PlayerPerformance,
} from '@/data/squad'
import type { Match } from '@/data/matches'
import PlayerPortrait from './PlayerPortrait.vue'
import AppIcon from '@/components/matchday/AppIcon.vue'
const props = defineProps<{
  summary: PlayerSummary
  matches: Match[]
  performances: PlayerPerformance[]
}>()
// 注释修改时间：2026-10-22
// 用途与逻辑：读取球员位置说明，按当前球员位置编号匹配预设位置配置。
const role = computed(() => positions.find((p) => p.id === props.summary.player.position))
const statusLabels = {
  available: '可出场',
  doubtful: '出场存疑',
  injured: '伤停',
  unavailable: '暂不可用',
  unknown: '状态未提供',
}
const stats: { key: Metric; label: string; unit?: string }[] = [
  { key: 'appearances', label: '出场次数', unit: '场' },
  { key: 'minutes', label: '出场时间', unit: '分钟' },
  { key: 'goals', label: '进球', unit: '球' },
  { key: 'assists', label: '助攻', unit: '次' },
  { key: 'interceptions', label: '防守拦截' },
  { key: 'clearances', label: '完成解围' },
  { key: 'saves', label: '扑救' },
  { key: 'tackles', label: '抢断' },
]
// 注释修改时间：2026-10-22
// 用途与逻辑：生成球员近期比赛明细，关联个人统计并按阿森纳主客身份计算对手与胜平负。
const recent = computed(() =>
  props.matches.map((match) => {
    // 按球员与比赛双编号查找统计，缺失值保持缺失，不补造个人数据。
    const metrics = props.performances.find(
      (p) => p.playerId === props.summary.player.id && p.matchId === match.id,
    )?.metrics
    // 以阿森纳的主客身份选择双方比分，再计算该队视角下的胜平负。
    const home = match.home.id === 'arsenal'
    const us = match.actual?.[home ? 0 : 1] ?? 0
    const them = match.actual?.[home ? 1 : 0] ?? 0
    // 将比赛、个人统计、对手与比分组成详情行，供界面统一展示。
    return {
      match,
      metrics,
      opponent: home ? match.away : match.home,
      home,
      result: us === them ? '平' : us > them ? '胜' : '负',
      score: `${match.actual?.[0]} : ${match.actual?.[1]}`,
    }
  }),
)
// 注释修改时间：2026-10-22
// 用途与逻辑：格式化球员比赛日期，按上海时区将开球时间显示为月日。
const date = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
</script>
<template>
  <section class="player-detail panel" aria-labelledby="detail-title">
    <div class="detail-topline">
      <span>PLAYER SPOTLIGHT</span><span>{{ summary.covered }}/{{ summary.sample }} 场有数据</span>
    </div>
    <div :key="summary.player.id" class="player-profile">
      <div class="player-identity">
        <span class="position-tag"
          >{{ role?.label }} ·
          {{ summary.player.number ? `#${summary.player.number}` : '号码未公布' }}</span
        >
        <h2 id="detail-title">{{ summary.player.name }}</h2>
        <p>ARSENAL FOOTBALL CLUB</p>
        <span class="player-status" :class="summary.player.status"
          ><i></i>{{ statusLabels[summary.player.status] }}</span
        >
      </div>
      <div class="profile-photo">
        <span aria-hidden="true">{{ summary.player.number ?? 'AFC' }}</span
        ><PlayerPortrait :player="summary.player" />
      </div>
    </div>
    <p v-if="summary.player.news" class="player-news">{{ summary.player.news }}</p>
    <div class="detail-metrics" aria-label="球员最近五场关键统计">
      <div
        v-for="stat in stats"
        :key="stat.key"
        :class="{ missing: summary.metrics[stat.key] === null }"
      >
        <span>{{ stat.label }}</span
        ><strong
          >{{ metricText(summary, stat.key)
          }}<small v-if="summary.metrics[stat.key] !== null && stat.unit">{{
            stat.unit
          }}</small></strong
        >
      </div>
    </div>
    <div class="defensive-note">
      <AppIcon name="shield" :size="15" /><span
        >英超防守合计 <b>{{ metricText(summary, 'cbi') }}</b
        ><small>解围＋封堵＋拦截</small></span
      ><span
        >夺回球权 <b>{{ metricText(summary, 'recoveries') }}</b></span
      >
    </div>
    <div class="recent-heading">
      <h3>最近比赛轨迹</h3>
      <span>新 → 旧 · 北京时间</span>
    </div>
    <div class="recent-matches">
      <a
        v-for="row in recent"
        :key="row.match.id"
        :href="row.match.sourceUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="recent-match"
        ><span
          class="result-badge"
          :class="row.result === '胜' ? 'win' : row.result === '负' ? 'loss' : 'draw'"
          >{{ row.result }}</span
        >
        <div>
          <strong
            >{{ row.opponent.name
            }}<small
              >{{ row.home ? '主' : '客' }} ·
              {{ row.match.league === 'pl' ? '英超' : '欧冠' }}</small
            ></strong
          ><span
            >{{ date(row.match.kickoff) }} <b>{{ row.score }}</b></span
          >
        </div>
        <span class="match-minutes"
          >{{ row.metrics?.minutes ?? '—'
          }}<small v-if="row.metrics?.minutes !== null && row.metrics?.minutes !== undefined"
            >′</small
          ><i>{{
            row.metrics?.minutes === 0
              ? '未出场'
              : row.metrics?.goals
                ? `${row.metrics.goals} 球`
                : row.metrics?.minutes === undefined
                  ? '待补齐'
                  : '出场时间'
          }}</i></span
        ><AppIcon name="chevron" :size="12"
      /></a>
    </div>
    <p class="detail-footnote">— 表示未提供或口径不一致；* 为已获取场次的部分合计。</p>
    <a
      class="official-profile"
      :href="summary.player.profileUrl"
      target="_blank"
      rel="noopener noreferrer"
      >查看官方球员档案<AppIcon name="arrow" :size="14"
    /></a>
  </section>
</template>
<style scoped>
.player-detail {
  padding: 20px 23px 15px;
  min-width: 0;
  overflow: hidden;
}
.detail-topline {
  display: flex;
  justify-content: space-between;
  gap: 7px;
  font-size: 12px;
  letter-spacing: 1.5px;
  color: var(--md-secondary, #8b9b80);
}
.detail-topline > span:last-child {
  letter-spacing: 0;
  color: var(--md-muted, #9ba393);
}
.player-profile {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  min-height: 142px;
  position: relative;
  align-items: center;
  margin: 10px 0 15px;
  animation: profile-in 0.4s ease both;
}
.player-identity {
  position: relative;
  z-index: 1;
  max-width: 66%;
}
.position-tag {
  font-size: 13px;
  color: var(--md-secondary, #8c966c);
}
.player-identity h2 {
  font-family: Bahnschrift, 'Arial Narrow', sans-serif;
  font-size: 29px;
  line-height: 1.15;
  letter-spacing: -0.5px;
  color: var(--md-text, #263e2c);
  margin: 8px 0;
  max-width: 220px;
}
.player-identity > p {
  font-size: 11px;
  letter-spacing: 1.7px;
  color: var(--md-muted, #a5ad9b);
}
.player-status {
  font-size: 13px;
  color: var(--md-secondary, #618252);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 14px;
}
.player-status i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.player-status.injured,
.player-status.unavailable {
  color: var(--md-danger, #b77060);
}
.player-status.doubtful {
  color: var(--md-warning, #b08c41);
}
.profile-photo {
  position: absolute;
  right: -14px;
  bottom: -4px;
  width: 145px;
  height: 143px;
}
.profile-photo > span {
  position: absolute;
  bottom: 1px;
  right: 0;
  font-family: Georgia, serif;
  font-size: 129px;
  line-height: 1;
  color: var(--md-border, #edf1e7);
  letter-spacing: -10px;
}
.profile-photo .player-portrait {
  position: absolute;
  inset: 0;
  width: 142px;
  height: 143px;
  background: transparent;
  border-radius: 0;
  mask-image: linear-gradient(#000 80%, transparent);
}
.player-news {
  font-size: 14px;
  color: var(--md-warning, #9b7450);
  padding: 9px 11px;
  background: var(--md-warning-soft, #faf6ed);
  border-radius: 5px;
  margin: 0 0 12px;
  line-height: 1.5;
}
.detail-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--md-border, #edf0e8);
  border-bottom: 1px solid var(--md-border, #edf0e8);
  gap: 19px 4px;
  padding: 16px 0;
}
.detail-metrics > div {
  padding-left: 9px;
  border-left: 1px solid var(--md-border, #edf0e8);
}
.detail-metrics > div:nth-child(4n + 1) {
  padding-left: 0;
  border-left: 0;
}
.detail-metrics > div > span {
  font-size: 13px;
  color: var(--md-muted, #9ba28e);
  display: block;
}
.detail-metrics strong {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 3px;
  font-family: Bahnschrift, sans-serif;
  font-size: 30px;
  font-weight: 500;
  color: var(--md-text, #345a3d);
  margin-top: 6px;
  line-height: 1;
}
.detail-metrics small {
  font:
    12px 'Microsoft YaHei',
    sans-serif;
  white-space: nowrap;
  color: var(--md-muted, #9ba78d);
}
.detail-metrics .missing strong {
  color: var(--md-muted, #c1c8b9);
  font-size: 26px;
}
.defensive-note {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--md-secondary, #829473);
  background: var(--md-soft, #f4f7ef);
  padding: 10px 9px;
  margin-top: 11px;
  border-radius: 5px;
}
.defensive-note > span:last-child {
  margin-left: auto;
  white-space: nowrap;
}
.defensive-note b {
  color: var(--md-text, #3c6242);
  margin-left: 4px;
  font-size: 17px;
  font-weight: 500;
}
.defensive-note small {
  display: block;
  font-size: 11px;
  margin-top: 2px;
  color: var(--md-muted, #9daa8d);
}
.recent-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 19px 0 7px;
}
.recent-heading h3 {
  font-size: 15px;
  color: var(--md-text, #4d6846);
  font-weight: 500;
  margin: 0;
}
.recent-heading > span {
  font-size: 12px;
  color: var(--md-muted, #a3aa99);
}
.recent-match {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 0;
  border-bottom: 1px solid var(--md-border, #f0f2ec);
  text-decoration: none;
  color: inherit;
}
.recent-match:hover {
  background: var(--md-soft, #fafbf7);
}
.result-badge {
  display: grid;
  place-items: center;
  font-size: 12px;
  flex-shrink: 0;
  width: 22px;
  height: 23px;
  border-radius: 4px;
}
.win {
  color: var(--md-secondary, #537e47);
  background: var(--md-soft, #eef4e6);
}
.loss {
  color: var(--md-danger, #b26e64);
  background: var(--md-warning-soft, #faf0ec);
}
.draw {
  color: var(--md-secondary, #8c947f);
  background: var(--md-soft, #f1f2ec);
}
.recent-match > div {
  flex: 1;
  min-width: 0;
}
.recent-match strong {
  display: block;
  font-size: 14px;
  color: var(--md-text, #536649);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recent-match strong small {
  font-size: 11px;
  margin-left: 6px;
  color: var(--md-muted, #9ca68e);
  font-weight: 400;
}
.recent-match > div > span {
  font-size: 12px;
  color: var(--md-muted, #a3ab99);
}
.recent-match > div > span b {
  font-weight: 400;
  color: var(--md-secondary, #7b8e6c);
  margin-left: 7px;
}
.match-minutes {
  font-size: 20px;
  color: var(--md-text, #44633d);
  text-align: right;
  font-family: Bahnschrift, sans-serif;
}
.match-minutes small {
  font-size: 15px;
}
.match-minutes i {
  display: block;
  font-size: 11px;
  color: var(--md-muted, #a7ae9b);
  font-style: normal;
}
.recent-match > svg {
  color: var(--md-muted, #bbc3b1);
}
.detail-footnote {
  font-size: 12px;
  color: var(--md-muted, #a4ad98);
  line-height: 1.6;
  margin: 11px 0;
}
.official-profile {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--md-secondary, #647c51);
  font-size: 13px;
  text-decoration: none;
  padding-top: 9px;
  border-top: 1px solid var(--md-border, #edf0e7);
}
@keyframes profile-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (max-width: 600px) {
  .player-detail {
    padding: 20px;
  }
  .player-identity h2 {
    font-size: 29px;
  }
  .detail-metrics strong {
    font-size: 29px;
  }
}
</style>
