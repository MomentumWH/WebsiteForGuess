import type { IncomingMessage, ServerResponse } from 'node:http'
import type { FootballService } from './service.ts'

export function footballMiddleware(service: FootballService) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname !== '/api/football/arsenal') return next()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      res.writeHead(405).end(JSON.stringify({ error: '仅支持 GET 请求' }))
      return
    }
    // One configured season per server keeps upstream requests bounded.
    void service
      .getFeed()
      .then((feed) => {
        res.writeHead(feed.sources.every((s) => s.state === 'error') ? 503 : 200)
        res.end(JSON.stringify(feed))
      })
      .catch(() => {
        res.writeHead(502).end(JSON.stringify({ error: '赛程同步失败，请稍后重试' }))
      })
  }
}
