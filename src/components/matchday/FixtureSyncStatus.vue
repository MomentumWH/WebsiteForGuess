<script setup lang="ts">
import { computed, nextTick, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue'
import type { FootballSource } from '@/data/football'
import AppIcon from './AppIcon.vue'
import FixtureSyncOverlay from './FixtureSyncOverlay.vue'
const props = defineProps<{ sources: FootballSource[]; loading: boolean; error: string }>()
const emit = defineEmits<{ refresh: [] }>()
type Feedback = 'idle' | 'loading' | 'success' | 'warning' | 'error'
const feedback = shallowRef<Feedback>('idle')
const syncButton = useTemplateRef<HTMLElement>('syncButton')
// 注释修改时间：2026-10-22
// 用途与逻辑：合并同步忙碌状态，外部请求或手动反馈仍在加载时均视为忙碌。
const busy = computed(() => props.loading || feedback.value === 'loading')
// 注释修改时间：2026-10-22
// 用途与逻辑：生成同步按钮文案，按忙碌、成功、部分更新或错误状态依次选择提示。
const buttonLabel = computed(() => {
  // 忙碌状态优先于历史反馈，避免请求过程中出现可再次同步的提示。
  if (busy.value) return '正在同步'
  if (feedback.value === 'success') return '同步完成'
  if (feedback.value === 'warning') return '部分已更新'
  if (feedback.value === 'error') return '重新同步'
  return '同步赛程'
})
// 注释修改时间：2026-10-22
// 用途与逻辑：生成同步反馈标题，将加载、成功和部分更新状态映射为对应说明。
const feedbackTitle = computed(() => {
  // 根据手动同步阶段选择标题，未完成状态统一使用默认说明。
  if (feedback.value === 'loading') return '正在更新英超与欧冠赛程'
  if (feedback.value === 'success') return '赛程与赛果已同步'
  if (feedback.value === 'warning') return '部分赛事暂时无法更新'
  return '本次同步未完成'
})
// 注释修改时间：2026-10-22
// 用途与逻辑：生成同步反馈描述，按同步结果与已有来源时间区分完成、保留数据或缺失。
const feedbackDescription = computed(() => {
  // 加载与成功直接反馈，其余情况根据已有时间区分缓存与数据缺失。
  if (feedback.value === 'loading') return '正在核对英超、欧冠的赛程与赛果，请稍候。'
  if (feedback.value === 'success') return '已核对英超与欧冠数据，可以继续记录你的预测。'
  return props.sources.some((source) => source.updatedAt)
    ? '已保留可用的赛事数据，稍后会自动重试。'
    : '暂时无法获取官方数据，请稍后重试。'
})
let startedAt = 0
let feedbackTimer: number | undefined
// 注释修改时间：2026-10-22
// 用途与逻辑：关闭同步反馈，取消反馈计时并切回空闲，视图更新后按需恢复按钮焦点。
function dismissFeedback() {
  // 先停止反馈计时并关闭提示，避免旧定时器再次改写状态。
  window.clearTimeout(feedbackTimer)
  feedback.value = 'idle'
  // 等待视图更新后，在外部请求已经结束时恢复同步按钮焦点。
  void nextTick(() => {
    // 只在没有同步请求进行时恢复焦点，避免聚焦不可操作的按钮。
    if (!props.loading) syncButton.value?.focus({ preventScroll: true })
  })
}
// 注释修改时间：2026-10-22
// 用途与逻辑：请求手动同步，拦截重复操作，记录开始时间并进入加载反馈，再向上通知刷新。
function requestRefresh() {
  // 忙碌期间拒绝再次刷新，避免重复请求和重叠反馈。
  if (busy.value) return
  // 重置计时起点并进入加载阶段，再通知父组件执行实际同步。
  window.clearTimeout(feedbackTimer)
  startedAt = Date.now()
  feedback.value = 'loading'
  emit('refresh')
}
// 注释修改时间：2026-10-22
// 用途与逻辑：监听请求结束，仅处理手动同步反馈，保证最短展示时间后计算结果并安排关闭。
watch(
  () => props.loading,
  (loading) => {
    // Background refreshes stay quiet; this feedback follows the user's click.
    // 只跟踪用户主动触发的反馈，不让后台自动刷新弹出提示。
    if (feedback.value !== 'loading') return
    window.clearTimeout(feedbackTimer)
    // 请求仍进行时继续等待，结束后再安排结果反馈。
    if (loading) return
    // Keep fast cached responses readable without delaying the actual data update.
    feedbackTimer = window.setTimeout(
      () => {
        // 结合请求错误和两个联赛的来源状态，判定失败、成功或部分更新。
        feedback.value = props.error
          ? 'error'
          : props.sources.length === 2 &&
              props.sources.every((source) => source.state === 'success')
            ? 'success'
            : 'warning'
        // 按结果类型设置关闭延迟，成功提示较短，异常提示留出阅读时间。
        feedbackTimer = window.setTimeout(
          dismissFeedback,
          feedback.value === 'success' ? 1200 : 2600,
        )
      },
      Math.max(0, 900 - (Date.now() - startedAt)),
    )
  },
)
// 注释修改时间：2026-10-22
// 用途与逻辑：卸载时取消反馈定时器，防止组件销毁后仍更新提示状态。
onUnmounted(() => window.clearTimeout(feedbackTimer))
// 注释修改时间：2026-10-22
// 用途与逻辑：格式化来源更新时间，按上海时区显示月日时分，缺失时说明尚未同步。
function updatedLabel(value: string | null) {
  // 只格式化已存在的来源时间，缺失时保留明确的尚未同步说明。
  return value
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(value))
    : '尚未同步'
}
</script>
<template>
  <section class="sync-status" aria-label="赛事数据同步" :aria-busy="busy">
    <div class="sync-sources" role="status" aria-live="polite">
      <span v-if="!sources.length">{{ loading ? '正在同步官方赛程…' : '等待同步官方赛程' }}</span>
      <span
        v-for="source in sources"
        :key="source.league"
        class="sync-source"
        :class="source.state"
      >
        <i></i
        ><a
          :href="
            source.league === 'pl'
              ? 'https://www.premierleague.com/en/matches'
              : 'https://www.uefa.com/uefachampionsleague/clubs/52280--arsenal/matches/'
          "
          target="_blank"
          rel="noopener noreferrer"
          >{{ source.league === 'pl' ? '英超' : '欧冠' }}</a
        >
        {{
          source.state === 'success' ? '已同步' : source.state === 'stale' ? '使用缓存' : '同步失败'
        }}
        <small>{{ updatedLabel(source.updatedAt) }}{{ source.updatedAt ? ' 更新' : '' }}</small>
      </span>
    </div>
    <button
      ref="syncButton"
      type="button"
      class="sync-button"
      :class="{ 'is-loading': busy, 'is-success': feedback === 'success' && !busy }"
      :disabled="busy"
      @click="requestRefresh"
    >
      <span class="button-content">
        <AppIcon v-if="feedback === 'success' && !busy" name="check" :size="15" />
        <svg
          v-else
          class="sync-icon"
          :class="{ spinning: busy }"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M20 7a9 9 0 0 0-15-1L3 9m0-5v5h5M4 17a9 9 0 0 0 15 1l2-3m0 5v-5h-5" />
        </svg>
        <span>{{ buttonLabel }}</span>
      </span>
    </button>
    <FixtureSyncOverlay
      :phase="feedback"
      :title="feedbackTitle"
      :description="feedbackDescription"
      :sources="sources"
      @dismiss="dismissFeedback"
    />
    <p v-if="error && !busy" class="sync-message" role="alert">
      {{ error }}{{ sources.some((s) => s.updatedAt) ? '，当前保留上次成功数据。' : '。' }}
    </p>
    <p v-for="source in sources.filter((s) => s.message)" :key="source.league" class="sync-message">
      {{ source.league === 'pl' ? '英超' : '欧冠' }}：{{
        source.state === 'success' ? source.message : '官网暂时无法同步，将自动重试。'
      }}
    </p>
  </section>
