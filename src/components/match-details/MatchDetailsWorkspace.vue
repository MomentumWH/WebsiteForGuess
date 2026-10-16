<script setup lang="ts">
import { computed } from 'vue'
import type { Match, Prediction } from '@/data/matches'
import { isMatchLocked } from '@/data/matches'
import { seasonText } from '@/data/matchDetails'
import { useMatchDetails } from '@/composables/useMatchDetails'
import AppIcon from '@/components/matchday/AppIcon.vue'
import MatchScoreboard from './MatchScoreboard.vue'
import MatchFacts from './MatchFacts.vue'
import MatchStatisticsPanel from './MatchStatisticsPanel.vue'
import MatchEventsPanel from './MatchEventsPanel.vue'
import HeadToHead from './HeadToHead.vue'
import TeamRecentForm from './TeamRecentForm.vue'
const props = defineProps<{
  matchId: string
  matches: Match[]
  feedLoading: boolean
  feedError: string
  predictions: Record<string, Prediction>
  now: number
}>()
defineEmits<{ back: []; predict: [match: Match] }>()
const { match, details, history, loading, error, refresh } = useMatchDetails(
  () => props.matches.find((m) => m.id === props.matchId),
  () => props.matches,
)
const showHistory = computed(
  () => match.value && !['finished', 'cancelled'].includes(match.value.status ?? ''),
)
const sourceProblems = computed(
  () => details.value?.sources.filter((s) => s.state !== 'success') ?? [],
)
const scope = computed(() =>
  details.value
    ? details.value.seasons.map(seasonText).join('、')
    : match.value?.season
      ? `${seasonText(match.value.season)} 当前赛程缓存`
      : '',
)
</script>
<template>
  <div class="match-details">
    <div class="detail-toolbar">
      <button class="detail-back" @click="$emit('back')">
        <AppIcon name="chevron" :size="15" />返回赛事列表</button
      ><span>比赛资料 <i>/</i> {{ match?.actual ? '赛后回顾' : '赛前观察' }}</span>
    </div>
    <div v-if="!match" class="detail-empty panel" role="status">
      <AppIcon name="calendar" :size="32" />
      <h2>{{ feedLoading ? '正在加载所选比赛' : '未找到这场比赛' }}</h2>
      <p>
        {{
          feedLoading
            ? '正在与官方赛程同步，请稍候。'
            : feedError || '这场比赛不在当前赛季赛程中，请返回列表重新选择。'
        }}
      </p>
      <button v-if="!feedLoading" class="detail-secondary-button" @click="$emit('back')">
        返回赛程
      </button>
    </div>
    <template v-else>
      <MatchScoreboard :match="match" :now="now" />
      <MatchFacts
        v-if="match.status === 'finished'"
        :match="match"
        :prediction="predictions[match.id]"
        @predict="$emit('predict', $event)"
      />
      <MatchEventsPanel
        v-if="match.status === 'finished'"
        :match="match"
        :timeline="details?.timeline"
        :loading="loading"
        :error="error"
        @refresh="refresh"
      />
      <MatchStatisticsPanel
        v-if="match.status === 'finished'"
        :match="match"
        :statistics="details?.statistics"
        :loading="loading"
        :error="error"
        @refresh="refresh"
      />
      <p v-else-if="match.status === 'cancelled'" class="detail-notice">
        本场比赛已取消，请以官方后续安排为准。
      </p>
      <template v-if="showHistory">
        <div class="detail-preview-heading">
          <div>
            <span class="detail-eyebrow">BEFORE THE WHISTLE</span>
            <h2>交锋与近期状态</h2>
            <p>近五次交手，和双方最近五场的比赛表现。</p>
          </div>
          <button
            v-if="!isMatchLocked(match, now)"
            class="primary-button"
            @click="$emit('predict', match)"
          >
            {{ predictions[match.id] ? '修改我的预测' : '预测本场比分'
            }}<AppIcon name="arrow" :size="16" />
          </button>
        </div>
        <div v-if="loading" class="detail-notice" role="status">
          <span class="detail-spinner"></span
          ><span>{{
            details
              ? '正在更新历史赛果，暂时保留已加载记录…'
              : '正在同步历史赛果，先展示当前赛季已有记录…'
          }}</span>
        </div>
        <div v-if="error || sourceProblems.length" class="detail-notice warning" role="status">
          <AppIcon name="info" :size="18" /><span
            >{{ error || '部分赛季的官方资料暂时不可用，当前记录可能不完整。'
            }}<small v-for="source in sourceProblems" :key="`${source.season}:${source.league}`"
              >{{ seasonText(source.season) }} {{ source.league === 'pl' ? '英超' : '欧冠' }}：{{
                source.state === 'stale' ? '使用上次成功同步的缓存' : '暂无可用数据'
              }}</small
            ></span
          ><button :disabled="loading" @click="refresh">重试</button>
        </div>
        <HeadToHead :match="match" :matches="history.headToHead" :loading="loading" />
        <div class="detail-forms-grid">
          <TeamRecentForm
            :team="match.home"
            :matches="history.homeForm"
            side="主队"
            :loading="loading"
          /><TeamRecentForm
            :team="match.away"
            :matches="history.awayForm"
            side="客队"
            :loading="loading"
          />
        </div>
        <div class="detail-data-note">
          <AppIcon name="info" :size="16" />
          <p>
            统计范围：英超与欧冠（含资格赛），{{
              scope
            }}。只计本场开赛前且已结束的比赛，常规时间比分；其他赛事不计入近期战绩。{{
              details ? '' : '历史同步完成后将补充近四个赛季。'
            }}不足五场时显示实际记录。
          </p>
          <button :disabled="loading" @click="refresh">
            {{ loading ? '同步中' : '更新资料' }}
          </button>
        </div>
      </template>
      <p v-if="!showHistory && error" class="detail-notice warning">
        {{ error }}，当前展示赛程中的基本信息。<button @click="refresh">重试</button>
      </p>
    </template>
  </div>
</template>
<style src="./match-details.css"></style>
