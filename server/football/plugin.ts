import type { Plugin } from 'vite'
import { createFootballService } from './service.ts'
import { footballMiddleware } from './middleware.ts'
import { createSquadService } from '../squad/service.ts'
import { squadMiddleware } from '../squad/middleware.ts'

export function footballPlugin(env: Record<string, string>): Plugin {
  const service = createFootballService({
    season: env.FOOTBALL_SEASON ? Number(env.FOOTBALL_SEASON) : undefined,
    cacheDir: env.FOOTBALL_CACHE_DIR || undefined,
  })
  const squad = createSquadService({
    football: service,
    cacheDir: env.FOOTBALL_CACHE_DIR || undefined,
  })
  return {
    name: 'matchday-official-football',
    configureServer(server) {
      server.middlewares.use(footballMiddleware(service))
      server.middlewares.use(squadMiddleware(squad))
    },
    configurePreviewServer(server) {
      server.middlewares.use(footballMiddleware(service))
      server.middlewares.use(squadMiddleware(squad))
    },
  }
}
