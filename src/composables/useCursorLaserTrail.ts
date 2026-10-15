import { onMounted, onScopeDispose, type ShallowRef } from 'vue'

interface TrailPoint {
  x: number
  y: number
  born: number
  hue: number
  startsStroke: boolean
}

const LIFETIME = 800
const MAX_POINTS = 256

export function useCursorLaserTrail(canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>) {
  let cleanup: (() => void) | undefined

  onMounted(() => {
    const target = canvas.value
    const drawing = target?.getContext('2d')
    if (!target || !drawing) return
    const element = target
    const context = drawing

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let points: TrailPoint[] = []
    let frame = 0
    let width = 0
    let height = 0
    let pixelRatio = 1
    let distance = 0
    let startsStroke = true

    function clear() {
      window.cancelAnimationFrame(frame)
      frame = 0
      points = []
      startsStroke = true
      context.clearRect(0, 0, width, height)
    }

    function resize() {
      clear()
      width = window.innerWidth
      height = window.innerHeight
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      element.width = Math.round(width * pixelRatio)
      element.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    function draw(now: number) {
      frame = 0
      points = points.filter((point) => now - point.born < LIFETIME)
      context.clearRect(0, 0, width, height)
      if (!points.length) return

      const ctx = context
      const dark = document.documentElement.dataset.matchdayTheme === 'dark'
      const reduced = preference.matches
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      for (let index = 1; index < points.length; index++) {
        const previous = points[index - 1]!
        const point = points[index]!
        if (point.startsStroke) continue
        const before = points[index - 2]
        const start =
          before && !previous.startsStroke
            ? { x: (before.x + previous.x) / 2, y: (before.y + previous.y) / 2 }
            : previous
        const end = { x: (previous.x + point.x) / 2, y: (previous.y + point.y) / 2 }
        const life = Math.pow(Math.max(0, 1 - (now - point.born) / LIFETIME), 1.35)
        const lightness = dark ? 66 : 46
        const color = `hsl(${point.hue} 100% ${lightness}%)`
        const gradient = ctx.createLinearGradient(previous.x, previous.y, point.x, point.y)
        gradient.addColorStop(0, `hsl(${previous.hue} 100% ${lightness}%)`)
        gradient.addColorStop(1, color)

        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.quadraticCurveTo(previous.x, previous.y, end.x, end.y)
        if (!points[index + 1] || points[index + 1]!.startsStroke) ctx.lineTo(point.x, point.y)

        // The colored halo and fine luminous core share one continuous curve.
        ctx.globalAlpha = life * (reduced ? 0.65 : 0.9)
        ctx.strokeStyle = gradient
        ctx.lineWidth = (reduced ? 1.7 : 2.8) * (0.2 + life * 0.8)
        ctx.shadowColor = color
        ctx.shadowBlur = (reduced ? 4 : 12) * life
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.globalAlpha = life * 0.78
        ctx.lineWidth = 0.65 * life
        ctx.strokeStyle = `hsl(${point.hue} 100% ${dark ? 91 : 75}%)`
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      frame = window.requestAnimationFrame(draw)
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerType !== 'mouse' || document.visibilityState !== 'visible') return
      if (Math.min(window.devicePixelRatio || 1, 2) !== pixelRatio) resize()
      const now = performance.now()
      const previous = points.at(-1)
      const step = previous ? Math.hypot(event.clientX - previous.x, event.clientY - previous.y) : 0
      if (previous && step < 1) return
      const newStroke = startsStroke || !previous || now - previous.born > 180
      distance += newStroke ? 0 : step
      const point: TrailPoint = {
        x: event.clientX,
        y: event.clientY,
        born: now,
        hue: (195 + distance * 0.38 + now * 0.025) % 360,
        startsStroke: newStroke,
      }
      // Limit sampling on fast mice, while retaining the latest cursor position.
      if (previous && !newStroke && now - previous.born < 8 && points.length > 1) {
        point.born = previous.born
        point.startsStroke = previous.startsStroke
        points[points.length - 1] = point
      } else {
        points.push(point)
        if (points.length > MAX_POINTS) points.shift()
      }
      startsStroke = false
      if (!frame) frame = window.requestAnimationFrame(draw)
    }

    function onPointerOut(event: PointerEvent) {
      if (!event.relatedTarget) startsStroke = true
    }

    resize()
    window.addEventListener('pointermove', onPointerMove, { passive: true, capture: true })
    window.addEventListener('pointerout', onPointerOut, { passive: true })
    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)

    cleanup = () => {
      clear()
      window.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('pointerout', onPointerOut)
      window.removeEventListener('resize', resize)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', clear)
    }
  })

  onScopeDispose(() => cleanup?.())
}
