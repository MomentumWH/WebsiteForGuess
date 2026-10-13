<script setup lang="ts">
import { metricText, positions, type PlayerSummary, type Position, type Metric } from '@/data/squad'
import PlayerPortrait from './PlayerPortrait.vue'
import AppIcon from '@/components/matchday/AppIcon.vue'
defineProps<{ players: PlayerSummary[]; selected: string; emptyMessage: string }>()
defineEmits<{ select: [id: string] }>()
const position = defineModel<Position | 'all'>('position', { default: 'all' })
const sort = defineModel<'minutes' | 'goals' | 'appearances'>('sort', { default: 'minutes' })
const firstTeam = defineModel<boolean>('firstTeam', { default: true })
const columns: { key: Metric; label: string }[] = [
  { key: 'appearances', label: '出场' },
  { key: 'minutes', label: '分钟' },
  { key: 'goals', label: '进球' },
  { key: 'assists', label: '助攻' },
  { key: 'interceptions', label: '拦截' },
  { key: 'clearances', label: '解围' },
  { key: 'saves', label: '扑救' },
  { key: 'cbi', label: '英超防守合计' },
]
</script>
<template>
  <section class="squad-table-panel panel" aria-labelledby="squad-table-title">
    <div class="table-heading">
      <div>
        <h2 id="squad-table-title">
          每一个位置，都有自己的答案。<span>{{ players.length }} 人</span>
        </h2>
        <p>选择球员查看比赛轨迹，比较同一统计窗口内的表现。</p>
      </div>
      <label class="sort-control"
        ><AppIcon name="chart" :size="14" /><select v-model="sort" aria-label="球员排序">
          <option value="minutes">出场时间 ↓</option>
          <option value="goals">进球数 ↓</option>
          <option value="appearances">出场次数 ↓</option>
        </select></label
      >
    </div>
    <div class="table-filters">
      <div class="position-filters" aria-label="按球员位置筛选">
        <button :aria-pressed="position === 'all'" @click="position = 'all'">全部位置</button
        ><button
          v-for="role in positions"
          :key="role.id"
          :aria-pressed="position === role.id"
          @click="position = role.id"
        >
          {{ role.label }}
        </button>
      </div>
      <label class="first-team-filter"
        ><input v-model="firstTeam" type="checkbox" />仅英超名单球员</label
      >
    </div>
    <div class="table-scroll" tabindex="0" aria-label="可横向滚动的球员统计表">
      <table>
        <thead>
          <tr>
            <th scope="col">球员 / 位置</th>
            <th v-for="col in columns" :key="col.key" scope="col">{{ col.label }}</th>
            <th scope="col">明细</th>
          </tr>
        </thead>
        <tbody :key="`${position}-${sort}-${firstTeam}`">
          <template v-for="role in positions" :key="role.id"
            ><tr v-if="players.some((p) => p.player.position === role.id)" class="position-divider">
              <th colspan="10" scope="rowgroup">
                <span>{{ role.label }}</span
                >{{ role.english
                }}<i>{{ players.filter((p) => p.player.position === role.id).length }}</i>
              </th>
            </tr>
            <tr
              v-for="(row, index) in players.filter((p) => p.player.position === role.id)"
              :key="row.player.id"
              class="player-row"
              :class="{ selected: row.player.id === selected }"
              :style="{ '--index': Math.min(index, 7) }"
            >
              <th scope="row">
                <button
                  class="player-name-button"
                  :aria-pressed="row.player.id === selected"
                  @click="$emit('select', row.player.id)"
                >
                  <PlayerPortrait :player="row.player" /><span
                    ><strong
                      >{{ row.player.name
                      }}<i
                        v-if="row.player.status === 'injured' || row.player.status === 'doubtful'"
                        :title="row.player.status === 'injured' ? '伤停' : '出场存疑'"
                        >+</i
                      ></strong
                    ><small
                      >{{ row.player.number ? '#' + row.player.number + ' · ' : ''
                      }}{{ role.label }} · {{ row.covered }}/{{ row.sample }} 场有数据</small
                    ></span
                  >
                </button>
              </th>
              <td
                v-for="col in columns"
                :key="col.key"
                :class="{
                  missing: row.metrics[col.key] === null,
                  highlight: col.key === 'goals' && !!row.metrics.goals,
                }"
              >
                {{ metricText(row, col.key) }}
              </td>
              <td>
                <button
                  class="detail-button"
                  :aria-label="`查看 ${row.player.name} 数据`"
                  @click="$emit('select', row.player.id)"
                >
                  <AppIcon name="arrow" :size="14" />
                </button>
              </td></tr
          ></template>
        </tbody>
      </table>
    </div>
    <div v-if="!players.length" class="table-empty">
      <AppIcon name="search" :size="26" /><strong>{{ emptyMessage }}</strong
      ><span>可尝试其他位置、球员姓名或赛事筛选。</span>
    </div>
    <div class="table-caption">
      <span>— 未提供 / 无可比口径 &nbsp; · &nbsp; * 部分场次合计</span
      ><span>按门将 → 后卫 → 中场 → 前锋分组</span>
    </div>
  </section>
