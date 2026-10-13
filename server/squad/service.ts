import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  isSquadFeed,
  recentSquadMatches,
  type SquadFeed,
  type SquadSource,
  type PlayerPerformance,
} from '../../src/data/squad.ts'
import type { FootballService } from '../football/service.ts'
import {
  combineRoster,
  parseBootstrap,
  parseHistory,
  fplMetrics,
  uefaMetrics,
  type FplBootstrap,
  type UefaRosterPlayer,
} from './adapters.ts'

export const FPL_API = 'https://fantasy.premierleague.com/api/'
export const UEFA_SQUAD = 'https://www.uefa.com/uefachampionsleague/clubs/52280--arsenal/squad/'
export const UEFA_PLAYER_STATS = 'https://matchstats.uefa.com/v2/player-statistics/'
interface Options {
  football: FootballService
  cacheDir?: string
  fetcher?: typeof fetch
  clock?: () => number
  timeoutMs?: number
}
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (value: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++
        results[i] = await fn(items[i]!)
      }
    }),
  )
  return results
}
export function createSquadService(options: Options) {
  const season = options.football.season
  const fetcher = options.fetcher ?? fetch
  const clock = options.clock ?? Date.now
  const file = resolve(options.cacheDir ?? '.cache/football', `arsenal-squad-${season}.json`)
  let feed: SquadFeed | undefined
  let pending: Promise<SquadFeed> | undefined
  let diskLoad: Promise<void> | undefined
  let nextCheck = 0
  async function request(url: string): Promise<unknown> {
    const response = await fetcher(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'MATCHDAY/1.0' },
      signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
    })
    if (!response.ok) throw new Error(`官方服务返回 HTTP ${response.status}`)
    return response.json()
  }
  async function refresh(): Promise<SquadFeed> {
    const checkedAt = new Date(clock()).toISOString()
    const sources: SquadSource[] = []
    function source(id: SquadSource['id'], label: string, url: string, error?: string) {
      const previous = feed?.sources.find((s) => s.id === id)
      sources.push({
        id,
        label,
        url,
        state: error ? (previous?.updatedAt ? 'stale' : 'error') : 'success',
        updatedAt: error ? (previous?.updatedAt ?? null) : checkedAt,
        message: error ?? '',
      })
    }
    const [football, bootstrapResult] = await Promise.all([
      options.football.getFeed(),
      request(`${FPL_API}bootstrap-static/`)
        .then((v) => parseBootstrap(v, season))
        .then((value) => ({ value, error: '' }))
        .catch((e: Error) => ({ value: null, error: e.message })),
    ])
    source('fpl', '英超 FPL 球员', `${FPL_API}bootstrap-static/`, bootstrapResult.error)
    source(
      'roster',
      'UEFA 名单本地缓存',
      UEFA_SQUAD,
      '项目规则禁止网页抓取，名单仅使用已有本地缓存',
    )
    const bootstrap: FplBootstrap | null = bootstrapResult.value
    const oldRoster: UefaRosterPlayer[] =
      feed?.players
        .filter((p) => p.uefaId)
        .map((p) => ({
          id: p.uefaId!,
          name: p.name,
          number: p.number,
          position: p.position,
          image: p.image,
          url: p.profileUrl,
        })) ?? []
    const roster = oldRoster
    const players = bootstrap
      ? combineRoster(bootstrap, roster)
      : (feed?.players ?? combineRoster(null, roster))
    const matches = [
      ...recentSquadMatches(football.matches, 'pl'),
      ...recentSquadMatches(football.matches, 'ucl'),
    ]
    const performances: PlayerPerformance[] = []
    const plMatches = matches.filter((m) => m.league === 'pl')
    const uclMatches = matches.filter((m) => m.league === 'ucl')
    let plError = bootstrapResult.error
    let plFailedAll = !bootstrap
    const failedPlPlayers = new Set<string>()
    const failedUclMatches = new Set<string>()
    if (bootstrap && plMatches.length) {
      try {
        const fixtures = (await request(`${FPL_API}fixtures/`)) as {
          id: number
          code: number
          team_h: number
          team_a: number
          team_h_score: number | null
          team_a_score: number | null
        }[]
        if (
          !Array.isArray(fixtures) ||
          fixtures.some((f) => !Number.isInteger(f.id) || !Number.isInteger(f.code))
        )
          throw new Error('FPL 赛程映射格式变更')
        const team = bootstrap.teams.find((t) => t.short_name === 'ARS')!.id
        const mapping = new Map(
          plMatches.map((m) => {
            const fixture = fixtures.find(
              (f) => String(f.code) === m.id.slice(3) && (f.team_h === team || f.team_a === team),
            )
            if (!fixture) throw new Error('部分英超比赛尚未映射至 FPL')
            return [m.id, fixture.id]
          }),
        )
        const results = await mapLimit(
          players.filter((p) => p.fplId !== null),
          4,
          async (player) => {
            try {
              const history = parseHistory(
                await request(`${FPL_API}element-summary/${player.fplId}/`),
                player.fplId!,
              )
              const rows: PlayerPerformance[] = []
              for (const match of plMatches) {
                const row = history.find((r) => r.fixture === mapping.get(match.id))
                if (row)
                  rows.push({ playerId: player.id, matchId: match.id, metrics: fplMetrics(row) })
              }
              return { rows, error: '' }
            } catch (e) {
              failedPlPlayers.add(player.id)
              return {
                rows: [] as PlayerPerformance[],
                error: e instanceof Error ? e.message : '球员同步失败',
              }
            }
          },
        )
        performances.push(...results.flatMap((r) => r.rows))
        const failed = results.filter((r) => r.error).length
        if (failed) plError = `${failed} 名球员同步失败，保留可用缓存`
      } catch (e) {
        plFailedAll = true
        plError = e instanceof Error ? e.message : '英超球员数据暂不可用'
      }
    }
    const plFixtureSource = football.sources.find((s) => s.league === 'pl')
    source(
      'pl',
      '英超逐场统计',
      `${FPL_API}fixtures/`,
      plError ||
        (plFixtureSource?.state !== 'success' ? '赛程来源暂不可用，统计范围基于最近成功赛程' : ''),
    )
    const uclResults = await mapLimit(uclMatches, 2, async (match) => {
      try {
        const stats = uefaMetrics(await request(`${UEFA_PLAYER_STATS}${match.id.slice(4)}`))
        return {
          rows: players.flatMap((player) => {
            const metrics = player.uefaId ? stats.get(player.uefaId) : undefined
            return metrics ? [{ playerId: player.id, matchId: match.id, metrics }] : []
          }),
          error: '',
        }
      } catch (e) {
        failedUclMatches.add(match.id)
        return {
          rows: [] as PlayerPerformance[],
          error: e instanceof Error ? e.message : '欧冠球员数据暂不可用',
        }
      }
    })
    performances.push(...uclResults.flatMap((r) => r.rows))
    const uclFailures = uclResults.filter((r) => r.error).length
    const uclFixtureSource = football.sources.find((s) => s.league === 'ucl')
    source(
      'ucl',
      'UEFA 逐场统计',
      `${UEFA_PLAYER_STATS}${uclMatches[0]?.id.slice(4) ?? ''}`,
      uclFailures
        ? `${uclFailures} 场欧冠数据暂不可用，保留可用缓存`
        : uclMatches.length && !players.some((p) => p.uefaId)
          ? '缺少本地 UEFA 球员名单，无法关联欧冠统计；网页抓取已禁用'
          : uclFixtureSource?.state !== 'success'
            ? '赛程来源暂不可用，统计范围基于最近成功赛程'
            : '',
    )
    for (const previous of feed?.performances ?? []) {
      if (
        (previous.matchId.startsWith('pl-')
          ? plFailedAll || failedPlPlayers.has(previous.playerId)
          : failedUclMatches.has(previous.matchId)) &&
        matches.some((m) => m.id === previous.matchId) &&
        players.some((p) => p.id === previous.playerId) &&
        !performances.some(
          (p) => p.matchId === previous.matchId && p.playerId === previous.playerId,
        )
      )
        performances.push(previous)
    }
    const candidate: SquadFeed = {
      version: 1,
      season,
      checkedAt,
      players,
      matches,
      performances,
      sources,
    }
    if (!isSquadFeed(candidate)) throw new Error('球员数据校验失败')
    feed = candidate
    nextCheck =
      clock() + (sources.some((s) => s.id !== 'roster' && s.state !== 'success') ? 60_000 : 600_000)
    try {
      await mkdir(resolve(file, '..'), { recursive: true })
      await writeFile(`${file}.tmp`, JSON.stringify(candidate), 'utf8')
      await rename(`${file}.tmp`, file)
    } catch {
      /* A read-only cache must not prevent live statistics. */
    }
    return candidate
  }
  return {
    async getFeed(force = false): Promise<SquadFeed> {
      diskLoad ??= (async () => {
        try {
          const cached: unknown = JSON.parse(await readFile(file, 'utf8'))
          if (isSquadFeed(cached) && cached.season === season) {
            feed = cached
            nextCheck =
              Date.parse(cached.checkedAt) +
              (cached.sources.every((s) => s.id === 'roster' || s.state === 'success')
                ? 600_000
                : 60_000)
          }
        } catch {
          /* Empty cache is normal on the first visit. */
        }
      })()
      await diskLoad
      if (pending) return pending
      if (feed && !force && clock() < nextCheck) return feed
      pending = refresh().finally(() => {
        pending = undefined
      })
      return pending
    },
  }
}
export type SquadService = ReturnType<typeof createSquadService>
