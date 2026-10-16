import { computed, nextTick, onMounted, onUnmounted, shallowRef, watch, type ShallowRef } from 'vue'
import type { Match } from '@/data/matches'

// The two directions grow independently, so adding older results preserves upcoming fixtures.
export function useFixtureTimeline(
  getMatches: () => Match[],
  getScope: () => string,
  getPageSize: () => number,
  viewport: Readonly<ShallowRef<HTMLElement | null>>,
  current: Readonly<ShallowRef<HTMLElement | null>>,
) {
  const pastLimit = shallowRef(getPageSize())
  const futureLimit = shallowRef(getPageSize())
  const prepending = shallowRef(false)
  const groups = computed(() => {
    const sorted = [...getMatches()].sort(
      (a, b) =>
        (Date.parse(a.kickoff) || Infinity) - (Date.parse(b.kickoff) || Infinity) ||
        a.id.localeCompare(b.id),
    )
    return { past: sorted.filter(isFinished), future: sorted.filter((m) => !isFinished(m)) }
  })
  const past = computed(() => groups.value.past.slice(-pastLimit.value))
  const future = computed(() => groups.value.future.slice(0, futureLimit.value))
  const hasEarlier = computed(() => groups.value.past.length > pastLimit.value)
  const hasMore = computed(() => groups.value.future.length > futureLimit.value)
  let disposed = false
  let revision = 0
  let ready = false
  let resizing: ResizeObserver | undefined

  function scrollToCurrent(behavior: ScrollBehavior = 'auto') {
    const element = viewport.value
    if (!element || !current.value) return
    element.scrollTo({ top: current.value.offsetTop - element.clientTop, behavior })
    element.dataset.currentTop = String(current.value.offsetTop)
  }
  function showPast() {
    const element = viewport.value
    if (!element || !current.value) return
    element.scrollTo({
      top: Math.max(0, current.value.offsetTop - element.clientHeight),
      behavior: motion(),
    })
  }
  async function reset() {
    const run = ++revision
    ready = false
    prepending.value = false
    await nextTick()
    if (disposed || run !== revision) return
    scrollToCurrent()
    ready = true
  }
  watch(getScope, () => {
    pastLimit.value = getPageSize()
    futureLimit.value = getPageSize()
    void reset()
  })
  // Empty initial feeds and updated kickoff/status data should locate the same timeline anchor.
  watch(
    () => groups.value.future[0]?.id ?? (groups.value.past.length ? 'past-only' : ''),
    () => void reset(),
  )
  async function showEarlier() {
    const element = viewport.value
    if (!element || !hasEarlier.value || !ready) return
    const anchor = element.querySelector<HTMLElement>('.history-cards .match-card')
    const top = anchor
      ? anchor.offsetTop + (anchor.offsetParent as HTMLElement).offsetTop
      : undefined
    const run = revision
    ready = false
    prepending.value = true
    pastLimit.value += getPageSize()
    await nextTick()
    if (disposed || run !== revision) return
    // Keep the card under the pointer still when older rows are inserted above it.
    if (anchor?.isConnected && top !== undefined)
      element.scrollTop += anchor.offsetTop + (anchor.offsetParent as HTMLElement).offsetTop - top
    if (current.value) element.dataset.currentTop = String(current.value.offsetTop)
    prepending.value = false
    ready = true
  }
  function onScroll() {
    if (ready && viewport.value && viewport.value.scrollTop < 48) void showEarlier()
  }
  onMounted(() => {
    void reset()
    resizing = new ResizeObserver(() => {
      // Column changes can move the boundary; keep its position when viewing current fixtures.
      const element = viewport.value
      if (!element || !current.value || !ready) return
      const oldTop = Number(element.dataset.currentTop ?? current.value.offsetTop)
      if (Math.abs(element.scrollTop - oldTop) < 16) scrollToCurrent()
      element.dataset.currentTop = String(current.value.offsetTop)
    })
    if (current.value) resizing.observe(current.value)
  })
  onUnmounted(() => {
    disposed = true
    revision++
    resizing?.disconnect()
  })
  return {
    past,
    prepending,
    future,
    groups,
    hasEarlier,
    hasMore,
    showEarlier,
    showMore: () => (futureLimit.value += getPageSize()),
    scrollToCurrent: () => scrollToCurrent(motion()),
    showPast,
    onScroll,
  }
}
function isFinished(match: Match) {
  return match.status === 'finished' || !!match.actual
}
function motion(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}
