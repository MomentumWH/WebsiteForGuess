<script setup lang="ts">
import { computed } from 'vue'
import type { Match } from '@/data/matches'
import { statisticDefinitions, formatStatistic, type MatchStatistics } from '@/data/matchStatistics'
import TeamBadge from '@/components/matchday/TeamBadge.vue'
import AppIcon from '@/components/matchday/AppIcon.vue'
const props = defineProps<{
  match: Match
  statistics?: MatchStatistics
  loading: boolean
  error: string
}>()
defineEmits<{ refresh: [] }>()
const rows = computed(() =>
  statisticDefinitions.map((definition) => {
    const values = props.statistics?.metrics[definition.key] ?? [null, null]
    const available = values.every((value) => value !== null)
    const sum = (values[0] ?? 0) + (values[1] ?? 0)
    return {
      ...definition,
      home: formatStatistic(definition.key, values[0]!),
      away: formatStatistic(definition.key, values[1]!),
      available,
      homeShare: available && sum > 0 ? (values[0]! / sum) * 100 : 0,
      awayShare: available && sum > 0 ? (values[1]! / sum) * 100 : 0,
      homeMissing: values[0] === null,
      awayMissing: values[1] === null,
    }
  }),
)
const source = computed(() => props.statistics?.source)
const notice = computed(
  () =>
    props.error ||
    (source.value?.state === 'stale'
      ? '官方同步暂不可用，正在展示上次成功同步的技术统计。'
      : source.value?.message) ||
    '',
)
const updatedAt = computed(() =>
  source.value?.updatedAt
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(source.value.updatedAt))
    : '',
)
</script>
<template>
  <section
    class="match-statistics-panel panel"
    :aria-busy="loading"
    aria-labelledby="match-statistics-title"
  >
    <div class="detail-section-heading">
      <div>
        <span class="detail-eyebrow">MATCH STATISTICS</span>
        <h3 id="match-statistics-title">技术统计</h3>
      </div>
      <button class="statistics-refresh" :disabled="loading" @click="$emit('refresh')">
        <AppIcon name="refresh" :size="14" />{{ loading ? '同步中' : '更新统计' }}
      </button>
    </div>
    <p class="statistics-intro">从控球到攻防，回看双方在场上的表现。</p>
    <div v-if="notice" class="statistics-notice" role="status">
      <AppIcon name="info" :size="16" /><span
        >{{ notice }}{{ source?.state === 'error' ? '，缺失指标暂不显示数值。' : '' }}</span
      >
    </div>
    <p v-else-if="loading" class="statistics-notice" role="status">
      <span class="detail-spinner"></span>正在同步本场官方技术统计…
    </p>
    <div class="statistics-teams">
      <div>
        <TeamBadge :team="match.home" :size="30" /><span
          >{{ match.home.name }}<small>主队</small></span
        >
      </div>
      <span>全场数据</span>
      <div>
        <span>{{ match.away.name }}<small>客队</small></span
        ><TeamBadge :team="match.away" :size="30" />
      </div>
    </div>
    <div class="statistics-rows">
      <div v-for="row in rows" :key="row.key" class="statistics-row" :data-stat="row.key">
        <dl class="statistics-values">
          <dt>{{ row.label }}</dt>
          <dd
            class="home-value"
            :aria-label="`${match.home.name} ${row.label}`"
            :class="{ missing: row.homeMissing, 'statistics-skeleton': loading && !statistics }"
          >
            {{ loading && !statistics ? '同步中' : row.home }}
          </dd>
          <dd
            :aria-label="`${match.away.name} ${row.label}`"
            :class="{ missing: row.awayMissing, 'statistics-skeleton': loading && !statistics }"
          >
            {{ loading && !statistics ? '同步中' : row.away }}
          </dd>
        </dl>
        <div class="statistics-bars" :class="{ unavailable: !row.available }" aria-hidden="true">
          <div><i :style="{ width: `${row.homeShare}%` }"></i></div>
          <div><i :style="{ width: `${row.awayShare}%` }"></i></div>
        </div>
      </div>
    </div>
    <div class="statistics-source">
      <span class="statistics-source-dot" :class="source?.state"></span
      ><span
        >{{ source?.label ?? '官方技术统计' }}{{ updatedAt ? ` · ${updatedAt} 更新` : ''
        }}{{ source?.state === 'stale' ? ' · 使用缓存' : '' }}</span
      ><span v-if="statistics && !loading">北京时间</span>
    </div>
    <p class="detail-note">
      统计采用官方全场口径，可能包含加时，不包含点球大战；赛果与预测复盘仍采用常规时间比分。缺失数据与零值分别显示。“威胁进攻”与普通进攻次数独立，预期进球
      xG 不由比分或射门次数推算。
    </p>
  </section>
