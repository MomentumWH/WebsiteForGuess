import { computed, shallowRef, watch } from 'vue'
import type { Match } from '@/data/matches'

export function useMatchWindow(
  getMatches: () => Match[],
  getScope: () => string,
  getPageSize: () => number,
) {
  const limit = shallowRef(getPageSize())
  watch(getScope, () => {
    limit.value = getPageSize()
  })
  const visibleMatches = computed(() => getMatches().slice(0, limit.value))
  const hasMore = computed(() => getMatches().length > limit.value)
  function showMore() {
    limit.value += getPageSize()
  }
  return { visibleMatches, hasMore, showMore }
}
