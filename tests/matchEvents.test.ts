import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { teams, type Match } from '../src/data/matches.ts'
import { eventTime, isMatchEvents } from '../src/data/matchEvents.ts'
import { normalizePlEvents, normalizeUefaEvents } from '../server/football/eventAdapters.ts'
import { createMatchEventsService, fetchMatchEvents } from '../server/football/events.ts'

const now = Date.parse('2026-10-16T12:00:00Z')
const match: Match = {
  id: 'pl-42',
  league: 'pl',
  season: 2026,
  status: 'finished',
  round: '第 8 轮',
  kickoff: '2026-10-10T11:30:00Z',
  venue: '球场',
  actual: [1, 0],
  home: { ...teams.arsenal!, officialId: '3' },
  away: { ...teams.city!, officialId: '2' },
}
const lineup = [
  { teamId: '2', players: [{ id: '20', firstName: 'Away', lastName: 'Player' }] },
  {
    teamId: '3',
    players: [
      { id: '10', firstName: 'First', lastName: 'Scorer' },
      { id: '11', firstName: 'Assist', lastName: 'Player', knownName: 'Official Name' },
      { id: '12', firstName: 'Incoming', lastName: 'Player' },
    ],
  },
]
const goal = {
  type: 'goal',
  team1: '3',
  player1: '10',
  player2: '11',
  time: "45+2'",
  timestamp: '2026-10-10 13:17:00',
  comment: 'This prose is not used as a source of player identities.',
}
const sub = {
  type: 'substitution',
  team1: '3',
  player1: '12',
  player2: '10',
  time: "63'",
  timestamp: '2026-10-10 13:55:00',
}
const ucl: Match = {
  ...match,
  id: 'ucl-42',
  league: 'ucl',
  home: { ...match.home, officialId: '52280' },
  away: { ...match.away, officialId: '75797' },
}
const actor = (id: string, teamId = '52280') => ({
  person: { id, internationalName: `Player ${id}`, translations: { name: { ZH: `球员 ${id}` } } },
  team: { id: teamId },
})
const uGoal = {
  id: 'g1',
  matchId: '42',
  type: 'GOAL',
  phase: 'SECOND_HALF',
  time: { minute: 64, second: 21 },
  timestamp: '2026-10-13T20:20:56Z',
  primaryActor: actor('10'),
  secondaryActor: actor('20', '75797'),
}
const uAssist = {
  id: 'a1',
  matchId: '42',
  type: 'ASSIST',
  phase: 'SECOND_HALF',
  time: { minute: 64, second: 16 },
  timestamp: '2026-10-13T20:20:54Z',
  primaryActor: actor('11'),
}
const uSub = {
  id: 's1',
  matchId: '42',
  type: 'SUBSTITUTION',
  phase: 'SECOND_HALF',
  time: { minute: 65, second: 12 },
  timestamp: '2026-10-13T20:22:12Z',
  primaryActor: actor('10'),
  secondaryActor: actor('12'),
}
const basic = {
  id: '42',
  homeTeam: { id: '52280' },
  awayTeam: { id: '75797' },
  playerEvents: { scorers: [{ id: 'g1', player: actor('10').person, teamId: '52280' }] },
}

test('PL uses structured goal/assist IDs, incoming/outgoing roles, chronological stoppage time and deduplication', () => {
  const result = normalizePlEvents(
    [sub, goal, { ...goal, comment: 'Another language' }],
    lineup,
    match,
  )
  assert.equal(result.length, 2)
  const g = result[0]!,
    s = result[1]!
  assert.equal(eventTime(g), '45+2′')
  assert.equal(g.timestamp, '2026-10-10T12:17:00.000Z')
  assert.equal(g.type, 'goal')
  if (g.type !== 'goal' || s.type !== 'substitution') throw new Error('unexpected types')
  assert.equal(g.player!.name, 'First Scorer')
  assert.equal(g.assist!.name, 'Official Name')
  assert.equal(s.playerIn!.id, '12')
  assert.equal(s.playerOut!.id, '10')
  const missing = normalizePlEvents(
    [{ ...goal, player1: '999', player2: undefined, time: undefined }],
    lineup,
    match,
  )[0]!
  assert.equal(missing.type === 'goal' && missing.player, null)
  assert.equal(eventTime(missing), '时间待补')
  assert.throws(() => normalizePlEvents([goal], [lineup[0]], match), /名单不完整/)
  assert.throws(
    () => normalizePlEvents([{ ...sub, player1: '20' }], lineup, match),
    /球员与球队不匹配/,
  )
})

