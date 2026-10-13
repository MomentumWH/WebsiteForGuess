import { onScopeDispose, shallowRef, type ShallowRef } from 'vue'

interface DragState {
  id: string
  x: number
  y: number
}
export function useLineupDrag(
  root: Readonly<ShallowRef<HTMLElement | null>>,
  drop: (player: string, target: string) => void,
) {
  const active = shallowRef<DragState | null>(null)
  const target = shallowRef<string | null>(null)
  let pending: { id: string; pointer: number; x: number; y: number; source: HTMLElement } | null =
    null
  let ignoreClickUntil = 0
  let scrollFrame = 0
  let scrollContainer: HTMLElement | null = null
  function autoScroll() {
    scrollFrame = 0
    if (!active.value || !scrollContainer) return
    const bounds =
      scrollContainer === document.scrollingElement
        ? { top: 0, bottom: window.innerHeight }
        : scrollContainer.getBoundingClientRect()
    const y = active.value.y
    const edge = 65
    const speed =
      y < bounds.top + edge
        ? -Math.min(14, (bounds.top + edge - y) / 4)
        : y > bounds.bottom - edge
          ? Math.min(14, (y - bounds.bottom + edge) / 4)
          : 0
    if (speed) {
      scrollContainer.scrollTop += speed
      aim(active.value.x, active.value.y)
    }
    scrollFrame = window.requestAnimationFrame(autoScroll)
  }
  function aim(x: number, y: number) {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-lineup-target]')
    target.value =
      element && root.value?.contains(element) ? (element.dataset.lineupTarget ?? null) : null
  }
  function move(event: PointerEvent) {
    if (!pending || event.pointerId !== pending.pointer) return
    if (!active.value && Math.hypot(event.clientX - pending.x, event.clientY - pending.y) < 6)
      return
    active.value = { id: pending.id, x: event.clientX, y: event.clientY }
    event.preventDefault()
    aim(event.clientX, event.clientY)
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(autoScroll)
  }
  function cleanup() {
    window.cancelAnimationFrame(scrollFrame)
    scrollFrame = 0
    scrollContainer = null
    if (pending?.source.hasPointerCapture(pending.pointer))
      pending.source.releasePointerCapture(pending.pointer)
    pending = null
    active.value = null
    target.value = null
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', finish)
    window.removeEventListener('pointercancel', cancel)
    window.removeEventListener('keydown', escape)
    window.removeEventListener('blur', cancel)
  }
  function cancel() {
    if (active.value) ignoreClickUntil = Date.now() + 300
    cleanup()
  }
  function escape(event: KeyboardEvent) {
    if (event.key === 'Escape') cancel()
  }
  function finish(event: PointerEvent) {
    if (!pending || event.pointerId !== pending.pointer) return
    if (active.value) {
      aim(event.clientX, event.clientY)
      const destination = target.value
      const player = pending.id
      ignoreClickUntil = Date.now() + 300
      cleanup()
      if (destination) drop(player, destination)
    } else cleanup()
  }
  function start(event: PointerEvent, id: string) {
    if (event.button !== 0 || !event.isPrimary) return
    cancel()
    const source = event.currentTarget as HTMLElement
    scrollContainer = document.scrollingElement as HTMLElement | null
    for (let parent = root.value?.parentElement; parent; parent = parent.parentElement) {
      if (
        /(auto|scroll)/.test(getComputedStyle(parent).overflowY) &&
        parent.scrollHeight > parent.clientHeight
      ) {
        scrollContainer = parent
        break
      }
    }
    pending = { id, pointer: event.pointerId, x: event.clientX, y: event.clientY, source }
    source.setPointerCapture(event.pointerId)
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', escape)
    window.addEventListener('blur', cancel)
  }
  onScopeDispose(cleanup)
  return { active, target, start, cancel, suppressClick: () => Date.now() < ignoreClickUntil }
}
