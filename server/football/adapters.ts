import { teams, type Match, type Team } from '../../src/data/matches.ts'
import { officialBadgeUrl, premierLeagueBadge, uefaBadge } from '../../src/data/teamBadges.ts'

interface PlTeam {
  id: string
  name: string
  abbr: string
  score?: number
  halfTimeScore?: number
}
interface PlMatch {
  matchId: string
  competitionId: string
  season: string
  matchWeek: number
  kickoff?: string
  kickoffTimezone?: string
  kickoffTimezoneString?: string
  period: string
  ground?: string
  attendance?: number
  homeTeam: PlTeam
  awayTeam: PlTeam
}
interface UefaTeam {
  id: string
  internationalName: string
  teamCode: string
  logoUrl?: string
  mediumLogoUrl?: string
  bigLogoUrl?: string
  translations?: { displayName?: { ZH?: string; EN?: string } }
}
interface UefaMatch {
  id: string
  competition: { id: string }
  seasonYear: string
  status: string
  homeTeam: UefaTeam
  awayTeam: UefaTeam
  kickOffTime?: { dateTime?: string }
  matchday?: { sequenceNumber?: string }
  round?: { translations?: { name?: { ZH?: string; EN?: string } } }
  stadium?: { translations?: { name?: { ZH?: string; EN?: string } } }
  score?: { regular?: { home: number; away: number }; total?: { home: number; away: number } }
  matchAttendance?: number
}
const knownTeams: Record<string, string> = {
  ARS: 'arsenal',
  MCI: 'city',
  CHE: 'chelsea',
  LIV: 'liverpool',
  TOT: 'tottenham',
  BAY: 'bayern',
  RMA: 'madrid',
  ATM: 'atletico',
  POR: 'porto',
  NFO: 'forest',
}
const chineseNames: Record<string, string> = {
  MUN: '曼联',
  AVL: '阿斯顿维拉',
  BHA: '布莱顿',
  BOU: '伯恩茅斯',
  BRE: '布伦特福德',
  CRY: '水晶宫',
  EVE: '埃弗顿',
  FUL: '富勒姆',
  LEE: '利兹联',
  NEW: '纽卡斯尔联',
  SUN: '桑德兰',
  WHU: '西汉姆联',
  WOL: '狼队',
  BUR: '伯恩利',
  IPS: '伊普斯维奇',
  HUL: '赫尔城',
  COV: '考文垂',
  SOU: '南安普顿',
  LEI: '莱斯特城',
}
function makeTeam(
  id: string,
  name: string,
  short: string,
  league: 'pl' | 'ucl',
  logo?: string,
): Team {
  if (![id, name, short].every((value) => typeof value === 'string' && value.length > 0))
    throw new Error('球队字段缺失')
  const known = teams[knownTeams[short] ?? '']
  const badgeUrl =
    officialBadgeUrl(logo) ?? (league === 'pl' ? premierLeagueBadge(id) : uefaBadge(id))
  return {
    ...(known ?? {
      id: `${league}-team-${id}`,
      name: chineseNames[short] ?? name,
      short,
      color: '#315f49',
    }),
    officialId: String(id),
    ...(badgeUrl ? { badgeUrl } : {}),
  }
}
function uefaLogo(team: UefaTeam): string | undefined {
  return (
    officialBadgeUrl(team.mediumLogoUrl) ??
    officialBadgeUrl(team.logoUrl) ??
    officialBadgeUrl(team.bigLogoUrl)
  )
}
function score(value: { home?: number; away?: number } | undefined): [number, number] | undefined {
  if (!value || ![value.home, value.away].every((n) => Number.isInteger(n) && n! >= 0))
    return undefined
  return [value.home!, value.away!]
}
// The PL endpoint returns a London wall-clock time, not a UTC timestamp.
// Resolve the IANA zone for the fixture date so winter GMT and summer BST both work.
export function londonKickoff(value?: string, zone = 'Europe/London'): string {
  if (!value) return ''
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) || zone !== 'Europe/London')
    throw new Error('英超开球时间格式或时区变更')
  const wall = Date.parse(value.replace(' ', 'T') + 'Z')
  if (!Number.isFinite(wall)) throw new Error('英超开球时间无效')
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(wall)).map((p) => [p.type, p.value]),
  )
  const projected = Date.parse(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`,
  )
  return new Date(wall - (projected - wall)).toISOString()
}
export function normalizePremierLeague(payload: unknown, season: number): Match[] {
  const page = payload as { data?: PlMatch[]; pagination?: { _next?: string | null } }
  if (!page || !Array.isArray(page.data)) throw new Error('英超响应格式变更')
  if (page.pagination?._next) throw new Error('英超赛程响应不完整，仍有未读取的分页')
  if (page.data.some((m) => !m?.matchId || !m.homeTeam?.id || !m.awayTeam?.id))
    throw new Error('英超比赛字段缺失')
  return page.data.map((m) => {
    if (String(m.competitionId) !== '8' || Number(m.season) !== season || !m.matchId)
      throw new Error('英超赛事或赛季字段不匹配')
    const states: Record<string, NonNullable<Match['status']>> = {
      PreMatch: 'upcoming',
      FullTime: 'finished',
      Postponed: 'postponed',
      Cancelled: 'cancelled',
      FirstHalf: 'live',
      HalfTime: 'live',
      SecondHalf: 'live',
      ExtraTime: 'live',
    }
    const status = states[m.period]
    if (!status) throw new Error(`英超比赛状态尚未支持：${m.period}`)
    const scores = score({ home: m.homeTeam.score, away: m.awayTeam.score })
    if (status === 'finished' && !scores) throw new Error('英超完赛比分缺失')
    return {
      id: `pl-${m.matchId}`,
      league: 'pl',
      season,
      status,
      round: `第 ${m.matchWeek} 轮`,
      home: makeTeam(String(m.homeTeam.id), m.homeTeam.name, m.homeTeam.abbr, 'pl'),
      away: makeTeam(String(m.awayTeam.id), m.awayTeam.name, m.awayTeam.abbr, 'pl'),
      kickoff: londonKickoff(m.kickoff, m.kickoffTimezoneString),
      venue: m.ground || '球场待定',
      ...(status === 'finished'
        ? {
            actual: scores,
            halfTimeScore: score({
              home: m.homeTeam.halfTimeScore,
              away: m.awayTeam.halfTimeScore,
            }),
            ...(Number.isInteger(m.attendance) && m.attendance! >= 0
              ? { attendance: m.attendance }
              : {}),
          }
        : status === 'live'
          ? { liveScore: scores }
          : {}),
      sourceUrl: `https://www.premierleague.com/en/match/${m.matchId}`,
    }
  })
}
export function normalizeUefa(payload: unknown, season: number): Match[] {
  if (!Array.isArray(payload)) throw new Error('欧冠响应格式变更')
  if (payload.some((m) => !m?.id || !m.homeTeam?.id || !m.awayTeam?.id))
    throw new Error('欧冠比赛字段缺失')
  return (payload as UefaMatch[]).map((m) => {
    if (String(m.competition?.id) !== '1' || Number(m.seasonYear) !== season + 1 || !m.id)
      throw new Error('欧冠赛事或赛季字段不匹配')
    const states: Record<string, NonNullable<Match['status']>> = {
      UPCOMING: 'upcoming',
      FINISHED: 'finished',
      LIVE: 'live',
      IN_PROGRESS: 'live',
      POSTPONED: 'postponed',
      CANCELLED: 'cancelled',
      SUSPENDED: 'postponed',
      ABANDONED: 'postponed',
    }
    const status = states[m.status]
    if (!status) throw new Error(`欧冠比赛状态尚未支持：${m.status}`)
    // Predictions settle on 90 minutes, excluding extra time and shoot-outs.
    const actual = score(m.score?.regular)
    if (status === 'finished' && !actual) throw new Error('欧冠常规时间比分缺失，暂不结算')
    const kickoff = m.kickOffTime?.dateTime ?? ''
    if (kickoff && (!/[Z]|[+-]\d\d:\d\d$/.test(kickoff) || !Number.isFinite(Date.parse(kickoff))))
      throw new Error('欧冠开球时间格式变更')
    return {
      id: `ucl-${m.id}`,
      league: 'ucl',
      season,
      status,
      round: m.matchday?.sequenceNumber
        ? `比赛日 ${m.matchday.sequenceNumber}`
        : m.round?.translations?.name?.ZH || m.round?.translations?.name?.EN || '轮次待定',
      home: makeTeam(
        m.homeTeam.id,
        m.homeTeam.translations?.displayName?.ZH || m.homeTeam.internationalName,
        m.homeTeam.teamCode || m.homeTeam.internationalName,
        'ucl',
        uefaLogo(m.homeTeam),
      ),
      away: makeTeam(
        m.awayTeam.id,
        m.awayTeam.translations?.displayName?.ZH || m.awayTeam.internationalName,
        m.awayTeam.teamCode || m.awayTeam.internationalName,
        'ucl',
        uefaLogo(m.awayTeam),
      ),
      kickoff,
      venue: m.stadium?.translations?.name?.ZH || m.stadium?.translations?.name?.EN || '球场待定',
      ...(status === 'finished'
        ? {
            actual,
            finalScore: score(m.score?.total),
            ...(Number.isInteger(m.matchAttendance) && m.matchAttendance! >= 0
              ? { attendance: m.matchAttendance }
              : {}),
          }
        : status === 'live'
          ? { liveScore: score(m.score?.total) }
          : {}),
      sourceUrl: `https://www.uefa.com/uefachampionsleague/match/${m.id}/`,
    }
  })
}
