import { computed, onBeforeUnmount, onMounted, shallowRef, watch, type Ref } from 'vue'

interface GlassRect {
  x: number
  y: number
  width: number
  height: number
}

// 创建时间：2026-10-28；调用记录：GPT-20261028-001
// 用途与逻辑：协调导航玻璃层的位置、高光和弹性动效，并在布局或动态效果偏好变化时同步清理状态。
export function useLiquidGlassNav(root: Readonly<Ref<HTMLElement | null>>, selected: () => string) {
  const activeRect = shallowRef<GlassRect | null>(null)
  const hoverRect = shallowRef<GlassRect | null>(null)
  const hoverVisible = shallowRef(false)
  const highlight = shallowRef({ x: 50, y: 50, tiltX: 0, tiltY: 0 })
  let hoveredButton: HTMLButtonElement | null = null
  let pointerFrame = 0
  let layoutFrame = 0
  let resizeObserver: ResizeObserver | undefined
  let motionQuery: MediaQueryList | undefined
  let deformation: Animation | undefined

  // 创建时间：2026-10-28；调用记录：GPT-20261028-001
  // 用途与逻辑：读取按钮在导航容器内的布局坐标，使竖排、图标和底部横排共用同一定位方式。
  function rectFor(button: HTMLButtonElement): GlassRect {
    return {
      x: button.offsetLeft,
      y: button.offsetTop,
      width: button.offsetWidth,
      height: button.offsetHeight,
    }
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-001
  // 用途与逻辑：将按钮几何信息转换为玻璃层尺寸与位移，暂未测量时保持装饰层不可见。
  function styleFor(rect: GlassRect | null) {
    return rect
      ? {
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          transform: `translate3d(${rect.x}px, ${rect.y}px, 0)`,
        }
      : { opacity: 0 }
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-001
  // 用途与逻辑：仅从选中按钮的测量结果派生底板样式，不改动页面的栏目状态。
  const activeStyle = computed(() => styleFor(activeRect.value))
  // 创建时间：2026-10-28；调用记录：GPT-20261028-001
  // 用途与逻辑：组合悬停位置、透明度和鼠标高光变量，让装饰层跟随鼠标而不移动按钮文字。
  const hoverStyle = computed(() => ({
    ...styleFor(hoverRect.value),
    opacity: hoverVisible.value ? 1 : 0,
    '--glass-pointer-x': `${highlight.value.x}%`,
    '--glass-pointer-y': `${highlight.value.y}%`,
    '--glass-tilt-x': `${highlight.value.tiltX}deg`,
    '--glass-tilt-y': `${highlight.value.tiltY}deg`,
  }))

  // 创建时间：2026-10-28；调用记录：GPT-20261028-001
  // 用途与逻辑：测量当前选中按钮与悬停按钮，布局改变时让玻璃层重新对齐实际尺寸。
  function measure() {
    const buttons = root.value?.querySelectorAll<HTMLButtonElement>('[data-nav-id]')
    const active =
      buttons && Array.from(buttons).find((button) => button.dataset.navId === selected())
    activeRect.value = active ? rectFor(active) : null
    if (hoveredButton?.isConnected) hoverRect.value = rectFor(hoveredButton)
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-001
  // 用途与逻辑：将连续尺寸变化合并到下一帧，避免缩放窗口时重复读取导航布局。
  function scheduleMeasure() {
    if (layoutFrame) return
    layoutFrame = requestAnimationFrame(measureNextFrame)
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-001
  // 用途与逻辑：释放本帧测量标记，再读取最终布局，后续尺寸变化可重新排队。
  function measureNextFrame() {
    layoutFrame = 0
    measure()
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-001
  // 用途与逻辑：切换选项后对玻璃内层播放短暂拉伸，外层位移由样式过渡连续衔接。
  function animateSelection() {
    const before = activeRect.value
    measure()
    // 取消未完成的拉伸，快速连续切换时只保留当前目标的动效。
    deformation?.cancel()
    const after = activeRect.value
    if (!before || !after || motionQuery?.matches) return
    const lens = root.value?.querySelector<HTMLElement>('.nav-glass-active .nav-glass-lens')
    if (!lens?.animate) return
    const horizontal = Math.abs(after.x - before.x) > Math.abs(after.y - before.y)
    deformation = lens.animate(
      [
        { transform: 'scale(1)' },
        { transform: horizontal ? 'scale(1.1, .94)' : 'scale(.97, 1.14)', offset: 0.32 },
        { transform: horizontal ? 'scale(.985, 1.02)' : 'scale(1.015, .98)', offset: 0.74 },
        { transform: 'scale(1)' },
      ],
      { duration: 560, easing: 'cubic-bezier(.22, 1, .36, 1)' },
    )
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-001
  // 用途与逻辑：在栏目状态更新且按钮渲染完成后启动滑动，兼容点击、快捷入口和路由切换。
  watch(selected, animateSelection, { flush: 'post' })

  // 创建时间：2026-10-28；调用记录：GPT-20261028-001
  // 用途与逻辑：显示鼠标进入的按钮玻璃层，触摸事件不保留悬停状态。
  function enterPointer(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return
    hoveredButton = event.currentTarget as HTMLButtonElement
    hoverRect.value = rectFor(hoveredButton)
    hoverVisible.value = true
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-001
  // 用途与逻辑：将鼠标位置与轻微透视倾角每帧更新一次，减少动态效果时只保留静态悬停。
  function movePointer(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || motionQuery?.matches) return
    const button = event.currentTarget as HTMLButtonElement
    const { clientX, clientY } = event
    cancelAnimationFrame(pointerFrame)
    // 原生事件的 currentTarget 不会保留到下一帧，因此先捕获按钮和鼠标坐标。
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0
      if (!button.isConnected || hoveredButton !== button) return
      const box = button.getBoundingClientRect()
      const x = Math.max(0, Math.min(100, ((clientX - box.left) / box.width) * 100))
      const y = Math.max(0, Math.min(100, ((clientY - box.top) / box.height) * 100))
      highlight.value = { x, y, tiltX: (50 - y) * 0.035, tiltY: (x - 50) * 0.025 }
    })
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-001
  // 用途与逻辑：键盘聚焦时为对应按钮显示居中的玻璃高光，保留原生按钮的键盘操作。
  function focusButton(event: FocusEvent) {
    const button = event.currentTarget as HTMLButtonElement
    // 触摸和鼠标点击也会触发聚焦，仅为键盘可见焦点补充悬停反馈，避免触屏留下高光。
    if (!button.matches(':focus-visible')) return
    hoveredButton = button
    hoverRect.value = rectFor(hoveredButton)
    highlight.value = { x: 50, y: 50, tiltX: 0, tiltY: 0 }
    hoverVisible.value = true
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-001
  // 用途与逻辑：鼠标离开或按钮失焦时淡出悬停层，并清除尚未提交的鼠标帧。
  function clearHover() {
    hoveredButton = null
    hoverVisible.value = false
    cancelAnimationFrame(pointerFrame)
    pointerFrame = 0
    highlight.value = { x: 50, y: 50, tiltX: 0, tiltY: 0 }
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-001
  // 用途与逻辑：动态效果偏好改为减少时立即停止拉伸和跟随，选中标记仍正常显示。
  function motionPreferenceChanged() {
    if (!motionQuery?.matches) return
    deformation?.cancel()
    clearHover()
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-001
  // 用途与逻辑：挂载后测量按钮、观察导航尺寸并订阅动态效果偏好，不启动常驻动画循环。
  onMounted(() => {
    measure()
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQuery.addEventListener('change', motionPreferenceChanged)
    if (typeof ResizeObserver !== 'undefined' && root.value) {
      resizeObserver = new ResizeObserver(scheduleMeasure)
      resizeObserver.observe(root.value)
      // 同时观察按钮，覆盖字体与响应式布局引起的尺寸变化。
      root.value
        .querySelectorAll<HTMLButtonElement>('[data-nav-id]')
        .forEach((button) => resizeObserver!.observe(button))
    } else window.addEventListener('resize', scheduleMeasure)
  })

  // 创建时间：2026-10-28；调用记录：GPT-20261028-001
  // 用途与逻辑：卸载时释放尺寸监听、偏好监听、排队帧和拉伸动画，避免离开页面后继续执行。
  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    motionQuery?.removeEventListener('change', motionPreferenceChanged)
    window.removeEventListener('resize', scheduleMeasure)
    cancelAnimationFrame(layoutFrame)
    cancelAnimationFrame(pointerFrame)
    deformation?.cancel()
  })

  return { activeRect, activeStyle, hoverStyle, enterPointer, movePointer, focusButton, clearHover }
}
