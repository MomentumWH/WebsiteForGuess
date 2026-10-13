<script setup lang="ts">
import { computed } from 'vue'
import type { Formation } from '@/data/lineup'
import type { SquadPlayer } from '@/data/squad'
import PlayerPortrait from './PlayerPortrait.vue'
import AppIcon from '@/components/matchday/AppIcon.vue'
const props = defineProps<{
  template: Formation
  assignments: Readonly<Record<string, string>>
  players: SquadPlayer[]
  selected: string
  dragging: string
  target: string | null
}>()
defineEmits<{
  slot: [id: string]
  remove: [id: string]
  pointerStart: [event: PointerEvent, id: string]
}>()
const slots = computed(() => {
  const index = new Map(props.players.map((p) => [p.id, p]))
  return props.template.slots.map((s) => ({
    ...s,
    playerId: props.assignments[s.id],
    player: index.get(props.assignments[s.id] ?? ''),
  }))
})
</script>
<template>
  <div class="personal-pitch-panel">
    <div class="personal-pitch-top">
      <span>YOUR XI · {{ template.label }}</span
      ><span>进攻方向 ↑</span>
    </div>
    <div class="personal-pitch" aria-label="我的阵容球场">
      <div class="personal-markings" aria-hidden="true">
        <i class="halfway"></i><i class="circle"></i><i class="area top"></i
        ><i class="area bottom"></i><i class="goal top"></i><i class="goal bottom"></i>
      </div>
      <div
        v-for="slot in slots"
        :key="slot.id"
        class="personal-slot"
        :class="{
          targeted: target === slot.id,
          picked: slot.playerId && selected === slot.playerId,
          dragging: slot.playerId && dragging === slot.playerId,
        }"
        :style="{ left: `${slot.x}%`, top: `${slot.y}%` }"
        :data-lineup-target="slot.id"
      >
        <button
          class="slot-main"
          :aria-label="`${slot.label}：${slot.player?.name ?? (slot.playerId ? '球员暂未在名单中' : '空位')}，点击安排球员`"
          :aria-pressed="Boolean(slot.playerId && selected === slot.playerId)"
          @click="$emit('slot', slot.id)"
          @dragstart.prevent
          @pointerdown="slot.player && $emit('pointerStart', $event, slot.player.id)"
        >
          <Transition name="slot-appear" mode="out-in">
            <span v-if="slot.player" :key="slot.player.id" class="slot-avatar"
              ><PlayerPortrait :player="slot.player" /><b>{{ slot.player.number ?? '·' }}</b></span
            >
            <span v-else :key="slot.playerId ?? 'empty'" class="slot-empty">{{
              slot.playerId ? '?' : '+'
            }}</span>
          </Transition>
          <strong class="slot-name">{{
            slot.player?.shortName ?? (slot.playerId ? '名单暂缺' : slot.label)
          }}</strong>
          <small class="slot-role">{{ slot.playerId ? slot.label : '拖入球员' }}</small>
        </button>
        <button
          v-if="slot.playerId"
          class="slot-remove"
          :aria-label="`移出${slot.player?.name ?? slot.label}`"
          @click.stop="$emit('remove', slot.playerId)"
        >
          <AppIcon name="close" :size="10" />
        </button>
      </div>
    </div>
    <div class="personal-pitch-bottom">
      <span>位置自由安排 · 同一球员仅占一个位置</span><span>拖到已占位置即可互换</span>
    </div>
  </div>
