import { fileCache } from './cache.ts'
import { resolve } from 'node:path'
import { isMatchEvents, type MatchEvents, type MatchEvent } from '../../src/data/matchEvents.ts'
import type { Match } from '../../src/data/matches.ts'
import { normalizePlEvents, normalizeUefaEvents } from './eventAdapters.ts'
import type { ServiceOptions } from './service.ts'

export function eventsUrl(match: Match): string {
  if (!new RegExp(`^${match.league}-\\d+$`).test(match.id)) throw new Error('比赛编号无效')
  const id = match.id.slice(match.id.indexOf('-') + 1)
  return match.league === 'pl'
    ? `https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches/${id}/commentary?lang=en&_limit=100`
    : `https://match.uefa.com/v5/matches/${id}/events?filter=ALL&limit=500&offset=0&order=ASC`
}
export async function fetchMatchEvents(
  match: Match,
  fetcher: typeof fetch,
  signal: AbortSignal,
): Promise<MatchEvent[]> {
  const url = eventsUrl(match)
  const get = async (address: string): Promise<unknown> => {
    const response = await fetcher(address, {
      headers: { Accept: 'application/json', 'User-Agent': 'MATCHDAY/1.0' },
      signal,
    })
    if (!response.ok) throw new Error(`官方赛况接口返回 HTTP ${response.status}`)
    return response.json()
  }
  const paginate = async (): Promise<unknown[]> => {
    const all: unknown[] = [],
      cursors = new Set<string>(),
      signatures = new Set<string>()
    let address = url
    for (let page = 0; page < 12; page++) {
      const value = await get(address)
      if (match.league === 'pl') {
        const v = value as { data?: unknown[]; pagination?: { _next?: unknown } } | null
        if (!v || !Array.isArray(v.data) || !v.pagination || !Object.hasOwn(v.pagination, '_next'))
          throw new Error('英超赛况分页字段不完整')
        const signature = JSON.stringify(v.data)
        if (v.data.length && signatures.has(signature)) throw new Error('英超赛况分页重复')
        signatures.add(signature)
        all.push(...v.data)
        const next = v.pagination._next
        if (next === null) return all
        if (typeof next !== 'string' || !next || cursors.has(next) || !v.data.length)
          throw new Error('英超赛况分页游标异常')
        cursors.add(next)
        const nextUrl = new URL(url)
        nextUrl.searchParams.set('_next', next)
        address = nextUrl.href
      } else {
        if (!Array.isArray(value)) throw new Error('欧冠赛况分页字段不完整')
        const signature = JSON.stringify(value)
        if (value.length && signatures.has(signature)) throw new Error('欧冠赛况分页重复')
        signatures.add(signature)
        all.push(...value)
        if (value.length < 500) return all
        const nextUrl = new URL(url)
        nextUrl.searchParams.set('offset', String((page + 1) * 500))
        address = nextUrl.href
      }
    }
    throw new Error('赛况分页超出范围，请稍后重试')
  }
  // Fetch names/confirmed goals concurrently with the event pages.
  const metadataUrl =
    match.league === 'pl' ? url.split('/commentary')[0] + '/lineups' : url.split('/events')[0]!
  const [rows, metadata] = await Promise.all([paginate(), get(metadataUrl)])
  return match.league === 'pl'
    ? normalizePlEvents(rows, metadata, match)
    : normalizeUefaEvents(rows, metadata, match)
}
function complete(events: MatchEvent[], match: Match): boolean {
  if (
    !events.length ||
    events.some(
      (e) =>
        e.minute === null || (e.type === 'substitution' ? !e.playerIn || !e.playerOut : !e.player),
    )
  )
    return false
  const expected = match.finalScore ?? match.actual
  if (!expected) return false
  const goals = events.filter((e) => e.type === 'goal')
  return (
    goals.filter((e) => e.teamId === match.home.id).length === expected[0] &&
    goals.filter((e) => e.teamId === match.away.id).length === expected[1]
  )
}
export function createMatchEventsService(
  options: Omit<ServiceOptions, 'season' | 'maxAgeMs'> = {},
) {
  const clock = options.clock ?? Date.now,
    fetcher = options.fetcher ?? fetch
  const memory = new Map<string, { data: MatchEvents; nextCheck: number }>()
  const pending = new Map<string, Promise<MatchEvents>>()
  const ttl = (data: MatchEvents) =>
    data.source.state === 'success' && data.completeness === 'complete' ? 86_400_000 : 60_000
  function remember(key: string, data: MatchEvents, nextCheck: number) {
    memory.delete(key)
    memory.set(key, { data, nextCheck })
    if (memory.size > 64) memory.delete(memory.keys().next().value!)
    return data
  }
  async function load(match: Match, key: string): Promise<MatchEvents> {
    const url = eventsUrl(match)
    const file = resolve(options.cacheDir ?? '.cache/football', `events-${key}-v1.json`)
    let previous = memory.get(key)?.data
    if (previous && !isMatchEvents(previous, match)) previous = undefined
    if (!previous)
      try {
        const cached: unknown = await (options.cache ?? fileCache()).read(file)
        if (isMatchEvents(cached, match)) previous = cached
      } catch {
        /* A missing cache must not prevent an official request. */
      }
    if (
      previous?.source.state === 'success' &&
      previous.source.updatedAt &&
      Date.parse(previous.checkedAt) <= clock()
    ) {
      const until = Date.parse(previous.source.updatedAt) + ttl(previous)
      if (until > clock()) return remember(key, previous, until)
    }
    const checkedAt = new Date(clock()).toISOString()
    const source = {
      league: match.league,
      label: match.league === 'pl' ? 'Premier League 官方赛况' : 'UEFA 官方赛况',
      url,
    }
    let data: MatchEvents
    try {
      const events = await fetchMatchEvents(
        match,
        fetcher,
        AbortSignal.timeout(options.timeoutMs ?? 12_000),
      )
      const completeness = complete(events, match) ? 'complete' : 'partial'
      data = {
        matchId: match.id,
        season: match.season!,
        homeTeamId: match.home.id,
        awayTeamId: match.away.id,
        checkedAt,
        events,
        completeness,
        source: {
          ...source,
          state: 'success',
          updatedAt: checkedAt,
          message:
            completeness === 'partial'
              ? '部分赛况或球员信息暂未提供，以下仅列出已取得的官方记录。'
              : '',
        },
      }
      if (!isMatchEvents(data, match)) throw new Error('官方赛况校验失败')
      // Incomplete refreshes cannot overwrite a previously complete timeline.
      if (
        completeness === 'partial' &&
        previous?.completeness === 'complete' &&
        previous.events.length
      )
        throw new Error('本次官方赛况不完整')
      try {
        await (options.cache ?? fileCache()).write(file, data)
      } catch {
        /* Valid memory data remains usable without disk storage. */
      }
    } catch (cause) {
      data = {
        matchId: match.id,
        season: match.season!,
        homeTeamId: match.home.id,
        awayTeamId: match.away.id,
        checkedAt,
        events: previous?.events ?? [],
        completeness: previous?.completeness ?? 'partial',
        source: {
          ...source,
          state: previous?.source.updatedAt ? 'stale' : 'error',
          updatedAt: previous?.source.updatedAt ?? null,
          message:
            cause instanceof Error && !['AbortError', 'TimeoutError'].includes(cause.name)
              ? cause.message
              : '官方赛况同步超时，请稍后重试',
        },
      }
    }
    return remember(key, data, clock() + ttl(data))
  }
  return {
    getEvents(match: Match): Promise<MatchEvents> {
      if (match.status !== 'finished') return Promise.reject(new Error('赛后记录仅用于已完赛场次'))
      const key = `${match.season}-${match.id}`
      const cached = memory.get(key)
      if (cached && isMatchEvents(cached.data, match) && cached.nextCheck > clock())
        return Promise.resolve(cached.data)
      const running = pending.get(key)
      if (running) return running
      const request = load(match, key).finally(() => pending.delete(key))
      pending.set(key, request)
      return request
    },
  }
}
