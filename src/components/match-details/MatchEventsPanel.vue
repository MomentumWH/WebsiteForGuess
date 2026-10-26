<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import type { Match } from '@/data/matches'
import { eventTime, type MatchEvents } from '@/data/matchEvents'
import AppIcon from '@/components/matchday/AppIcon.vue'
import TeamBadge from '@/components/matchday/TeamBadge.vue'

const props = defineProps<{
  match: Match
  timeline?: MatchEvents
  loading: boolean
  error: string
}>()
defineEmits<{ refresh: [] }>()
const filter = shallowRef<'all' | 'goal' | 'substitution'>('all')
// 注释修改时间：2026-10-22
// 用途与逻辑：切换比赛时重置赛况筛选，通过监听比赛编号避免沿用上一场的筛选条件。
watch(
  () => props.match.id,
  () => {
    // 比赛编号变化后恢复全部赛况，防止筛选条件跨比赛残留。
    filter.value = 'all'
  },
)
// 注释修改时间：2026-10-22
// 用途与逻辑：读取比赛事件列表，时间线尚未提供时使用空列表保持渲染稳定。
const events = computed(() => props.timeline?.events ?? [])
// 注释修改时间：2026-10-22
// 用途与逻辑：按赛况类别过滤事件，分别保留全部、进球与助攻或换人记录。
const visible = computed(() =>
  events.value.filter(
    (e) =>
      filter.value === 'all' ||
      (filter.value === 'goal'
        ? e.type === 'goal' || e.type === 'assist'
        : e.type === 'substitution'),
  ),
)
// 注释修改时间：2026-10-22
// 用途与逻辑：统计进球事件数量，过滤时间线中类型为进球的记录后计数。
const goalCount = computed(() => events.value.filter((e) => e.type === 'goal').length)
// 注释修改时间：2026-10-22
// 用途与逻辑：统计换人事件数量，过滤时间线中类型为换人的记录后计数。
const subCount = computed(() => events.value.filter((e) => e.type === 'substitution').length)
// 注释修改时间：2026-10-22
// 用途与逻辑：读取赛况数据源信息，直接派生当前时间线的来源状态。
const source = computed(() => props.timeline?.source)
// 注释修改时间：2026-10-22
// 用途与逻辑：生成赛况提示，优先展示请求错误，再提示旧缓存状态或数据源说明。
const notice = computed(
  () =>
    props.error ||
    (source.value?.state === 'stale'
      ? '本次同步暂不可用，正在展示上次成功取得的赛况。'
      : source.value?.message) ||
    '',
)
// 注释修改时间：2026-10-22
// 用途与逻辑：格式化赛况更新时间，存在时间时按上海时区显示月日时分，否则留空。
const updated = computed(() =>
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
const filters = [
  { key: 'all', label: '全部赛况' },
  { key: 'goal', label: '进球与助攻' },
  { key: 'substitution', label: '换人记录' },
] as const
</script>

<template>
  <section
    class="match-events-panel panel"
    :aria-busy="loading"
    aria-labelledby="match-events-title"
  >
    <div class="detail-section-heading">
      <div>
        <span class="detail-eyebrow">THE MATCH STORY</span>
        <h3 id="match-events-title">比赛赛况</h3>
      </div>
      <button class="events-refresh" :disabled="loading" @click="$emit('refresh')">
        <AppIcon name="refresh" :size="14" />{{ loading ? '同步中' : '更新赛况' }}
      </button>
    </div>
    <div class="events-intro">
      <p>从进球到换人，回看比赛的关键时刻。</p>
      <span v-if="timeline"
        >已记录 <b>{{ goalCount }}</b> 次进球 · <b>{{ subCount }}</b> 次换人</span
      >
    </div>
    <div class="events-filters" role="group" aria-label="筛选赛况">
      <button
        v-for="item in filters"
        :key="item.key"
        :aria-pressed="filter === item.key"
        @click="filter = item.key"
      >
        {{ item.label }}
      </button>
    </div>
    <p v-if="notice" class="events-notice" role="status">
      <AppIcon name="info" :size="16" />{{ notice }}
    </p>
    <div v-if="loading && !timeline" class="events-loading" role="status">
      <span class="detail-spinner"></span>正在同步官方进球、助攻与换人记录…
    </div>
    <ol v-else-if="visible.length" class="events-list" aria-label="比赛关键事件时间线">
      <li
        v-for="event in visible"
        :key="event.id"
        class="event-row"
        :class="[event.type, { away: event.teamId === match.away.id }]"
        :data-event="event.type"
      >
        <div class="event-time">
          {{ eventTime(event)
          }}<small v-if="event.phase.includes('EXTRA') || event.phase.includes('OVERTIME')"
            >加时</small
          >
        </div>
        <span class="event-marker" aria-hidden="true"
          ><AppIcon
            :name="
              event.type === 'substitution' ? 'swap' : event.type === 'assist' ? 'target' : 'ball'
            "
            :size="17"
        /></span>
        <div class="event-body">
          <div class="event-topline">
            <span class="event-kind">{{
              event.type === 'goal' ? '进球' : event.type === 'assist' ? '助攻' : '换人'
            }}</span
            ><span class="event-team"
              ><TeamBadge
                :team="event.teamId === match.home.id ? match.home : match.away"
                :size="16"
              />{{ event.teamId === match.home.id ? match.home.name : match.away.name }}</span
            >
          </div>
          <template v-if="event.type === 'substitution'"
            ><div class="event-player event-in">
              <span>↑ 上场</span><strong>{{ event.playerIn?.name ?? '官方未提供球员' }}</strong>
            </div>
            <div class="event-player event-out">
              <span>↓ 下场</span><strong>{{ event.playerOut?.name ?? '官方未提供球员' }}</strong>
            </div></template
          >
          <template v-else
            ><strong class="event-scorer">{{ event.player?.name ?? '官方未提供球员' }}</strong>
            <p v-if="event.type === 'goal'" class="event-assist">
              {{
                event.assist
                  ? `助攻 · ${event.assist.name}`
                  : match.league === 'ucl'
                    ? '助攻按官方独立事件展示'
                    : '助攻 · 官方未提供'
              }}
            </p></template
          >
        </div>
      </li>
    </ol>
    <p v-else class="events-empty" role="status">
      {{
        timeline?.events.length
          ? '当前筛选下暂无已记录的事件。'
          : '本场比赛暂无可用的官方进球与换人记录。'
      }}
    </p>
    <div class="events-source">
      <span
        >{{ source?.label ?? '官方比赛赛况' }}{{ updated ? ` · ${updated} 更新（北京时间）` : ''
        }}{{ source?.state === 'stale' ? ' · 使用缓存' : '' }}</span
      ><span>按发生时间排列</span>
    </div>
    <p class="detail-note">
      仅显示已取得的官方记录，缺失助攻不等于无助攻。{{
        match.league === 'ucl' ? '欧冠助攻作为独立事件展示，不与临近进球自动配对。' : ''
      }}加时事件保留，点球大战不计入本时间线。
    </p>
  </section>
</template>

<style scoped>
.match-events-panel {
  margin-top: 22px;
  padding: 26px;
}
.events-refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--md-border, #e1e8dc);
  border-radius: 6px;
  background: var(--md-soft, #f4f7ef);
  padding: 9px 12px;
  color: var(--md-text, #315f49);
  font-size: 13px;
}
.events-intro {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 20px;
  color: var(--md-secondary, #758077);
  font-size: 14px;
  margin: 12px 0 20px;
  line-height: 1.7;
}
.events-intro p {
  margin: 0;
}
.events-intro > span {
  font-size: 12px;
}
.events-intro b {
  color: var(--md-text, #315f49);
  font-variant-numeric: tabular-nums;
}
.events-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--md-border, #e6ebe3);
}
.events-filters button {
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 8px 13px;
  background: transparent;
  color: var(--md-secondary, #758077);
  font-size: 13px;
  transition:
    background 0.2s,
    color 0.2s;
}
.events-filters button[aria-pressed='true'] {
  color: var(--md-text, #315f49);
  background: var(--md-selected, #eaf2e2);
  border-color: var(--md-border, #e1e8dc);
}
.events-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--md-soft, #f4f7ef);
  color: var(--md-secondary, #758077);
  padding: 12px;
  border-radius: 6px;
  line-height: 1.8;
  font-size: 13px;
}
.events-notice svg {
  flex-shrink: 0;
}
.events-loading,
.events-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 150px;
  color: var(--md-secondary, #758077);
  font-size: 14px;
  text-align: center;
  line-height: 1.8;
}
.events-list {
  list-style: none;
  margin: 18px 0;
  padding: 0;
}
.event-row {
  display: grid;
  grid-template-columns: 66px 34px minmax(0, 1fr);
  column-gap: 16px;
  padding: 15px 0;
  position: relative;
}
.event-row::before {
  content: '';
  position: absolute;
  left: 98px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--md-border, #e1e8dc);
}
.event-row:first-child::before {
  top: 27px;
}
.event-row:last-child::before {
  bottom: calc(100% - 28px);
}
.event-time {
  padding-top: 6px;
  text-align: right;
  font-size: 18px;
  font-weight: 650;
  color: var(--md-text, #315f49);
  font-variant-numeric: tabular-nums;
}
.event-time small {
  display: block;
  font-size: 11px;
  font-weight: 400;
  color: var(--md-muted, #98a099);
  margin-top: 5px;
}
.event-marker {
  z-index: 1;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--md-border, #e1e8dc);
  border-radius: 50%;
  background: var(--md-soft, #f4f7ef);
  color: var(--md-accent, #438762);
}
.goal .event-marker {
  background: var(--md-selected, #eaf2e2);
}
.away .event-marker {
  color: var(--md-warning, #ad8e52);
}
.event-body {
  min-width: 0;
  padding: 6px 0 17px;
  border-bottom: 1px solid var(--md-border, #e6ebe3);
}
.event-row:last-child .event-body {
  border-bottom: 0;
}
.event-topline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
}
.event-kind {
  color: var(--md-accent, #438762);
}
.away .event-kind {
  color: var(--md-warning, #ad8e52);
}
.event-team {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--md-secondary, #758077);
}
.event-scorer,
.event-player strong {
  font-size: 17px;
  font-weight: 600;
  color: var(--md-text, #273e31);
  overflow-wrap: anywhere;
}
.event-assist {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--md-secondary, #758077);
  line-height: 1.7;
}
.event-player {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 8px;
}
.event-player > span {
  flex-shrink: 0;
  font-size: 12px;
}
.event-in > span {
  color: var(--md-accent, #438762);
}
.event-out > span {
  color: var(--md-warning, #ad8e52);
}
.event-out strong {
  font-weight: 400;
  color: var(--md-secondary, #758077);
}
.events-source {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 18px;
  border-top: 1px solid var(--md-border, #e6ebe3);
  font-size: 12px;
  line-height: 1.7;
  color: var(--md-secondary, #758077);
}
@media (max-width: 600px) {
  .match-events-panel {
    padding: 20px 16px;
  }
  .events-refresh {
    padding: 8px;
    font-size: 12px;
  }
  .events-filters button {
    padding: 8px 10px;
    font-size: 12px;
  }
  .event-row {
    grid-template-columns: 43px 28px minmax(0, 1fr);
    column-gap: 10px;
  }
  .event-row::before {
    left: 66px;
  }
  .event-marker {
    width: 28px;
    height: 28px;
  }
  .event-time {
    font-size: 15px;
  }
  .event-scorer,
  .event-player strong {
    font-size: 15px;
  }
  .event-team {
    font-size: 11px;
  }
  .event-topline {
    margin-bottom: 8px;
  }
  .event-assist {
    font-size: 12px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .events-filters button {
    transition: none;
  }
}
</style>
