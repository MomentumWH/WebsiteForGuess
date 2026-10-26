<script setup lang="ts">
import { computed } from 'vue'
import { outcome, type Match, type Prediction } from '@/data/matches'
import AppIcon from '@/components/matchday/AppIcon.vue'
const props = defineProps<{ match: Match; prediction?: Prediction }>()
defineEmits<{ predict: [match: Match] }>()
// 注释修改时间：2026-10-22
// 用途与逻辑：生成赛果说明，缺少正式比分时提示缺失，否则比较主客队比分确定结果。
const winner = computed(() => {
  // 正式比分缺失时明确提示，不根据实时数据推断最终赛果。
  if (!props.match.actual) return '官方比分暂未提供'
  // 正式比分可用后，再比较主客队得分生成结果说明。
  const [home, away] = props.match.actual
  return home === away
    ? '双方战平'
    : `${home > away ? props.match.home.name : props.match.away.name}获胜`
})
// 注释修改时间：2026-10-22
// 用途与逻辑：判断是否存在额外赛果差异，同时具备终场比分与正式比分时逐项比较。
const hasExtraTime = computed(
  () =>
    props.match.finalScore &&
    props.match.actual &&
    props.match.finalScore.some((n, i) => n !== props.match.actual![i]),
)
</script>
<template>
  <section class="detail-facts panel">
    <div class="detail-section-heading">
      <div>
        <span class="detail-eyebrow">FULL TIME</span>
        <h3>赛果与比赛信息</h3>
      </div>
      <AppIcon name="ball" :size="23" />
    </div>
    <div class="match-facts-grid">
      <div>
        <span>常规时间赛果</span><strong>{{ winner }}</strong>
      </div>
      <div>
        <span>半场比分</span><strong>{{ match.halfTimeScore?.join(' : ') ?? '官方未提供' }}</strong>
      </div>
      <div>
        <span>现场观众</span
        ><strong>{{
          match.attendance === undefined
            ? '官方未提供'
            : `${match.attendance.toLocaleString('zh-CN')} 人`
        }}</strong>
      </div>
      <div><span>比赛状态</span><strong>已完赛</strong></div>
    </div>
    <p v-if="hasExtraTime" class="detail-note">
      含加时比分
      {{ match.finalScore!.join(' : ') }}；本页赛果与预测复盘采用常规时间比分，不包含加时和点球。
    </p>
    <div class="detail-prediction">
      <div>
        <span class="detail-eyebrow">MY PREDICTION</span>
        <h4>
          {{ prediction ? `我的预测 ${prediction.home} : ${prediction.away}` : '本场尚无预测记录' }}
        </h4>
        <p>
          {{ prediction ? outcome(match, prediction) : '赛前留下的预测，将在这里与赛果对比。' }}
        </p>
      </div>
      <button class="detail-secondary-button" @click="$emit('predict', match)">
        查看预测复盘<AppIcon name="arrow" :size="15" />
      </button>
    </div>
  </section>
</template>
