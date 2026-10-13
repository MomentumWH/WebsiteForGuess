import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { isSquadFeed, type SquadFeed } from '@/data/squad'

const key = 'matchday.arsenal-squad.v1'
export function useArsenalSquad() {
  const feed = shallowRef<SquadFeed | null>(null)
  const loading = shallowRef(false)
  const error = shallowRef('')
  const cached = shallowRef(false)
  let disposed = false
  let controller: AbortController | undefined
  let timer: number | undefined
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (isSquadFeed(value)) {
      feed.value = value
      cached.value = true
    }
  } catch {
    /* Browser storage is optional. */
  }
  const sources = computed(
    () =>
      feed.value?.sources.map((s) =>
        cached.value && s.updatedAt ? { ...s, state: 'stale' as const } : s,
      ) ?? [],
  )
  async function refresh() {
    if (loading.value || disposed) return
    loading.value = true
    error.value = ''
    const requestController = new AbortController()
    controller = requestController
    const timeout = window.setTimeout(() => requestController.abort(), 45000)
    try {
      const response = await fetch('/api/football/arsenal/squad', {
        signal: requestController.signal,
        cache: 'no-store',
      })
      const value: unknown = await response.json()
      if (!isSquadFeed(value)) throw new Error('球员服务暂不可用，请稍后重试')
      if (disposed) return
      feed.value = value
      cached.value = false
      if (!response.ok) error.value = '官方球员数据暂不可用'
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {
        /* Storage failure does not affect statistics. */
      }
    } catch (cause) {
      if (disposed) return
      cached.value = !!feed.value
      error.value =
        cause instanceof Error && cause.name !== 'AbortError'
          ? cause.message
          : '同步超时，请稍后重试'
    } finally {
      window.clearTimeout(timeout)
      if (!disposed) loading.value = false
    }
  }
  function onVisible() {
    if (document.visibilityState === 'visible') void refresh()
  }
  onMounted(() => {
    void refresh()
    timer = window.setInterval(onVisible, 300000)
    document.addEventListener('visibilitychange', onVisible)
  })
  onUnmounted(() => {
    disposed = true
    controller?.abort()
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
  })
  return { feed, loading, error, sources, refresh }
}
