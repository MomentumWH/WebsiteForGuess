import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { teams, type Match } from '../src/data/matches.ts'
import {
  formResult,
  isMatchDetails,
  matchHistory,
  sameTeam,
  summarizeForm,
} from '../src/data/matchDetails.ts'
import { isFootballFeed, type FootballFeed } from '../src/data/football.ts'
import type { FootballService } from '../server/football/service.ts'
import { createMatchDetailsService } from '../server/football/details.ts'
import { normalizePremierLeague, normalizeUefa } from '../server/football/adapters.ts'

const now = Date.parse('2026-10-16T12:00:00Z')
const selected: Match = {
  id: 'pl-900',
  league: 'pl',
  season: 2026,
  status: 'upcoming',
  round: '第 9 轮',
  kickoff: '2026-10-20T19:00:00Z',
  venue: '球场',
  home: teams.arsenal!,
  away: teams.city!,
}
const past = (id: number, date: string, score: [number, number], reverse = false): Match => ({
  ...selected,
  id: `pl-${id}`,
  kickoff: `${date}T19:00:00Z`,
  actual: score,
  status: 'finished',
  home: reverse ? selected.away : selected.home,
  away: reverse ? selected.home : selected.away,
})
const feed: FootballFeed = {
  scope: 'competitions',
  season: 2026,
  checkedAt: new Date(now).toISOString(),
  matches: [selected],
  sources: (['pl', 'ucl'] as const).map((league) => ({
    league,
    label: league,
    url: 'https://example.test',
    state: 'success',
    updatedAt: new Date(now).toISOString(),
    message: '',
  })),
}
const football = (matches: Match[] = [selected]): FootballService => ({
  season: 2026,
  getFeed: async () => ({ ...feed, matches }),
})

