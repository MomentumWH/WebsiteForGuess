export type League = 'all' | 'pl' | 'ucl'
export interface Team {
  id: string
  name: string
  short: string
  color: string
  badgeUrl?: string
  officialId?: string
}
export interface Match {
  id: string
  league: Exclude<League, 'all'>
  round: string
  home: Team
  away: Team
  kickoff: string
  venue: string
  actual?: [number, number]
  status?: 'upcoming' | 'live' | 'finished' | 'postponed' | 'cancelled'
  liveScore?: [number, number]
  sourceUrl?: string
  season?: number
  halfTimeScore?: [number, number]
  attendance?: number
  finalScore?: [number, number]
}
export interface Prediction {
  home: number
  away: number
  confidence: number
  note: string
  savedAt: string
  sample?: boolean
}
export const teams: Record<string, Team> = {
  arsenal: { id: 'arsenal', name: '阿森纳', short: 'ARS', color: '#d63c42' },
  city: { id: 'city', name: '曼城', short: 'MCI', color: '#77b9d6' },
  chelsea: { id: 'chelsea', name: '切尔西', short: 'CHE', color: '#2455a4' },
  liverpool: { id: 'liverpool', name: '利物浦', short: 'LIV', color: '#c73740' },
  tottenham: { id: 'tottenham', name: '热刺', short: 'TOT', color: '#182648' },
  bayern: { id: 'bayern', name: '拜仁慕尼黑', short: 'BAY', color: '#db3446' },
  madrid: { id: 'madrid', name: '皇家马德里', short: 'RMA', color: '#aa9037' },
  atletico: { id: 'atletico', name: '马德里竞技', short: 'ATM', color: '#c83c40' },
  porto: { id: 'porto', name: '波尔图', short: 'POR', color: '#2456ab' },
  forest: { id: 'forest', name: '诺丁汉森林', short: 'NFO', color: '#d63c42' },
}
function team(id: string): Team {
  return teams[id]!
}
export const matches: Match[] = [
  {
    id: 'next-city',
    league: 'pl',
    round: '第 8 轮',
    home: team('arsenal'),
    away: team('city'),
    kickoff: '2026-10-18T23:30:00+08:00',
    venue: '酋长球场',
  },
  {
    id: 'next-bayern',
    league: 'ucl',
    round: '联赛阶段 · 第 3 轮',
    home: team('arsenal'),
    away: team('bayern'),
    kickoff: '2026-10-22T03:00:00+08:00',
    venue: '酋长球场',
  },
  {
    id: 'next-chelsea',
    league: 'pl',
    round: '第 9 轮',
    home: team('chelsea'),
    away: team('arsenal'),
    kickoff: '2026-10-25T00:30:00+08:00',
    venue: '斯坦福桥球场',
  },
  {
    id: 'next-liverpool',
    league: 'pl',
    round: '第 8 轮',
    home: team('liverpool'),
    away: team('tottenham'),
    kickoff: '2026-10-18T21:00:00+08:00',
    venue: '安菲尔德球场',
  },
  {
    id: 'next-madrid',
    league: 'ucl',
    round: '联赛阶段 · 第 3 轮',
    home: team('madrid'),
    away: team('porto'),
    kickoff: '2026-10-21T03:00:00+08:00',
    venue: '伯纳乌球场',
  },
  {
    id: 'past-forest',
    league: 'pl',
    round: '第 7 轮',
    home: team('arsenal'),
    away: team('forest'),
    kickoff: '2026-10-04T22:00:00+08:00',
    venue: '酋长球场',
    actual: [3, 0],
  },
  {
    id: 'past-atletico',
    league: 'ucl',
    round: '联赛阶段 · 第 2 轮',
    home: team('atletico'),
    away: team('arsenal'),
    kickoff: '2026-10-01T03:00:00+08:00',
    venue: '大都会球场',
    actual: [1, 2],
  },
  {
    id: 'past-chelsea',
    league: 'pl',
    round: '第 6 轮',
    home: team('arsenal'),
    away: team('chelsea'),
    kickoff: '2026-09-27T23:30:00+08:00',
    venue: '酋长球场',
    actual: [1, 1],
  },
  {
    id: 'past-tottenham',
    league: 'pl',
    round: '第 5 轮',
    home: team('tottenham'),
    away: team('arsenal'),
    kickoff: '2026-09-20T21:00:00+08:00',
    venue: '托特纳姆热刺球场',
    actual: [0, 2],
  },
  {
    id: 'past-porto',
    league: 'ucl',
    round: '联赛阶段 · 第 1 轮',
    home: team('arsenal'),
    away: team('porto'),
    kickoff: '2026-09-17T03:00:00+08:00',
    venue: '酋长球场',
    actual: [2, 0],
  },
  {
    id: 'past-liverpool',
    league: 'pl',
    round: '第 4 轮',
    home: team('liverpool'),
    away: team('arsenal'),
    kickoff: '2026-09-13T23:30:00+08:00',
    venue: '安菲尔德球场',
    actual: [2, 1],
  },
]
export const samplePredictions: Record<string, Prediction> = {
  'past-forest': {
    home: 3,
    away: 0,
    confidence: 85,
    note: '主场优势明显，期待防线保持零封。',
    savedAt: '2026-10-03T10:00:00Z',
    sample: true,
  },
  'past-atletico': {
    home: 0,
    away: 2,
    confidence: 70,
    note: '看好阿森纳的边路推进，但客场需要保持耐心。',
    savedAt: '2026-09-29T10:00:00Z',
    sample: true,
  },
  'past-chelsea': {
    home: 2,
    away: 0,
    confidence: 75,
    note: '预计主队能够控制中场，实际低估了对手的反击。',
    savedAt: '2026-09-26T10:00:00Z',
    sample: true,
  },
  'past-tottenham': {
    home: 0,
    away: 2,
    confidence: 80,
    note: '德比战看好阿森纳的定位球和防守稳定性。',
    savedAt: '2026-09-19T10:00:00Z',
    sample: true,
  },
  'past-porto': {
    home: 2,
    away: 0,
    confidence: 90,
    note: '主场出击，预测两球获胜。',
    savedAt: '2026-09-16T10:00:00Z',
    sample: true,
  },
  'past-liverpool': {
    home: 2,
    away: 1,
    confidence: 60,
    note: '客场赛程压力较大，预测主队小胜。',
    savedAt: '2026-09-12T10:00:00Z',
    sample: true,
  },
}
export const leagueName = (league: Exclude<League, 'all'>) => (league === 'pl' ? '英超' : '欧冠')
export const dateLabel = (kickoff: string) =>
  !Number.isFinite(Date.parse(kickoff))
    ? '日期待定'
    : new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(kickoff))
