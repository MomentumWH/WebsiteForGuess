import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  londonKickoff,
  normalizePremierLeague,
  normalizeUefa,
} from '../server/football/adapters.ts'
import { createFootballService, currentSeason, sourceUrls } from '../server/football/service.ts'
import { isFootballFeed } from '../src/data/football.ts'
import { isMatchLocked, outcome } from '../src/data/matches.ts'
import { officialBadgeUrl, teamBadgeSources } from '../src/data/teamBadges.ts'
import { fetchCompetitionMatches } from '../server/football/pagination.ts'

const pl = {
  matchId: '123',
  competitionId: '8',
  season: '2026',
  matchWeek: 1,
  kickoff: '2026-08-21 20:00:00',
  kickoffTimezoneString: 'Europe/London',
  period: 'FullTime',
  ground: 'Emirates Stadium',
  homeTeam: { id: '3', name: 'Arsenal', abbr: 'ARS', score: 3 },
  awayTeam: { id: '9', name: 'Coventry City', abbr: 'COV', score: 0 },
}
const ucl = {
  id: '456',
  competition: { id: '1' },
  seasonYear: '2027',
  status: 'FINISHED',
  homeTeam: { id: '52280', internationalName: 'Arsenal', teamCode: 'ARS' },
  awayTeam: { id: '50037', internationalName: 'Bayern', teamCode: 'BAY' },
  kickOffTime: { dateTime: '2026-10-13T19:00:00Z' },
  score: { regular: { home: 1, away: 1 }, total: { home: 2, away: 1 } },
}
const plPage = (item = pl) => ({ data: [item], pagination: { _next: null } })

test('PL London wall-clock times handle summer, winter and DST change weekends', () => {
  assert.equal(londonKickoff('2026-08-21 20:00:00'), '2026-08-21T19:00:00.000Z')
  assert.equal(londonKickoff('2027-01-02 15:00:00'), '2027-01-02T15:00:00.000Z')
  assert.equal(londonKickoff('2026-10-25 16:30:00'), '2026-10-25T16:30:00.000Z')
  assert.equal(londonKickoff('2027-03-28 16:30:00'), '2027-03-28T15:30:00.000Z')
  assert.equal(londonKickoff(), '')
  assert.throws(() => londonKickoff('not-a-date'))
})
test('official IDs, Arsenal identity and PL home/away scores are preserved', () => {
  const match = normalizePremierLeague(plPage(), 2026)[0]!
  assert.equal(match.id, 'pl-123')
  assert.equal(match.home.id, 'arsenal')
  assert.deepEqual(match.actual, [3, 0])
  assert.equal(match.away.name, '考文垂')
  assert.throws(() => normalizePremierLeague(plPage(), 2025))
})

test('PL badges use the API team IDs, including clubs outside the local artwork list', () => {
  const match = normalizePremierLeague(
    plPage({
      ...pl,
      awayTeam: { ...pl.awayTeam, id: '11', name: 'Everton', abbr: 'EVE' },
    }),
    2026,
  )[0]!
  assert.equal(match.home.id, 'arsenal')
  assert.equal(
    match.home.badgeUrl,
    'https://resources.premierleague.com/premierleague/badges/t3.png',
  )
  assert.equal(
    match.away.badgeUrl,
    'https://resources.premierleague.com/premierleague/badges/t11.png',
  )
  assert.equal(teamBadgeSources(match.home)[0], '/images/arsenal.png')
  assert.equal(teamBadgeSources(match.away)[0], match.away.badgeUrl)
})

test('UEFA badge metadata survives normalization and missing artwork is optional', () => {
  const logo = 'https://img.uefa.com/imgml/TP/teams/logos/70x70/52498.png'
  const medium = 'https://img.uefa.com/imgml/TP/teams/logos/240x240/52498.png'
  const raw = {
    ...ucl,
    awayTeam: { id: '52498', internationalName: 'Slavia Praha', teamCode: 'SLA', logoUrl: logo },
  }
  assert.equal(normalizeUefa([raw], 2026)[0]!.away.badgeUrl, logo)
  assert.equal(
    normalizeUefa([{ ...raw, awayTeam: { ...raw.awayTeam, mediumLogoUrl: medium } }], 2026)[0]!.away
      .badgeUrl,
    medium,
  )
  assert.equal(
    normalizeUefa([{ ...raw, awayTeam: { ...raw.awayTeam, logoUrl: undefined } }], 2026)[0]!.away
      .badgeUrl,
    medium,
  )
})

