import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  combineRoster,
  parseBootstrap,
  parseHistory,
  fplMetrics,
  uefaMetrics,
  type UefaRosterPlayer,
} from '../server/squad/adapters.ts'
import { createSquadService } from '../server/squad/service.ts'
import {
  emptyMetrics,
  isSquadFeed,
  metricText,
  recentSquadMatches,
  recommendLineup,
  summarizePlayer,
  type SquadPlayer,
  type Position,
} from '../src/data/squad.ts'
import { teams, type Match } from '../src/data/matches.ts'
import type { FootballFeed } from '../src/data/football.ts'

const player: SquadPlayer = {
  id: 'fpl-123',
  name: 'Bukayo Saka',
  shortName: 'Saka',
  position: 'FWD',
  number: 7,
  image: '',
  status: 'available',
  news: '',
  fplId: 1,
  uefaId: '1001',
  profileUrl: 'https://www.uefa.com/',
}
function match(id: string, date: string, league: 'pl' | 'ucl' = 'pl'): Match {
  return {
    id,
    league,
    season: 2026,
    status: 'finished',
    round: '1',
    kickoff: `2026-09-${date}T19:00:00Z`,
    home: teams.arsenal!,
    away: teams.city!,
    actual: [1, 0],
    venue: 'Emirates Stadium',
  }
}
const bootstrap = {
  teams: [{ id: 9, short_name: 'ARS', name: 'Arsenal' }],
  events: [{ deadline_time: '2026-08-21T00:00:00Z' }],
  elements: [
    {
      id: 1,
      code: 123,
      team: 9,
      first_name: 'Bukayo',
      second_name: 'Saka',
      web_name: 'Saka',
      element_type: 3,
      squad_number: null,
      status: 'a',
      news: '',
    },
    {
      id: 2,
      code: 456,
      team: 9,
      first_name: 'David',
      second_name: 'Raya Martín',
      web_name: 'Raya',
      element_type: 1,
      squad_number: null,
      status: 'a',
      news: '',
    },
  ],
}
const roster: UefaRosterPlayer[] = [
  { id: '1002', name: 'David Raya', number: 1, position: 'GK', image: '', url: player.profileUrl },
  {
    id: '1001',
    name: 'Bukayo Saka',
    number: 7,
    position: 'FWD',
    image: '',
    url: player.profileUrl,
  },
]
const history = (id: number) => ({
  history: [1, 2].map((fixture) => ({
    element: id,
    fixture,
    minutes: fixture === 1 ? 90 : 0,
    goals_scored: fixture === 1 ? 1 : 0,
    assists: 0,
    saves: 0,
    tackles: 2,
    recoveries: 3,
    clearances_blocks_interceptions: 4,
  })),
})
const uefaRows = [
  {
    playerId: '1001',
    teamId: '52280',
    statistics: [
      { name: 'matches_appearance', value: '1' },
      { name: 'minutes_played_official', value: '73' },
      { name: 'goals', value: '0' },
      { name: 'assists', value: '1' },
      { name: 'saves', value: '0' },
      { name: 'clearance_completed', value: '2' },
    ],
  },
]

