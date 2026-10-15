import type { Competition } from '../../src/data/football.ts'
import type { Match } from '../../src/data/matches.ts'
import { normalizePremierLeague, normalizeUefa } from './adapters.ts'

const PAGE_SIZE = 100
const MAX_PAGES = 12

export async function fetchCompetitionMatches(
  league: Competition,
  sourceUrl: string,
  season: number,
  fetcher: typeof fetch,
  timeoutMs: number,
): Promise<Match[]> {
  const url = new URL(sourceUrl)
  const signal = AbortSignal.timeout(timeoutMs)
  const matches = new Map<string, Match>()
  const cursors = new Set<string>()
  for (let index = 0; index < MAX_PAGES; index++) {
    const response = await fetcher(url.href, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'MATCHDAY/1.0',
        Origin: league === 'pl' ? 'https://www.premierleague.com' : 'https://www.uefa.com',
      },
      signal,
    })
    if (!response.ok) throw new Error(`官网接口返回 HTTP ${response.status}`)
    const raw: unknown = await response.json()
    let page: Match[]
    let next: string | null = null
    if (league === 'pl') {
      const payload = raw as { data?: unknown[]; pagination?: { _next?: unknown } } | null
      if (
        !payload ||
        !Array.isArray(payload.data) ||
        !payload.pagination ||
        !(payload.pagination._next === null || typeof payload.pagination._next === 'string')
      )
        throw new Error('英超分页字段缺失，暂不替换已有赛程')
      next = payload.pagination._next || null
      page = normalizePremierLeague({ data: payload.data }, season)
    } else {
      page = normalizeUefa(raw, season)
    }
    if (page.length > PAGE_SIZE) throw new Error('官网分页大小超出预期')
    const previousSize = matches.size
    for (const match of page) matches.set(match.id, match)
    if (page.length && matches.size === previousSize)
      throw new Error('官网分页重复，暂不替换已有赛程')
    if (league === 'pl') {
      if (!next) return [...matches.values()]
      if (!page.length || cursors.has(next)) throw new Error('英超分页游标异常')
      cursors.add(next)
      url.searchParams.set('_next', next)
    } else {
      if (page.length < PAGE_SIZE) return [...matches.values()]
      url.searchParams.set('offset', String((index + 1) * PAGE_SIZE))
    }
  }
  throw new Error('官网分页超出读取上限，暂不替换已有赛程')
}
