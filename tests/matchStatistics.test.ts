import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { teams, type Match } from '../src/data/matches.ts'
import { emptyStatistics, formatStatistic, isMatchStatistics } from '../src/data/matchStatistics.ts'
import {
  normalizePlStatistics,
  normalizeUefaStatistics,
} from '../server/football/statisticsAdapters.ts'
import { createMatchStatisticsService, statisticsUrl } from '../server/football/statistics.ts'

const now = Date.parse('2026-10-16T12:00:00Z')
const match: Match = {
  id: 'pl-2645245',
  league: 'pl',
  season: 2026,
  status: 'finished',
  round: '第 8 轮',
  kickoff: '2026-10-10T14:00:00Z',
  venue: '球场',
  actual: [2, 1],
  home: { ...teams.arsenal!, officialId: '3' },
  away: { ...teams.city!, officialId: '2' },
}
const rawPl = () => [
  {
    side: 'Away',
    teamId: '2',
    stats: {
      possessionPercentage: 42,
      totalScoringAtt: 11,
      ontargetScoringAtt: 5,
      fkFoulLost: 20,
      totalYelCard: 4,
      yellowCard: 0,
      totalRedCard: 0,
      totalOffside: 4,
      totalPass: 356,
      accuratePass: 281,
    },
  },
  {
    side: 'Home',
    teamId: '3',
    stats: {
      possessionPercentage: 58,
      totalScoringAtt: 13,
      ontargetScoringAtt: 6,
      fkFoulLost: 12,
      totalYelCard: 1,
      yellowCard: 0,
      totalRedCard: 0,
      totalOffside: 7,
      totalPass: 512,
      accuratePass: 437,
    },
  },
]
const ucl: Match = {
  ...match,
  id: 'ucl-2049572',
  league: 'ucl',
  home: { ...match.home, officialId: '52280' },
  away: { ...match.away, officialId: '75797' },
}
const rawUcl = () => [
  {
    teamId: '75797',
    statistics: [
      { name: 'ball_possession', value: '47' },
      { name: 'attempts', value: '4' },
      { name: 'attempts_on_target', value: '0' },
      { name: 'attacks', value: '16' },
      { name: 'yellow_cards', value: '1' },
    ],
  },
  {
    teamId: '52280',
    statistics: [
      { name: 'ball_possession', value: '53' },
      { name: 'attempts', value: '16' },
      { name: 'attempts_on_target', value: '8' },
      { name: 'attacks', value: '76' },
      { name: 'yellow_cards', value: '2' },
    ],
  },
]

test('PL maps home/away by identity, uses total cards and derives pass accuracy', () => {
  const result = normalizePlStatistics(rawPl(), match)
  assert.deepEqual(result.possession, [58, 42])
  assert.deepEqual(result.shots, [13, 11])
  assert.deepEqual(result.shotsOnTarget, [6, 5])
  assert.deepEqual(result.yellowCards, [1, 4])
  assert.deepEqual(result.redCards, [0, 0])
  assert.deepEqual(result.fouls, [12, 20])
  assert.deepEqual(result.offsides, [7, 4])
  assert.deepEqual(result.passAccuracy, [85.4, 78.9])
  assert.deepEqual(result.expectedGoals, [null, null])
  assert.deepEqual(result.dangerousAttacks, [null, null])
  const badges = {
    ...match,
    home: {
      ...match.home,
      officialId: undefined,
      badgeUrl: 'https://resources.premierleague.com/premierleague/badges/t3.png',
    },
    away: {
      ...match.away,
      officialId: undefined,
      badgeUrl: 'https://resources.premierleague.com/premierleague/badges/t2.png',
    },
  }
  assert.deepEqual(
    normalizePlStatistics(rawPl(), badges),
    result,
    'existing cached official badges retain provider identity',
  )
})

test('UEFA matches team IDs independent of order; ordinary attacks never become dangerous attacks', () => {
  const result = normalizeUefaStatistics(rawUcl(), ucl)
  assert.deepEqual(result.possession, [53, 47])
  assert.deepEqual(result.shots, [16, 4])
  assert.deepEqual(result.shotsOnTarget, [8, 0])
  assert.deepEqual(result.yellowCards, [2, 1])
  assert.deepEqual(result.attacks, [76, 16])
  assert.deepEqual(result.dangerousAttacks, [null, null])
  assert.deepEqual(result.expectedGoals, [null, null])
})

