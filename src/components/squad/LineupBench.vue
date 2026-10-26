<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { positions, type Position, type SquadPlayer } from '@/data/squad'
import PlayerPortrait from './PlayerPortrait.vue'
import AppIcon from '@/components/matchday/AppIcon.vue'
const props = defineProps<{
  players: SquadPlayer[]
  assigned: string[]
  selected: string
  target: string | null
}>()
const emit = defineEmits<{
  select: [id: string]
  pointerStart: [event: PointerEvent, id: string]
}>()
const search = shallowRef('')
const position = shallowRef<Position | 'all'>('all')
const firstTeam = shallowRef(true)
// 注释修改时间：2026-10-22
// 用途与逻辑：构建已上场球员集合，便于候选名单排序时快速判断球员是否已经安排。
const assigned = computed(() => new Set(props.assigned))
// 注释修改时间：2026-10-22
// 用途与逻辑：生成候选球员名单，结合一线队、位置与搜索筛选，并将未安排球员优先排序。
const visible = computed(() =>
  props.players
    .filter(
      (p) =>
        (!firstTeam.value || p.fplId !== null) &&
        (position.value === 'all' || p.position === position.value) &&
        `${p.name} ${p.shortName} ${p.number ?? ''}`
          .toLowerCase()
          .includes(search.value.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(assigned.value.has(a.id)) - Number(assigned.value.has(b.id)) ||
        a.name.localeCompare(b.name),
    ),
)
// 注释修改时间：2026-10-22
// 用途与逻辑：启动候选球员拖动，仅在非触摸指针操作时向父组件转发拖动起始事件。
function start(event: PointerEvent, id: string) {
  // 非触摸操作才转发指针起点，触摸设备保留现有点击选择流程。
  if (event.pointerType !== 'touch') emit('pointerStart', event, id)
}
</script>
<template>
  <aside
    class="lineup-bench"
    :class="{ targeted: target === 'bench' }"
    data-lineup-target="bench"
    aria-label="阵容候选球员"
  >
    <div class="bench-heading">
      <div>
        <span>THE SELECTION</span>
        <h3>你的球员席</h3>
      </div>
      <b>{{ visible.length }}<small>人</small></b>
    </div>
    <label class="bench-search"
      ><AppIcon name="search" :size="14" /><input
        v-model="search"
        aria-label="搜索阵容候选球员"
        placeholder="搜索姓名或号码"
    /></label>
    <div class="bench-filters" aria-label="候选球员位置">
      <button :aria-pressed="position === 'all'" @click="position = 'all'">全部</button
      ><button
        v-for="role in positions"
        :key="role.id"
        :aria-pressed="position === role.id"
        @click="position = role.id"
      >
        {{ role.label }}
      </button>
    </div>
    <label class="bench-first-team"
      ><input v-model="firstTeam" type="checkbox" />仅英超名单球员</label
    >
    <div class="bench-list">
      <div
        v-for="player in visible"
        :key="player.id"
        class="bench-card"
        :class="{ picked: selected === player.id, assigned: assigned.has(player.id) }"
      >
        <button
          class="bench-player"
          :aria-label="`选择${player.name}安排阵容`"
          :aria-pressed="selected === player.id"
          @click="$emit('select', player.id)"
          @pointerdown="start($event, player.id)"
          @dragstart.prevent
        >
          <PlayerPortrait :player="player" /><span class="bench-name"
            ><strong>{{ player.shortName }}</strong
            ><small
              >{{ positions.find((r) => r.id === player.position)?.label }} ·
              {{ player.number === null ? '号码暂缺' : `#${player.number}`
              }}<i v-if="player.status === 'injured' || player.status === 'doubtful'">{{
                player.status === 'injured' ? '伤停' : '存疑'
              }}</i></small
            ></span
          ><span v-if="assigned.has(player.id)" class="on-pitch">场上</span>
        </button>
        <button
          class="bench-drag"
          :aria-label="`拖动${player.name}，也可点击选择`"
          @pointerdown="$emit('pointerStart', $event, player.id)"
          @click="$emit('select', player.id)"
          @dragstart.prevent
        >
          <span aria-hidden="true">⠿</span>
        </button>
      </div>
      <p v-if="!visible.length" class="bench-empty">没有找到球员，请调整筛选条件。</p>
    </div>
    <div class="bench-tip">
      <AppIcon name="info" :size="13" />
      <p>拖动右侧手柄，或点选球员后点击球场位置。把场上球员拖回这里即可移出。</p>
    </div>
  </aside>
</template>
<style scoped>
.lineup-bench {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--md-border, #e2e9d7);
  border-radius: 10px;
  background: var(--md-soft, #fbfcf7);
  padding: 19px 17px 13px;
  transition:
    border-color 0.2s,
    background 0.2s;
}
.lineup-bench.targeted {
  border-color: var(--md-accent, #829c5e);
  background: var(--md-soft, #eef4e4);
}
.bench-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
}
.bench-heading span {
  color: var(--md-muted, #a0ad8c);
  font-size: 12px;
  letter-spacing: 1.6px;
}
.bench-heading h3 {
  margin: 6px 0 0;
  color: var(--md-text, #49663d);
  font-size: 21px;
  font-weight: 500;
}
.bench-heading b {
  font-family: Bahnschrift, sans-serif;
  font-size: 30px;
  color: var(--md-secondary, #7c9362);
  font-weight: 400;
}
.bench-heading b small {
  font-family: inherit;
  font-size: 13px;
  margin-left: 5px;
}
.bench-search {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--md-border, #e1e8d5);
  padding: 10px;
  border-radius: 6px;
  color: var(--md-muted, #9ca989);
  background: var(--md-surface, #fff);
}
.bench-search:focus-within {
  border-color: var(--md-accent, #809861);
}
.bench-search input {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--md-text, #527445);
}
.bench-search input::placeholder {
  color: var(--md-muted, #a2ac91);
}
.bench-filters {
  display: flex;
  gap: 3px;
  margin: 12px 0 9px;
}
.bench-filters button {
  flex: 1;
  border: 0;
  padding: 6px 2px;
  font-size: 14px;
  color: var(--md-muted, #94a07f);
  border-radius: 4px;
  background: transparent;
}
.bench-filters button[aria-pressed='true'] {
  color: var(--md-text, #506d3b);
  background: var(--md-soft, #e9f0dc);
}
.bench-first-team {
  font-size: 13px;
  color: var(--md-secondary, #8d9a7a);
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 13px;
}
.bench-first-team input {
  accent-color: var(--md-accent, #64874e);
  margin: 0;
}
.bench-list {
  height: 349px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--md-border, #cfdac0) transparent;
  padding-right: 3px;
}
.bench-card {
  display: flex;
  border: 1px solid var(--md-border, #e4eadb);
  background: var(--md-surface, #fff);
  border-radius: 7px;
  margin-bottom: 7px;
  min-height: 53px;
  overflow: hidden;
}
.bench-card.picked {
  border-color: var(--md-accent, #8da666);
  background: var(--md-soft, #eff4e5);
}
.bench-player {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  color: inherit;
  padding: 8px 9px;
  text-align: left;
  cursor: grab;
  user-select: none;
  touch-action: pan-y;
}
.bench-player :deep(.player-portrait) {
  width: 34px;
  pointer-events: none;
}
.bench-name {
  min-width: 0;
  flex: 1;
  pointer-events: none;
}
.bench-name strong {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: var(--md-secondary, #5b7348);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bench-name small {
  display: block;
  font-size: 12px;
  margin-top: 5px;
  color: var(--md-muted, #9ea98f);
}
.bench-name i {
  font-style: normal;
  color: var(--md-warning, #a2855d);
  margin-left: 5px;
}
.on-pitch {
  font-size: 12px;
  color: var(--md-secondary, #8c9d73);
  padding: 3px 5px;
  background: var(--md-soft, #edf2e5);
  border-radius: 3px;
}
.bench-drag {
  flex-shrink: 0;
  width: 34px;
  min-height: 45px;
  touch-action: none;
  background: transparent;
  border: 0;
  border-left: 1px solid var(--md-border, #ecf0e5);
  color: var(--md-muted, #a5b28f);
  font-size: 26px;
  cursor: grab;
}
.bench-drag:hover {
  color: var(--md-text, #506f3d);
  background: var(--md-soft, #edf3e3);
}
.bench-player:focus-visible,
.bench-drag:focus-visible {
  outline: 2px solid var(--md-accent, #849e5e);
  outline-offset: -3px;
}
.bench-empty {
  text-align: center;
  padding: 35px 8px;
  color: var(--md-muted, #a1ac92);
  font-size: 15px;
}
.bench-tip {
  display: flex;
  gap: 7px;
  align-items: flex-start;
  padding: 13px 0 0;
  border-top: 1px solid var(--md-border, #e4eadb);
  color: var(--md-muted, #9ba88a);
  font-size: 13px;
}
.bench-tip svg {
  flex-shrink: 0;
  margin-top: 1px;
}
.bench-tip p {
  margin: 0;
  line-height: 1.8;
}
@media (max-width: 850px) {
  .bench-list {
    height: 260px;
  }
  .lineup-bench {
    padding: 16px;
  }
}
</style>
