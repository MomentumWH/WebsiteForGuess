import { computed, onUnmounted, readonly, ref, shallowRef, type Ref } from 'vue'
import { isMatchLocked, type Match, type Prediction } from '@/data/matches'

const STORAGE_KEY = 'matchday.predictions.v1'
function validPrediction(value: unknown): value is Prediction {
  if (!value || typeof value !== 'object') return false
  const p = value as Prediction
  return (
    Number.isInteger(p.home) &&
    p.home >= 0 &&
    p.home <= 20 &&
    Number.isInteger(p.away) &&
    p.away >= 0 &&
    p.away <= 20 &&
    Number.isInteger(p.confidence) &&
    p.confidence >= 0 &&
    p.confidence <= 100 &&
    typeof p.note === 'string' &&
    p.note.length <= 500 &&
    typeof p.savedAt === 'string' &&
    Number.isFinite(Date.parse(p.savedAt))
  )
}
export function usePredictions(matches: Readonly<Ref<Match[]>>) {
  const personal = ref<Record<string, Prediction>>({})
  const storageMessage = shallowRef('')
  const now = shallowRef(Date.now())
  const timer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
  onUnmounted(() => window.clearInterval(timer))
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      personal.value = Object.fromEntries(
        Object.entries(raw).filter(([, p]) => validPrediction(p) && !p.sample),
      )
    }
  } catch {
    storageMessage.value = '无法读取本地预测记录，请检查浏览器存储设置。'
  }
  // Keep orphaned records in storage/export; only settle predictions that were
  // saved before the latest official kickoff. Sync never rewrites user records.
  const predictions = computed(() =>
    Object.fromEntries(
      matches.value.flatMap((match) => {
        const p = personal.value[match.id]
        return p && Date.parse(p.savedAt) < Date.parse(match.kickoff) ? [[match.id, p]] : []
      }),
    ),
  )
  function save(id: string, value: Omit<Prediction, 'savedAt'>): string | null {
    const match = matches.value.find((m) => m.id === id)
    if (!match || isMatchLocked(match)) return '比赛已经开赛，预测已锁定。'
    const prediction: Prediction = {
      home: value.home,
      away: value.away,
      confidence: value.confidence,
      note: value.note.trim(),
      savedAt: new Date().toISOString(),
    }
    if (!validPrediction(prediction)) return '请输入 0–20 的整数比分，并检查预测内容。'
    const next = { ...personal.value, [id]: prediction }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      return '浏览器无法保存记录，请检查存储空间或隐私设置。'
    }
    personal.value = next
    return null
  }
  function remove(id: string): string | null {
    const match = matches.value.find((m) => m.id === id)
    if (!match || isMatchLocked(match)) return '比赛已经开赛，预测已锁定。'
    const next = { ...personal.value }
    delete next[id]
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      return '浏览器无法更新记录，请检查存储空间或隐私设置。'
    }
    personal.value = next
    return null
  }
  function exportRecords() {
    const data = {
      app: 'MATCHDAY',
      version: 1,
      exportedAt: new Date().toISOString(),
      demoFixtures: false,
      records: Object.entries(personal.value).map(([id, prediction]) => ({
        matchId: id,
        match: matches.value.find((m) => m.id === id),
        prediction,
      })),
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'matchday-predictions.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return {
    personal: readonly(personal),
    predictions,
    storageMessage,
    now: readonly(now),
    save,
    remove,
    exportRecords,
  }
}