test('official roster names join across FPL/UEFA and retain football rather than fantasy positions', () => {
  const b = parseBootstrap(bootstrap, 2026)
  const u = roster
  const result = combineRoster(b, u)
  assert.equal(result.length, 2)
  assert.equal(result[0]!.position, 'FWD')
  assert.equal(result[1]!.uefaId, '1002')
  assert.equal(result[1]!.number, 1)
  const nwaneri = {
    ...bootstrap,
    elements: [
      {
        ...bootstrap.elements[0]!,
        first_name: 'Ethan',
        second_name: 'Nwaneri',
        web_name: 'Nwaneri',
      },
    ],
  }
  const differentPerson = combineRoster(nwaneri, [{ ...u[1]!, id: '900', name: 'Emerson Nwaneri' }])
  assert.equal(differentPerson.length, 2)
  assert.equal(differentPerson[0]!.uefaId, null)
  assert.throws(() => parseBootstrap(bootstrap, 2025), /赛季/)
})
test('FPL defensive aggregate is never mislabeled as clearances or interceptions; missing differs from zero', () => {
  const row = parseHistory(history(1), 1)[0]!
  const stats = fplMetrics(row)
  assert.equal(stats.appearances, 1)
  assert.equal(stats.cbi, 4)
  assert.equal(stats.clearances, null)
  assert.equal(stats.interceptions, null)
  assert.equal(stats.saves, 0)
  assert.equal(fplMetrics({ ...row, assists: undefined }).assists, null)
  assert.throws(() => parseHistory(history(2), 1))
  const u = uefaMetrics(uefaRows).get('1001')!
  assert.equal(u.minutes, 73)
  assert.equal(u.clearances, 2)
  assert.equal(u.interceptions, null)
  assert.equal(u.recoveries, null)
  assert.throws(() => uefaMetrics([{ ...uefaRows[0], teamId: 'other' }]))
})
test('recent five is a shared team window, excludes live/unrelated matches, and does not backfill absences', () => {
  const matches = Array.from({ length: 7 }, (_, i) =>
    match(`pl-${i}`, String(i + 1).padStart(2, '0')),
  )
  matches.push({ ...match('live', '09'), status: 'live', actual: undefined })
  matches.push({ ...match('other', '10'), home: teams.city!, away: teams.chelsea! })
  matches.push(match('ucl-11', '08', 'ucl'))
  assert.deepEqual(
    recentSquadMatches(matches, 'pl').map((m) => m.id),
    ['pl-6', 'pl-5', 'pl-4', 'pl-3', 'pl-2'],
  )
  assert.deepEqual(
    recentSquadMatches(matches, 'all').map((m) => m.id),
    ['ucl-11', 'pl-6', 'pl-5', 'pl-4', 'pl-3'],
  )
  const window = recentSquadMatches(matches, 'pl')
  const summary = summarizePlayer(player, window, [
    {
      playerId: player.id,
      matchId: 'pl-6',
      metrics: { ...emptyMetrics(), minutes: 0, appearances: 0, goals: 0 },
    },
  ])
  assert.equal(summary.metrics.minutes, 0)
  assert.equal(summary.metrics.appearances, 0)
  assert.equal(summary.covered, 1)
  assert.equal(summary.sample, 5)
  assert.equal(metricText(summary, 'minutes'), '0*')
  assert.equal(metricText(summary, 'interceptions'), '—')
})
test('different assist definitions are available in single competitions and never added in the combined window', () => {
  const matches = [match('pl-1', '01'), match('ucl-2', '02', 'ucl')]
  const rows = matches.map((m) => ({
    playerId: player.id,
    matchId: m.id,
    metrics: { ...emptyMetrics(), assists: 1, minutes: 90, appearances: 1 },
  }))
  assert.equal(summarizePlayer(player, matches, rows).metrics.assists, null)
  assert.equal(summarizePlayer(player, matches.slice(0, 1), rows).metrics.assists, 1)
  assert.equal(summarizePlayer(player, [], rows).metrics.goals, null)
})
test('reference formations have distinct players and the requested position counts', () => {
  const players = (['GK', 'DEF', 'MID', 'FWD'] as Position[]).flatMap((position) =>
    Array.from({ length: 6 }, (_, i) =>
      summarizePlayer(
        { ...player, id: `${position}-${i}`, position },
        [match('pl-1', '01')],
        [
          {
            playerId: `${position}-${i}`,
            matchId: 'pl-1',
            metrics: { ...emptyMetrics(), minutes: 90 - i },
          },
        ],
      ),
    ),
  )
  for (const [formation, counts] of [
    ['433', [3, 3, 4, 1]],
    ['4231', [1, 3, 2, 4, 1]],
  ] as const) {
    const rows = recommendLineup(players, formation)
    assert.deepEqual(
      rows.map((r) => r.length),
      counts,
    )
    assert.equal(new Set(rows.flat().map((r) => r.player.id)).size, 11)
  }
})
test('service maps stable official match codes, coalesces requests, persists data and preserves failed statistics', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'matchday-squad-'))
  let now = Date.parse('2026-10-13T00:00:00Z')
  let calls = 0
  let failPlayer = false
  let failAll = false
  let omitHistory = false
  const football: FootballFeed = {
    scope: 'competitions',
    season: 2026,
    checkedAt: new Date(now).toISOString(),
    matches: [match('pl-101', '01'), match('pl-102', '02'), match('ucl-201', '03', 'ucl')],
    sources: (['pl', 'ucl'] as const).map((league) => ({
      league,
      label: league,
      url: 'https://example.com',
      state: 'success',
      updatedAt: new Date(now).toISOString(),
      message: '',
    })),
  }
  const fetcher: typeof fetch = async (input) => {
    calls++
    const url = String(input)
    assert.equal(url.includes('/squad/'), false, 'website scraping must never be requested')
    if (failAll) throw new Error('offline')
    if (url.includes('bootstrap-static')) return Response.json(bootstrap)
    if (url.includes('fixtures/'))
      return Response.json([
        { id: 1, code: 101, team_h: 9, team_a: 5 },
        { id: 2, code: 102, team_h: 9, team_a: 5 },
      ])
    if (url.includes('element-summary')) {
      const id = Number(url.match(/element-summary\/(\d+)/)![1])
      if (failPlayer && id === 1) throw new Error('player unavailable')
      if (omitHistory && id === 1) return Response.json({ history: [] })
      return Response.json(history(id))
    }
    return Response.json(uefaRows)
  }
  const options = {
    football: { season: 2026, getFeed: async () => football },
    fetcher,
    cacheDir,
    clock: () => now,
  }
  try {
    await writeFile(
      join(cacheDir, 'arsenal-squad-2026.json'),
      JSON.stringify({
        version: 1,
        season: 2026,
        checkedAt: new Date(now - 600_001).toISOString(),
        players: combineRoster(parseBootstrap(bootstrap, 2026), roster),
        matches: [],
        performances: [],
        sources: ['fpl', 'roster', 'pl', 'ucl'].map((id) => ({
          id,
          label: 'UEFA 本地名单',
          url: player.profileUrl,
          state: 'success',
          updatedAt: new Date(now - 600_001).toISOString(),
          message: '',
        })),
      }),
    )
    const service = createSquadService(options)
    const [a, b] = await Promise.all([service.getFeed(), service.getFeed()])
    assert.deepEqual(a, b)
    assert.equal(calls, 5)
    assert.equal(isSquadFeed(a), true)
    assert.equal(
      a.performances.find((p) => p.playerId === player.id && p.matchId === 'pl-101')!.metrics
        .minutes,
      90,
    )
    await service.getFeed()
    assert.equal(calls, 5)
    failPlayer = true
    now += 600_001
    const partial = await service.getFeed()
    assert.equal(partial.sources.find((s) => s.id === 'pl')!.state, 'stale')
    assert.equal(partial.sources.find((s) => s.id === 'ucl')!.state, 'success')
    assert.equal(partial.sources.find((s) => s.id === 'pl')!.updatedAt, a.checkedAt)
    assert.equal(
      partial.performances.find((p) => p.playerId === player.id && p.matchId === 'pl-101')!.metrics
        .minutes,
      90,
    )
    failAll = true
    now += 60_001
    const restored = await createSquadService(options).getFeed()
    assert.equal(restored.players.length, 2)
    assert.equal(
      restored.sources.every((s) => s.state === 'stale'),
      true,
    )
    assert.equal(restored.performances.length, a.performances.length)
    assert.equal(
      isSquadFeed({
        ...a,
        performances: [
          { playerId: player.id, matchId: 'pl-101', metrics: { ...emptyMetrics(), minutes: -1 } },
        ],
      }),
      false,
    )
    // A snapshot for another season must not populate this season's roster.
    await writeFile(join(cacheDir, 'arsenal-squad-2027.json'), JSON.stringify(a))
    const other = await createSquadService({
      ...options,
      football: { season: 2027, getFeed: async () => ({ ...football, season: 2027, matches: [] }) },
    }).getFeed()
    assert.equal(other.players.length, 0)
    assert.equal(other.sources.find((s) => s.id === 'fpl')!.state, 'error')
    failAll = false
    failPlayer = false
    omitHistory = true
    const corrected = await service.getFeed(true)
    assert.equal(corrected.sources.find((s) => s.id === 'pl')!.state, 'success')
    assert.equal(
      corrected.performances.some((p) => p.playerId === player.id && p.matchId === 'pl-101'),
      false,
    )
    assert.equal(
      corrected.performances.some((p) => p.playerId === player.id && p.matchId === 'ucl-201'),
      true,
    )
  } finally {
    await rm(cacheDir, { recursive: true, force: true })
  }
})

