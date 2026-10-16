import type { Match, Team } from './matches.ts'
import { isOfficialMatch, type FootballSource } from './football.ts'
import { isMatchStatistics, type MatchStatistics } from './matchStatistics.ts'
import { isMatchEvents, type MatchEvents } from './matchEvents.ts'

export interface MatchHistorySource extends FootballSource {
  season: number
}
export interface MatchDetails {
  match: Match
  checkedAt: string
  seasons: number[]
  sources: MatchHistorySource[]
  headToHead: Match[]
  homeForm: Match[]
  awayForm: Match[]
  statistics?: MatchStatistics
  timeline?: MatchEvents
}
// These official UEFA identities refer to the same clubs as the PL Opta identities.
const linkedClubs: Record<string, string> = {
  'ucl-team-52683': 'pl-team-7',
  'ucl-team-52682': 'pl-team-1',
  'ucl-team-59324': 'pl-team-4',
  'ucl-team-2601306': 'pl-team-94',
}
export function sameTeam(a: Team, b: Team): boolean {
  return (linkedClubs[a.id] ?? a.id) === (linkedClubs[b.id] ?? b.id)
}
export function formResult(match: Match, team: Team): 'win' | 'draw' | 'loss' | null {
  if (!match.actual || (!sameTeam(match.home, team) && !sameTeam(match.away, team))) return null
  const [home, away] = match.actual
  const difference = sameTeam(match.home, team) ? home - away : away - home
  return difference > 0 ? 'win' : difference < 0 ? 'loss' : 'draw'
}
export function summarizeForm(matches: Match[], team: Team) {
  const results = { win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0, total: 0 }
  for (const match of matches) {
    const result = formResult(match, team)
    if (!result) continue
    results[result]++
    results.total++
    const home = sameTeam(match.home, team)
    results.goalsFor += match.actual![home ? 0 : 1]
    results.goalsAgainst += match.actual![home ? 1 : 0]
  }
  return results
}
export function matchHistory(match: Match, records: Match[], now = Date.now()) {
  const kickoff = Date.parse(match.kickoff)
  const cutoff = Number.isFinite(kickoff) ? Math.min(kickoff, now) : now
  const eligible = [...new Map(records.map((m) => [m.id, m])).values()]
    .filter(
      (m) =>
        m.id !== match.id &&
        m.status === 'finished' &&
        m.actual &&
        Number.isFinite(Date.parse(m.kickoff)) &&
        Date.parse(m.kickoff) < cutoff,
    )
    .sort((a, b) => Date.parse(b.kickoff) - Date.parse(a.kickoff) || a.id.localeCompare(b.id))
  const includes = (m: Match, team: Team) => sameTeam(m.home, team) || sameTeam(m.away, team)
  return {
    headToHead: eligible
      .filter((m) => includes(m, match.home) && includes(m, match.away))
      .slice(0, 5),
    homeForm: eligible.filter((m) => includes(m, match.home)).slice(0, 5),
    awayForm: eligible.filter((m) => includes(m, match.away)).slice(0, 5),
  }
}
export function historyDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}
export function seasonText(season: number): string {
  return `${season}/${String(season + 1).slice(-2)}`
}

export function isMatchDetails(value: unknown): value is MatchDetails {
  if (!value || typeof value !== 'object') return false
  const d = value as MatchDetails
  if (
    !isOfficialMatch(d.match) ||
    (d.timeline !== undefined &&
      (d.match.status !== 'finished' || !isMatchEvents(d.timeline, d.match))) ||
    (d.statistics !== undefined &&
      (d.match.status !== 'finished' || !isMatchStatistics(d.statistics, d.match))) ||
    !Number.isFinite(Date.parse(d.checkedAt)) ||
    !Array.isArray(d.seasons) ||
    d.seasons.length < 1 ||
    d.seasons.length > 4 ||
    !d.seasons.every(
      (s) => Number.isInteger(s) && s <= d.match.season! && s >= d.match.season! - 3,
    ) ||
    new Set(d.seasons).size !== d.seasons.length ||
    !Array.isArray(d.sources) ||
    d.sources.length !== d.seasons.length * 2
  )
    return false
  if (
    new Set(d.sources.map((s) => `${s?.season}:${s?.league}`)).size !== d.sources.length ||
    !d.sources.every(
      (s) =>
        s &&
        d.seasons.includes(s.season) &&
        ['pl', 'ucl'].includes(s.league) &&
        ['success', 'stale', 'error'].includes(s.state) &&
        typeof s.message === 'string' &&
        (s.updatedAt === null || Number.isFinite(Date.parse(s.updatedAt))),
    )
  )
    return false
  const includes = (m: Match, team: Team) => sameTeam(m.home, team) || sameTeam(m.away, team)
  return (['headToHead', 'homeForm', 'awayForm'] as const).every((key) => {
    const rows = d[key]
    return (
      Array.isArray(rows) &&
      rows.length <= 5 &&
      new Set(rows.map((m) => m?.id)).size === rows.length &&
      rows.every(
        (m) =>
          isOfficialMatch(m) &&
          d.seasons.includes(m.season!) &&
          m.status === 'finished' &&
          m.actual &&
          m.id !== d.match.id &&
          Date.parse(m.kickoff) <
            Math.min(Date.parse(d.match.kickoff) || Infinity, Date.parse(d.checkedAt)) &&
          (key === 'headToHead'
            ? includes(m, d.match.home) && includes(m, d.match.away)
            : includes(m, key === 'homeForm' ? d.match.home : d.match.away)),
      )
    )
  })
}
