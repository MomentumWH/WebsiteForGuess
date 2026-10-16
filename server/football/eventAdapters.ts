import type { Match } from '../../src/data/matches.ts'
import type { MatchEvent, EventPlayer } from '../../src/data/matchEvents.ts'
import { londonKickoff } from './adapters.ts'
import { providerTeamId } from './statisticsAdapters.ts'

type Row = Record<string, unknown>
function object(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('官方赛况数据格式变更')
  return value as Row
}
function id(value: unknown): string | null {
  return (typeof value === 'string' || typeof value === 'number') && /^\d+$/.test(String(value))
    ? String(value)
    : null
}
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
function number(value: unknown, max = 180): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max
    ? value
    : null
}
function side(value: unknown, match: Match): string {
  const official = id(value)
  if (official && official === providerTeamId(match.home, match.league)) return match.home.id
  if (official && official === providerTeamId(match.away, match.league)) return match.away.id
  throw new Error('官方赛况球队编号不匹配')
}
function sorted(events: MatchEvent[]): MatchEvent[] {
  return events.sort((a, b) => {
    if (a.timestamp && b.timestamp)
      return Date.parse(a.timestamp) - Date.parse(b.timestamp) || a.id.localeCompare(b.id)
    return (
      (a.minute ?? 181) - (b.minute ?? 181) ||
      (a.addedMinute ?? 0) - (b.addedMinute ?? 0) ||
      (a.second ?? 0) - (b.second ?? 0) ||
      a.id.localeCompare(b.id)
    )
  })
}
export function normalizePlEvents(raw: unknown, lineup: unknown, match: Match): MatchEvent[] {
  if (!Array.isArray(raw) || !Array.isArray(lineup)) throw new Error('英超赛况格式变更')
  const players = new Map<string, { person: EventPlayer; teamId: string }>()
  const teamIds = new Set<string>()
  for (const value of lineup) {
    const row = object(value),
      teamId = side(row.teamId, match)
    if (teamIds.has(teamId) || !Array.isArray(row.players)) throw new Error('英超比赛名单不完整')
    teamIds.add(teamId)
    for (const entry of row.players) {
      const p = object(entry),
        playerId = id(p.id)
      const name =
        text(p.knownName) ?? [text(p.firstName), text(p.lastName)].filter(Boolean).join(' ')
      if (!playerId || !name || players.has(playerId)) throw new Error('英超球员身份字段不完整')
      players.set(playerId, { person: { id: playerId, name }, teamId })
    }
  }
  if (teamIds.size !== 2) throw new Error('英超比赛名单不完整')
  const person = (value: unknown, teamId: string): EventPlayer | null => {
    const p = players.get(id(value) ?? '')
    if (p && p.teamId !== teamId) throw new Error('英超赛况球员与球队不匹配')
    return p?.person ?? null
  }
  const events = new Map<string, MatchEvent>()
  for (const entry of raw) {
    const row = object(entry)
    if (row.type !== 'goal' && row.type !== 'substitution') continue
    const teamId = side(row.team1, match)
    const time =
      typeof row.time === 'string' ? /^(\d{1,3})(?:\+(\d{1,2}))?['′]$/.exec(row.time.trim()) : null
    const minute = time ? number(Number(time[1])) : null
    const addedMinute = time?.[2] ? number(Number(time[2])) : null
    const timestamp =
      typeof row.timestamp === 'string' ? londonKickoff(row.timestamp) || null : null
    // English structured records supply IDs; commentary prose is never rendered or parsed.
    const key = `pl-${String(row.type)}-${timestamp ?? row.time}-${teamId}-${id(row.player1) ?? 'missing'}-${id(row.player2) ?? 'missing'}`
    const base = { id: key, teamId, minute, addedMinute, second: null, timestamp, phase: '' }
    if (row.type === 'substitution')
      events.set(key, {
        ...base,
        type: 'substitution',
        playerIn: person(row.player1, teamId),
        playerOut: person(row.player2, teamId),
      })
    else
      events.set(key, {
        ...base,
        type: 'goal',
        player: person(row.player1, teamId),
        assist: person(row.player2, teamId),
      })
  }
  return sorted([...events.values()])
}
function uefaPerson(value: unknown): EventPlayer | null {
  if (!value || typeof value !== 'object') return null
  const p = value as Row,
    playerId = id(p.id)
  const translations = p.translations as { name?: { ZH?: string } } | undefined
  const name = text(translations?.name?.ZH) ?? text(p.internationalName)
  return playerId && name ? { id: playerId, name } : null
}
export function normalizeUefaEvents(raw: unknown, basic: unknown, match: Match): MatchEvent[] {
  if (!Array.isArray(raw)) throw new Error('欧冠赛况格式变更')
  const metadata = object(basic)
  if (String(metadata.id) !== match.id.slice(4)) throw new Error('欧冠赛况比赛编号不匹配')
  if (
    side(object(metadata.homeTeam).id, match) !== match.home.id ||
    side(object(metadata.awayTeam).id, match) !== match.away.id
  )
    throw new Error('欧冠赛况主客队不匹配')
  const scorers = (metadata.playerEvents as { scorers?: unknown[] } | undefined)?.scorers
  if (scorers !== undefined && !Array.isArray(scorers)) throw new Error('欧冠进球记录格式变更')
  const confirmed = new Map(
    (scorers ?? []).map((value) => {
      const r = object(value)
      return [text(r.id), r]
    }),
  )
  const events = new Map<string, MatchEvent>()
  for (const entry of raw) {
    const row = object(entry)
    if (!['GOAL', 'ASSIST', 'SUBSTITUTION'].includes(String(row.type))) continue
    if (String(row.matchId) !== match.id.slice(4) || !text(row.id))
      throw new Error('欧冠赛况比赛编号不匹配')
    // Shootout attempts do not count as goals in this match timeline.
    if (/SHOOT_?OUT|^PENALTIES$/.test(String(row.phase))) continue
    const actor = object(row.primaryActor),
      other = row.secondaryActor ? object(row.secondaryActor) : null
    const goal = row.type === 'GOAL' ? confirmed.get(String(row.id)) : undefined
    if (row.type === 'GOAL' && !goal) continue
    const teamId = side(goal?.teamId ?? object(actor.team).id, match)
    const time = row.time && typeof row.time === 'object' ? (row.time as Row) : {}
    const timestamp =
      typeof row.timestamp === 'string' && Number.isFinite(Date.parse(row.timestamp))
        ? row.timestamp
        : null
    const base = {
      id: `ucl-${row.id}`,
      teamId,
      minute: number(time.minute),
      addedMinute: number(time.injuryMinute),
      second: number(time.second, 59),
      timestamp,
      phase: text(row.phase) ?? '',
    }
    if (row.type === 'SUBSTITUTION') {
      if (other && side(object(other.team).id, match) !== teamId)
        throw new Error('欧冠换人球队编号不匹配')
      // Verified against the official starting XI: primary leaves, secondary enters.
      events.set(base.id, {
        ...base,
        type: 'substitution',
        playerOut: uefaPerson(actor.person),
        playerIn: uefaPerson(other?.person),
      })
    } else if (row.type === 'ASSIST')
      events.set(base.id, { ...base, type: 'assist', player: uefaPerson(actor.person) })
    else
      events.set(base.id, {
        ...base,
        type: 'goal',
        player: uefaPerson(goal?.player ?? actor.person),
        assist: null,
      })
  }
  return sorted([...events.values()])
}