test('UEFA keeps independent assists, never labels the opposing goalkeeper as assisting, and reverses PL substitution roles', () => {
  const rows = normalizeUefaEvents([uSub, uGoal, uAssist, uGoal], basic, ucl)
  assert.deepEqual(
    rows.map((r) => r.type),
    ['assist', 'goal', 'substitution'],
  )
  const g = rows[1]!,
    s = rows[2]!
  assert.equal(g.type === 'goal' && g.assist, null)
  assert.equal(g.type === 'goal' && g.player!.name, '球员 10')
  assert.equal(s.type === 'substitution' && s.playerIn!.id, '12')
  assert.equal(s.type === 'substitution' && s.playerOut!.id, '10')
  assert.equal(rows[0]!.type === 'assist' && rows[0]!.player!.id, '11')
  assert.deepEqual(
    normalizeUefaEvents([{ ...uGoal, id: 'unconfirmed' }], basic, ucl),
    [],
    'unconfirmed or disallowed goals are not published',
  )
  assert.deepEqual(normalizeUefaEvents([{ ...uGoal, phase: 'PENALTY_SHOOTOUT' }], basic, ucl), [])
  assert.throws(() => normalizeUefaEvents([{ ...uGoal, matchId: '99' }], basic, ucl), /比赛编号/)
  assert.throws(
    () => normalizeUefaEvents([uGoal], { ...basic, homeTeam: basic.awayTeam }, ucl),
    /主客队/,
  )
  assert.throws(
    () => normalizeUefaEvents([{ ...uSub, secondaryActor: actor('20', '75797') }], basic, ucl),
    /球队编号/,
  )
})

test('PL follows every cursor and refuses repeated/truncated pages rather than publishing half a timeline', async () => {
  const urls: string[] = []
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input))
    urls.push(url.href)
    if (url.pathname.endsWith('/lineups')) return Response.json(lineup)
    assert.equal(url.searchParams.get('lang'), 'en')
    return Response.json(
      url.searchParams.has('_next')
        ? { data: [sub], pagination: { _next: null } }
        : { data: [goal], pagination: { _next: 'official-cursor' } },
    )
  }
  const rows = await fetchMatchEvents(match, fetcher, AbortSignal.timeout(1000))
  assert.equal(rows.length, 2)
  assert.equal(urls.length, 3)
  assert.ok(urls.some((u) => new URL(u).searchParams.get('_next') === 'official-cursor'))
  const broken: typeof fetch = async (input) =>
    Response.json(
      String(input).endsWith('/lineups') ? lineup : { data: [goal], pagination: { _next: 'same' } },
    )
  await assert.rejects(
    fetchMatchEvents(match, broken, AbortSignal.timeout(1000)),
    /分页重复|游标异常/,
  )
  const truncated: typeof fetch = async (input) =>
    Response.json(String(input).endsWith('/lineups') ? lineup : { data: [goal] })
  await assert.rejects(fetchMatchEvents(match, truncated, AbortSignal.timeout(1000)), /分页字段/)
})

test('UEFA follows offsets through the empty terminal page and rejects ignored pagination', async () => {
  let calls = 0
  const page = Array.from({ length: 500 }, (_, i) => ({ id: `f${i}`, type: 'FOUL' }))
  const fetcher: typeof fetch = async (input) => {
    const u = new URL(String(input))
    if (!u.pathname.endsWith('/events')) return Response.json(basic)
    calls++
    return Response.json(u.searchParams.get('offset') === '0' ? page : [])
  }
  assert.deepEqual(await fetchMatchEvents(ucl, fetcher, AbortSignal.timeout(1000)), [])
  assert.equal(calls, 2)
  const repeated: typeof fetch = async (input) =>
    Response.json(String(input).includes('/events?') ? page : basic)
  await assert.rejects(fetchMatchEvents(ucl, repeated, AbortSignal.timeout(1000)), /分页重复/)
})

