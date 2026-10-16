import type { Match } from './matches.ts'
import type { FootballSource } from './football.ts'

export interface EventPlayer {
  id: string
  name: string
}
interface EventBase {
  id: string
  teamId: string
  minute: number | null
  addedMinute: number | null
  second: number | null
  timestamp: string | null
  phase: string
}
export type MatchEvent = EventBase &
  (
    | { type: 'goal'; player: EventPlayer | null; assist: EventPlayer | null }
    | { type: 'assist'; player: EventPlayer | null }
    | { type: 'substitution'; playerIn: EventPlayer | null; playerOut: EventPlayer | null }
  )
export interface MatchEvents {
  matchId: string
  season: number
  homeTeamId: string
  awayTeamId: string
  checkedAt: string
  source: FootballSource
  completeness: 'complete' | 'partial'
  events: MatchEvent[]
}
const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v))
const player = (v: unknown): boolean => {
  if (v === null) return true
  if (!v || typeof v !== 'object') return false
  const p = v as EventPlayer
  return (
    typeof p.id === 'string' && /^\d+$/.test(p.id) && typeof p.name === 'string' && !!p.name.trim()
  )
}
export function isMatchEvents(value: unknown, match?: Match): value is MatchEvents {
  if (!value || typeof value !== 'object') return false
  const e = value as MatchEvents
  if (
    typeof e.matchId !== 'string' ||
    !/^(pl|ucl)-\d+$/.test(e.matchId) ||
    !Number.isInteger(e.season) ||
    e.season < 1992 ||
    e.season > 2100 ||
    typeof e.homeTeamId !== 'string' ||
    !e.homeTeamId ||
    typeof e.awayTeamId !== 'string' ||
    !e.awayTeamId ||
    e.homeTeamId === e.awayTeamId ||
    !date(e.checkedAt) ||
    !['complete', 'partial'].includes(e.completeness) ||
    !e.source ||
    e.source.league !== e.matchId.split('-')[0] ||
    !['success', 'stale', 'error'].includes(e.source.state) ||
    typeof e.source.label !== 'string' ||
    typeof e.source.url !== 'string' ||
    typeof e.source.message !== 'string' ||
    (e.source.updatedAt !== null && !date(e.source.updatedAt)) ||
    !Array.isArray(e.events) ||
    e.events.length > 1000 ||
    new Set(e.events.map((r) => r?.id)).size !== e.events.length
  )
    return false
  if (
    match &&
    (match.id !== e.matchId ||
      match.season !== e.season ||
      match.home.id !== e.homeTeamId ||
      match.away.id !== e.awayTeamId)
  )
    return false
  return e.events.every((r) => {
    if (
      !r ||
      typeof r.id !== 'string' ||
      !r.id ||
      ![e.homeTeamId, e.awayTeamId].includes(r.teamId) ||
      !['goal', 'assist', 'substitution'].includes(r.type) ||
      typeof r.phase !== 'string' ||
      (r.timestamp !== null && !date(r.timestamp)) ||
      ![r.minute, r.addedMinute, r.second].every(
        (n, i) => n === null || (Number.isInteger(n) && n >= 0 && n <= (i === 2 ? 59 : 180)),
      ) ||
      (r.addedMinute !== null && r.minute === null)
    )
      return false
    return r.type === 'substitution'
      ? player(r.playerIn) &&
          player(r.playerOut) &&
          (!r.playerIn || !r.playerOut || r.playerIn.id !== r.playerOut.id)
      : player(r.player) &&
          (r.type !== 'goal' ||
            (player(r.assist) && (!r.player || !r.assist || r.player.id !== r.assist.id)))
  })
}
export function eventTime(event: Pick<MatchEvent, 'minute' | 'addedMinute'>): string {
  return event.minute === null
    ? '时间待补'
    : `${event.minute}${event.addedMinute ? `+${event.addedMinute}` : ''}′`
}
