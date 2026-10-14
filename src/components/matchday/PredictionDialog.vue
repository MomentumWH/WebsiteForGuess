<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, shallowRef, useTemplateRef } from 'vue'
import {
  dateLabel,
  timeLabel,
  leagueName,
  outcome,
  isMatchLocked,
  matchStatusLabel,
  type Match,
  type Prediction,
} from '@/data/matches'
import AppIcon from './AppIcon.vue'
import TeamBadge from './TeamBadge.vue'
const props = defineProps<{ match: Match; prediction?: Prediction; now: number; error: string }>()
const emit = defineEmits<{ save: [value: Omit<Prediction, 'savedAt'>]; close: []; remove: [] }>()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const locked = computed(() => isMatchLocked(props.match, props.now))
const confirmRemoval = shallowRef(false)
const form = reactive({
  home: props.prediction?.home ?? 2,
  away: props.prediction?.away ?? 1,
  confidence: props.prediction?.confidence ?? 75,
  note: props.prediction?.note ?? '',
})
const validation = shallowRef('')
const result = computed(() => outcome(props.match, props.prediction))
let previousFocus: HTMLElement | null = null
onMounted(() => {
  previousFocus = document.activeElement as HTMLElement
  dialog.value?.showModal()
})
onUnmounted(() => {
  previousFocus?.focus()
})
function submit() {
  if (locked.value) return
  if (![form.home, form.away].every((n) => Number.isInteger(n) && n >= 0 && n <= 20)) {
    validation.value = '比分必须是 0–20 的整数。'
    return
  }
  validation.value = ''
  emit('save', { ...form })
}
</script>
<template>
  <dialog
    ref="dialog"
    class="prediction-dialog"
    aria-labelledby="prediction-title"
    @cancel.prevent="emit('close')"
    @click="$event.target === dialog && emit('close')"
  >
    <div class="dialog-header">
      <div>
        <span class="dialog-eyebrow">{{
          match.actual ? 'POST-MATCH REVIEW' : 'YOUR MATCH. YOUR CALL.'
        }}</span>
        <h2 id="prediction-title">
          {{
            match.actual
              ? '赛后复盘'
              : locked
                ? '预测已锁定'
                : prediction
                  ? '修改比分预测'
                  : '写下你的比分预测'
          }}
        </h2>
      </div>
      <button class="icon-button" aria-label="关闭" @click="emit('close')">
        <AppIcon name="close" />
      </button>
    </div>
    <p class="dialog-meta">
      {{ leagueName(match.league) }} · {{ match.round }}
      <span>{{ dateLabel(match.kickoff) }} {{ timeLabel(match.kickoff) }} 北京时间</span>
      <span>{{ matchStatusLabel(match, now) }}</span>
    </p>
    <form @submit.prevent="submit">
      <div class="score-entry">
        <div class="score-team">
          <TeamBadge :team="match.home" :size="64" /><strong>{{ match.home.name }}</strong
          ><small>主场</small>
        </div>
        <div class="score-inputs">
          <label
            ><span class="sr-only">主队预测比分</span
            ><input
              v-if="!locked"
              v-model.number="form.home"
              type="number"
              min="0"
              max="20"
              step="1"
              required
              autofocus
            /><b v-else>{{ prediction?.home ?? '—' }}</b></label
          ><span>:</span
          ><label
            ><span class="sr-only">客队预测比分</span
            ><input
              v-if="!locked"
              v-model.number="form.away"
              type="number"
              min="0"
              max="20"
              step="1"
              required
            /><b v-else>{{ prediction?.away ?? '—' }}</b></label
          >
        </div>
        <div class="score-team">
          <TeamBadge :team="match.away" :size="64" /><strong>{{ match.away.name }}</strong
          ><small>客场</small>
        </div>
      </div>
      <div v-if="match.actual" class="actual-result">
        <span>实际赛果 · 常规时间</span
        ><strong>{{ match.actual[0] }} : {{ match.actual[1] }}</strong
        ><span class="league-pill">{{ result }}</span>
      </div>
      <template v-if="!locked"
        ><label class="field-label" for="confidence"
          >你有多大把握？<b>{{ form.confidence }}%</b></label
        ><input
          id="confidence"
          v-model.number="form.confidence"
          class="confidence-range"
          type="range"
          min="0"
          max="100"
          step="5"
        />
        <div class="range-labels"><span>大胆一猜</span><span>很有信心</span></div></template
      >
      <label class="field-label note-label" for="prediction-note"
        >{{ locked ? '当时的判断' : '预测理由'
        }}<span v-if="!locked">选填 · {{ form.note.length }}/500</span
        ><span v-else-if="prediction?.sample">演示预测</span></label
      ><textarea
        v-if="!locked"
        id="prediction-note"
        v-model="form.note"
        maxlength="500"
        rows="3"
        placeholder="主场优势、近期状态、伤病情况……是什么让你做出这个判断？"
      ></textarea>
      <p v-else class="readonly-note">{{ prediction?.note || '这场比赛没有留下预测理由。' }}</p>
      <p v-if="error || validation" class="form-error" role="alert">{{ error || validation }}</p>
      <div class="dialog-footnote">
        <AppIcon name="shield" :size="14" />{{
          locked ? '预测已锁定 · 赛况来自赛事官网' : '开赛前可修改 · 仅保存在当前浏览器'
        }}
      </div>
      <button v-if="!locked" class="primary-button save-button" type="submit">
        保存我的预测<AppIcon name="arrow" :size="17" /></button
      ><button v-else class="primary-button save-button" type="button" @click="emit('close')">
        完成复盘<AppIcon name="check" :size="17" />
      </button>
      <div v-if="prediction && !locked" class="remove-actions">
        <button type="button" @click="confirmRemoval ? emit('remove') : (confirmRemoval = true)">
          {{ confirmRemoval ? '确认撤回本场预测' : '撤回预测' }}
        </button>
        <button v-if="confirmRemoval" type="button" @click="confirmRemoval = false">
          保留预测
        </button>
      </div>
    </form>
  </dialog>
