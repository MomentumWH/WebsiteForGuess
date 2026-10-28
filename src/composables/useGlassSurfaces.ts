import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

const surfaces = '.panel, .match-card, .personal-lineup, .lineup-bench, .bench-card, .fan-card'

// 创建时间：2026-10-28；调用记录：GPT-20261028-002
// 用途与逻辑：统一卡片鼠标折光与栏目入场，仅在交互时申请帧，不修改业务状态或列表排序。
export function useGlassSurfaces(root: Readonly<Ref<HTMLElement | null>>, scene: () => string) {
  let frame = 0
  let lit: HTMLElement | null = null
  let pending: { element: HTMLElement; x: number; y: number } | null = null
  let motion: MediaQueryList | undefined
  const entrances = new Set<Animation>()

  // 创建时间：2026-10-28；调用记录：GPT-20261028-002
  // 用途与逻辑：清除上一张卡片的鼠标高光及待处理帧，离开页面或滚动时不留下光斑。
  function clearHighlight() {
    cancelAnimationFrame(frame)
    frame = 0
    pending = null
    lit?.removeAttribute('data-glass-lit')
    lit?.style.removeProperty('--surface-x')
    lit?.style.removeProperty('--surface-y')
    lit = null
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-002
  // 用途与逻辑：在本帧读取当前卡片边界，将鼠标坐标转换为局部高光位置。
  function paintHighlight() {
    frame = 0
    if (!pending?.element.isConnected) return
    const { element, x, y } = pending
    if (lit !== element) {
      lit?.removeAttribute('data-glass-lit')
      lit?.style.removeProperty('--surface-x')
      lit?.style.removeProperty('--surface-y')
    }
    lit = element
    const bounds = element.getBoundingClientRect()
    element.style.setProperty('--surface-x', `${x - bounds.left}px`)
    element.style.setProperty('--surface-y', `${y - bounds.top}px`)
    element.dataset.glassLit = ''
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-002
  // 用途与逻辑：在工作台委托监听鼠标，合并高频移动并只照亮最近的卡片，触屏和拖动不触发。
  function movePointer(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || event.buttons || motion?.matches) {
      clearHighlight()
      return
    }
    const element =
      event.target instanceof Element ? event.target.closest<HTMLElement>(surfaces) : null
    if (!element || !root.value?.contains(element)) {
      clearHighlight()
      return
    }
    pending = { element, x: event.clientX, y: event.clientY }
    if (!frame) frame = requestAnimationFrame(paintHighlight)
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-002
  // 用途与逻辑：停止尚未结束的栏目入场，快速切换和减少动态效果时不累积动画。
  function cancelEntrances() {
    for (const animation of entrances) animation.cancel()
    entrances.clear()
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-002
  // 用途与逻辑：对新栏目内容分批淡入上移，不重建组件，因此筛选、预测和阵容状态仍由原逻辑管理。
  function revealScene() {
    clearHighlight()
    cancelEntrances()
    if (motion?.matches) return
    const sections = root.value?.querySelectorAll<HTMLElement>(
      '.main-content > :is(.hero-grid, .summary-grid, .content-columns, .review-panel, .view-toolbar, .stats-panel, .prediction-explainer, .squad-workspace, .match-details)',
    )
    sections?.forEach((element, index) => {
      if (!element.animate) return
      const animation = element.animate(
        [
          { opacity: 0.15, translate: '0 12px' },
          { opacity: 1, translate: '0 0' },
        ],
        {
          duration: 520,
          delay: Math.min(index * 55, 165),
          easing: 'cubic-bezier(.22, 1, .36, 1)',
          fill: 'backwards',
        },
      )
      entrances.add(animation)
      // 完成后释放动画句柄，不在长时间浏览中保留已结束的动画。
      animation.onfinish = () => entrances.delete(animation)
    })
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-002
  // 用途与逻辑：监听栏目完成渲染后的变化，再播放新栏目入场，不监听数据同步或搜索结果。
  watch(scene, revealScene, { flush: 'post' })

  // 创建时间：2026-10-28；调用记录：GPT-20261028-002
  // 用途与逻辑：动态效果偏好变化时立即清理高光和入场，偏好恢复后等待下一次实际交互。
  function preferenceChanged() {
    clearHighlight()
    cancelEntrances()
  }

  // 创建时间：2026-10-28；调用记录：GPT-20261028-002
  // 用途与逻辑：挂载后安装单组委托事件和偏好监听，滚动捕获用于清除过期鼠标坐标。
  onMounted(() => {
    motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    motion.addEventListener('change', preferenceChanged)
    root.value?.addEventListener('pointermove', movePointer, { passive: true })
    root.value?.addEventListener('pointerleave', clearHighlight)
    window.addEventListener('scroll', clearHighlight, { passive: true, capture: true })
    window.addEventListener('blur', preferenceChanged)
    revealScene()
  })

  // 创建时间：2026-10-28；调用记录：GPT-20261028-002
  // 用途与逻辑：离开工作台时移除事件、偏好监听与动画帧，避免装饰动效影响其他页面。
  onBeforeUnmount(() => {
    clearHighlight()
    cancelEntrances()
    motion?.removeEventListener('change', preferenceChanged)
    root.value?.removeEventListener('pointermove', movePointer)
    root.value?.removeEventListener('pointerleave', clearHighlight)
    window.removeEventListener('scroll', clearHighlight, true)
    window.removeEventListener('blur', preferenceChanged)
  })
}
