<script setup lang="ts">
import { computed } from 'vue'
import { leagueName, timeLabel, isMatchLocked, matchStatusLabel, type Match } from '@/data/matches'
import { historyDate, seasonText } from '@/data/matchDetails'
import TeamBadge from '@/components/matchday/TeamBadge.vue'
import AppIcon from '@/components/matchday/AppIcon.vue'
const props = defineProps<{ match: Match; now: number }>()
const score = computed(() => props.match.actual ?? props.match.liveScore)
const kickoff = computed(() =>
  props.match.kickoff
    ? `${historyDate(props.match.kickoff)} · ${timeLabel(props.match.kickoff)}`
    : '开球时间待定',
)
const status = computed(() =>
  props.match.status === 'upcoming' && !isMatchLocked(props.match, props.now)
    ? '未开赛'
    : matchStatusLabel(props.match, props.now),
)
</script>
<template>
  <section class="detail-scoreboard panel" aria-label="比赛比分与基本信息">
    <div class="scoreboard-top">
      <span class="league-pill">{{ leagueName(match.league) }} <i>·</i> {{ match.round }}</span
      ><span class="detail-status" :class="match.status"><span></span>{{ status }}</span>
    </div>
    <div class="scoreboard-teams">
      <div class="scoreboard-team">
        <TeamBadge :team="match.home" :size="82" />
        <h2>{{ match.home.name }}</h2>
        <span>主队 · {{ match.home.short }}</span>
      </div>
      <div class="scoreboard-center">
        <span class="score-caption">{{
          match.actual ? '常规时间比分' : match.liveScore ? '即时比分' : 'MATCH PREVIEW'
        }}</span
        ><strong :class="{ 'is-versus': !score }">{{
          score ? `${score[0]} : ${score[1]}` : 'VS'
        }}</strong
        ><span class="scoreboard-date">{{ kickoff }}<small>北京时间 UTC+8</small></span>
      </div>
      <div class="scoreboard-team">
        <TeamBadge :team="match.away" :size="82" />
        <h2>{{ match.away.name }}</h2>
        <span>客队 · {{ match.away.short }}</span>
      </div>
    </div>
    <div class="scoreboard-facts">
      <div>
        <AppIcon name="calendar" :size="17" /><span
          >赛季<strong>{{ match.season ? seasonText(match.season) : '未提供' }}</strong></span
        >
      </div>
      <div>
        <AppIcon name="shield" :size="17" /><span
          >比赛球场<strong>{{ match.venue }}</strong></span
        >
      </div>
      <div>
        <AppIcon name="cup" :size="17" /><span
          >赛事<strong>{{
            match.league === 'pl' ? '英格兰超级联赛' : '欧洲冠军联赛'
          }}</strong></span
        >
      </div>
    </div>
  </section>
</template>