</template>
<style scoped>
.match-statistics-panel {
  margin-top: 22px;
  padding: 26px;
}
.statistics-refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--md-border, #e1e8dc);
  border-radius: 6px;
  background: var(--md-soft, #f4f7ef);
  padding: 9px 12px;
  color: var(--md-text, #315f49);
  font-size: 13px;
}
.statistics-intro {
  color: var(--md-secondary, #758077);
  font-size: 14px;
  margin-top: 11px;
}
.statistics-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 15px;
  background: var(--md-soft, #f4f7ef);
  border-radius: 6px;
  color: var(--md-secondary, #758077);
  font-size: 13px;
  line-height: 1.7;
  margin-top: 17px;
}
.statistics-notice svg {
  flex-shrink: 0;
}
.statistics-teams {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  padding: 24px 0 20px;
  border-bottom: 1px solid var(--md-border, #e6ebe3);
  margin-top: 7px;
}
.statistics-teams > div {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 650;
  font-size: 17px;
}
.statistics-teams > div:last-child {
  justify-content: flex-end;
  text-align: right;
}
.statistics-teams small {
  display: block;
  color: var(--md-secondary, #758077);
  font-size: 12px;
  font-weight: 400;
  margin-top: 5px;
}
.statistics-teams > span {
  color: var(--md-muted, #98a099);
  font-size: 12px;
  letter-spacing: 1px;
}
.statistics-rows {
  margin: 0;
}
.statistics-row {
  padding: 18px 0;
  border-bottom: 1px solid var(--md-border, #e6ebe3);
}
.statistics-row:last-child {
  border-bottom: 0;
}
.statistics-values {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  margin: 0;
}
.statistics-values dt {
  grid-column: 2;
  grid-row: 1;
  color: var(--md-secondary, #758077);
  font-size: 14px;
}
.statistics-values dd {
  grid-column: 3;
  grid-row: 1;
  margin: 0;
  color: var(--md-text, #273e31);
  font-size: 23px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
.statistics-values .home-value {
  grid-column: 1;
}
.statistics-values dd:last-child {
  text-align: right;
}
.statistics-values dd.missing {
  font-size: 12px;
  font-weight: 400;
  color: var(--md-muted, #98a099);
}
.statistics-bars {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin-top: 13px;
}
.statistics-bars > div {
  height: 5px;
  border-radius: 4px;
  background: var(--md-soft, #f0f4eb);
  overflow: hidden;
}
.statistics-bars i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--md-accent, #438762);
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
.statistics-bars > div:first-child i {
  margin-left: auto;
}
.statistics-bars > div:last-child i {
  background: #bfa065;
}
.statistics-bars.unavailable {
  opacity: 0.4;
}
.statistics-source {
  display: flex;
  align-items: center;
  gap: 6px;
  border-top: 1px solid var(--md-border, #e6ebe3);
  padding-top: 18px;
  color: var(--md-secondary, #758077);
  font-size: 12px;
  line-height: 1.7;
}
.statistics-source > span:last-child:not(:nth-child(2)) {
  margin-left: auto;
  white-space: nowrap;
}
.statistics-source-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--md-muted, #98a099);
  flex-shrink: 0;
}
.statistics-source-dot.success {
  background: var(--md-accent, #438762);
}
.statistics-source-dot.stale,
.statistics-source-dot.error {
  background: var(--md-warning, #bfa065);
}
.statistics-skeleton {
  background: linear-gradient(
    90deg,
    var(--md-soft, #f0f4eb),
    var(--md-selected, #e6efde),
    var(--md-soft, #f0f4eb)
  );
  background-size: 200% 100%;
  color: transparent !important;
  border-radius: 4px;
  width: 58px;
  animation: statistics-shimmer 1.5s linear infinite;
}
.statistics-skeleton:last-child {
  justify-self: end;
}
@keyframes statistics-shimmer {
  to {
    background-position: -200% 0;
  }
}
@media (max-width: 600px) {
  .match-statistics-panel {
    padding: 20px 16px;
  }
  .statistics-teams {
    gap: 8px;
  }
  .statistics-teams > div {
    font-size: 14px;
    gap: 6px;
  }
  .statistics-teams > span {
    font-size: 11px;
    letter-spacing: 0;
  }
  .statistics-values dt {
    font-size: 13px;
  }
  .statistics-values dd {
    font-size: 20px;
  }
  .statistics-values dd.missing {
    font-size: 11px;
  }
  .statistics-refresh {
    padding: 8px;
    font-size: 12px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .statistics-bars i {
    transition: none;
  }
  .statistics-skeleton {
    animation: none;
  }
}
</style>
