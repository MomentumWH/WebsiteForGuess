import type { Match } from './matches.ts'
import type { FootballSource } from './football.ts'

export const statisticDefinitions = [
  { key: 'possession', label: '控球率', unit: '%', decimals: 1, percentage: true },
  { key: 'shots', label: '射门次数', unit: '', decimals: 0 },
  { key: 'shotsOnTarget', label: '射正次数', unit: '', decimals: 0 },
  { key: 'expectedGoals', label: '预期进球 xG', unit: '', decimals: 2 },
  { key: 'dangerousAttacks', label: '威胁进攻', unit: '', decimals: 0 },
  { key: 'attacks', label: '进攻次数', unit: '', decimals: 0 },
  { key: 'corners', label: '角球', unit: '', decimals: 0 },
  { key: 'passes', label: '传球次数', unit: '', decimals: 0 },
  { key: 'passAccuracy', label: '传球成功率', unit: '%', decimals: 1, percentage: true },
  { key: 'fouls', label: '犯规次数', unit: '', decimals: 0 },
  { key: 'yellowCards', label: '黄牌', unit: '', decimals: 0 },
  { key: 'redCards', label: '红牌', unit: '', decimals: 0 },
  { key: 'offsides', label: '越位', unit: '', decimals: 0 },
  { key: 'saves', label: '扑救', unit: '', decimals: 0 },
] as const
export type StatisticKey = (typeof statisticDefinitions)[number]['key']
export type StatisticValues = Record<StatisticKey, [number | null, number | null]>
export interface MatchStatistics {
  matchId: string
  season: number
  homeTeamId: string
  awayTeamId: string
  period: 'full-match'
  checkedAt: string
  source: FootballSource
  metrics: StatisticValues
}
export function emptyStatistics(): StatisticValues {
  return Object.fromEntries(
    statisticDefinitions.map(({ key }) => [key, [null, null]]),
  ) as StatisticValues
}
export function isMatchStatistics(value: unknown, match?: Match): value is MatchStatistics {
  if (!value || typeof value !== 'object') return false
  const s = value as MatchStatistics
  if (
    typeof s.matchId !== 'string' ||
    !/^(pl|ucl)-\d+$/.test(s.matchId) ||
    !Number.isInteger(s.season) ||
    s.season < 1992 ||
    s.season > 2100 ||
    typeof s.homeTeamId !== 'string' ||
    typeof s.awayTeamId !== 'string' ||
    s.homeTeamId === s.awayTeamId ||
    s.period !== 'full-match' ||
    typeof s.checkedAt !== 'string' ||
    !Number.isFinite(Date.parse(s.checkedAt)) ||
    !s.source ||
    s.source.league !== s.matchId.split('-')[0] ||
    !['success', 'stale', 'error'].includes(s.source.state) ||
    typeof s.source.label !== 'string' ||
    typeof s.source.url !== 'string' ||
    typeof s.source.message !== 'string' ||
    (s.source.updatedAt !== null &&
      (typeof s.source.updatedAt !== 'string' ||
        !Number.isFinite(Date.parse(s.source.updatedAt)))) ||
    !s.metrics ||
    typeof s.metrics !== 'object'
  )
    return false
  if (
    match &&
    (match.id !== s.matchId ||
      match.season !== s.season ||
      match.home.id !== s.homeTeamId ||
      match.away.id !== s.awayTeamId)
  )
    return false
  return statisticDefinitions.every((definition) => {
    const pair = s.metrics[definition.key]
    return (
      Array.isArray(pair) &&
      pair.length === 2 &&
      pair.every(
        (n) =>
          n === null ||
          (typeof n === 'number' &&
            Number.isFinite(n) &&
            n >= 0 &&
            (!('percentage' in definition) || n <= 100) &&
            (definition.decimals !== 0 || Number.isInteger(n))),
      )
    )
  })
}
export function formatStatistic(key: StatisticKey, value: number | null): string {
  if (value === null) return '官方未提供'
  const definition = statisticDefinitions.find((item) => item.key === key)!
  return `${value.toLocaleString('zh-CN', { minimumFractionDigits: definition.key === 'expectedGoals' ? 2 : 0, maximumFractionDigits: definition.decimals })}${definition.unit}`
}