test('a fresh install uses JSON APIs without scraping or inventing UEFA roster associations', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'matchday-squad-json-'))
  const now = Date.parse('2026-10-13T00:00:00Z')
  const requests: string[] = []
  const football: FootballFeed = {
    scope: 'competitions',
    season: 2026,
    checkedAt: new Date(now).toISOString(),
    matches: [match('ucl-201', '03', 'ucl')],
    sources: (['pl', 'ucl'] as const).map((league) => ({
      league,
      label: league,
      url: 'https://example.com',
      state: 'success',
      updatedAt: new Date(now).toISOString(),
      message: '',
    })),
  }
  try {
    const feed = await createSquadService({
      football: { season: 2026, getFeed: async () => football },
      cacheDir,
      clock: () => now,
      fetcher: async (input, init) => {
        const url = String(input)
        requests.push(url)
        assert.equal(new Headers(init?.headers).get('Accept'), 'application/json')
        if (url === 'https://fantasy.premierleague.com/api/bootstrap-static/')
          return Response.json(bootstrap)
        if (url === 'https://matchstats.uefa.com/v2/player-statistics/201')
          return Response.json(uefaRows)
        throw new Error(`Unexpected source: ${url}`)
      },
    }).getFeed()
    assert.equal(requests.length, 2)
    assert.ok(requests.every((url) => !url.includes('www.uefa.com')))
    assert.equal(feed.players.length, 2)
    assert.ok(feed.players.every((p) => p.uefaId === null))
    assert.equal(feed.sources.find((s) => s.id === 'roster')!.state, 'error')
    assert.equal(feed.sources.find((s) => s.id === 'ucl')!.state, 'error')
    assert.equal(feed.performances.length, 0)
  } finally {
    await rm(cacheDir, { recursive: true, force: true })
  }
})
