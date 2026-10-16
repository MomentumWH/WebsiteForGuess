import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { FootballFeed, FootballSource } from '../../src/data/football.ts'
import { isFootballFeed } from '../../src/data/football.ts'
import { fetchCompetitionMatches } from './pagination.ts'

export const PL_API = 'https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches'
export const UEFA_API = 'https://match.uefa.com/v5/matches'
export function currentSeason(now = new Date()): number {
  const [year, month] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
  })
    .format(now)
    .split('-')
    .map(Number)
  return year! - (month! < 7 ? 1 : 0)
}
export function sourceUrls(season: number) {
  return {
    pl: `${PL_API}?${new URLSearchParams({ competition: '8', season: String(season), _limit: '100' })}`,
    ucl: `${UEFA_API}?${new URLSearchParams({ competitionId: '1', seasonYear: String(season + 1), limit: '100', offset: '0', order: 'ASC' })}`,
  }
}
export interface ServiceOptions {
  season?: number
  cacheDir?: string
  fetcher?: typeof fetch
  clock?: () => number
  timeoutMs?: number
  maxAgeMs?: number
}
export function createFootballService(options: ServiceOptions = {}) {
  const season = options.season ?? currentSeason()
  if (!Number.isInteger(season) || season < 1992 || season > 2100)
    throw new Error('FOOTBALL_SEASON 必须为赛季起始年份')
  const urls = sourceUrls(season)
  const fetcher = options.fetcher ?? fetch
  const clock = options.clock ?? Date.now
  const cacheFile = resolve(options.cacheDir ?? '.cache/football', `competitions-${season}-v2.json`)
  let feed: FootballFeed | undefined
  let pending: Promise<FootballFeed> | undefined
  let nextCheck = 0
  let diskLoaded = false
  async function refresh(): Promise<FootballFeed> {
    if (!diskLoaded) {
      diskLoaded = true
      try {
        const cached: unknown = JSON.parse(await readFile(cacheFile, 'utf8'))
        if (isFootballFeed(cached) && cached.season === season) feed = cached
      } catch {
        /* A missing or damaged cache must not prevent fresh data. */
      }
    }
    if (
      feed &&
      options.maxAgeMs &&
      feed.sources.every((s) => s.state === 'success') &&
      clock() - Date.parse(feed.checkedAt) >= 0 &&
      clock() - Date.parse(feed.checkedAt) < options.maxAgeMs
    ) {
      nextCheck = Date.parse(feed.checkedAt) + options.maxAgeMs
      return feed
    }
    const checkedAt = new Date(clock()).toISOString()
    const results = await Promise.all(
      (['pl', 'ucl'] as const).map(async (league) => {
        const previous = feed?.sources.find((s) => s.league === league)
        const base = {
          league,
          label: league === 'pl' ? 'Premier League 官网' : 'UEFA 官网',
          url: urls[league],
        }
        try {
          const matches = await fetchCompetitionMatches(
            league,
            urls[league],
            season,
            fetcher,
            options.timeoutMs ?? 25_000,
          )
          return {
            source: {
              ...base,
              state: 'success',
              updatedAt: checkedAt,
              message: matches.length ? '' : '该赛季暂无已公布的赛事',
            } satisfies FootballSource,
            matches,
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : '官网数据暂时无法获取'
          return {
            source: {
              ...base,
              state: previous?.updatedAt ? 'stale' : 'error',
              updatedAt: previous?.updatedAt ?? null,
              message,
            } satisfies FootballSource,
            matches: feed?.matches.filter((m) => m.league === league) ?? [],
          }
        }
      }),
    )
    const candidate: FootballFeed = {
      scope: 'competitions',
      season,
      checkedAt,
      sources: results.map((r) => r.source),
      matches: results
        .flatMap((r) => r.matches)
        .sort(
          (a, b) =>
            (Date.parse(a.kickoff) || Infinity) - (Date.parse(b.kickoff) || Infinity) ||
            a.id.localeCompare(b.id),
        ),
    }
    if (!isFootballFeed(candidate)) throw new Error('赛程数据校验失败')
    feed = candidate
    nextCheck =
      clock() +
      (feed.sources.some((s) => s.state !== 'success') ||
      feed.matches.some((m) => m.status === 'live')
        ? 60_000
        : (options.maxAgeMs ?? 300_000))
    try {
      await mkdir(resolve(cacheFile, '..'), { recursive: true })
      await writeFile(`${cacheFile}.tmp`, JSON.stringify(feed), 'utf8')
      await rename(`${cacheFile}.tmp`, cacheFile)
    } catch {
      /* Keep the in-memory cache if disk is read-only. */
    }
    return feed
  }
  return {
    season,
    getFeed(): Promise<FootballFeed> {
      if (pending) return pending
      if (feed && clock() < nextCheck) return Promise.resolve(feed)
      pending = refresh().finally(() => {
        pending = undefined
      })
      return pending
    },
  }
}
export type FootballService = ReturnType<typeof createFootballService>
