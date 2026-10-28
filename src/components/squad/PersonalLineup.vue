<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { formations, type FormationId } from '@/data/lineup'
import type { SquadPlayer } from '@/data/squad'
import { usePersonalLineup } from '@/composables/usePersonalLineup'
import { useLineupDrag } from '@/composables/useLineupDrag'
import LineupPitch from './LineupPitch.vue'
import LineupBench from './LineupBench.vue'
import PlayerPortrait from './PlayerPortrait.vue'
import AppIcon from '@/components/matchday/AppIcon.vue'
import LiquidGlassTabs from '@/components/matchday/LiquidGlassTabs.vue'
const props = defineProps<{ players: SquadPlayer[] }>()
// 创建时间：2026-10-28；调用记录：GPT-20261028-002
// 用途与逻辑：将既有阵型模板映射为通用玻璃选项，保持阵型编号与切换方法契约一致。
const formationOptions = formations.map((formation) => ({
  value: formation.id,
  label: formation.label,
}))
const root = useTemplateRef<HTMLElement>('root')
const { draft, template, storageError, place, remove, change, clear } = usePersonalLineup()
const selected = shallowRef('')
const confirmingClear = shallowRef(false)
const announcement = shallowRef('先选一套阵型，再把你的球员安排上场。')
// 注释修改时间：2026-10-22
// 用途与逻辑：读取已安排球员编号，将阵容位置映射的值汇总为列表供状态与候选名单使用。
const assigned = computed(() => Object.values(draft.value.assignments))
// 注释修改时间：2026-10-22
// 用途与逻辑：获取当前选中球员，按选中编号在传入球员名单中匹配记录。
const selectedPlayer = computed(() => props.players.find((p) => p.id === selected.value))
// 注释修改时间：2026-10-22
// 用途与逻辑：识别名单中已缺失的上场球员，筛出无法在当前球员列表找到的编号。
const missing = computed(() =>
  assigned.value.filter((id) => !props.players.some((p) => p.id === id)),
)
// 注释修改时间：2026-10-22
// 用途与逻辑：初始化阵容拖动交互，按目标是候选席还是球场位置分别调用移除或安排方法。
const { active, target, start, cancel, suppressClick } = useLineupDrag(
  root,
  (player, destination) => {
    // 拖到候选席时移除上场安排，拖到球场槽位时执行放置或互换。
    if (destination === 'bench') removeFromPitch(player)
    else arrange(player, destination)
  },
)
// 注释修改时间：2026-10-22
// 用途与逻辑：获取正在拖动的球员，按拖动状态中的球员编号匹配完整球员信息。
const draggedPlayer = computed(() => props.players.find((p) => p.id === active.value?.id))
// 注释修改时间：2026-10-22
// 用途与逻辑：切换球员选择，忽略拖动后的点击，更新选中编号并刷新操作提示。
function choose(id: string) {
  // 忽略拖动结束后的合成点击，避免刚放置球员又被错误选中。
  if (suppressClick()) return
  // 再次点击同一球员取消选择，同时撤销清空确认并更新操作说明。
  selected.value = selected.value === id ? '' : id
  confirmingClear.value = false
  announcement.value = selected.value
    ? `已选 ${selectedPlayer.value?.shortName ?? '球员'}，点击球场位置即可安排。`
    : '已取消选择。'
}
// 注释修改时间：2026-10-22
// 用途与逻辑：安排球员位置，先校验球员存在，再记录替换信息、更新阵容并生成反馈。
function arrange(id: string, destination: string) {
  // 仅允许当前名单中的有效球员进入阵容，避免使用失效编号。
  if (!props.players.some((p) => p.id === id)) return
  // 记录目标位置旧球员与当前上场状态，供放置后的反馈区分互换和替换。
  const previous = draft.value.assignments[destination]
  const onPitch = assigned.value.includes(id)
  // 提交位置安排后取消选择，并根据原占位情况说明实际操作结果。
  place(id, destination)
  selected.value = ''
  announcement.value =
    previous && previous !== id
      ? onPitch
        ? '两位球员已互换位置。'
        : '已替换球员，原球员返回候选名单。'
      : '球员已安排到位。'
}
// 注释修改时间：2026-10-22
// 用途与逻辑：处理球场位置选择，优先放置已选球员，否则选中该位置球员或提示先选人。
function selectSlot(id: string) {
  // 先屏蔽拖动衍生点击，再按已选球员与位置占用情况分派操作。
  if (suppressClick()) return
  if (selected.value) arrange(selected.value, id)
  else if (draft.value.assignments[id]) choose(draft.value.assignments[id])
  else announcement.value = '先在球员席选择一位球员，再点击这个位置。'
}
// 注释修改时间：2026-10-22
// 用途与逻辑：将球员移出球场，更新阵容并清除对应选择，再提示其余位置保持不变。
function removeFromPitch(id: string) {
  // 先移除位置安排，再清除该球员可能残留的选择状态。
  remove(id)
  if (selected.value === id) selected.value = ''
  announcement.value = '球员已移出，其他位置保持原有安排。'
}
// 注释修改时间：2026-10-22
// 用途与逻辑：切换阵型，先取消拖动，再调用阵型迁移逻辑并重置清空确认状态。
function switchFormation(id: FormationId) {
  // 切阵前终止正在进行的拖动，再由统一阵型工具迁移现有安排。
  cancel()
  change(id)
  confirmingClear.value = false
  announcement.value = '阵型已切换，已选球员保留在场上；原位置不存在时安排到相邻空位。'
}
// 注释修改时间：2026-10-22
// 用途与逻辑：重置个人阵容，取消拖动并清空位置安排，再恢复选择和提示状态。
function reset() {
  // 重置前取消拖动，随后清空阵容和临时选择，避免旧拖动落点再次写入。
  cancel()
  clear()
  selected.value = ''
  confirmingClear.value = false
  announcement.value = '阵容已清空，可以重新安排球员。'
}
// 注释修改时间：2026-10-22
// 用途与逻辑：取消当前交互，停止拖动并清除选择及清空确认，向用户反馈取消结果。
function escape() {
  // 同时取消拖动、选择和清空确认，让取消操作回到稳定状态。
  cancel()
  selected.value = ''
  confirmingClear.value = false
  announcement.value = '已取消选择与拖动。'
}
// 注释修改时间：2026-10-22
// 用途与逻辑：取消球员选择，清空选中编号并更新提示，不修改已保存的位置安排。
function cancelSelection() {
  // 只清除当前选择，不触碰已安排到球场的球员。
  selected.value = ''
  announcement.value = '已取消选择。'
}
</script>
<template>
  <section
    ref="root"
    class="personal-lineup"
    aria-labelledby="personal-lineup-title"
    @keydown.esc="escape"
  >
    <div class="lineup-heading">
      <div>
        <span class="lineup-kicker">MY TACTICS · MY GUNNERS</span>
        <h2 id="personal-lineup-title">我的阵容，由我排定。</h2>
        <p>选择阵型，把球员拖到你心中的位置。</p>
      </div>
      <div class="lineup-count">
        <b>{{ assigned.length.toString().padStart(2, '0') }}</b
        ><span>/ 11<small>已安排球员</small></span>
      </div>
    </div>
    <div class="lineup-toolbar">
      <LiquidGlassTabs
        :model-value="draft.formation"
        :items="formationOptions"
        label="我的阵容模板"
        variant="wrap"
        @update:model-value="switchFormation"
      />
      <button
        class="lineup-clear"
        :disabled="!assigned.length"
        @click="confirmingClear = !confirmingClear"
      >
        <AppIcon name="close" :size="12" />清空阵容
      </button>
    </div>
    <div v-if="confirmingClear" class="lineup-confirm" role="alert">
      <span>清空这套阵容的所有球员？</span><button @click="reset">确认清空</button
      ><button @click="confirmingClear = false">取消</button>
    </div>
    <div class="lineup-description">
      <span>{{ template.description }}</span
      ><span
        ><AppIcon :name="storageError ? 'info' : 'check'" :size="11" />{{
          storageError ? '本机保存暂不可用' : '自动保存在本机'
        }}</span
      >
    </div>
    <div class="lineup-content">
      <LineupPitch
        :template="template"
        :assignments="draft.assignments"
        :players="players"
        :selected="selected"
        :dragging="active?.id ?? ''"
        :target="target"
        @slot="selectSlot"
        @remove="removeFromPitch"
        @pointer-start="start"
      /><LineupBench
        :players="players"
        :assigned="assigned"
        :selected="selected"
        :target="target"
        @select="choose"
        @pointer-start="start"
      />
    </div>
    <div class="lineup-status" role="status" aria-live="polite">
      <AppIcon name="info" :size="13" /><span>{{ announcement }}</span
      ><button v-if="selected" @click="cancelSelection">取消选择</button
      ><button v-if="selected && assigned.includes(selected)" @click="removeFromPitch(selected)">
        移出所选球员
      </button>
    </div>
    <p v-if="missing.length" class="lineup-missing">
      {{ missing.length }} 位已选球员暂未在当前名单中，位置仍为你保留；可移出后重新安排。
    </p>
    <p class="lineup-note">
      自定义阵容仅供个人构思，不代表官方首发。球员名单使用现有数据，切换上方统计赛事不会更改你的安排。手机上也可点选球员，再点球场位置。
    </p>
    <Teleport to="body"
      ><div
        v-if="active && draggedPlayer"
        class="lineup-ghost"
        :style="{ left: `${active.x}px`, top: `${active.y}px` }"
        aria-hidden="true"
      >
        <PlayerPortrait :player="draggedPlayer" /><strong>{{ draggedPlayer.shortName }}</strong
        ><small>{{ target === 'bench' ? '移出阵容' : target ? '松开安排' : '拖到场上位置' }}</small>
      </div></Teleport
    >
  </section>
