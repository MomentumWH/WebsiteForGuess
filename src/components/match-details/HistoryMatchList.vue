<script setup lang="ts">
import { computed } from 'vue'
import { leagueName, type Match, type Team } from '@/data/matches'
import { formResult, historyDate } from '@/data/matchDetails'
import TeamBadge from '@/components/matchday/TeamBadge.vue'
const props = defineProps<{ matches: Match[]; team?: Team }>()
const labels = { win: '胜', draw: '平', loss: '负' }
// 注释修改时间：2026-10-22
// 用途与逻辑：生成历史比赛列表，将每场比赛与指定球队的胜平负结果配对。
const rows = computed(() =>
  props.matches.map((match) => ({
    match,
    result: props.team ? formResult(match, props.team) : null,
  })),
)
</script>
<template>
  <ol class="detail-history-list">
    <li v-for="{ match, result } in rows" :key="match.id">
      <div class="history-row-meta">
        <time :datetime="match.kickoff">{{ historyDate(match.kickoff) }}</time
        ><span>{{ leagueName(match.league) }}</span
        ><b v-if="result" class="form-chip" :class="result">{{ labels[result] }}</b>
      </div>
      <div class="history-row-teams">
        <div>
          <TeamBadge :team="match.home" :size="24" /><span>{{ match.home.name }}</span
          ><small>主</small>
        </div>
        <strong>{{ match.actual?.join(' : ') }}</strong>
        <div>
          <TeamBadge :team="match.away" :size="24" /><span>{{ match.away.name }}</span
          ><small>客</small>
        </div>
      </div>
    </li>
  </ol>
</template>
