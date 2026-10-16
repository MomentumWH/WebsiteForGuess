import { matchHistory, type MatchDetails } from '../../src/data/matchDetails.ts'
import { createFootballService, type FootballService, type ServiceOptions } from './service.ts'
import { createMatchStatisticsService } from './statistics.ts'
import { createMatchEventsService } from './events.ts'

export function createMatchDetailsService(
  football: FootballService,
  options: Omit<ServiceOptions, 'season'> = {},
) {
  const clock = options.clock ?? Date.now
  const statistics = createMatchStatisticsService(options)
  const events = createMatchEventsService(options)
  const historical = Array.from({ length: Math.min(3, football.season - 1992) }, (_, index) =>
    createFootballService({
      ...options,
      season: football.season - index - 1,
      maxAgeMs: 86_400_000,
    }),
  )
  return {
    async getDetails(id: string): Promise<MatchDetails | null> {
      const current = await football.getFeed()
      const match = current.matches.find((m) => m.id === id)
      if (!match) return null
      // History is fetched only when opening a fixture that has not finished.
      const feeds = [
        current,
        ...(match.status === 'finished' || match.status === 'cancelled'
          ? []
          : await Promise.all(historical.map((service) => service.getFeed()))),
      ]
      const finished =
        match.status === 'finished'
          ? await Promise.all([statistics.getStatistics(match), events.getEvents(match)])
          : undefined
      return {
        match,
        ...(finished ? { statistics: finished[0], timeline: finished[1] } : {}),
        checkedAt: new Date(clock()).toISOString(),
        seasons: feeds.map((f) => f.season),
        sources: feeds.flatMap((f) => f.sources.map((s) => ({ ...s, season: f.season }))),
        ...matchHistory(
          match,
          feeds.flatMap((f) => f.matches),
          clock(),
        ),
      }
    },
  }
}
export type MatchDetailsService = ReturnType<typeof createMatchDetailsService>
