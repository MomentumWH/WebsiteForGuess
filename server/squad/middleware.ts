import type { IncomingMessage, ServerResponse } from 'node:http'
import type { SquadService } from './service.ts'

export function squadMiddleware(service: SquadService) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (new URL(req.url ?? '/', 'http://localhost').pathname !== '/api/football/arsenal/squad')
      return next()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      res.writeHead(405).end(JSON.stringify({ error: '仅支持 GET 请求' }))
      return
    }
    void service
      .getFeed()
      .then((feed) => {
        res
          .writeHead(feed.sources.every((s) => s.state === 'error') ? 503 : 200)
          .end(JSON.stringify(feed))
      })
      .catch(() =>
        res.writeHead(502).end(JSON.stringify({ error: '球员同步暂不可用，请稍后重试' })),
      )
  }
}
