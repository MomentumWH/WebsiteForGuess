import { emptyStatistics, type StatisticValues } from '../../src/data/matchStatistics.ts'
import type { Match, Team } from '../../src/data/matches.ts'
import { officialBadgeUrl } from '../../src/data/teamBadges.ts'

export function providerTeamId(team: Team, league: Match['league']): string | undefined {
  if (team.officialId) return team.officialId
  const prefix = new RegExp(`^${league}-team-(\\d+)$`).exec(team.id)?.[1]
  if (prefix) return prefix
  const badge = officialBadgeUrl(team.badgeUrl)
  if (!badge) return undefined
  return league === 'pl'
    ? /premierleague\/badges\/t(\d+)\./.exec(badge)?.[1]
    : /TP\/teams\/logos\/\d+x\d+\/(\d+)\./.exec(badge)?.[1]
}
function metric(value: unknown, percentage = false, integer = true): number | null {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)
        ? Number(value)
        : NaN
  return Number.isFinite(n) &&
    n >= 0 &&
    (!percentage || n <= 100) &&
    (!integer || Number.isInteger(n))
    ? n
    : null
}
type RawPlStats = { teamId: string; side: 'Home' | 'Away'; stats: Record<string, unknown> }
export function normalizePlStatistics(value: unknown, match: Match): StatisticValues {
  if (!Array.isArray(value)) throw new Error('英超技术统计格式变更')
  const metrics = emptyStatistics()
  if (!value.length) return metrics
  const rows = value as RawPlStats[]
  if (
    rows.length !== 2 ||
    rows.some(
      (r) => !r || !['Home', 'Away'].includes(r.side) || !r.stats || typeof r.stats !== 'object',
    ) ||
    new Set(rows.map((r) => r.side)).size !== 2
  )
    throw new Error('英超主客队统计字段不完整')
  const keys = {
    possession: 'possessionPercentage',
    shots: 'totalScoringAtt',
    shotsOnTarget: 'ontargetScoringAtt',
    fouls: 'fkFoulLost',
    yellowCards: 'totalYelCard',
    redCards: 'totalRedCard',
    offsides: 'totalOffside',
    corners: 'cornerTaken',
    saves: 'saves',
    passes: 'totalPass',
  } as const
  for (const [index, side] of (['Home', 'Away'] as const).entries()) {
    const row = rows.find((r) => r.side === side)!
    const expected = providerTeamId(index === 0 ? match.home : match.away, 'pl')
    if (!expected || String(row.teamId) !== expected) throw new Error('英超技术统计球队编号不匹配')
    for (const [key, field] of Object.entries(keys) as [keyof typeof keys, string][])
      metrics[key][index] = metric(row.stats[field], key === 'possession', key !== 'possession')
    const total = metric(row.stats.totalPass),
      completed = metric(row.stats.accuratePass)
    if (total !== null && completed !== null && total > 0 && completed <= total)
      metrics.passAccuracy[index] = Math.round((completed / total) * 1000) / 10
  }
  return metrics
}
type RawUefaStats = { teamId: string; statistics: { name: string; value: unknown }[] }
export function normalizeUefaStatistics(value: unknown, match: Match): StatisticValues {
  if (!Array.isArray(value)) throw new Error('欧冠技术统计格式变更')
  const metrics = emptyStatistics()
  if (!value.length) return metrics
  const rows = value as RawUefaStats[]
  if (
    rows.length !== 2 ||
    rows.some((r) => !r || !Array.isArray(r.statistics)) ||
    new Set(rows.map((r) => String(r.teamId))).size !== 2
  )
    throw new Error('欧冠球队统计字段不完整')
  const keys = {
    possession: 'ball_possession',
    shots: 'attempts',
    shotsOnTarget: 'attempts_on_target',
    fouls: 'fouls_committed',
    yellowCards: 'yellow_cards',
    redCards: 'red_cards',
    offsides: 'offsides',
    corners: 'corners',
    saves: 'saves',
    passes: 'passes_attempted',
    passAccuracy: 'passes_accuracy',
    attacks: 'attacks',
  } as const
  for (const [index, team] of [match.home, match.away].entries()) {
    const expected = providerTeamId(team, 'ucl')
    const row = rows.find((r) => String(r.teamId) === expected)
    if (!expected || !row) throw new Error('欧冠技术统计球队编号不匹配')
    if (
      row.statistics.some((s) => !s || typeof s.name !== 'string') ||
      new Set(row.statistics.map((s) => s.name)).size !== row.statistics.length
    )
      throw new Error('欧冠技术统计字段重复或缺失')
    const stats = new Map(row.statistics.map((s) => [s.name, s.value]))
    for (const [key, field] of Object.entries(keys) as [keyof typeof keys, string][])
      metrics[key][index] = metric(
        stats.get(field),
        key === 'possession' || key === 'passAccuracy',
        key !== 'possession' && key !== 'passAccuracy',
      )
  }
  // Neither verified endpoint exposes xG or dangerous attacks; ordinary attacks stay separate.
  return metrics
}
