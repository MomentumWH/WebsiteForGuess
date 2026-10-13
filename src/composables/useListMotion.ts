import { nextTick, onUnmounted, watch, type ShallowRef } from 'vue'

// Vue handles FLIP item movement. Animate the surrounding height separately so
// content below a filtered list glides into place instead of jumping.
export function useListMotion(
  viewport: Readonly<ShallowRef<HTMLElement | null>>,
  getKeys: () => string,
) {
  let heightAnimation: Animation | undefined
  watch(getKeys, async (_keys, _previous, onCleanup) => {
    const element = viewport.value
    if (!element) return
    const from = element.getBoundingClientRect().height
    heightAnimation?.cancel()
    let cancelled = false
    onCleanup(() => {
      cancelled = true
      heightAnimation?.cancel()
    })
    await nextTick()
    if (cancelled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const to = element.getBoundingClientRect().height
    if (Math.abs(from - to) < 1) return
    heightAnimation = element.animate([{ height: `${from}px` }, { height: `${to}px` }], {
      duration: 400,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    })
  })
  onUnmounted(() => heightAnimation?.cancel())

  function beforeLeave(element: Element) {
    if (!(element instanceof HTMLElement)) return
    element.style.width = `${element.offsetWidth}px`
    element.style.height = `${element.offsetHeight}px`
    element.inert = true
    // Preserve table column alignment while an outgoing row leaves the flow.
    for (const cell of element.querySelectorAll<HTMLElement>(':scope > td')) {
      cell.style.width = `${cell.getBoundingClientRect().width}px`
      cell.style.minWidth = cell.style.width
      cell.style.maxWidth = cell.style.width
    }
  }
  function clearLeavingSize(element: Element) {
    if (!(element instanceof HTMLElement)) return
    element.style.removeProperty('width')
    element.style.removeProperty('height')
    element.inert = false
    for (const cell of element.querySelectorAll<HTMLElement>(':scope > td')) {
      for (const property of ['width', 'min-width', 'max-width'])
        cell.style.removeProperty(property)
    }
  }
  return { beforeLeave, clearLeavingSize }
}
