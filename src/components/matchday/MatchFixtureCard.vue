<script setup lang="ts">
import { computed } from 'vue'
import {
  dateLabel,
  timeLabel,
  leagueName,
  isMatchLocked,
  matchStatusLabel,
  type Match,
  type Prediction,
} from '@/data/matches'
import AppIcon from './AppIcon.vue'
import TeamBadge from './TeamBadge.vue'
const props = defineProps<{ match: Match; prediction?: Prediction; now: number }>()
defineEmits<{ predict: [match: Match]; detail: [match: Match] }>()
// 注释修改时间：2026-10-22
// 用途与逻辑：判断赛程卡片是否完赛，比赛状态已结束或存在正式赛果时均视为完赛。
const finished = computed(() => props.match.status === 'finished' || !!props.match.actual)
</script>
<template>
  <article class="match-card" :class="{ 'is-finished': finished }" :data-match-id="match.id">
    <div class="card-top">
      <span class="competition" :class="match.league"
        ><AppIcon :name="match.league === 'pl' ? 'cup' : 'ball'" :size="13" />{{
          leagueName(match.league)
        }}<i>·</i>{{ match.round }}</span
      ><span class="fixture-date"
        >{{ dateLabel(match.kickoff) }}<b>{{ timeLabel(match.kickoff) }}</b
        ><em v-if="finished">已完赛</em></span
      >
    </div>
    <div class="fixture-teams">
      <div>
        <TeamBadge :team="match.home" :size="38" /><span>{{ match.home.name }}</span
        ><small>主</small>
      </div>
      <span class="fixture-vs" :class="{ 'fixture-score': finished || match.liveScore }">{{
        finished ? (match.actual?.join(' : ') ?? '—') : (match.liveScore?.join(' : ') ?? 'vs')
      }}</span>
      <div>
        <TeamBadge :team="match.away" :size="38" /><span>{{ match.away.name }}</span
        ><small>客</small>
      </div>
    </div>
    <div class="card-bottom">
      <span :class="{ predicted: prediction }"
        ><AppIcon :name="prediction || finished ? 'check' : 'clock'" :size="13" />{{
          prediction
            ? `我的预测 ${prediction.home} : ${prediction.away}`
            : matchStatusLabel(match, now)
        }}</span
      ><button
        :class="{ 'already-predicted': prediction }"
        @click="finished ? $emit('detail', match) : $emit('predict', match)"
      >
        {{ finished ? '详情' : isMatchLocked(match, now) ? '查看' : prediction ? '修改' : '预测'
        }}<AppIcon name="chevron" :size="12" />
      </button>
    </div>
    <button
      class="fixture-detail"
      :aria-label="`查看${match.home.name}对${match.away.name}比赛详情`"
      @click="$emit('detail', match)"
    >
      {{ finished ? '比赛详情 · 比分与赛后信息' : '比赛详情 · 交锋与近期战绩'
      }}<AppIcon name="arrow" :size="13" />
    </button>
  </article>
</template>
<style scoped>
.match-card {
  border: 1px solid var(--md-border, #e9ede6);
  border-radius: 9px;
  overflow: hidden;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    translate 0.2s;
  background: var(--md-surface, white);
}
.match-card:hover {
  border-color: var(--md-accent, #a3bcaa);
  translate: 0 -2px;
  box-shadow: 0 5px 16px #315e420b;
}
.card-top {
  padding: 13px 12px 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.competition {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--md-purple, #76667c);
  white-space: nowrap;
}
.competition.ucl {
  color: var(--md-blue, #53648e);
}
.competition i {
  font-style: normal;
  color: var(--md-muted, #b0b6b0);
}
.fixture-date {
  font-size: 13px;
  color: var(--md-muted, #9ba39b);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}
.fixture-date b {
  font-weight: 500;
  color: var(--md-secondary, #69766c);
}
.fixture-date em {
  margin-left: auto;
  font-size: 11px;
  color: var(--md-accent, #327557);
  font-style: normal;
}
.fixture-teams {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 15px 6px;
  gap: 4px;
}
.fixture-teams > div {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  flex: 1;
}
.fixture-teams > div > span:nth-child(2) {
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  overflow-wrap: anywhere;
}
.fixture-teams small {
  color: var(--md-muted, #a4aaa4);
  font-size: 12px;
  margin-top: -4px;
}
.fixture-vs {
  color: var(--md-muted, #b4bbb3);
  font-size: 16px;
  font-family: Georgia, serif;
  font-style: italic;
  align-self: flex-start;
  margin-top: 12px;
  white-space: nowrap;
}
.fixture-vs.fixture-score {
  color: var(--md-text, #315f49);
  font-size: 21px;
  font-weight: 700;
  font-style: normal;
  font-variant-numeric: tabular-nums;
}
.card-bottom {
  border-top: 1px solid var(--md-border, #f0f2ed);
  padding: 9px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}
.card-bottom > span {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--md-muted, #9aa299);
}
.card-bottom > span.predicted {
  color: var(--md-secondary, #39825e);
}
.card-bottom > button {
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 2px;
  color: var(--md-text, #276043);
  background: var(--md-soft, #edf5e9);
  border: 0;
  border-radius: 4px;
  padding: 4px 6px;
  cursor: pointer;
  flex-shrink: 0;
}
.fixture-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-top: 1px dashed var(--md-border, #e5e9e3);
  background: transparent;
  color: var(--md-accent, #327557);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}
.fixture-detail:hover {
  color: var(--md-text, #203c2d);
}
@media (max-width: 1050px) {
  .card-bottom {
    padding: 9px 6px;
  }
  .card-top {
    padding: 12px 8px 0;
  }
  .competition {
    font-size: 12px;
  }
}
@media (max-width: 800px) {
  .card-top {
    flex-direction: row;
    justify-content: space-between;
    padding: 15px;
    flex-wrap: wrap;
  }
  .fixture-teams {
    padding: 15px;
  }
  .fixture-teams > div {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }
  .card-bottom {
    padding: 12px 15px;
  }
  .card-bottom > span,
  .card-bottom > button {
    font-size: 15px;
  }
  .fixture-teams > div > span:nth-child(2) {
    font-size: 17px;
  }
  .fixture-vs {
    align-self: center;
    margin: 0;
  }
  .fixture-teams small {
    margin: 0;
  }
  .competition,
  .fixture-date {
    font-size: 14px;
  }
}
</style>
