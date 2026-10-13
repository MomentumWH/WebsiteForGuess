import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
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
  assert.throws(() => normalizeUefa(Array(100).fill(ucl), 2026))
})
test('season year mapping uses July boundary in Beijing and UEFA end year', () => {
  assert.equal(currentSeason(new Date('2026-06-30T15:59:59Z')), 2025)
  assert.equal(currentSeason(new Date('2026-06-30T16:00:00Z')), 2026)
  assert.match(sourceUrls(2026).ucl, /seasonYear=2027/)
  assert.match(sourceUrls(2026).pl, /season=2026/)
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
