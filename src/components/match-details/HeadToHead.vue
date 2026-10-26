<script setup lang="ts">
import { computed } from 'vue'
import type { Match } from '@/data/matches'
import { summarizeForm } from '@/data/matchDetails'
import HistoryMatchList from './HistoryMatchList.vue'
const props = defineProps<{ match: Match; matches: Match[]; loading: boolean }>()
// 注释修改时间：2026-10-22
// 用途与逻辑：汇总双方交锋表现，以当前主队为观察对象计算历史胜平负数据。
const summary = computed(() => summarizeForm(props.matches, props.match.home))
</script>
<template>
  <section class="detail-h2h panel" :aria-busy="loading">
    <div class="detail-section-heading">
      <div>
        <span class="detail-eyebrow">HEAD TO HEAD</span>
        <h3>近期交手记录</h3>
      </div>
      <span class="detail-count">{{ matches.length }} 场</span>
    </div>
    <template v-if="matches.length"
      ><div class="h2h-summary">
        <div>
          <strong>{{ summary.win }}</strong
          ><span>{{ match.home.name }}胜</span>
        </div>
        <div>
          <strong>{{ summary.draw }}</strong
          ><span>平局</span>
        </div>
        <div>
          <strong>{{ summary.loss }}</strong
          ><span>{{ match.away.name }}胜</span>
        </div>
      </div>
      <div class="h2h-bar" aria-hidden="true">
        <i
          v-for="(count, i) in [summary.win, summary.draw, summary.loss]"
          :key="i"
          :style="{ flex: count }"
        ></i>
      </div>
      <HistoryMatchList :matches="matches"
    /></template>
    <div v-else class="detail-empty">
      <strong>{{ loading ? '正在查找历史交锋' : '暂无可用的交锋记录' }}</strong>
      <p>{{ loading ? '同步完成后会自动显示。' : '已查询范围内没有双方交手的已完赛记录。' }}</p>
    </div>
    <p class="detail-note">最近 {{ matches.length }} 次交手 · 按比赛时间从近到远</p>
  </section>
</template>
