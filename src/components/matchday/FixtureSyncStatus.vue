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
const busy = computed(() => props.loading || feedback.value === 'loading')
const buttonLabel = computed(() => {
  if (busy.value) return '正在同步'
  if (feedback.value === 'success') return '同步完成'
  if (feedback.value === 'warning') return '部分已更新'
  if (feedback.value === 'error') return '重新同步'
  return '同步赛程'
})
const feedbackTitle = computed(() => {
  if (feedback.value === 'loading') return '正在更新阿森纳赛程'
  if (feedback.value === 'success') return '赛程与赛果已同步'
  if (feedback.value === 'warning') return '部分赛事暂时无法更新'
  return '本次同步未完成'
})
const feedbackDescription = computed(() => {
  if (feedback.value === 'loading') return '正在核对英超、欧冠的赛程与赛果，请稍候。'
  if (feedback.value === 'success') return '已核对英超与欧冠数据，可以继续记录你的预测。'
  return props.sources.some((source) => source.updatedAt)
    ? '已保留可用的赛事数据，稍后会自动重试。'
    : '暂时无法获取官方数据，请稍后重试。'
})
let startedAt = 0
let feedbackTimer: number | undefined
function dismissFeedback() {
  window.clearTimeout(feedbackTimer)
  feedback.value = 'idle'
  void nextTick(() => {
    if (!props.loading) syncButton.value?.focus({ preventScroll: true })
  })
}
function requestRefresh() {
  if (busy.value) return
  window.clearTimeout(feedbackTimer)
  startedAt = Date.now()
  feedback.value = 'loading'
  emit('refresh')
}
watch(
  () => props.loading,
  (loading) => {
    // Background refreshes stay quiet; this feedback follows the user's click.
    if (feedback.value !== 'loading') return
    window.clearTimeout(feedbackTimer)
    if (loading) return
    // Keep fast cached responses readable without delaying the actual data update.
    feedbackTimer = window.setTimeout(
      () => {
        feedback.value = props.error
          ? 'error'
          : props.sources.length === 2 &&
              props.sources.every((source) => source.state === 'success')
            ? 'success'
            : 'warning'
        feedbackTimer = window.setTimeout(
          dismissFeedback,
          feedback.value === 'success' ? 1200 : 2600,
        )
      },
      Math.max(0, 900 - (Date.now() - startedAt)),
    )
  },
)
onUnmounted(() => window.clearTimeout(feedbackTimer))
function updatedLabel(value: string | null) {
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
  font-size: 11px;
  color: #6d7e6f;
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
  color: #929d91;
  font-size: 10px;
}
.sync-button {
  position: relative;
  overflow: hidden;
  min-width: 108px;
  border: 1px solid #d9e4d4;
  color: #315f49;
  background: #fff;
  padding: 7px 12px;
  border-radius: 6px;
  cursor: pointer;
}
.sync-button:disabled {
  opacity: 1;
  cursor: wait;
}
.sync-button:hover:not(:disabled) {
  background: #f0f5eb;
  border-color: #b3c9a8;
}
.sync-button.is-loading {
  color: #f4f9ec;
  background: #315e42;
  border-color: #315e42;
  box-shadow: 0 3px 10px #315e4214;
}
.sync-button.is-success {
  background: #eaf2e3;
  border-color: #d1e1c6;
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
  color: #98713c;
  margin: 0;
  line-height: 1.6;
}
</style>
