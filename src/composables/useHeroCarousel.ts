import { computed, onMounted, onScopeDispose, readonly, shallowRef, watch } from 'vue'
import type { ShallowRef } from 'vue'

export function useHeroCarousel(root: Readonly<ShallowRef<HTMLElement | null>>, count: number) {
  const activeIndex = shallowRef(0)
  const progressKey = shallowRef(0)
  const autoplay = shallowRef(true)
  const hovered = shallowRef(false)
  const focused = shallowRef(false)
  const reducedMotion = shallowRef(false)
  const visible = shallowRef(false)
  const inViewport = shallowRef(false)
  const interval = 6000
  const canAutoplay = computed(
    () => autoplay.value && !hovered.value && !focused.value && visible.value && inViewport.value,
  )

  function select(index: number) {
    activeIndex.value = ((index % count) + count) % count
  }
  function next() {
    select(activeIndex.value + 1)
  }
  function previous() {
    select(activeIndex.value - 1)
  }
  function toggleAutoplay() {
    autoplay.value = !autoplay.value
  }
  // Restart a full interval after selection or an interaction pause; never queue timers.
  watch([activeIndex, canAutoplay], (_, __, onCleanup) => {
    if (!canAutoplay.value) return
    progressKey.value++
    const timer = window.setTimeout(next, interval)
    onCleanup(() => window.clearTimeout(timer))
  })

  let cleanup: (() => void) | undefined
  onMounted(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.value = preference.matches
    if (preference.matches) autoplay.value = false
    function onPreferenceChange(event: MediaQueryListEvent) {
      reducedMotion.value = event.matches
      if (event.matches) autoplay.value = false
    }
    function onVisibilityChange() {
      visible.value = document.visibilityState === 'visible'
    }
    const observer = new IntersectionObserver(([entry]) => {
      inViewport.value = !!entry?.isIntersecting
    })
    if (root.value) observer.observe(root.value)
    onVisibilityChange()
    preference.addEventListener('change', onPreferenceChange)
    document.addEventListener('visibilitychange', onVisibilityChange)
    cleanup = () => {
      observer.disconnect()
      preference.removeEventListener('change', onPreferenceChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  })
  onScopeDispose(() => cleanup?.())

  return {
    activeIndex: readonly(activeIndex),
    progressKey: readonly(progressKey),
    autoplay: readonly(autoplay),
    canAutoplay,
    reducedMotion: readonly(reducedMotion),
    hovered,
    focused,
    interval,
    select,
    next,
    previous,
    toggleAutoplay,
  }
}