</template>
<style scoped>
.sync-status {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0 20px;
  font-size: 15px;
  color: var(--md-secondary, #6d7e6f);
}
.sync-sources {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}
.sync-source {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.sync-source i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #329265;
}
.sync-source.stale i,
.sync-source.error i {
  background: #be8743;
}
.sync-source a {
  color: inherit;
  text-underline-offset: 3px;
}
.sync-source small {
  color: var(--md-muted, #929d91);
  font-size: 14px;
}
.sync-button {
  position: relative;
  overflow: hidden;
  min-width: 108px;
  border: 1px solid var(--md-border, #d9e4d4);
  color: var(--md-text, #315f49);
  background: var(--md-surface, #fff);
  padding: 7px 12px;
  border-radius: 6px;
  cursor: pointer;
}
.sync-button:disabled {
  opacity: 1;
  cursor: wait;
}
.sync-button:hover:not(:disabled) {
  background: var(--md-soft, #f0f5eb);
  border-color: var(--md-accent, #b3c9a8);
}
.sync-button.is-loading {
  color: #f4f9ec;
  background: #315e42;
  border-color: var(--md-accent, #315e42);
  box-shadow: 0 3px 10px #315e4214;
}
.sync-button.is-success {
  background: var(--md-soft, #eaf2e3);
  border-color: var(--md-border, #d1e1c6);
}
.button-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}
.spinning {
  animation: sync-spin 1.35s linear infinite;
}
@keyframes sync-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 520px) {
  .sync-sources {
    gap: 7px 14px;
  }
  .sync-source small {
    display: none;
  }
  .sync-button {
    min-width: 103px;
  }
}
.sync-message {
  flex-basis: 100%;
  color: var(--md-warning, #98713c);
  margin: 0;
  line-height: 1.6;
}
</style>
