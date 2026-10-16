import { computed, shallowRef, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { isMatchDetails, matchHistory, type MatchDetails } from '@/data/matchDetails'
import type { Match } from '@/data/matches'

export function useMatchDetails(
  match: MaybeRefOrGetter<Match | undefined>,
  records: MaybeRefOrGetter<Match[]>,
) {
  const details = shallowRef<MatchDetails | null>(null)
  const loading = shallowRef(false)
  const error = shallowRef('')
  const reload = shallowRef(0)
  watch(
    [() => toValue(match)?.id, () => toValue(match)?.status, reload],
    async (_, __, onCleanup) => {
      const selected = toValue(match)
      if (
        details.value?.match.id !== selected?.id ||
        details.value?.match.status !== selected?.status
      )
        details.value = null
      error.value = ''
      loading.value = !!selected
      if (!selected) return
      const controller = new AbortController()
      let active = true
      const timeout = window.setTimeout(() => controller.abort(), 35_000)
      onCleanup(() => {
        active = false
        controller.abort()
        window.clearTimeout(timeout)
      })
      try {
        const response = await fetch(`/api/football/matches/${encodeURIComponent(selected.id)}`, {
          signal: controller.signal,
          cache: 'no-store',
        })
        const value: unknown = await response.json()
        if (!response.ok || !isMatchDetails(value) || value.match.id !== selected.id)
          throw new Error('比赛资料暂时无法获取，请稍后重试')
        if (active) details.value = value
      } catch (cause) {
        if (active)
          error.value =
            cause instanceof Error && cause.name !== 'AbortError'
              ? cause.message
              : '比赛资料同步超时，请稍后重试'
      } finally {
        window.clearTimeout(timeout)
        if (active) loading.value = false
      }
    },
    { immediate: true },
  )
  const selectedMatch = computed(() => {
    const selected = toValue(match)
    return selected ? { ...details.value?.match, ...selected } : undefined
  })
  const history = computed(
    () =>
      details.value ??
      (toValue(match)
        ? matchHistory(toValue(match)!, toValue(records))
        : { headToHead: [], homeForm: [], awayForm: [] }),
  )
  return { details, match: selectedMatch, history, loading, error, refresh: () => reload.value++ }
}
