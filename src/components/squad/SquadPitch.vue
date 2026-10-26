<script setup lang="ts">
import { computed } from 'vue'
import { recommendLineup, type PlayerSummary } from '@/data/squad'
import PlayerPortrait from './PlayerPortrait.vue'
const formation = defineModel<'433' | '4231'>('formation', { default: '433' })
const props = defineProps<{ players: PlayerSummary[]; selected: string }>()
defineEmits<{ select: [id: string] }>()
// 注释修改时间：2026-10-22
// 用途与逻辑：生成推荐阵容行，按当前球员表现和所选阵型调用统一推荐工具。
const rows = computed(() => recommendLineup(props.players, formation.value))
</script>
<template>
  <section class="pitch-panel" aria-labelledby="pitch-title">
    <div class="pitch-heading">
      <div>
        <p>THE GUNNERS · ON THE PITCH</p>
        <h2 id="pitch-title">让阵容，变得一目了然。</h2>
      </div>
      <img src="/images/arsenal.png" alt="阿森纳队徽" width="37" height="42" />
    </div>
    <div class="pitch-toolbar">
      <span><i></i>按近五场出场时间排列</span>
      <div class="formation-control" aria-label="参考阵型">
        <button :aria-pressed="formation === '433'" @click="formation = '433'">4–3–3</button
        ><button :aria-pressed="formation === '4231'" @click="formation = '4231'">4–2–3–1</button>
      </div>
    </div>
    <div class="football-pitch" :class="{ 'five-lines': formation === '4231' }">
      <div class="pitch-markings" aria-hidden="true">
        <span class="halfway"></span><span class="center-circle"></span
        ><span class="penalty top"></span><span class="penalty bottom"></span
        ><span class="goal top"></span><span class="goal bottom"></span>
      </div>
      <div
        v-for="(row, index) in rows"
        :key="`${formation}-${index}`"
        class="pitch-row"
        :style="{ '--row': index }"
      >
        <button
          v-for="summary in row"
          :key="summary.player.id"
          class="pitch-player"
          :class="{ selected: summary.player.id === selected }"
          :aria-pressed="summary.player.id === selected"
          :aria-label="`查看 ${summary.player.name} 近五场数据`"
          @click="$emit('select', summary.player.id)"
        >
          <span class="pitch-avatar"
            ><PlayerPortrait :player="summary.player" /><b>{{ summary.player.number ?? '·' }}</b
            ><i
              v-if="summary.player.status === 'injured' || summary.player.status === 'doubtful'"
              :title="summary.player.status === 'injured' ? '伤停' : '出场存疑'"
              >+</i
            ></span
          >
          <strong>{{ summary.player.shortName }}</strong
          ><small
            >{{ summary.metrics.minutes ?? '—' }}′
            <span> / {{ summary.metrics.goals ?? '—' }} 球</span></small
          >
        </button>
        <span v-if="!row.length" class="pitch-empty">该位置暂无可用名单</span>
      </div>
    </div>
    <div class="pitch-footer">
      <span><i></i>点击球员查看表现</span><span>参考阵容 · 非官方首发</span>
    </div>
  </section>