</template>
<style scoped>
.remove-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 16px;
}
.remove-actions button {
  background: transparent;
  border: 0;
  font-size: 14px;
  color: var(--md-warning, #9c786d);
  padding: 4px;
}
.remove-actions button:hover {
  color: var(--md-secondary, #bd4941);
}
.prediction-dialog {
  border: 1px solid var(--md-border, #e3e9de);
  border-radius: 18px;
  width: min(520px, calc(100% - 28px));
  padding: 30px;
  margin: auto;
  color: var(--md-text, #263c2d);
  background: var(--md-surface, #fff);
  box-shadow: 0 25px 100px #12271835;
}
.prediction-dialog::backdrop {
  background: #102a26aa;
  backdrop-filter: blur(5px);
}
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dialog-eyebrow {
  font-size: 12px;
  letter-spacing: 2px;
  color: var(--md-muted, #94a086);
}
.dialog-header h2 {
  font-size: 26px;
  letter-spacing: 0.5px;
  margin-top: 8px;
}
.dialog-meta {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--md-muted, #95a18c);
  margin-top: 15px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--md-border, #edf1e8);
}
.score-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28px 0;
}
.score-team {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 105px;
}
.score-team strong {
  font-size: 17px;
}
.score-team small {
  color: var(--md-muted, #96a28d);
  font-size: 14px;
}
.score-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--md-secondary, #8b9a83);
  font-size: 29px;
}
.score-inputs input {
  font-family: Bahnschrift, sans-serif;
  width: 62px;
  height: 70px;
  text-align: center;
  font-size: 35px;
  color: var(--md-text, #275337);
  background: var(--md-soft, #f4f8f0);
  border: 1px solid var(--md-border, #dce6d4);
  border-radius: 9px;
  padding-left: 9px;
}
.score-inputs b {
  font-size: 39px;
  font-family: Bahnschrift, sans-serif;
  font-weight: 500;
  color: var(--md-text, #275337);
}
.field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 16px;
  margin-bottom: 15px;
}
.field-label b {
  font-size: 17px;
  color: var(--md-text, #4c7c36);
}
.confidence-range {
  width: 100%;
  accent-color: var(--md-accent, #39764c);
}
.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--md-muted, #a0aa96);
  margin: 6px 0 23px;
}
.note-label > span {
  font-size: 13px;
  color: var(--md-muted, #9fa991);
}
.note-label {
  margin-bottom: 10px;
}
textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid var(--md-border, #e2e8db);
  border-radius: 7px;
  padding: 12px;
  font: inherit;
  font-size: 15px;
  line-height: 1.8;
  color: var(--md-text, #4c6043);
  background: var(--md-surface, #fcfdfb);
}
.dialog-footnote {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--md-muted, #9ca58f);
  margin: 17px 0;
}
.save-button {
  width: 100%;
  justify-content: center;
  gap: 15px;
  padding: 13px;
}
.form-error {
  font-size: 16px;
  color: var(--md-secondary, #bd4941);
  margin-top: 10px;
}
.actual-result {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--md-soft, #f2f6ed);
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 25px;
  font-size: 14px;
  color: var(--md-secondary, #8b9a7f);
}
.actual-result strong {
  font-size: 28px;
  color: var(--md-text, #2a4930);
  font-family: Bahnschrift, sans-serif;
}
.readonly-note {
  padding: 15px;
  border-radius: 8px;
  background: var(--md-soft, #f8faf5);
  line-height: 1.8;
  font-size: 16px;
  color: var(--md-secondary, #78896a);
}
@media (max-width: 450px) {
  .prediction-dialog {
    padding: 22px;
  }
  .score-team {
    width: 80px;
  }
  .score-inputs input {
    width: 48px;
    height: 60px;
    padding-left: 5px;
  }
  .score-inputs {
    gap: 6px;
  }
  .dialog-meta {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
