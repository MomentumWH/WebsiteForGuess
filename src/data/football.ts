import type { Match } from './matches'

export type Competition = 'pl' | 'ucl'
export interface FootballSource {
  league: Competition
  label: string
  url: string
  state: 'success' | 'stale' | 'error'
  updatedAt: string | null
  message: string
}
export interface FootballFeed {
  scope: 'competitions'
  season: number
  checkedAt: string
  sources: FootballSource[]
  matches: Match[]
}
const validDate = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value))
function validTeam(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const team = value as Record<string, unknown>
  return (
    ['id', 'name', 'short', 'color'].every((key) => typeof team[key] === 'string') &&
    (team.badgeUrl === undefined || typeof team.badgeUrl === 'string') &&
    (team.officialId === undefined ||
      (typeof team.officialId === 'string' && /^\d+$/.test(team.officialId)))
  )
}
export function validScore(value: unknown): boolean {
  return (
    Array.isArray(value) && value.length === 2 && value.every((n) => Number.isInteger(n) && n >= 0)
  )
}
export function isOfficialMatch(value: unknown): value is Match {
  if (!value || typeof value !== 'object') return false
  const m = value as Match
  return (
    ['pl', 'ucl'].includes(m.league) &&
    typeof m.id === 'string' &&
    m.id.startsWith(`${m.league}-`) &&
    Number.isInteger(m.season) &&
    m.season! >= 1992 &&
    m.season! <= 2100 &&
    typeof m.round === 'string' &&
    typeof m.venue === 'string' &&
    (m.kickoff === '' || validDate(m.kickoff)) &&
    validTeam(m.home) &&
    validTeam(m.away) &&
    ['upcoming', 'live', 'finished', 'postponed', 'cancelled'].includes(m.status ?? '') &&
    (m.actual === undefined || (m.status === 'finished' && validScore(m.actual))) &&
    (m.liveScore === undefined || validScore(m.liveScore)) &&
    (m.halfTimeScore === undefined || validScore(m.halfTimeScore)) &&
    (m.finalScore === undefined || validScore(m.finalScore)) &&
    (m.attendance === undefined || (Number.isInteger(m.attendance) && m.attendance >= 0))
  )
}
export function isFootballFeed(value: unknown): value is FootballFeed {
  if (!value || typeof value !== 'object') return false
  const feed = value as FootballFeed
  return (
    feed.scope === 'competitions' &&
    Number.isInteger(feed.season) &&
    feed.season >= 1992 &&
    feed.season <= 2100 &&
    validDate(feed.checkedAt) &&
    Array.isArray(feed.sources) &&
    feed.sources.length === 2 &&
    new Set(feed.sources.map((s) => s?.league)).size === 2 &&
    feed.sources.every(
      (s) =>
        s &&
        ['pl', 'ucl'].includes(s.league) &&
        ['success', 'stale', 'error'].includes(s.state) &&
        typeof s.label === 'string' &&
        typeof s.url === 'string' &&
        typeof s.message === 'string' &&
        (s.updatedAt === null || validDate(s.updatedAt)),
    ) &&
    Array.isArray(feed.matches) &&
    new Set(feed.matches.map((m) => m?.id)).size === feed.matches.length &&
    feed.matches.every((m) => isOfficialMatch(m) && m.season === feed.season)
  )
}