</template>
<style scoped>
.pitch-panel {
  background: #163d2d;
  border: 1px solid #214a37;
  border-radius: 14px;
  padding: 25px 27px 17px;
  color: #e8ecdb;
  overflow: hidden;
  position: relative;
  background-image: radial-gradient(ellipse at 70% 20%, #41614844, transparent 65%);
}
.pitch-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.pitch-heading p {
  font-size: 12px;
  letter-spacing: 2.2px;
  color: #a1b98d;
  margin: 0 0 10px;
}
.pitch-heading h2 {
  font-size: 25px;
  font-weight: 500;
  letter-spacing: 1px;
  margin: 0;
}
.pitch-heading img {
  object-fit: contain;
  opacity: 0.85;
}
.pitch-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0 13px;
  gap: 6px;
  font-size: 13px;
  color: #a4b99b;
}
.pitch-toolbar > span {
  display: flex;
  gap: 7px;
  align-items: center;
}
.pitch-toolbar i,
.pitch-footer i {
  display: inline-block;
  width: 5px;
  height: 5px;
  background: #bbd495;
  border-radius: 50%;
}
.formation-control {
  display: flex;
  background: #092b2044;
  border: 1px solid #acc99b26;
  padding: 3px;
  border-radius: 6px;
  gap: 2px;
}
.formation-control button {
  border: 0;
  background: transparent;
  color: #a7bb99;
  padding: 5px 9px;
  font-size: 14px;
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
}
.formation-control button[aria-pressed='true'] {
  color: #183d2a;
  background: #d9e6b6;
}
.football-pitch {
  position: relative;
  isolation: isolate;
  min-height: 414px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 10px;
  padding: 19px 2px;
  background: repeating-linear-gradient(
    0deg,
    #7da36908 0px,
    #7da36908 60px,
    transparent 60px,
    transparent 120px
  );
}
.pitch-markings {
  position: absolute;
  inset: 2px 8px;
  border: 1px solid #d5e4be24;
  z-index: -1;
  pointer-events: none;
}
.halfway {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  border-top: 1px solid #d5e4be24;
}
.center-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 90px;
  height: 90px;
  border: 1px solid #d5e4be24;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.penalty {
  position: absolute;
  width: 45%;
  height: 65px;
  border: 1px solid #d5e4be24;
  left: 27.5%;
}
.top {
  top: -1px;
}
.bottom {
  bottom: -1px;
}
.goal {
  position: absolute;
  width: 21%;
  height: 25px;
  border: 1px solid #d5e4be24;
  left: 39.5%;
}
.pitch-row {
  display: flex;
  justify-content: space-evenly;
  gap: 3px;
  animation: line-arrive 0.55s calc(var(--row) * 70ms) both;
}
.pitch-player {
  position: relative;
  background: transparent;
  border: 0;
  color: #e5ecd9;
  padding: 2px 3px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  width: 24%;
  border-radius: 10px;
}
.pitch-avatar {
  position: relative;
  display: block;
  width: 49px;
  height: 49px;
  border-radius: 50%;
  border: 2px solid #c7d8b242;
  background: #40644b;
  transition:
    box-shadow 0.25s,
    transform 0.25s;
}
.pitch-avatar .player-portrait {
  width: 100%;
  height: 100%;
}
.pitch-avatar b {
  position: absolute;
  bottom: -3px;
  right: -5px;
  border-radius: 5px;
  background: #a92f36;
  color: #fff2e0;
  min-width: 23px;
  height: 21px;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid #c75652;
}
.pitch-avatar i {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 17px;
  background: #f3d8a6;
  color: #8c542a;
  border-radius: 50%;
  width: 19px;
  height: 19px;
  line-height: 19px;
  font-style: normal;
}
.pitch-player strong {
  display: block;
  font-size: 14px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 7px 0 2px;
  font-weight: 500;
}
.pitch-player small {
  font-size: 12px;
  color: #a5bc96;
  font-variant-numeric: tabular-nums;
}
.pitch-player small span {
  opacity: 0.75;
}
.pitch-player:hover .pitch-avatar {
  transform: translateY(-3px);
  box-shadow: 0 0 0 4px #c4d89724;
}
.pitch-player.selected .pitch-avatar {
  border-color: #dfd69b;
  box-shadow:
    0 0 0 4px #d3dd9c25,
    0 5px 18px #071f1a66;
}
.pitch-player.selected strong {
  color: #efdfa4;
}
.pitch-footer {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  font-size: 12px;
  letter-spacing: 0.3px;
  color: #8fab87;
  margin-top: 15px;
}
.pitch-footer > span:first-child {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pitch-empty {
  font-size: 15px;
  color: #b2c5a3;
}
.five-lines {
  min-height: 470px;
}
@keyframes line-arrive {
  from {
    opacity: 0;
    transform: translateY(9px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (max-width: 600px) {
  .pitch-panel {
    padding: 21px 15px 16px;
  }
  .pitch-heading h2 {
    font-size: 22px;
  }
  .pitch-heading p {
    font-size: 11px;
  }
  .pitch-avatar {
    width: 43px;
    height: 43px;
  }
  .football-pitch {
    min-height: 390px;
  }
  .five-lines {
    min-height: 470px;
  }
  .pitch-player strong {
    font-size: 13px;
  }
  .pitch-toolbar {
    font-size: 12px;
  }
  .formation-control button {
    padding: 5px 6px;
  }
}
</style>