test('service coalesces requests, uses disk, retains complete timelines after errors or incomplete refreshes, isolates seasons', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'matchday-events-'))
  let calls = 0,
    time = now,
    mode = 'normal'
  const fetcher: typeof fetch = async (input) => {
    calls++
    if (mode === 'error') throw new Error('官方赛况暂不可用')
    return Response.json(
      String(input).endsWith('/lineups')
        ? lineup
        : { data: mode === 'empty' ? [] : [goal, sub], pagination: { _next: null } },
    )
  }
  const options = { cacheDir, clock: () => time, fetcher }
  try {
    const service = createMatchEventsService(options)
    const [a, b] = await Promise.all([service.getEvents(match), service.getEvents(match)])
    assert.deepEqual(a, b)
    assert.equal(a.completeness, 'complete')
    assert.ok(isMatchEvents(a, match))
    assert.equal(calls, 2)
    await service.getEvents(match)
    await createMatchEventsService(options).getEvents(match)
    assert.equal(calls, 2)
    time += 86_400_001
    mode = 'empty'
    const stale = await service.getEvents(match)
    assert.equal(stale.source.state, 'stale')
    assert.deepEqual(stale.events, a.events)
    assert.equal(stale.source.updatedAt, a.source.updatedAt)
    const before = calls
    await service.getEvents(match)
    assert.equal(calls, before)
    time += 60_001
    mode = 'error'
    const failed = await service.getEvents(match)
    assert.deepEqual(failed.events, a.events)
    const other = await service.getEvents({ ...match, season: 2025 })
    assert.equal(other.source.state, 'error')
    assert.deepEqual(other.events, [])
    await writeFile(
      join(cacheDir, 'events-2026-pl-42-v1.json'),
      JSON.stringify({ ...a, homeTeamId: 'wrong' }),
    )
    const rejected = await createMatchEventsService(options).getEvents(match)
    assert.equal(rejected.source.state, 'error')
    assert.deepEqual(rejected.events, [])
    const attempts = calls
    await assert.rejects(service.getEvents({ ...match, status: 'upcoming' }), /已完赛/)
    await assert.rejects(service.getEvents({ ...match, id: 'pl-invalid' }), /编号无效/)
    assert.equal(calls, attempts)
    assert.equal(isMatchEvents({ ...a, events: [a.events[0], a.events[0]] }), false)
    assert.equal(isMatchEvents({ ...a, events: [{ ...a.events[0], teamId: 'wrong' }] }), false)
    assert.equal(isMatchEvents(a, { ...match, id: 'pl-99' }), false)
    assert.equal(isMatchEvents({ ...a, events: [{ ...a.events[0], minute: -1 }] }), false)
  } finally {
    await rm(cacheDir, { recursive: true, force: true })
  }
})

test('successful but incomplete official records are labelled partial and retried after a minute', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'matchday-events-partial-'))
  let time = now,
    calls = 0
  try {
    const service = createMatchEventsService({
      cacheDir,
      clock: () => time,
      fetcher: async (input) => {
        calls++
        return Response.json(
          String(input).endsWith('/lineups')
            ? lineup
            : { data: [sub], pagination: { _next: null } },
        )
      },
    })
    const partial = await service.getEvents(match)
    assert.equal(partial.source.state, 'success')
    assert.equal(partial.completeness, 'partial')
    assert.ok(partial.source.message)
    await service.getEvents(match)
    assert.equal(calls, 2)
    time += 60_001
    await service.getEvents(match)
    assert.equal(calls, 4)
  } finally {
    await rm(cacheDir, { recursive: true, force: true })
  }
})
