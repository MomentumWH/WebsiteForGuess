import {
  emptyMetrics,
  type SquadPlayer,
  type Metrics,
  type Position,
} from '../../src/data/squad.ts'

export interface FplPlayer {
  id: number
  code: number
  team: number
  first_name: string
  second_name: string
  web_name: string
  element_type: number
  squad_number: number | null
  status: string
  news: string
  removed?: boolean
}
export interface FplBootstrap {
  teams: { id: number; short_name: string; name: string }[]
  elements: FplPlayer[]
  events: { deadline_time: string }[]
}
export function parseBootstrap(value: unknown, season: number): FplBootstrap {
  const b = value as FplBootstrap
  if (!b || !Array.isArray(b.teams) || !Array.isArray(b.elements) || !Array.isArray(b.events))
    throw new Error('英超球员数据格式变更')
  if (
    !b.teams.some((t) => t.short_name === 'ARS') ||
    !b.elements.every(
      (p) =>
        Number.isInteger(p.id) &&
        Number.isInteger(p.code) &&
        typeof p.web_name === 'string' &&
        typeof p.first_name === 'string' &&
        typeof p.second_name === 'string' &&
        [1, 2, 3, 4].includes(p.element_type),
    )
  )
    throw new Error('英超球员字段缺失')
  const first = b.events[0]?.deadline_time
  if (!first || new Date(first).getUTCFullYear() !== season)
    throw new Error('FPL 仅提供当前赛季；与项目赛季不一致')
  return b
}
export interface UefaRosterPlayer {
  id: string
  name: string
  number: number | null
  position: Position
  image: string
  url: string
}
const normalized = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/gi, 'o')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
export function combineRoster(
  bootstrap: FplBootstrap | null,
  roster: UefaRosterPlayer[],
): SquadPlayer[] {
  const team = bootstrap?.teams.find((t) => t.short_name === 'ARS')?.id
  const used = new Set<string>()
  const players: SquadPlayer[] = (
    bootstrap?.elements.filter((p) => p.team === team && !p.removed) ?? []
  ).map((p) => {
    const exact = roster.find(
      (r) =>
        normalized(r.name) === normalized(`${p.first_name} ${p.second_name}`) ||
        normalized(r.name) === normalized(p.web_name) ||
        normalized(r.name) === normalized(`${p.first_name} ${p.second_name.split(' ')[0]}`),
    )
    const candidates = roster.filter(
      (r) =>
        !used.has(r.id) &&
        (normalized(r.name.split(' ')[0]!) === normalized(p.first_name.split(' ')[0]!) ||
          (normalized(r.name.split(' ')[0]!) === 'ben' &&
            normalized(p.first_name) === 'benjamin')) &&
        (normalized(r.name).endsWith(normalized(p.web_name)) ||
          normalized(r.name).endsWith(normalized(p.second_name))),
    )
    const match = exact ?? (candidates.length === 1 ? candidates[0] : undefined)
    if (match) used.add(match.id)
    const states: Record<string, SquadPlayer['status']> = {
      a: 'available',
      d: 'doubtful',
      i: 'injured',
      s: 'unavailable',
      u: 'unavailable',
      n: 'unavailable',
    }
    return {
      id: `fpl-${p.code}`,
      name: match?.name ?? `${p.first_name} ${p.second_name}`,
      shortName: p.web_name,
      position: match?.position ?? (['GK', 'DEF', 'MID', 'FWD'] as const)[p.element_type - 1]!,
      number: match?.number ?? p.squad_number ?? null,
      image: match?.image ?? '',
      status: states[p.status] ?? 'unavailable',
      news: p.news ?? '',
      fplId: p.id,
      uefaId: match?.id ?? null,
      profileUrl: match?.url ?? 'https://fantasy.premierleague.com/player-list',
    }
  })
  for (const p of roster.filter((r) => !used.has(r.id)))
    players.push({
      id: `uefa-${p.id}`,
      name: p.name,
      shortName: p.name.split(' ').slice(-1).join(' '),
      position: p.position,
      number: p.number,
      image: p.image,
      status: 'unknown',
      news: '',
      fplId: null,
      uefaId: p.id,
      profileUrl: p.url,
    })
  return players
}
function count(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}
export interface FplHistory {
  fixture: number
  element: number
  minutes: number
  [key: string]: unknown
}
export function parseHistory(value: unknown, playerId: number): FplHistory[] {
  const h = (value as { history?: FplHistory[] })?.history
  if (
    !Array.isArray(h) ||
    h.some(
      (r) => r.element !== playerId || !Number.isInteger(r.fixture) || count(r.minutes) === null,
    )
  )
    throw new Error('英超逐场球员数据格式变更')
  return h
}
export function fplMetrics(row: FplHistory): Metrics {
  return {
    ...emptyMetrics(),
    appearances: row.minutes > 0 ? 1 : 0,
    minutes: count(row.minutes),
    goals: count(row.goals_scored),
    assists: count(row.assists),
    saves: count(row.saves),
    tackles: count(row.tackles),
    recoveries: count(row.recoveries),
    cbi: count(row.clearances_blocks_interceptions),
  }
}
export function uefaMetrics(payload: unknown): Map<string, Metrics> {
  const rows = payload as {
    playerId: string
    teamId: string
    statistics: { name: string; value: string }[]
  }[]
  if (
    !Array.isArray(rows) ||
    rows.some((r) => !r.playerId || !r.teamId || !Array.isArray(r.statistics))
  )
    throw new Error('UEFA 逐场球员数据格式变更')
  const arsenal = rows.filter((r) => r.teamId === '52280')
  if (!arsenal.length) throw new Error('UEFA 逐场数据不含阿森纳')
  return new Map(
    arsenal.map((row) => {
      const stats = Object.fromEntries(row.statistics.map((s) => [s.name, s.value]))
      return [
        row.playerId,
        {
          ...emptyMetrics(),
          appearances: count(stats.matches_appearance),
          minutes: count(stats.minutes_played_official),
          goals: count(stats.goals),
          assists: count(stats.assists),
          clearances: count(stats.clearance_completed),
          saves: count(stats.saves),
          tackles: count(stats.tackles),
          recoveries: count(stats.recovered_ball),
        },
      ]
    }),
  )
}
