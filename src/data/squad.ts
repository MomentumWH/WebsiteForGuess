import type { Match, League } from './matches.ts'

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD'
export const positions: { id: Position; label: string; english: string }[] = [
  { id: 'GK', label: '门将', english: 'GOALKEEPERS' },
  { id: 'DEF', label: '后卫', english: 'DEFENDERS' },
  { id: 'MID', label: '中场', english: 'MIDFIELDERS' },
  { id: 'FWD', label: '前锋', english: 'FORWARDS' },
]
export const metricLabels = {
  appearances: '出场',
  minutes: '时间',
  goals: '进球',
  assists: '助攻',
  interceptions: '拦截',
  clearances: '解围',
  saves: '扑救',
  tackles: '抢断',
  recoveries: '夺回球权',
  cbi: '解围 / 封堵 / 拦截',
} as const
export type Metric = keyof typeof metricLabels
export type Metrics = Record<Metric, number | null>
export const emptyMetrics = (): Metrics =>
  Object.fromEntries(Object.keys(metricLabels).map((k) => [k, null])) as Metrics
export interface SquadPlayer {
  id: string
  name: string
  shortName: string
  position: Position
  number: number | null
  image: string
  status: 'available' | 'doubtful' | 'injured' | 'unavailable' | 'unknown'
  news: string
  fplId: number | null
  uefaId: string | null
  profileUrl: string
}
export interface PlayerPerformance {
  playerId: string
  matchId: string
  metrics: Metrics
}
export interface SquadSource {
  id: 'fpl' | 'roster' | 'pl' | 'ucl'
  label: string
  url: string
  state: 'success' | 'stale' | 'error'
  updatedAt: string | null
  message: string
}
export interface SquadFeed {
  version: 1
  season: number
  checkedAt: string
  players: SquadPlayer[]
  matches: Match[]
  performances: PlayerPerformance[]
  sources: SquadSource[]
}
export function recentSquadMatches(matches: Match[], league: League): Match[] {
  return matches
    .filter(
      (m) =>
        m.status === 'finished' &&
        m.actual &&
        [m.home.id, m.away.id].includes('arsenal') &&
        (league === 'all' || m.league === league),
    )
    .sort((a, b) => Date.parse(b.kickoff) - Date.parse(a.kickoff))
    .slice(0, 5)
}
export interface PlayerSummary {
  player: SquadPlayer
  metrics: Metrics
  coverage: Record<Metric, number>
  covered: number
  sample: number
}
export function summarizePlayer(
  player: SquadPlayer,
  matches: Match[],
  performances: PlayerPerformance[],
): PlayerSummary {
  const rows = matches.map((m) =>
    performances.find((p) => p.playerId === player.id && p.matchId === m.id),
  )
  const metrics = emptyMetrics()
  const coverage = {} as Record<Metric, number>
  for (const key of Object.keys(metricLabels) as Metric[]) {
    const values = rows
      .map((r) => r?.metrics[key])
      .filter((v): v is number => typeof v === 'number')
    coverage[key] = values.length
    metrics[key] = values.length ? values.reduce((a, b) => a + b, 0) : null
  }
  // FPL fantasy assists and UEFA assists have different rules; never silently add them.
  if (new Set(matches.map((m) => m.league)).size > 1) {
    metrics.assists = null
    coverage.assists = 0
  }
  return {
    player,
    metrics,
    coverage,
    covered: rows.filter((r) => r?.metrics.minutes !== null && r?.metrics.minutes !== undefined)
      .length,
    sample: matches.length,
  }
}
export function metricText(summary: PlayerSummary, key: Metric): string {
  const value = summary.metrics[key]
  return value === null ? '—' : `${value}${summary.coverage[key] < summary.sample ? '*' : ''}`
}
export function recommendLineup(
  players: PlayerSummary[],
  formation: '433' | '4231',
): PlayerSummary[][] {
  const ranked = (position: Position) =>
    players
      .filter((p) => p.player.position === position)
      .sort(
        (a, b) =>
          (b.metrics.minutes ?? -1) - (a.metrics.minutes ?? -1) ||
          (b.metrics.goals ?? 0) - (a.metrics.goals ?? 0) ||
          a.player.id.localeCompare(b.player.id),
      )
  // A positional reference based on recent minutes, never an official starting XI.
  return formation === '433'
    ? [
        ranked('FWD').slice(0, 3),
        ranked('MID').slice(0, 3),
        ranked('DEF').slice(0, 4),
        ranked('GK').slice(0, 1),
      ]
    : [
        ranked('FWD').slice(0, 1),
        ranked('MID').slice(0, 3),
        ranked('MID').slice(3, 5),
        ranked('DEF').slice(0, 4),
        ranked('GK').slice(0, 1),
      ]
}
export function isSquadFeed(value: unknown): value is SquadFeed {
  if (!value || typeof value !== 'object') return false
  const f = value as SquadFeed
  const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v))
  return (
    f.version === 1 &&
    Number.isInteger(f.season) &&
    date(f.checkedAt) &&
    Array.isArray(f.players) &&
    f.players.every(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.shortName === 'string' &&
        positions.some((x) => x.id === p.position) &&
        (p.number === null || Number.isInteger(p.number)) &&
        typeof p.image === 'string' &&
        typeof p.profileUrl === 'string' &&
        typeof p.news === 'string' &&
        ['available', 'doubtful', 'injured', 'unavailable', 'unknown'].includes(p.status) &&
        (p.fplId === null || Number.isInteger(p.fplId)) &&
        (p.uefaId === null || typeof p.uefaId === 'string'),
    ) &&
    Array.isArray(f.matches) &&
    f.matches.every(
      (m) =>
        m &&
        typeof m.id === 'string' &&
        ['pl', 'ucl'].includes(m.league) &&
        m.status === 'finished' &&
        date(m.kickoff) &&
        m.home?.id &&
        m.away?.id &&
        Array.isArray(m.actual) &&
        m.actual.length === 2 &&
        m.actual.every((v) => Number.isInteger(v) && v >= 0),
    ) &&
    Array.isArray(f.performances) &&
    f.performances.every(
      (p) =>
        p &&
        f.players.some((x) => x.id === p.playerId) &&
        f.matches.some((x) => x.id === p.matchId) &&
        p.metrics &&
        Object.keys(metricLabels).every(
          (k) =>
            p.metrics[k as Metric] === null ||
            (Number.isFinite(p.metrics[k as Metric]) && p.metrics[k as Metric]! >= 0),
        ),
    ) &&
    Array.isArray(f.sources) &&
    f.sources.length === 4 &&
    new Set(f.sources.map((s) => s.id)).size === 4 &&
    f.sources.every(
      (s) =>
        ['fpl', 'roster', 'pl', 'ucl'].includes(s.id) &&
        ['success', 'stale', 'error'].includes(s.state) &&
        typeof s.label === 'string' &&
        typeof s.url === 'string' &&
        typeof s.message === 'string' &&
        (s.updatedAt === null || date(s.updatedAt)),
    )
  )
}
