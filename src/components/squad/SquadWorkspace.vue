<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { useArsenalSquad } from '@/composables/useArsenalSquad'
import {
  positions,
  recentSquadMatches,
  summarizePlayer,
  type Position,
  type SquadSource,
} from '@/data/squad'
import type { League } from '@/data/matches'
import SquadPitch from './SquadPitch.vue'
import PersonalLineup from './PersonalLineup.vue'
import PlayerDetail from './PlayerDetail.vue'
import SquadTable from './SquadTable.vue'
import PlayerMatchLog from './PlayerMatchLog.vue'
import AppIcon from '@/components/matchday/AppIcon.vue'
import LeagueFilter from '@/components/matchday/LeagueFilter.vue'
const props = defineProps<{ query: string }>()
const { feed, loading, error, sources, refresh } = useArsenalSquad()
const league = shallowRef<League>('all')
const position = shallowRef<Position | 'all'>('all')
const formation = shallowRef<'433' | '4231'>('433')
const sort = shallowRef<'minutes' | 'goals' | 'appearances'>('minutes')
const firstTeam = shallowRef(true)
const selectedId = shallowRef('fpl-223340')
const detail = useTemplateRef<HTMLElement>('detail')
// 注释修改时间：2026-10-22
// 用途与逻辑：获取近期比赛范围，使用当前数据中的比赛与所选联赛生成近期赛程。
const matches = computed(() => recentSquadMatches(feed.value?.matches ?? [], league.value))
// 注释修改时间：2026-10-22
// 用途与逻辑：筛选赛事注册球员，英超检查 FPL 编号，欧冠检查 UEFA 编号，全部模式保留全员。
const registered = computed(() =>
  (feed.value?.players ?? []).filter((p) =>
    league.value === 'pl' ? p.fplId !== null : league.value === 'ucl' ? p.uefaId !== null : true,
  ),
)
// 注释修改时间：2026-10-22
// 用途与逻辑：汇总球员近期表现，逐个结合选定比赛和已取得的个人统计生成摘要。
const summaries = computed(() =>
  registered.value.map((p) => summarizePlayer(p, matches.value, feed.value?.performances ?? [])),
)
// 注释修改时间：2026-10-22
// 用途与逻辑：选择详情球员，优先保留当前选择，其次匹配默认球员，最后使用首位可用球员。
const selected = computed(
  () =>
    summaries.value.find((s) => s.player.id === selectedId.value) ??
    summaries.value.find((s) => s.player.shortName === 'Saka') ??
    summaries.value[0],
)
// 注释修改时间：2026-10-22
// 用途与逻辑：生成球员表格数据，叠加位置、一线队和搜索条件，再按统计指标与姓名排序。
const tablePlayers = computed(() =>
  summaries.value
    // 先叠加位置、一线队与姓名号码搜索条件，得到当前表格范围。
    .filter(
      (s) =>
        (position.value === 'all' || s.player.position === position.value) &&
        (!firstTeam.value || s.player.fplId !== null) &&
        `${s.player.name} ${s.player.shortName} ${s.player.number ?? ''}`
          .toLowerCase()
          .includes(props.query.trim().toLowerCase()),
    )
    // 按选定表现指标倒序排列，数值相同时使用姓名保持排序稳定。
    .sort(
      (a, b) =>
        (b.metrics[sort.value] ?? -1) - (a.metrics[sort.value] ?? -1) ||
        a.player.name.localeCompare(b.player.name),
    ),
)
// 注释修改时间：2026-10-22
// 用途与逻辑：生成统计日期范围，提取近期比赛首尾日期并格式化，无比赛时显示缺失说明。
const dateRange = computed(() => {
  // 提取当前近期比赛的首尾时间，空范围不执行日期格式化。
  const dates = matches.value.map((m) => m.kickoff)
  return dates.length
    ? `${shortDate(dates[dates.length - 1]!)} — ${shortDate(dates[0]!)}`
    : '尚无已完赛比赛'
})
// 注释修改时间：2026-10-22
// 用途与逻辑：统计各位置人数，以注册球员名单为基准逐项计算位置分布。
const positionCounts = computed(() =>
  positions.map((p) => ({
    ...p,
    count: registered.value.filter((player) => player.position === p.id).length,
  })),
)
// 注释修改时间：2026-10-22
// 用途与逻辑：格式化简短比赛日期，按上海时区输出两位数月日。
function shortDate(value: string) {
  // 固定使用上海时区，避免不同浏览器本地时区造成日期差异。
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}
// 注释修改时间：2026-10-22
// 用途与逻辑：生成数据源时间说明，有更新时间时按上海时区格式化，否则提示尚未取得。
function sourceDate(s: SquadSource) {
  // 来源没有更新时间时明确展示缺失状态，不使用当前时间替代。
  return s.updatedAt
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(s.updatedAt))
    : '尚未取得'
}
// 注释修改时间：2026-10-22
// 用途与逻辑：响应表格选人，更新详情编号并按减少动效偏好滚动到球员详情区域。
function selectFromTable(id: string) {
  // 先更新详情球员，再依据用户动效偏好滚动到详情容器。
  selectedId.value = id
  detail.value?.scrollIntoView({
    block: 'start',
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
}
</script>
<template>
  <div class="squad-workspace">
    <div class="squad-toolbar">
      <div>
        <span class="squad-kicker">ARSENAL · SQUAD INTELLIGENCE</span>
        <p>读懂场上的每一个位置，让下一次判断更有依据。</p>
      </div>
      <div class="squad-actions">
        <LeagueFilter v-model="league" label="球员统计赛事" />
        <button class="squad-refresh" :disabled="loading" @click="refresh">
          <AppIcon name="history" :size="14" :class="{ spinning: loading }" />{{
            loading ? '同步中' : '同步球员'
          }}
        </button>
      </div>
    </div>
    <div v-if="error" class="squad-warning" role="alert">
      <AppIcon name="info" :size="16" />{{ error }}{{ feed ? '，当前显示最近取得的数据。' : ''
      }}<button :disabled="loading" @click="refresh">重试</button>
    </div>
    <details v-if="sources.length" class="squad-sources">
      <summary>
        <span class="source-summary"
          ><i :class="{ stale: sources.some((s) => s.state !== 'success') }"></i
          >{{
            sources.every((s) => s.state === 'success')
              ? '官方数据已同步'
              : '部分来源使用缓存或暂不可用'
          }}<small>数据来源与统计口径</small></span
        ><AppIcon name="down" :size="12" />
      </summary>
      <div class="source-grid">
        <a
          v-for="source in sources"
          :key="source.id"
          :href="source.url"
          target="_blank"
          rel="noopener noreferrer"
          ><strong
            >{{ source.label
            }}<span :class="source.state">{{
              source.state === 'success'
                ? '已同步'
                : source.state === 'stale'
                  ? '使用缓存'
                  : '暂不可用'
            }}</span></strong
          ><small>{{ sourceDate(source) }} · 北京时间</small>
          <p v-if="source.message">{{ source.message }}</p></a
        >
      </div>
      <p class="source-explanation">
        位置和号码优先采用本地缓存的 UEFA 注册名单，网页名单抓取已停用；其余球员采用 FPL 位置，FPL
        会把部分边锋归为中场。英超助攻为 FPL 口径，欧冠为 UEFA
        口径，综合视图不合计不同口径的助攻。参考阵容按各位置近期出场时间生成，可能包含伤停球员。
      </p>
    </details>
    <div v-if="loading && !feed" class="squad-loading" role="status">
      <div class="squad-loading-badge">
        <img src="/images/arsenal.png" width="42" height="48" alt="阿森纳" /><span></span>
      </div>
      <strong>正在召集你的枪手阵容</strong>
      <p>首次同步需要取得球员名单与逐场统计，之后会优先展示缓存。</p>
      <div class="skeleton-lines"><span></span><span></span><span></span></div>
    </div>
    <template v-else-if="feed && feed.players.length">
      <div class="squad-window">
        <div>
          <span class="window-label">RECENT FORM</span
          ><strong>最近 {{ matches.length }} 场已完赛</strong><span>{{ dateRange }}</span
          ><small v-if="matches.length < 5">本赛季该范围尚不足五场</small>
        </div>
        <div class="position-counts">
          <span v-for="role in positionCounts" :key="role.id"
            >{{ role.label }}<b>{{ role.count.toString().padStart(2, '0') }}</b></span
          >
        </div>
      </div>
      <div :key="league" class="squad-primary">
        <SquadPitch
          v-model:formation="formation"
          :players="summaries"
          :selected="selected?.player.id ?? ''"
          @select="selectedId = $event"
        />
        <div ref="detail" class="detail-anchor">
          <PlayerDetail
            v-if="selected"
            :summary="selected"
            :matches="matches"
            :performances="feed.performances"
          />
          <p v-else class="squad-warning">当前赛事暂无可关联球员数据，可继续使用下方个人阵容板。</p>
        </div>
      </div>
      <PersonalLineup :players="feed.players" />
      <PlayerMatchLog
        v-if="selected"
        :player="selected.player"
        :matches="matches"
        :performances="feed.performances"
      />
      <SquadTable
        v-model:position="position"
        v-model:sort="sort"
        v-model:first-team="firstTeam"
        :players="tablePlayers"
        :selected="selected?.player.id ?? ''"
        :empty-message="query ? '没有找到这位球员' : '当前筛选下没有球员'"
        @select="selectFromTable"
      />
      <div class="squad-method">
        <AppIcon name="info" :size="16" />
        <p>
          统计窗口为球队在所选赛事中最近五场已完赛比赛，未出场不向前补场；逐场官方记录明确为零才显示
          0。独立拦截暂未提供，英超“防守合计”为解围、封堵、拦截总和。欧冠解围显示完成解围，出场时间可能含加时。<br />切换赛事可查看各自的助攻口径；缺失数据与尚未取得的统计显示
          —。
        </p>
      </div>
    </template>
    <div v-else class="squad-empty">
      <AppIcon name="shield" :size="36" />
      <h2>暂时还没有取得球员名单</h2>
      <p>官方服务恢复后即可同步。你可以稍后重试。</p>
      <button class="primary-button" :disabled="loading" @click="refresh">重新同步球员</button>
    </div>
  </div>
</template>
<style scoped>
.squad-workspace {
  color: var(--md-text, #566c49);
}
.squad-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin: 5px 0 15px;
}
.squad-kicker {
  font-size: 12px;
  letter-spacing: 1.8px;
  color: var(--md-secondary, #8d9b79);
}
.squad-toolbar > div > p {
  font-size: 14px;
  color: var(--md-muted, #9fa78f);
  margin: 6px 0 0;
}
.squad-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.squad-refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--md-border, #dce5d1);
  border-radius: 6px;
  background: var(--md-surface, #fff);
  padding: 10px 12px;
  color: var(--md-secondary, #70875d);
  font-size: 14px;
}
.squad-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--md-warning, #a27749);
  background: var(--md-warning-soft, #fbf5e9);
  border: 1px solid var(--md-border, #ede0bd);
  padding: 12px;
  border-radius: 7px;
  font-size: 15px;
  margin: 12px 0;
}
.squad-warning button {
  border: 0;
  background: transparent;
  color: inherit;
  text-decoration: underline;
  margin-left: auto;
}
.squad-sources {
  border-bottom: 1px solid var(--md-border, #e5ebda);
  margin: 0 0 19px;
  padding-bottom: 12px;
}
.squad-sources summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--md-muted, #99a489);
  font-size: 13px;
}
.squad-sources summary::-webkit-details-marker {
  display: none;
}
.source-summary {
  display: flex;
  align-items: center;
  gap: 7px;
}
.source-summary > i {
  width: 5px;
  height: 5px;
  background: #769c63;
  border-radius: 50%;
}
.source-summary > i.stale {
  background: #b79760;
}
.source-summary small {
  font-size: 12px;
  color: var(--md-muted, #aab29b);
  margin-left: 6px;
}
.source-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding-top: 15px;
}
.source-grid a {
  background: var(--md-surface, #fff);
  border: 1px solid var(--md-border, #e5ebdc);
  border-radius: 6px;
  padding: 10px;
  text-decoration: none;
  color: var(--md-secondary, #7d8b6e);
  min-width: 0;
}
.source-grid strong {
  font-size: 13px;
  display: block;
  font-weight: 500;
}
.source-grid strong span {
  font-size: 11px;
  margin-left: 6px;
  color: var(--md-secondary, #83a46b);
}
.source-grid strong .stale {
  color: var(--md-warning, #b7995f);
}
.source-grid strong .error {
  color: var(--md-danger, #b17b6b);
}
.source-grid small {
  font-size: 12px;
  color: var(--md-muted, #a0aa90);
  display: block;
  margin-top: 6px;
}
.source-grid p {
  font-size: 13px;
  color: var(--md-warning, #ac8661);
  margin-bottom: 0;
  line-height: 1.5;
}
.source-explanation {
  font-size: 13px;
  color: var(--md-muted, #95a083);
  line-height: 1.8;
  margin: 12px 0 0;
}
.squad-window {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 0 1px 18px;
}
.squad-window > div:first-child {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.window-label {
  font-size: 12px;
  letter-spacing: 1.5px;
  color: var(--md-muted, #99a982);
}
.squad-window strong {
  font-size: 15px;
  font-weight: 500;
  color: var(--md-secondary, #647e50);
}
.squad-window > div > span:not(.window-label) {
  font-size: 13px;
  color: var(--md-muted, #a4ae96);
}
.squad-window small {
  font-size: 12px;
  color: var(--md-warning, #b29869);
}
.position-counts {
  display: flex;
  gap: 19px;
  flex-shrink: 0;
}
.position-counts > span {
  font-size: 13px !important;
  color: var(--md-muted, #9ba78a) !important;
}
.position-counts b {
  font-family: Bahnschrift, sans-serif;
  font-size: 21px;
  color: var(--md-secondary, #738c5d);
  font-weight: 400;
  margin-left: 5px;
}
.squad-primary {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 1fr);
  gap: 20px;
  align-items: start;
  animation: squad-in 0.45s ease both;
}
.detail-anchor {
  min-width: 0;
  scroll-margin-top: 25px;
}
.squad-method {
  display: flex;
  gap: 9px;
  margin: 18px 0;
  color: var(--md-muted, #97a285);
}
.squad-method > svg {
  flex-shrink: 0;
  margin-top: 2px;
}
.squad-method p {
  font-size: 13px;
  line-height: 1.9;
  margin: 0;
}
.squad-loading,
.squad-empty {
  border: 1px solid var(--md-border, #e4ebd9);
  background: var(--md-surface, #fff);
  border-radius: 13px;
  min-height: 470px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 30px 20px;
}
.squad-loading strong {
  font-weight: 500;
  font-size: 20px;
  color: var(--md-secondary, #5b7850);
  margin-top: 18px;
}
.squad-loading p,
.squad-empty p {
  font-size: 15px;
  color: var(--md-muted, #9da98c);
  line-height: 1.8;
  max-width: 350px;
}
.squad-empty h2 {
  font-size: 22px;
  font-weight: 500;
}
.squad-loading-badge {
  position: relative;
  padding: 20px;
}
.squad-loading-badge span {
  position: absolute;
  inset: 0;
  border: 1px solid var(--md-border, #dce6ce);
  border-top-color: var(--md-accent, #849c62);
  border-radius: 50%;
  animation: squad-spin 1.6s linear infinite;
}
.skeleton-lines {
  width: min(420px, 100%);
  margin-top: 25px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skeleton-lines span {
  height: 23px;
  background: linear-gradient(
    90deg,
    var(--md-soft, #f1f5e9),
    var(--md-soft, #e7efdb),
    var(--md-soft, #f1f5e9)
  );
  background-size: 200% 100%;
  border-radius: 5px;
  animation: skeleton-shimmer 1.7s ease infinite;
}
.skeleton-lines span:last-child {
  width: 65%;
  align-self: center;
}
.spinning {
  animation: squad-spin 1.4s linear infinite;
}
@keyframes squad-in {
  from {
    opacity: 0;
    transform: translateY(7px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes squad-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes skeleton-shimmer {
  to {
    background-position: -200% 0;
  }
}
@media (max-width: 1100px) {
  .squad-toolbar {
    align-items: flex-start;
  }
  .squad-toolbar > div > p {
    max-width: 190px;
    line-height: 1.7;
  }
  .position-counts {
    gap: 10px;
  }
  .squad-primary {
    grid-template-columns: minmax(0, 1.2fr) minmax(290px, 1fr);
    gap: 14px;
  }
  .source-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .window-label {
    display: none;
  }
  .squad-window > div:first-child {
    gap: 7px;
  }
}
@media (max-width: 850px) {
  .squad-toolbar {
    flex-direction: column;
    gap: 13px;
  }
  .squad-toolbar > div > p {
    max-width: none;
  }
  .squad-actions {
    width: 100%;
    justify-content: space-between;
  }
  .squad-primary {
    grid-template-columns: minmax(0, 1fr);
  }
  .squad-window {
    align-items: flex-start;
  }
  .squad-window > div:first-child {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .position-counts {
    gap: 9px;
  }
  .position-counts b {
    font-size: 18px;
  }
  .squad-leagues button {
    padding: 7px 9px;
  }
  .squad-refresh {
    padding: 10px;
  }
  .squad-method p {
    font-size: 12px;
  }
}
</style>
