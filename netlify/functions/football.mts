import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { basename } from 'node:path'
import { createFootballService } from '../../server/football/service.ts'
import { createMatchDetailsService } from '../../server/football/details.ts'
import { createSquadService } from '../../server/squad/service.ts'
import type { JsonCache } from '../../server/football/cache.ts'

export default async (request: Request): Promise<Response> => {
  const headers = { 'Cache-Control': 'no-store' }
  if (request.method !== 'GET') {
    return Response.json(
      { error: '仅支持 GET 请求' },
      { status: 405, headers: { ...headers, Allow: 'GET' } },
    )
  }
  const path = new URL(request.url).pathname
  const detail = /^\/api\/football\/matches\/(pl-\d+|ucl-\d+)$/.exec(path)
  if (
    !detail &&
    !['/api/football/matches', '/api/football/arsenal', '/api/football/arsenal/squad'].includes(
      path,
    )
  ) {
    return Response.json({ error: '接口不存在' }, { status: 404, headers })
  }
  try {
    const store = getStore('official-football-cache')
    const cache: JsonCache = {
      read: (key) => store.get(basename(key), { type: 'json' }),
      write: async (key, value) => {
        await store.setJSON(basename(key), value)
      },
    }
    const configuredSeason = Netlify.env.get('FOOTBALL_SEASON')
    const options = { cache, timeoutMs: 8000 }
    const football = createFootballService({
      ...options,
      season: configuredSeason ? Number(configuredSeason) : undefined,
      maxAgeMs: 60_000,
    })
    if (detail) {
      const value = await createMatchDetailsService(football, options).getDetails(detail[1]!)
      return Response.json(value ?? { error: '未找到这场比赛，请返回赛程重新选择' }, {
        status: value ? 200 : 404,
        headers,
      })
    }
    if (path === '/api/football/arsenal/squad') {
      const feed = await createSquadService({ ...options, football }).getFeed()
      return Response.json(feed, {
        status: feed.sources.every((source) => source.state === 'error') ? 503 : 200,
        headers,
      })
    }
    const feed = await football.getFeed()
    const value =
      path === '/api/football/arsenal'
        ? {
            ...feed,
            scope: 'arsenal',
            matches: feed.matches.filter((match) =>
              [match.home.id, match.away.id].includes('arsenal'),
            ),
          }
        : feed
    return Response.json(value, {
      status: feed.sources.every((source) => source.state === 'error') ? 503 : 200,
      headers,
    })
  } catch {
    return Response.json({ error: '赛事服务暂时无法获取，请稍后重试' }, { status: 502, headers })
  }
}

export const config: Config = { path: '/api/*' }
