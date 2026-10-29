import { fileCache } from './cache.ts'
import { resolve } from 'node:path'
import {
  emptyStatistics,
  isMatchStatistics,
  type MatchStatistics,
} from '../../src/data/matchStatistics.ts'
import type { Match } from '../../src/data/matches.ts'
import { normalizePlStatistics, normalizeUefaStatistics } from './statisticsAdapters.ts'
import type { ServiceOptions } from './service.ts'

export function statisticsUrl(match: Match): string {
  if (!new RegExp(`^${match.league}-\\d+$`).test(match.id)) throw new Error('比赛编号无效')
  const id = match.id.slice(match.id.indexOf('-') + 1)
  return match.league === 'pl'
    ? `https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches/${id}/stats`
    : `https://matchstats.uefa.com/v2/team-statistics/${id}`
}
export function createMatchStatisticsService(
  options: Omit<ServiceOptions, 'season' | 'maxAgeMs'> = {},
) {
  const clock = options.clock ?? Date.now
  const fetcher = options.fetcher ?? fetch
  const memory = new Map<string, { data: MatchStatistics; nextCheck: number }>()
  const pending = new Map<string, Promise<MatchStatistics>>()
  async function load(match: Match, key: string): Promise<MatchStatistics> {
    const url = statisticsUrl(match)
    const file = resolve(options.cacheDir ?? '.cache/football', `statistics-${key}-v1.json`)
    let previous = memory.get(key)?.data
    if (previous && !isMatchStatistics(previous, match)) previous = undefined
    if (!previous) {
      try {
        const cached: unknown = await (options.cache ?? fileCache()).read(file)
        if (isMatchStatistics(cached, match)) previous = cached
      } catch {
        /* A missing cache does not block official data. */
      }
    }
    const freshUntil = previous?.source.updatedAt
      ? Date.parse(previous.source.updatedAt) + 86_400_000
      : 0
    if (
      previous?.source.state === 'success' &&
      Object.values(previous.metrics).some((pair) => pair.some((n) => n !== null)) &&
      freshUntil > clock() &&
      Date.parse(previous.checkedAt) <= clock()
    ) {
      memory.set(key, { data: previous, nextCheck: freshUntil })
      if (memory.size > 64) memory.delete(memory.keys().next().value!)
      return previous
    }
    const checkedAt = new Date(clock()).toISOString()
    const source = {
      league: match.league,
      label: match.league === 'pl' ? 'Premier League 官方技术统计' : 'UEFA 官方技术统计',
      url,
    }
    let data: MatchStatistics
    try {
      const response = await fetcher(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'MATCHDAY/1.0' },
        signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
      })
      if (!response.ok) throw new Error(`官方统计接口返回 HTTP ${response.status}`)
      const raw: unknown = await response.json()
      const metrics =
        match.league === 'pl'
          ? normalizePlStatistics(raw, match)
          : normalizeUefaStatistics(raw, match)
      data = {
        matchId: match.id,
        season: match.season!,
        homeTeamId: match.home.id,
        awayTeamId: match.away.id,
        period: 'full-match',
        checkedAt,
        metrics,
        source: {
          ...source,
          state: 'success',
          updatedAt: checkedAt,
          message: Object.values(metrics).some((pair) => pair.some((n) => n !== null))
            ? ''
            : '本场比赛暂无官方技术统计',
        },
      }
      if (!isMatchStatistics(data, match)) throw new Error('技术统计数据校验失败')
      try {
        await (options.cache ?? fileCache()).write(file, data)
      } catch {
        /* Valid in-memory statistics remain usable without disk storage. */
      }
    } catch (cause) {
      data = {
        matchId: match.id,
        season: match.season!,
        homeTeamId: match.home.id,
        awayTeamId: match.away.id,
        period: 'full-match',
        checkedAt,
        metrics: previous?.metrics ?? emptyStatistics(),
        source: {
          ...source,
          state: previous?.source.updatedAt ? 'stale' : 'error',
          updatedAt: previous?.source.updatedAt ?? null,
          message:
            cause instanceof Error && cause.name !== 'AbortError' && cause.name !== 'TimeoutError'
              ? cause.message
              : '官方技术统计同步超时，请稍后重试',
        },
      }
    }
    memory.delete(key)
    memory.set(key, {
      data,
      nextCheck:
        clock() + (data.source.state === 'success' && !data.source.message ? 86_400_000 : 60_000),
    })
    if (memory.size > 64) memory.delete(memory.keys().next().value!)
    return data
  }
  return {
    getStatistics(match: Match): Promise<MatchStatistics> {
      if (match.status !== 'finished') return Promise.reject(new Error('技术统计仅用于已完赛场次'))
      const key = `${match.season}-${match.id}`
      const cached = memory.get(key)
      if (cached && isMatchStatistics(cached.data, match) && cached.nextCheck > clock())
        return Promise.resolve(cached.data)
      const running = pending.get(key)
      if (running) return running
      const request = load(match, key).finally(() => pending.delete(key))
      pending.set(key, request)
      return request
    },
  }
}