test('older caches resolve official artwork without a resync; unknown clubs keep a placeholder', () => {
  const base = { name: 'Club', short: 'CLB', color: '#315f49' }
  assert.deepEqual(teamBadgeSources({ ...base, id: 'forest' }), [
    'https://resources.premierleague.com/premierleague/badges/t17.png',
  ])
  assert.deepEqual(teamBadgeSources({ ...base, id: 'pl-team-88' }), [
    'https://resources.premierleague.com/premierleague/badges/t88.png',
  ])
  assert.deepEqual(teamBadgeSources({ ...base, id: 'ucl-team-52498' }), [
    'https://img.uefa.com/imgml/TP/teams/logos/240x240/52498.png',
  ])
  assert.deepEqual(teamBadgeSources({ ...base, id: 'unknown' }), [])
  assert.deepEqual(teamBadgeSources({ ...base, id: 'ucl-team-invalid' }), [])
})

test('image sources accept only official badge paths and deduplicate API/cache candidates', () => {
  for (const value of [
    'javascript:alert(1)',
    'https://img.uefa.com.other.test/imgml/TP/teams/logos/240x240/52498.png',
    'https://other.test/logo.png',
    'https://img.uefa.com/unrelated.png',
    'http://resources.premierleague.com/premierleague/badges/t11.png',
  ]) {
    assert.equal(officialBadgeUrl(value), undefined)
  }
  const badgeUrl = 'https://resources.premierleague.com/premierleague/badges/t11.png'
  assert.deepEqual(
    teamBadgeSources({
      id: 'pl-team-11',
      name: 'Everton',
      short: 'EVE',
      color: '#315f49',
      badgeUrl,
    }),
    [badgeUrl],
  )
})
test('UEFA settles regulation score even when extra time changes the winner', () => {
  const match = normalizeUefa([ucl], 2026)[0]!
  assert.equal(match.id, 'ucl-456')
  assert.deepEqual(match.actual, [1, 1])
  assert.equal(
    outcome(match, { home: 1, away: 1, confidence: 70, note: '', savedAt: '2026-10-01T00:00:00Z' }),
    '比分命中',
  )
  assert.throws(() => normalizeUefa([{ ...ucl, score: { total: { home: 2, away: 1 } } }], 2026))
})
test('live scores, postponed games and TBD fixtures never settle or unlock predictions', () => {
  const live = normalizeUefa([{ ...ucl, status: 'LIVE' }], 2026)[0]!
  assert.equal(live.actual, undefined)
  assert.deepEqual(live.liveScore, [2, 1])
  assert.equal(isMatchLocked(live, 0), true)
  for (const status of ['POSTPONED', 'CANCELLED', 'UPCOMING']) {
    const match = normalizeUefa([{ ...ucl, status, kickOffTime: {} }], 2026)[0]!
    assert.equal(match.actual, undefined)
    assert.equal(isMatchLocked(match, 0), true)
  }
})
test('malformed, unknown-status and truncated API responses fail instead of replacing data', () => {
  assert.throws(() => normalizePremierLeague({ data: [{}] }, 2026))
  assert.throws(() =>
    normalizePremierLeague({ ...plPage(), pagination: { _next: 'cursor' } }, 2026),
  )
  assert.throws(() => normalizeUefa([{}], 2026))
  assert.throws(() => normalizeUefa([{ ...ucl, status: 'NEW_STATE' }], 2026))
})
test('season year mapping uses July boundary in Beijing and UEFA end year', () => {
  assert.equal(currentSeason(new Date('2026-06-30T15:59:59Z')), 2025)
  assert.equal(currentSeason(new Date('2026-06-30T16:00:00Z')), 2026)
  assert.match(sourceUrls(2026).ucl, /seasonYear=2027/)
  assert.match(sourceUrls(2026).pl, /season=2026/)
  assert.equal(new URL(sourceUrls(2026).pl).searchParams.has('team'), false)
  assert.equal(new URL(sourceUrls(2026).ucl).searchParams.has('teamId'), false)
})

test('normalization retains other clubs and missing UEFA abbreviations use the official name', () => {
  const otherPl = {
    ...pl,
    homeTeam: { id: '14', name: 'Liverpool', abbr: 'LIV', score: 1 },
    awayTeam: { id: '11', name: 'Everton', abbr: 'EVE', score: 0 },
  }
  const match = normalizePremierLeague(plPage(otherPl), 2026)[0]!
  assert.equal(match.home.id, 'liverpool')
  assert.equal(match.away.id, 'pl-team-11')
  const [otherUcl] = normalizeUefa(
    [{ ...ucl, homeTeam: { id: '2605351', internationalName: 'Atert Bissen', teamCode: '' } }],
    2026,
  )
  assert.equal(otherUcl!.home.name, 'Atert Bissen')
  assert.equal(otherUcl!.home.short, 'Atert Bissen')
  assert.equal(otherUcl!.home.id, 'ucl-team-2605351')
})