</template>
<style scoped>
.personal-pitch-panel {
  background: #163d2d;
  color: #d9e6bd;
  border-radius: 10px;
  padding: 16px 18px 13px;
  min-width: 0;
}
.personal-pitch-top,
.personal-pitch-bottom {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: #a7bc94;
}
.personal-pitch-top {
  letter-spacing: 1.5px;
  padding: 0 2px 13px;
}
.personal-pitch-bottom {
  font-size: 12px;
  padding-top: 13px;
  color: #a3b88e;
  flex-wrap: wrap;
}
.personal-pitch {
  position: relative;
  height: 530px;
  background: repeating-linear-gradient(0deg, #769c6210 0 66px, transparent 66px 132px);
  isolation: isolate;
}
.personal-markings {
  position: absolute;
  inset: 5px 3px;
  border: 1px solid #d3e2b92a;
  z-index: -1;
  pointer-events: none;
}
.halfway {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 1px solid #d3e2b92a;
}
.circle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 85px;
  height: 85px;
  border: 1px solid #d3e2b92a;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.area {
  position: absolute;
  left: 27%;
  width: 46%;
  height: 15%;
  border: 1px solid #d3e2b92a;
}
.top {
  top: -1px;
}
.bottom {
  bottom: -1px;
}
.goal {
  position: absolute;
  left: 40%;
  width: 20%;
  height: 5%;
  border: 1px solid #d3e2b92a;
}
.personal-slot {
  position: absolute;
  width: 78px;
  transform: translate(-50%, -50%);
  transition:
    left 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    top 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  border-radius: 9px;
}
.slot-main {
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 5px 2px;
  width: 100%;
  border-radius: 9px;
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.slot-main:hover,
.slot-main:focus-visible {
  background: #c9dcaf10;
  border-color: #c9dcaf50;
  outline: none;
}
.picked .slot-main {
  border-color: #e4d79d;
  background: #e4d79d15;
}
.targeted .slot-main {
  border-color: #e6efba;
  background: #d5ecb928;
  box-shadow: 0 0 0 3px #d5ecb918;
}
.dragging .slot-main {
  opacity: 0.3;
}
.slot-avatar,
.slot-empty {
  width: 43px;
  height: 43px;
  position: relative;
  pointer-events: none;
}
.slot-avatar :deep(.player-portrait) {
  width: 43px;
  border: 2px solid #d8e2b7;
}
.slot-avatar b {
  position: absolute;
  bottom: -2px;
  right: -3px;
  border-radius: 50%;
  width: 21px;
  height: 21px;
  background: #e0e8bd;
  color: #193d2a;
  display: grid;
  place-items: center;
  font-size: 12px;
}
.slot-empty {
  border: 1px dashed #d6e3b860;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 27px;
  font-weight: 300;
  color: #bdcca188;
}
.slot-name {
  font-size: 14px;
  font-weight: 500;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 5px;
  pointer-events: none;
}
.slot-role {
  font-size: 12px;
  color: #adbf94;
  margin-top: 3px;
  pointer-events: none;
}
.slot-remove {
  position: absolute;
  right: -1px;
  top: -2px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 1px solid #cbddad55;
  border-radius: 50%;
  color: #d8e6ba;
  background: #204c36;
  opacity: 0;
  transition: opacity 0.15s;
}
.personal-slot:hover .slot-remove,
.personal-slot:focus-within .slot-remove,
.picked .slot-remove {
  opacity: 1;
}
.slot-appear-enter-active,
.slot-appear-leave-active {
  transition:
    opacity 0.18s,
    transform 0.18s;
}
.slot-appear-enter-from,
.slot-appear-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
@media (max-width: 600px) {
  .personal-pitch-panel {
    padding: 14px 7px 12px;
  }
  .personal-pitch {
    height: 490px;
  }
  .personal-slot {
    width: 55px;
  }
  .slot-avatar,
  .slot-empty {
    width: 34px;
    height: 34px;
  }
  .slot-avatar :deep(.player-portrait) {
    width: 34px;
  }
  .slot-name {
    font-size: 13px;
  }
  .slot-role {
    font-size: 11px;
  }
  .slot-remove {
    opacity: 1;
    width: 18px;
    height: 18px;
    right: -2px;
    top: -4px;
  }
  .personal-pitch-bottom {
    padding-left: 6px;
    padding-right: 6px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .personal-slot,
  .slot-appear-enter-active,
  .slot-appear-leave-active {
    transition: none;
  }
}
</style>