test('results use the selected team perspective for home and away, and never count missing scores', () => {
  const home = past(1, '2026-10-01', [2, 0])
  const away = past(2, '2026-10-02', [3, 1], true)
  const draw = past(3, '2026-10-03', [1, 1])
  assert.equal(formResult(home, selected.home), 'win')
  assert.equal(formResult(away, selected.home), 'loss')
  assert.equal(formResult(draw, selected.home), 'draw')
  assert.equal(formResult(selected, selected.home), null)
  assert.equal(formResult(home, teams.chelsea!), null)
  assert.deepEqual(summarizeForm([home, away, draw, selected], selected.home), {
    win: 1,
    draw: 1,
    loss: 1,
    goalsFor: 4,
    goalsAgainst: 4,
    total: 3,
  })
})
test('history is deduplicated, newest first, limited to five and excludes the selected match, live and future records', () => {
  const rows = Array.from({ length: 8 }, (_, i) =>
    past(i + 1, `2026-10-${String(i + 1).padStart(2, '0')}`, [2, 1], i % 2 === 0),
  )
  const records = [
    ...rows,
    rows[0]!,
    { ...rows[0]!, id: selected.id },
    { ...past(40, '2026-10-15', [2, 1]), status: 'live' as const, actual: undefined },
    past(41, '2026-10-17', [2, 1]),
    { ...past(42, '2026-10-15', [1, 0]), kickoff: '' },
  ]
  const result = matchHistory(selected, records, now)
  assert.deepEqual(
    result.headToHead.map((m) => m.id),
    ['pl-8', 'pl-7', 'pl-6', 'pl-5', 'pl-4'],
  )
  assert.equal(result.homeForm.length, 5)
  assert.equal(result.awayForm.length, 5)
  const earlier = { ...selected, kickoff: '2026-10-04T00:00:00Z' }
  assert.deepEqual(
    matchHistory(earlier, records, now).homeForm.map((m) => m.id),
    ['pl-3', 'pl-2', 'pl-1'],
  )
})
test('a club recent form includes other opponents; cross-provider club identities are linked', () => {
  const other = { ...past(1, '2026-10-01', [0, 0]), away: teams.chelsea! }
  assert.equal(matchHistory(selected, [other], now).headToHead.length, 0)
  assert.equal(matchHistory(selected, [other], now).homeForm.length, 1)
  assert.equal(matchHistory(selected, [other], now).awayForm.length, 0)
  assert.ok(
    sameTeam({ ...teams.arsenal!, id: 'ucl-team-52683' }, { ...teams.city!, id: 'pl-team-7' }),
  )
})
test('details validation rejects wrong teams, duplicate seasons/sources and malformed optional facts', () => {
  const rows = [past(1, '2026-10-01', [1, 0])]
  const details = {
    match: selected,
    checkedAt: feed.checkedAt,
    seasons: [2026],
    sources: feed.sources.map((s) => ({ ...s, season: 2026 })),
    ...matchHistory(selected, rows, now),
  }
  assert.ok(isMatchDetails(details))
  assert.equal(
    isMatchDetails({ ...details, sources: [details.sources[0], details.sources[0]] }),
    false,
  )
  assert.equal(isMatchDetails({ ...details, seasons: [2026, 2026] }), false)
  assert.equal(
    isMatchDetails({ ...details, headToHead: [{ ...rows[0], home: teams.chelsea! }] }),
    false,
  )
  assert.equal(isMatchDetails({ ...details, homeForm: [past(2, '2026-10-17', [1, 0])] }), false)
  assert.equal(isFootballFeed({ ...feed, matches: [{ ...selected, attendance: -1 }] }), false)
  assert.equal(isFootballFeed({ ...feed, matches: [{ ...selected, halfTimeScore: [0] }] }), false)
})
test('finished matches and unknown fixture IDs never fetch historical seasons', async () => {
  const calls: string[] = []
  const service = createMatchDetailsService(football([past(1, '2026-10-01', [2, 0])]), {
    clock: () => now,
    fetcher: async (input) => {
      calls.push(String(input))
      throw new Error('unexpected request')
    },
  })
  assert.equal(await service.getDetails('pl-999'), null)
  assert.equal(calls.length, 0)
  const details = await service.getDetails('pl-1')
  assert.deepEqual(calls, [
    'https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches/1/stats',
    'https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches/1/commentary?lang=en&_limit=100',
    'https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches/1/lineups',
  ])
  assert.equal(details!.statistics!.source.state, 'error')
  assert.equal(details!.timeline!.source.state, 'error')
  assert.deepEqual(details!.seasons, [2026])
  assert.ok(isMatchDetails(details))
})
test('upcoming fixtures fetch exactly three past seasons, share concurrent requests and reuse successful disk caches', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'matchday-details-'))
  let calls = 0
  const seasons = new Set<number>()
  const fetcher: typeof fetch = async (input) => {
    calls++
    const url = new URL(String(input))
    const pl = url.hostname !== 'match.uefa.com'
    const season = Number(url.searchParams.get(pl ? 'season' : 'seasonYear')) - (pl ? 0 : 1)
    seasons.add(season)
    if (!pl) return Response.json([])
    return Response.json({
      data: [
        {
          matchId: String(season),
          competitionId: '8',
          season: String(season),
          matchWeek: 1,
          kickoff: `${season}-09-01 20:00:00`,
          period: 'FullTime',
          homeTeam: { id: '3', name: 'Arsenal', abbr: 'ARS', score: 2 },
          awayTeam: { id: '43', name: 'Man City', abbr: 'MCI', score: 0 },
        },
      ],
      pagination: { _next: null },
    })
  }
  try {
    const options = { cacheDir, fetcher, clock: () => now }
    const service = createMatchDetailsService(football(), options)
    const [a, b] = await Promise.all([
      service.getDetails(selected.id),
      service.getDetails(selected.id),
    ])
    assert.equal(calls, 6)
    assert.deepEqual([...seasons].sort(), [2023, 2024, 2025])
    assert.deepEqual(a, b)
    assert.ok(isMatchDetails(a))
    assert.equal(a!.headToHead.length, 3)
    assert.equal(a!.sources.length, 8)
    await service.getDetails(selected.id)
    await createMatchDetailsService(football(), options).getDetails(selected.id)
    assert.equal(calls, 6)
    const stale = await createMatchDetailsService(football(), {
      ...options,
      clock: () => now + 86_400_001,
      fetcher: async () => {
        throw new Error('offline')
      },
    }).getDetails(selected.id)
    assert.equal(stale!.headToHead.length, 3)
    assert.equal(stale!.sources.filter((s) => s.state === 'stale').length, 6)
    assert.ok(isMatchDetails(stale))
  } finally {
    await rm(cacheDir, { recursive: true, force: true })
  }
})
test('optional attendance and half time facts preserve only valid official fields; UEFA regular score stays separate', () => {
  const raw = {
    matchId: '1',
    competitionId: '8',
    season: '2026',
    matchWeek: 1,
    kickoff: '2026-09-01 20:00:00',
    period: 'FullTime',
    attendance: 60234,
    homeTeam: { id: '3', name: 'Arsenal', abbr: 'ARS', score: 2, halfTimeScore: 1 },
    awayTeam: { id: '43', name: 'Man City', abbr: 'MCI', score: 0, halfTimeScore: 0 },
  }
  const [match] = normalizePremierLeague({ data: [raw] }, 2026)
  assert.deepEqual(match!.halfTimeScore, [1, 0])
  assert.equal(match!.attendance, 60234)
  assert.equal(
    normalizePremierLeague({ data: [{ ...raw, attendance: -1 }] }, 2026)[0]!.attendance,
    undefined,
  )
  const [ucl] = normalizeUefa(
    [
      {
        id: '10',
        competition: { id: '1' },
        seasonYear: '2027',
        status: 'FINISHED',
        homeTeam: { id: '52280', internationalName: 'Arsenal', teamCode: 'ARS' },
        awayTeam: { id: '50037', internationalName: 'Bayern', teamCode: 'BAY' },
        score: { regular: { home: 1, away: 1 }, total: { home: 2, away: 1 } },
        matchAttendance: 60100,
      },
    ],
    2026,
  )
  assert.deepEqual(ucl!.actual, [1, 1])
  assert.deepEqual(ucl!.finalScore, [2, 1])
  assert.equal(ucl!.attendance, 60100)
})