</template>
<style scoped>
.squad-table-panel {
  margin-top: 22px;
  padding: 24px 23px 0;
  overflow: hidden;
}
.table-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.table-heading h2 {
  font-size: 19px;
  color: #3f5b35;
  font-weight: 500;
  margin: 0;
}
.table-heading h2 > span {
  display: inline-block;
  vertical-align: middle;
  margin-left: 9px;
  padding: 3px 7px;
  background: #f0f4e7;
  color: #869477;
  font-size: 13px;
  border-radius: 4px;
}
.table-heading p {
  font-size: 13px;
  color: #9fa791;
  margin: 8px 0 0;
}
.sort-control {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #8b9d78;
}
.sort-control select {
  border: 1px solid #e5eadc;
  background: #fff;
  color: #7c8d6c;
  font-size: 13px;
  padding: 8px 5px;
  border-radius: 5px;
}
.table-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 23px 0 16px;
}
.position-filters {
  display: flex;
  gap: 5px;
  background: #f5f7f0;
  padding: 4px;
  border-radius: 6px;
}
.position-filters button {
  background: transparent;
  border: 0;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  color: #9aa28b;
}
.position-filters button[aria-pressed='true'] {
  color: #46683a;
  background: #fff;
  box-shadow: 0 1px 4px #263f1810;
}
.first-team-filter {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #9ba58c;
  font-size: 13px;
  white-space: nowrap;
}
.first-team-filter input {
  accent-color: #426538;
  width: 12px;
  height: 12px;
}
.table-scroll {
  overflow-x: auto;
}
.table-scroll table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  min-width: 760px;
  table-layout: fixed;
}
.table-scroll thead th {
  background: #f8faf4;
  color: #9ba68b;
  font-size: 13px;
  font-weight: 400;
  padding: 11px 4px;
  text-align: center;
  border-bottom: 1px solid #e9eee0;
}
.table-scroll thead th:first-child {
  text-align: left;
  width: 29%;
  padding-left: 12px;
}
.table-scroll thead th:nth-last-child(2) {
  width: 12%;
}
.table-scroll thead th:last-child {
  width: 6%;
}
.position-divider th {
  padding: 13px 11px 6px;
  color: #a5ae95;
  font-size: 11px;
  letter-spacing: 1.4px;
  font-weight: 400;
}
.position-divider span {
  font-size: 13px;
  color: #7f906c;
  margin-right: 9px;
  letter-spacing: 0;
}
.position-divider i {
  font-style: normal;
  margin-left: 8px;
  color: #b6beab;
}
.player-row {
  border-bottom: 1px solid #f0f3eb;
  animation: row-in 0.35s calc(var(--index) * 30ms) both;
}
.player-row:hover {
  background: #fafcf6;
}
.player-row.selected {
  background: #f3f7ea;
}
.player-name-button {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  text-align: left;
  padding: 10px 8px;
  border: 0;
  background: transparent;
}
.player-name-button .player-portrait {
  width: 33px;
  height: 33px;
}
.player-name-button > span {
  min-width: 0;
}
.player-name-button strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: Bahnschrift, sans-serif;
  color: #546448;
  font-size: 15px;
  font-weight: 500;
}
.player-name-button small {
  display: block;
  color: #a7af99;
  font-size: 11px;
  margin-top: 4px;
}
.player-name-button strong i {
  font-style: normal;
  margin-left: 5px;
  font-size: 16px;
  color: #b59356;
}
.player-row td {
  font-family: Bahnschrift, sans-serif;
  font-size: 16px;
  color: #718263;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.player-row td.missing {
  color: #c3cbb6;
}
.player-row td.highlight {
  color: #ad6250;
  font-weight: 600;
}
.detail-button {
  border: 0;
  background: transparent;
  color: #a6b298;
  border-radius: 5px;
  padding: 5px;
  display: inline-flex;
  align-items: center;
}
.table-caption {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 15px 0;
  font-size: 12px;
  color: #a4ad96;
}
.table-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 40px 15px;
  color: #a0ad8d;
}
.table-empty strong {
  font-size: 17px;
  font-weight: 500;
}
.table-empty > span {
  font-size: 14px;
}
@keyframes row-in {
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
  .squad-table-panel {
    padding: 20px 15px 0;
  }
  .table-heading {
    align-items: flex-start;
  }
  .table-heading h2 {
    font-size: 16px;
  }
  .table-heading p {
    font-size: 12px;
    line-height: 1.6;
  }
  .table-heading h2 > span {
    font-size: 12px;
    margin-left: 5px;
  }
  .sort-control > svg {
    display: none;
  }
  .sort-control select {
    max-width: 100px;
  }
  .table-filters {
    flex-wrap: wrap;
    margin: 18px 0 12px;
  }
  .position-filters {
    width: 100%;
    justify-content: space-between;
    gap: 0;
  }
  .position-filters button {
    padding: 6px 9px;
  }
  .table-caption {
    font-size: 11px;
  }
  .table-caption > span:last-child {
    display: none;
  }
}
</style>
