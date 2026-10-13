import type { Position } from './squad.ts'

export type FormationId = '433' | '3421' | '532' | '4231' | '442'
export interface LineupSlot {
  id: string
  label: string
  role: Position
  x: number
  y: number
}
export interface Formation {
  id: FormationId
  label: string
  description: string
  slots: LineupSlot[]
}
const slot = (id: string, label: string, role: Position, x: number, y: number): LineupSlot => ({
  id,
  label,
  role,
  x,
  y,
})
const keeper = slot('gk', '门将', 'GK', 50, 89)
const backFour = [
  slot('lb', '左后卫', 'DEF', 16, 68),
  slot('lcb', '左中卫', 'DEF', 39, 72),
  slot('rcb', '右中卫', 'DEF', 61, 72),
  slot('rb', '右后卫', 'DEF', 84, 68),
]
const backThree = [
  slot('lcb', '左中卫', 'DEF', 24, 71),
  slot('cb', '中卫', 'DEF', 50, 74),
  slot('rcb', '右中卫', 'DEF', 76, 71),
]
export const formations: Formation[] = [
  {
    id: '433',
    label: '4–3–3',
    description: '边路展开 · 三中场连接',
    slots: [
      keeper,
      ...backFour,
      slot('lcm', '左中场', 'MID', 25, 45),
      slot('cm', '中场', 'MID', 50, 49),
      slot('rcm', '右中场', 'MID', 75, 45),
      slot('lw', '左边锋', 'FWD', 21, 20),
      slot('st', '中锋', 'FWD', 50, 15),
      slot('rw', '右边锋', 'FWD', 79, 20),
    ],
  },
  {
    id: '3421',
    label: '3–4–2–1',
    description: '双前腰策应 · 翼卫覆盖',
    slots: [
      keeper,
      ...backThree,
      slot('lwb', '左翼卫', 'MID', 13, 49),
      slot('lcm', '左中场', 'MID', 38, 52),
      slot('rcm', '右中场', 'MID', 62, 52),
      slot('rwb', '右翼卫', 'MID', 87, 49),
      slot('lam', '左前腰', 'MID', 34, 31),
      slot('ram', '右前腰', 'MID', 66, 31),
      slot('st', '中锋', 'FWD', 50, 12),
    ],
  },
  {
    id: '532',
    label: '5–3–2',
    description: '五后卫保护 · 双前锋搭档',
    slots: [
      keeper,
      slot('lwb', '左翼卫', 'DEF', 12, 63),
      slot('lcb', '左中卫', 'DEF', 31, 73),
      slot('cb', '中卫', 'DEF', 50, 76),
      slot('rcb', '右中卫', 'DEF', 69, 73),
      slot('rwb', '右翼卫', 'DEF', 88, 63),
      slot('lcm', '左中场', 'MID', 24, 43),
      slot('cm', '中场', 'MID', 50, 48),
      slot('rcm', '右中场', 'MID', 76, 43),
      slot('lst', '左前锋', 'FWD', 35, 18),
      slot('rst', '右前锋', 'FWD', 65, 18),
    ],
  },
  {
    id: '4231',
    label: '4–2–3–1',
    description: '双后腰支撑 · 前腰组织',
    slots: [
      keeper,
      ...backFour,
      slot('lcm', '左后腰', 'MID', 35, 50),
      slot('rcm', '右后腰', 'MID', 65, 50),
      slot('lw', '左边锋', 'FWD', 19, 29),
      slot('am', '前腰', 'MID', 50, 30),
      slot('rw', '右边锋', 'FWD', 81, 29),
      slot('st', '中锋', 'FWD', 50, 11),
    ],
  },
  {
    id: '442',
    label: '4–4–2',
    description: '平行中场 · 双前锋配合',
    slots: [
      keeper,
      ...backFour,
      slot('lm', '左中场', 'MID', 16, 43),
      slot('lcm', '左中场中路', 'MID', 39, 48),
      slot('rcm', '右中场中路', 'MID', 61, 48),
      slot('rm', '右中场', 'MID', 84, 43),
      slot('lst', '左前锋', 'FWD', 35, 18),
      slot('rst', '右前锋', 'FWD', 65, 18),
    ],
  },
]
export interface LineupDraft {
  version: 1
  formation: FormationId
  assignments: Record<string, string>
}
export const emptyLineup = (formation: FormationId = '433'): LineupDraft => ({
  version: 1,
  formation,
  assignments: {},
})
export const getFormation = (id: FormationId): Formation => formations.find((f) => f.id === id)!

export function readLineup(value: unknown): LineupDraft | null {
  if (!value || typeof value !== 'object') return null
  const draft = value as Partial<LineupDraft>
  const template = formations.find((f) => f.id === draft.formation)
  if (
    draft.version !== 1 ||
    !template ||
    !draft.assignments ||
    typeof draft.assignments !== 'object' ||
    Array.isArray(draft.assignments)
  )
    return null
  const entries = Object.entries(draft.assignments)
  if (
    entries.some(
      ([id, player]) =>
        !template.slots.some((s) => s.id === id) ||
        typeof player !== 'string' ||
        !player.trim() ||
        player.length > 100,
    ) ||
    new Set(entries.map(([, player]) => player)).size !== entries.length
  )
    return null
  return { version: 1, formation: template.id, assignments: Object.fromEntries(entries) }
}

// A player already on the pitch exchanges places with the target occupant.
export function placePlayer(draft: LineupDraft, player: string, target: string): LineupDraft {
  if (!player || !getFormation(draft.formation).slots.some((s) => s.id === target)) return draft
  const assignments = { ...draft.assignments }
  const origin = Object.keys(assignments).find((id) => assignments[id] === player)
  if (origin === target) return draft
  const displaced = assignments[target]
  if (origin) {
    delete assignments[origin]
    if (displaced) assignments[origin] = displaced
  }
  assignments[target] = player
  return { ...draft, assignments }
}
export function removePlayer(draft: LineupDraft, player: string): LineupDraft {
  return {
    ...draft,
    assignments: Object.fromEntries(
      Object.entries(draft.assignments).filter(([, id]) => id !== player),
    ),
  }
}
export function changeFormation(draft: LineupDraft, formation: FormationId): LineupDraft {
  if (draft.formation === formation) return draft
  const previous = getFormation(draft.formation)
  const next = getFormation(formation)
  const assignments: Record<string, string> = {}
  const remaining: [LineupSlot, string][] = []
  for (const origin of previous.slots) {
    const player = draft.assignments[origin.id]
    if (!player) continue
    if (next.slots.some((s) => s.id === origin.id)) assignments[origin.id] = player
    else remaining.push([origin, player])
  }
  for (const [origin, player] of remaining) {
    const nearest = next.slots
      .filter((s) => !assignments[s.id])
      .sort(
        (a, b) =>
          (a.role === origin.role ? 0 : 200) +
          Math.hypot(a.x - origin.x, a.y - origin.y) -
          ((b.role === origin.role ? 0 : 200) + Math.hypot(b.x - origin.x, b.y - origin.y)),
      )[0]
    if (nearest) assignments[nearest.id] = player
  }
  return { version: 1, formation, assignments }
}
