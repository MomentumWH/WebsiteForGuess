<script setup lang="ts">
import { computed } from 'vue'
import type { Match } from '@/data/matches'
import type { SquadPlayer, PlayerPerformance, Metric } from '@/data/squad'
import AppIcon from '@/components/matchday/AppIcon.vue'
const props = defineProps<{
  player: SquadPlayer
  matches: Match[]
  performances: PlayerPerformance[]
}>()
const columns: { key: Metric; label: string }[] = [
  { key: 'minutes', label: '分钟' },
  { key: 'goals', label: '进球' },
  { key: 'assists', label: '助攻' },
  { key: 'interceptions', label: '拦截' },
  { key: 'clearances', label: '完成解围' },
  { key: 'saves', label: '扑救' },
  { key: 'tackles', label: '抢断' },
  { key: 'recoveries', label: '夺回球权' },
  { key: 'cbi', label: '英超防守合计' },
]
// 注释修改时间：2026-10-22
// 用途与逻辑：生成球员比赛日志，按比赛关联个人统计，并根据主客身份确定对手。
const rows = computed(() =>
  props.matches.map((match) => {
    // 使用球员与比赛编号匹配个人统计，避免关联到其他球员的表现。
    const metrics = props.performances.find(
      (p) => p.playerId === props.player.id && p.matchId === match.id,
    )?.metrics
    // 识别阿森纳所在一方，再将对手和统计信息附加到比赛记录。
    const home = match.home.id === 'arsenal'
    return { match, metrics, home, opponent: home ? match.away : match.home }
  }),
)
// 注释修改时间：2026-10-22
// 用途与逻辑：格式化比赛日志日期，使用上海时区输出两位数月日。
const date = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
</script>
<template>
  <details class="match-log panel">
    <summary>
      <span
        ><AppIcon name="history" :size="17" /><strong
          >{{ player.name }} <small>的逐场数据</small></strong
        ><i>{{ matches.length }} 场</i></span
      ><span class="log-hint">展开比赛明细<AppIcon name="down" :size="13" /></span>
    </summary>
    <div class="log-scroll" tabindex="0" aria-label="可横向滚动的近五场逐场数据">
      <table>
        <caption class="sr-only">
          {{
            player.name
          }}
          在球队最近
          {{
            matches.length
          }}
          场比赛中的逐场统计
        </caption>
        <thead>
          <tr>
            <th scope="col">比赛 / 赛事</th>
            <th v-for="col in columns" :key="col.key" scope="col">{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.match.id">
            <th scope="row">
              <a :href="row.match.sourceUrl" target="_blank" rel="noopener noreferrer"
                >{{ row.opponent.name
                }}<small
                  >{{ date(row.match.kickoff) }} · {{ row.home ? '主' : '客' }} ·
                  {{ row.match.league === 'pl' ? '英超 FPL' : '欧冠 UEFA' }} ·
                  {{
                    row.metrics?.minutes === 0
                      ? '未出场'
                      : row.metrics?.minutes === undefined
                        ? '数据未取得'
                        : '已出场'
                  }}</small
                ></a
              >
            </th>
            <td
              v-for="col in columns"
              :key="col.key"
              :class="{
                missing: row.metrics?.[col.key] === null || row.metrics?.[col.key] === undefined,
              }"
            >
              {{ row.metrics?.[col.key] ?? '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p>
      单场数值保留对应来源口径；空缺显示 —，官方明确未出场的记录显示
      0。英超防守合计不拆分成独立拦截或解围。
    </p>
  </details>
</template>
<style scoped>
.match-log {
  margin-top: 20px;
  overflow: hidden;
}
.match-log summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 18px 23px;
  cursor: pointer;
  list-style: none;
}
.match-log summary::-webkit-details-marker {
  display: none;
}
.match-log summary > span {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--md-secondary, #889e75);
}
.match-log summary strong {
  font-family: Bahnschrift, sans-serif;
  font-size: 17px;
  font-weight: 500;
  color: var(--md-text, #516d42);
}
.match-log summary small {
  font:
    14px 'Microsoft YaHei',
    sans-serif;
  font-weight: 400;
  color: var(--md-muted, #9aa58a);
  margin-left: 5px;
}
.match-log summary i {
  font-style: normal;
  color: var(--md-muted, #97a582);
  background: var(--md-soft, #f1f5e8);
  border-radius: 4px;
  padding: 3px 7px;
  font-size: 12px;
}
.log-hint {
  font-size: 13px;
  color: var(--md-muted, #a4ad96) !important;
  flex-shrink: 0;
}
.match-log[open] .log-hint > svg {
  transform: rotate(180deg);
}
.log-scroll {
  overflow: auto;
  margin: 0 23px;
}
.log-scroll table {
  border-collapse: collapse;
  width: 100%;
  min-width: 790px;
  table-layout: fixed;
}
.log-scroll th,
.log-scroll td {
  text-align: center;
  border-bottom: 1px solid var(--md-border, #edf1e6);
  padding: 12px 5px;
  font-size: 15px;
  font-weight: 400;
  color: var(--md-secondary, #6c815d);
  font-variant-numeric: tabular-nums;
}
.log-scroll thead th {
  background: var(--md-soft, #f7faf1);
  color: var(--md-muted, #96a684);
  font-size: 13px;
}
.log-scroll th:first-child {
  text-align: left;
  width: 24%;
  padding-left: 10px;
}
.log-scroll th:last-child {
  width: 12%;
}
.log-scroll a {
  text-decoration: none;
  color: var(--md-text, #577144);
  font-size: 14px;
}
.log-scroll a:hover {
  color: var(--md-text, #345929);
}
.log-scroll a > small {
  display: block;
  color: var(--md-muted, #a7b197);
  font-size: 11px;
  margin-top: 4px;
}
.log-scroll td.missing {
  color: var(--md-muted, #c2cbb5);
}
.match-log > p {
  padding: 10px 23px;
  margin: 0;
  font-size: 12px;
  color: var(--md-muted, #a2ae92);
  line-height: 1.7;
}
@media (max-width: 600px) {
  .match-log summary {
    padding: 16px 15px;
  }
  .match-log summary > span {
    gap: 6px;
  }
  .match-log summary strong {
    font-size: 15px;
  }
  .match-log summary small {
    font-size: 13px;
    display: block;
    margin: 5px 0 0;
  }
  .log-hint {
    font-size: 12px;
  }
  .log-scroll {
    margin: 0 15px;
  }
  .match-log > p {
    padding: 10px 15px;
  }
}
</style>
