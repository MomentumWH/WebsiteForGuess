import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import process from 'node:process'
import console from 'node:console'
import { createFootballService } from './football/service.ts'
import { footballMiddleware } from './football/middleware.ts'

const root = resolve('dist')
const handleFootball = footballMiddleware(
  createFootballService({
    season: process.env.FOOTBALL_SEASON ? Number(process.env.FOOTBALL_SEASON) : undefined,
    cacheDir: process.env.FOOTBALL_CACHE_DIR || undefined,
  }),
)
const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}
await stat(resolve(root, 'index.html'))
const server = createServer((req, res) => {
  handleFootball(req, res, () => {
    void (async () => {
      if (!['GET', 'HEAD'].includes(req.method ?? '')) {
        res.writeHead(405).end()
        return
      }
      const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
      if (path.startsWith('/api/')) {
        res.writeHead(404).end()
        return
      }
      let file = resolve(root, `.${path}`)
      if (file !== root && !file.startsWith(root + sep)) {
        res.writeHead(403).end()
        return
      }
      try {
        if (!(await stat(file)).isFile()) file = resolve(root, 'index.html')
      } catch {
        if (extname(path)) {
          res.writeHead(404).end()
          return
        }
        file = resolve(root, 'index.html')
      }
      const body = await readFile(file)
      res.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream')
      res.setHeader(
        'Cache-Control',
        file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
      )
      res.writeHead(200).end(req.method === 'HEAD' ? undefined : body)
    })().catch(() => {
      if (!res.headersSent) res.writeHead(500)
      res.end()
    })
  })
})
const port = Number(process.env.PORT || 4446)
const host = process.env.HOST || '127.0.0.1'
server.listen(port, host, () => console.log(`MATCHDAY http://${host}:${port}`))
