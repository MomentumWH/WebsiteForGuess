import type { IncomingMessage, ServerResponse } from 'node:http'
import type { FootballService } from './service.ts'
import { createMatchDetailsService, type MatchDetailsService } from './details.ts'

export function footballMiddleware(
  service: FootballService,
  details: MatchDetailsService = createMatchDetailsService(service),
) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const detailRoute = /^\/api\/football\/matches\/(pl-\d+|ucl-\d+)$/.exec(url.pathname)
    if (!detailRoute && !['/api/football/matches', '/api/football/arsenal'].includes(url.pathname))
      return next()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      res.writeHead(405).end(JSON.stringify({ error: '仅支持 GET 请求' }))
      return
    }
    if (detailRoute) {
      void details
        .getDetails(detailRoute[1]!)
        .then((value) => {
          res
            .writeHead(value ? 200 : 404)
            .end(JSON.stringify(value ?? { error: '未找到这场比赛，请返回赛程重新选择' }))
        })
        .catch(() =>
          res.writeHead(502).end(JSON.stringify({ error: '比赛资料暂时无法获取，请稍后重试' })),
        )
      return
    }
    // One configured season per server keeps upstream requests bounded.
    void service
      .getFeed()
      .then((feed) => {
        res.writeHead(feed.sources.every((s) => s.state === 'error') ? 503 : 200)
        res.end(
          JSON.stringify(
            url.pathname === '/api/football/arsenal'
              ? {
                  ...feed,
                  scope: 'arsenal',
                  matches: feed.matches.filter((m) => [m.home.id, m.away.id].includes('arsenal')),
                }
              : feed,
          ),
        )
      })
      .catch(() => {
        res.writeHead(502).end(JSON.stringify({ error: '赛程同步失败，请稍后重试' }))
      })
  }
}
