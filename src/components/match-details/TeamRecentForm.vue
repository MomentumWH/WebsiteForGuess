<script setup lang="ts">
import { computed } from 'vue'
import type { Match, Team } from '@/data/matches'
import { formResult, summarizeForm } from '@/data/matchDetails'
import TeamBadge from '@/components/matchday/TeamBadge.vue'
import HistoryMatchList from './HistoryMatchList.vue'
const props = defineProps<{ team: Team; matches: Match[]; side: string; loading: boolean }>()
// 注释修改时间：2026-10-22
// 用途与逻辑：汇总球队近期表现，使用当前比赛列表和球队信息计算胜平负概况。
const summary = computed(() => summarizeForm(props.matches, props.team))
// 注释修改时间：2026-10-22
// 用途与逻辑：生成近期战绩标记，将每场比赛编号与当前球队的比赛结果对应。
const results = computed(() =>
  props.matches.map((m) => ({ id: m.id, result: formResult(m, props.team) })),
)
const labels = { win: '胜', draw: '平', loss: '负' }
</script>
<template>
  <section class="detail-form panel" :aria-busy="loading">
    <div class="detail-section-heading">
      <div class="detail-form-title">
        <TeamBadge :team="team" :size="36" />
        <div>
          <span class="detail-eyebrow">{{ side }} · RECENT FORM</span>
          <h3>{{ team.name }}</h3>
        </div>
      </div>
      <span class="detail-count">近 {{ matches.length }} 场</span>
    </div>
    <template v-if="matches.length"
      ><div class="form-overview">
        <div class="form-chips" aria-label="最近五场胜平负，左侧为最近一场">
          <span v-for="item in results" :key="item.id" class="form-chip" :class="item.result">{{
            item.result ? labels[item.result] : '—'
          }}</span>
        </div>
        <span>{{ summary.win }}胜 {{ summary.draw }}平 {{ summary.loss }}负</span>
      </div>
      <div class="form-goals">
        <span
          >进球 <strong>{{ summary.goalsFor }}</strong></span
        ><span
          >失球 <strong>{{ summary.goalsAgainst }}</strong></span
        ><span
          >胜率
          <strong
            >{{ Math.round((summary.win / summary.total) * 100) }}<small>%</small></strong
          ></span
        >
      </div>
      <HistoryMatchList :matches="matches" :team="team"
    /></template>
    <div v-else class="detail-empty">
      <strong>{{ loading ? '正在同步近期比赛' : '暂无可用的近期赛果' }}</strong>
      <p>只统计已完赛且具备官方比分的比赛。</p>
    </div>
    <p class="detail-note">
      {{
        matches.length < 5
          ? `目前可用 ${matches.length} 场，未补齐为五场。`
          : '左侧为最近一场，胜平负均以本队为准。'
      }}
    </p>
  </section>
</template>