export const timeLabel = (kickoff: string) =>
  !Number.isFinite(Date.parse(kickoff))
    ? '时间待定'
    : new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(kickoff))
export function outcome(match: Match, prediction?: Prediction) {
  if (!prediction) return '未预测'
  if (!match.actual) return '待开赛'
  if (prediction.home === match.actual[0] && prediction.away === match.actual[1]) return '比分命中'
  if (Math.sign(prediction.home - prediction.away) === Math.sign(match.actual[0] - match.actual[1]))
    return '胜负命中'
  return '未命中'
}
export function isMatchLocked(match: Match, now = Date.now()) {
  return (
    !!match.actual ||
    !Number.isFinite(Date.parse(match.kickoff)) ||
    ['live', 'finished', 'postponed', 'cancelled'].includes(match.status ?? '') ||
    now >= Date.parse(match.kickoff)
  )
}
export function matchStatusLabel(match: Match, now = Date.now()) {
  if (match.status === 'cancelled') return '已取消'
  if (match.status === 'postponed') return '已延期'
  if (match.actual) return '已完赛'
  if (match.status === 'live')
    return `进行中${match.liveScore ? ` ${match.liveScore.join(' : ')}` : ''}`
  if (!match.kickoff) return '开球时间待定'
  return isMatchLocked(match, now) ? '已开赛 · 待更新赛况' : '等待你的预测'
}
export function summarize(items: Match[], predictions: Record<string, Prediction>) {
  const completed = items.filter((m) => m.actual && predictions[m.id])
  const exact = completed.filter((m) => outcome(m, predictions[m.id]) === '比分命中').length
  const correct = completed.filter((m) =>
    ['比分命中', '胜负命中'].includes(outcome(m, predictions[m.id])),
  ).length
  const total = items.filter((m) => predictions[m.id]).length
  return {
    total,
    completed: completed.length,
    pending: total - completed.length,
    exact,
    correct,
    rate: completed.length ? Math.round((correct / completed.length) * 100) : 0,
    exactRate: completed.length ? Math.round((exact / completed.length) * 100) : 0,
  }
}
export type Stats = ReturnType<typeof summarize>