test('invalid, empty and missing fields stay missing; zero remains a real value', () => {
  const raw = rawPl()
  Object.assign(raw[0]!.stats, {
    possessionPercentage: 101,
    totalScoringAtt: -1,
    ontargetScoringAtt: 2.5,
    totalOffside: null,
    fkFoulLost: '',
    totalPass: 0,
    accuratePass: 0,
  })
  const result = normalizePlStatistics(raw, match)
  for (const key of [
    'possession',
    'shots',
    'shotsOnTarget',
    'offsides',
    'fouls',
    'passAccuracy',
  ] as const)
    assert.equal(result[key][1], null, key)
  assert.equal(result.redCards[1], 0)
  assert.deepEqual(normalizePlStatistics([], match), emptyStatistics())
  assert.deepEqual(normalizeUefaStatistics([], ucl), emptyStatistics())
  const duplicate = rawUcl()
  duplicate[0]!.statistics.push(duplicate[0]!.statistics[0]!)
  assert.throws(() => normalizeUefaStatistics(duplicate, ucl), /重复/)
  assert.throws(() => normalizeUefaStatistics([rawUcl()[0], rawUcl()[0]], ucl))
  assert.throws(() => normalizePlStatistics([rawPl()[0], rawPl()[0]], match))
  assert.throws(
    () => normalizePlStatistics(rawPl(), { ...match, home: { ...match.home, officialId: '999' } }),
    /不匹配/,
  )
  assert.throws(
    () =>
      normalizePlStatistics(rawPl(), {
        ...match,
        home: { ...match.home, officialId: undefined, badgeUrl: undefined },
      }),
    /不匹配/,
  )
})

test('statistics requests share work, reuse memory and disk caches, and retain last success after failure', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'matchday-statistics-'))
  let calls = 0
  let time = now
  let offline = false
  const options = {
    cacheDir,
    clock: () => time,
    fetcher: (async () => {
      calls++
      if (offline) throw new Error('官方统计暂不可用')
      return Response.json(rawPl())
    }) as typeof fetch,
  }
  try {
    const service = createMatchStatisticsService(options)
    const [a, b] = await Promise.all([service.getStatistics(match), service.getStatistics(match)])
    assert.deepEqual(a, b)
    assert.equal(calls, 1)
    assert.ok(isMatchStatistics(a, match))
    await service.getStatistics(match)
    await createMatchStatisticsService(options).getStatistics(match)
    assert.equal(calls, 1)
    offline = true
    time += 86_400_001
    const stale = await service.getStatistics(match)
    assert.equal(stale.source.state, 'stale')
    assert.equal(stale.source.updatedAt, a.source.updatedAt)
    assert.deepEqual(stale.metrics, a.metrics)
    assert.ok(isMatchStatistics(stale, match))
    await service.getStatistics(match)
    assert.equal(calls, 2, 'failed calls are throttled for a minute')
    time += 60_001
    await service.getStatistics(match)
    assert.equal(calls, 3)
    const diskStale = await createMatchStatisticsService(options).getStatistics(match)
    assert.deepEqual(diskStale.metrics, a.metrics)
    const other = await service.getStatistics({ ...match, id: 'pl-99' })
    assert.equal(other.source.state, 'error')
    assert.deepEqual(other.metrics, emptyStatistics())
    const otherSeason = await service.getStatistics({ ...match, season: 2025 })
    assert.equal(otherSeason.source.state, 'error')
    await writeFile(
      join(cacheDir, 'statistics-2026-pl-2645245-v1.json'),
      JSON.stringify({ ...a, homeTeamId: 'wrong-team' }),
    )
    const rejected = await createMatchStatisticsService(options).getStatistics(match)
    assert.equal(rejected.source.state, 'error')
    assert.deepEqual(rejected.metrics, emptyStatistics())
    const before = calls
    await assert.rejects(service.getStatistics({ ...match, status: 'upcoming' }), /已完赛/)
    await assert.rejects(service.getStatistics({ ...match, id: 'pl-invalid' }), /编号无效/)
    assert.equal(calls, before)
  } finally {
    await rm(cacheDir, { recursive: true, force: true })
  }
})

test('contracts reject malformed values and mismatched fixtures; formats distinguish missing data and zero', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'matchday-statistics-contract-'))
  try {
    const stats = await createMatchStatisticsService({
      cacheDir,
      clock: () => now,
      fetcher: async () => Response.json([]),
    }).getStatistics(match)
    assert.ok(isMatchStatistics(stats, match))
    assert.equal(isMatchStatistics({ ...stats, matchId: { toString: () => match.id } }), false)
    assert.equal(isMatchStatistics({ ...stats, checkedAt: 123 }), false)
    assert.equal(isMatchStatistics(stats, { ...match, season: 2025 }), false)
    assert.equal(
      isMatchStatistics({ ...stats, metrics: { ...stats.metrics, shots: [1.5, 2] } }),
      false,
    )
    assert.equal(
      isMatchStatistics({ ...stats, metrics: { ...stats.metrics, possession: [101, 0] } }),
      false,
    )
    assert.equal(formatStatistic('redCards', 0), '0')
    assert.equal(formatStatistic('expectedGoals', null), '官方未提供')
    assert.equal(formatStatistic('expectedGoals', 1.2), '1.20')
    assert.equal(formatStatistic('possession', 58), '58%')
    assert.equal(statisticsUrl(ucl), 'https://matchstats.uefa.com/v2/team-statistics/2049572')
  } finally {
    await rm(cacheDir, { recursive: true, force: true })
  }
})