</template>
<style scoped>
.personal-lineup {
  margin: 23px 0;
  padding: 25px;
  background: var(--md-surface, #fff);
  border: 1px solid var(--md-border, #e2e9d7);
  border-radius: 13px;
}
.lineup-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.lineup-kicker {
  font-size: 12px;
  letter-spacing: 1.8px;
  color: var(--md-muted, #a0ac8c);
}
.lineup-heading h2 {
  font-size: 26px;
  font-weight: 500;
  color: var(--md-text, #47633b);
  letter-spacing: 0.6px;
  margin: 9px 0 8px;
}
.lineup-heading p {
  font-size: 15px;
  color: var(--md-muted, #99a58a);
  margin: 0;
}
.lineup-count {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--md-secondary, #8f9f79);
  flex-shrink: 0;
}
.lineup-count b {
  font-family: Bahnschrift, sans-serif;
  font-size: 40px;
  font-weight: 400;
  color: var(--md-secondary, #66864d);
}
.lineup-count > span {
  font-size: 15px;
}
.lineup-count small {
  display: block;
  font-size: 12px;
  margin-top: 5px;
}
.lineup-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 23px;
}
.lineup-clear {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: var(--md-muted, #9ba98b);
  font-size: 14px;
  flex-shrink: 0;
  padding: 9px 0;
}
.lineup-clear:disabled {
  opacity: 0.45;
  cursor: default;
}
.lineup-confirm {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--md-warning-soft, #f8f4e9);
  color: var(--md-warning, #a08355);
  font-size: 15px;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.lineup-confirm button {
  border: 1px solid var(--md-border, #ded2b6);
  background: var(--md-surface, #fff);
  color: var(--md-warning, #957546);
  border-radius: 4px;
  padding: 5px 9px;
  font-size: 14px;
}
.lineup-description {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--md-muted, #9ba789);
  margin: 13px 1px 15px;
}
.lineup-description > span:last-child {
  display: flex;
  gap: 4px;
  align-items: center;
  color: var(--md-secondary, #839965);
}
.lineup-content {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(270px, 1fr);
  gap: 18px;
  align-items: stretch;
}
.lineup-status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  font-size: 14px;
  color: var(--md-secondary, #849570);
  padding-top: 14px;
  min-height: 31px;
}
.lineup-status svg {
  flex-shrink: 0;
}
.lineup-status button {
  border: 0;
  color: var(--md-secondary, #6c8751);
  background: var(--md-soft, #eff4e6);
  padding: 5px 8px;
  font-size: 13px;
  border-radius: 4px;
}
.lineup-note {
  margin: 9px 0 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--md-muted, #a2ad92);
}
.lineup-missing {
  font-size: 14px;
  line-height: 1.7;
  color: var(--md-warning, #a38358);
}
.lineup-ghost {
  position: fixed;
  z-index: 10000;
  transform: translate(-50%, -70%);
  pointer-events: none;
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 9px 12px;
  background: var(--md-soft, #f7f9eeed);
  border: 1px solid var(--md-accent, #a0b67a);
  border-radius: 9px;
  box-shadow: 0 8px 25px #0b302938;
  min-width: 80px;
  color: var(--md-text, #45643a);
}
.lineup-ghost :deep(.player-portrait) {
  width: 41px;
}
.lineup-ghost strong {
  font-size: 15px;
  margin-top: 5px;
  font-weight: 500;
}
.lineup-ghost small {
  font-size: 12px;
  color: var(--md-secondary, #92a279);
  margin-top: 4px;
}
@media (max-width: 1100px) {
  .lineup-content {
    grid-template-columns: minmax(0, 1.3fr) minmax(260px, 1fr);
    gap: 13px;
  }
}
@media (max-width: 850px) {
  .personal-lineup {
    padding: 18px 13px;
  }
  .lineup-content {
    grid-template-columns: minmax(0, 1fr);
  }
  .lineup-heading h2 {
    font-size: 23px;
  }
  .lineup-count b {
    font-size: 33px;
  }
  .lineup-toolbar {
    align-items: flex-start;
    gap: 6px;
  }
  .lineup-clear {
    font-size: 13px;
  }
  .lineup-status {
    font-size: 13px;
    line-height: 1.7;
  }
}
</style>