test('PL follows official _next cursors and merges boundary duplicates', async () => {
  const urls: URL[] = []
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input))
    urls.push(url)
    assert.equal(url.searchParams.get('competition'), '8')
    assert.equal(url.searchParams.get('season'), '2026')
    assert.equal(url.searchParams.has('team'), false)
    const cursor = url.searchParams.get('_next')
    return Response.json(
      cursor === null
        ? { data: [pl], pagination: { _next: 'second' } }
        : { data: [pl, { ...pl, matchId: '124' }], pagination: { _next: null } },
    )
  }
  const matches = await fetchCompetitionMatches('pl', sourceUrls(2026).pl, 2026, fetcher, 1000)
  assert.deepEqual(
    matches.map((m) => m.id),
    ['pl-123', 'pl-124'],
  )
  assert.equal(urls.length, 2)
  assert.equal(urls[1]!.searchParams.get('_next'), 'second')
})

test('UEFA reads every offset page, including the empty terminal page after a full page', async () => {
  const offsets: number[] = []
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input))
    assert.equal(url.searchParams.has('teamId'), false)
    const offset = Number(url.searchParams.get('offset'))
    offsets.push(offset)
    return Response.json(
      offset < 200
        ? Array.from({ length: 100 }, (_, index) => ({ ...ucl, id: String(offset + index) }))
        : [],
    )
  }
  const matches = await fetchCompetitionMatches('ucl', sourceUrls(2026).ucl, 2026, fetcher, 1000)
  assert.equal(matches.length, 200)
  assert.deepEqual(offsets, [0, 100, 200])
})

test('repeated cursors, ignored offsets and missing pagination cannot publish an incomplete feed', async () => {
  let calls = 0
  await assert.rejects(
    fetchCompetitionMatches(
      'pl',
      sourceUrls(2026).pl,
      2026,
      async () => {
        calls++
        return Response.json({
          data: [{ ...pl, matchId: String(calls) }],
          pagination: { _next: 'same' },
        })
      },
      1000,
    ),
    /游标异常/,
  )
  assert.equal(calls, 2)
  await assert.rejects(
    fetchCompetitionMatches(
      'pl',
      sourceUrls(2026).pl,
      2026,
      async () => Response.json({ data: [pl] }),
      1000,
    ),
    /分页字段缺失/,
  )
  await assert.rejects(
    fetchCompetitionMatches(
      'ucl',
      sourceUrls(2026).ucl,
      2026,
      async () => Response.json(Array.from({ length: 100 }, (_, i) => ({ ...ucl, id: String(i) }))),
      1000,
    ),
    /分页重复/,
  )
})

test('failure on a later page retains the whole previous competition, without replacing it with a partial page', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'matchday-pagination-'))
  let now = Date.parse('2026-10-15T00:00:00Z')
  let failSecondPage = false
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input))
    if (url.hostname === 'match.uefa.com') return Response.json([ucl])
    if (url.searchParams.has('_next')) {
      if (failSecondPage) return new Response(null, { status: 503 })
      return Response.json(plPage({ ...pl, matchId: '124' }))
    }
    return Response.json({
      data: [{ ...pl, homeTeam: { ...pl.homeTeam, score: failSecondPage ? 9 : 3 } }],
      pagination: { _next: 'second' },
    })
  }
  try {
    const service = createFootballService({ season: 2026, cacheDir, fetcher, clock: () => now })
    const first = await service.getFeed()
    assert.equal(first.matches.length, 3)
    failSecondPage = true
    now += 300_001
    const partial = await service.getFeed()
    assert.deepEqual(
      partial.matches.filter((m) => m.league === 'pl'),
      first.matches.filter((m) => m.league === 'pl'),
    )
    assert.equal(partial.sources.find((s) => s.league === 'pl')!.state, 'stale')
    assert.equal(partial.sources.find((s) => s.league === 'ucl')!.state, 'success')
  } finally {
    await rm(cacheDir, { recursive: true, force: true })
  }
})

