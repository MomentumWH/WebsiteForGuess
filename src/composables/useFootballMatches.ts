import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { isFootballFeed, type FootballFeed, type FootballSource } from '@/data/football'

const CACHE_KEY = 'matchday.official-fixtures.v1'
export function useFootballMatches() {
  const feed = shallowRef<FootballFeed | null>(null)
  const loading = shallowRef(false)
  const error = shallowRef('')
  const offline = shallowRef(false)
  let disposed = false
  let controller: AbortController | undefined
  let timer: number | undefined
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (isFootballFeed(value)) {
      feed.value = value
      offline.value = true
    }
  } catch {
    /* The page can still synchronize without local storage. */
  }
  const matches = computed(() => feed.value?.matches ?? [])
  const sources = computed<FootballSource[]>(
    () =>
      feed.value?.sources.map((s) =>
        offline.value && s.updatedAt ? { ...s, state: 'stale' } : s,
      ) ?? [],
  )
  const seasonLabel = computed(() =>
    feed.value
      ? `${feed.value.season} / ${String(feed.value.season + 1).slice(-2)} 赛季`
      : '阿森纳 · 英超 / 欧冠',
  )
  async function refresh() {
    if (loading.value || disposed) return
    loading.value = true
    controller = new AbortController()
    const timeout = window.setTimeout(() => controller?.abort(), 15_000)
    try {
      const response = await fetch('/api/football/arsenal', {
        signal: controller.signal,
        cache: 'no-store',
      })
      const value: unknown = await response.json()
      if (!isFootballFeed(value)) throw new Error('赛事服务未返回有效数据，请稍后重试')
      if (disposed) return
      feed.value = value
      offline.value = false
      error.value = response.ok ? '' : '官方数据暂时无法获取，请稍后重试'
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(value))
      } catch {
        /* Optional browser cache. */
      }
    } catch (cause) {
      if (disposed) return
      offline.value = true
      error.value =
        cause instanceof Error && cause.name !== 'AbortError'
          ? cause.message
          : '同步超时，请稍后重试'
    } finally {
      window.clearTimeout(timeout)
      loading.value = false
    }
  }
  function onVisible() {
    if (document.visibilityState === 'visible') void refresh()
  }
  onMounted(() => {
    void refresh()
    timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 60_000)
    document.addEventListener('visibilitychange', onVisible)
  })
  onUnmounted(() => {
    disposed = true
    controller?.abort()
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
  })
  return { matches, sources, seasonLabel, loading, error, refresh }
}