test('Arsenal-only caches cannot be mistaken for full competition schedules', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'matchday-scope-'))
  try {
    const cache = {
      season: 2026,
      checkedAt: '2026-10-15T00:00:00Z',
      sources: (['pl', 'ucl'] as const).map((league) => ({
        league,
        label: league,
        url: sourceUrls(2026)[league],
        state: 'success',
        updatedAt: '2026-10-15T00:00:00Z',
        message: '',
      })),
      matches: [...normalizePremierLeague(plPage(), 2026), ...normalizeUefa([ucl], 2026)],
    }
    assert.equal(isFootballFeed(cache), false)
    assert.equal(isFootballFeed({ ...cache, scope: 'arsenal' }), false)
    assert.equal(isFootballFeed({ ...cache, scope: 'competitions' }), true)
    await writeFile(join(cacheDir, 'arsenal-2026.json'), JSON.stringify(cache))
    await writeFile(join(cacheDir, 'competitions-2026-v2.json'), JSON.stringify(cache))
    const feed = await createFootballService({
      season: 2026,
      cacheDir,
      fetcher: async () => {
        throw new Error('offline')
      },
    }).getFeed()
    assert.equal(feed.matches.length, 0)
    assert.ok(feed.sources.every((s) => s.state === 'error'))
  } finally {
    await rm(cacheDir, { recursive: true, force: true })
  }
})
test('concurrent requests share one upstream fetch; partial failure preserves only that source', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'matchday-football-'))
  let now = Date.parse('2026-10-13T00:00:00Z')
  let calls = 0
  let failUcl = false
  const fetcher: typeof fetch = async (input) => {
    calls++
    if (String(input).includes('match.uefa.com')) {
      if (failUcl) throw new Error('test unavailable')
      return Response.json([ucl])
    }
    return Response.json(plPage())
  }
  try {
    const service = createFootballService({ season: 2026, cacheDir, fetcher, clock: () => now })
    const [first, same] = await Promise.all([service.getFeed(), service.getFeed()])
    assert.equal(calls, 2)
    assert.equal(first, same)
    assert.equal(isFootballFeed(first), true)
    assert.equal(isFootballFeed({ ...first, matches: [...first.matches, first.matches[0]] }), false)
    await service.getFeed()
    assert.equal(calls, 2)
    failUcl = true
    now += 300_001
    const partial = await service.getFeed()
    assert.equal(partial.sources.find((s) => s.league === 'ucl')?.state, 'stale')
    assert.equal(partial.sources.find((s) => s.league === 'pl')?.state, 'success')
    assert.equal(partial.matches.length, 2)
    assert.equal(partial.sources.find((s) => s.league === 'ucl')?.updatedAt, first.checkedAt)
    const restarted = createFootballService({
      season: 2026,
      cacheDir,
      clock: () => now,
      fetcher: async () => {
        throw new Error('offline')
      },
    })
    const disk = await restarted.getFeed()
    assert.equal(disk.matches.length, 2)
    assert.ok(disk.sources.every((s) => s.state === 'stale'))
    const differentSeason = await createFootballService({
      season: 2025,
      cacheDir,
      fetcher: async () => {
        throw new Error('offline')
      },
    }).getFeed()
    assert.equal(differentSeason.matches.length, 0)
    assert.ok(differentSeason.sources.every((s) => s.state === 'error'))
  } finally {
    await rm(cacheDir, { recursive: true, force: true })
  }
})

test('external cache survives service restarts and preserves last successful data during outages', async () => {
  const entries = new Map<string, unknown>()
  const cache = {
    async read(key: string) {
      return entries.get(key)
    },
    async write(key: string, value: unknown) {
      entries.set(key, structuredClone(value))
    },
  }
  let now = Date.parse('2026-10-15T00:00:00Z')
  const first = await createFootballService({
    season: 2026,
    cache,
    clock: () => now,
    fetcher: async (url) =>
      Response.json(String(url).includes('match.uefa.com') ? [ucl] : plPage()),
  }).getFeed()
  assert.equal(first.matches.length, 2)
  assert.equal(entries.size, 1)
  const offline: typeof fetch = async () => {
    throw new Error('offline')
  }
  const fresh = await createFootballService({
    season: 2026,
    cache,
    clock: () => now,
    maxAgeMs: 60_000,
    fetcher: offline,
  }).getFeed()
  assert.deepEqual(fresh, first)
  now += 60_001
  const stale = await createFootballService({
    season: 2026,
    cache,
    clock: () => now,
    maxAgeMs: 60_000,
    fetcher: offline,
  }).getFeed()
  assert.deepEqual(stale.matches, first.matches)
  assert.ok(stale.sources.every((source) => source.state === 'stale'))
})
