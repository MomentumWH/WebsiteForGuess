import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  matches,
  samplePredictions,
  outcome,
  summarize,
  isMatchLocked,
  dateLabel,
  timeLabel,
  type Prediction,
  type Match,
} from '../src/data/matches.ts'

const completed = matches.find((m) => m.id === 'past-forest')!
const upcoming = matches.find((m) => m.id === 'next-city')!
const guess = (home: number, away: number): Prediction => ({
  home,
  away,
  confidence: 75,
  note: '',
  savedAt: '2026-10-01T12:00:00Z',
})

test('exact score hits are distinguished from outcome-only hits', () => {
  assert.equal(outcome(completed, guess(3, 0)), '比分命中')
  assert.equal(outcome(completed, guess(2, 1)), '胜负命中')
  assert.equal(outcome(completed, guess(0, 1)), '未命中')
})
test('draw predictions count as outcome hits only when the actual result is a draw', () => {
  const draw: Match = { ...completed, actual: [1, 1] }
  assert.equal(outcome(draw, guess(0, 0)), '胜负命中')
  assert.equal(outcome(draw, guess(1, 1)), '比分命中')
  assert.equal(outcome(completed, guess(1, 1)), '未命中')
})
test('away wins are compared from the home-away perspective', () => {
  const away: Match = { ...completed, actual: [0, 2] }
  assert.equal(outcome(away, guess(1, 3)), '胜负命中')
  assert.equal(outcome(away, guess(3, 1)), '未命中')
})
test('unpredicted and unfinished games have separate statuses', () => {
  assert.equal(outcome(completed), '未预测')
  assert.equal(outcome(upcoming, guess(2, 1)), '待开赛')
})
test('unfinished predictions do not dilute the settled hit rate', () => {
  const stats = summarize([completed, upcoming], {
    [completed.id]: guess(3, 0),
    [upcoming.id]: guess(1, 0),
  })
  assert.deepEqual(stats, {
    total: 2,
    completed: 1,
    pending: 1,
    exact: 1,
    correct: 1,
    rate: 100,
    exactRate: 100,
  })
})
test('no predictions yields zero counts and finite rates', () => {
  const stats = summarize(matches, {})
  assert.deepEqual(stats, {
    total: 0,
    completed: 0,
    pending: 0,
    exact: 0,
    correct: 0,
    rate: 0,
    exactRate: 0,
  })
})
test('sample statistics are derived from their actual records', () => {
  const stats = summarize(matches, samplePredictions)
  assert.equal(stats.total, 6)
  assert.equal(stats.exact, 4)
  assert.equal(stats.correct, 5)
  assert.equal(stats.rate, 83)
  assert.equal(stats.exactRate, 67)
})
test('predictions lock exactly at kickoff, and completed games remain locked', () => {
  const kickoff = Date.parse(upcoming.kickoff)
  assert.equal(isMatchLocked(upcoming, kickoff - 1), false)
  assert.equal(isMatchLocked(upcoming, kickoff), true)
  assert.equal(isMatchLocked(upcoming, kickoff + 1), true)
  assert.equal(isMatchLocked(completed, 0), true)
})
test('dates consistently use Beijing time across midnight', () => {
  assert.equal(dateLabel('2026-10-21T19:00:00Z'), '10/22')
  assert.equal(timeLabel('2026-10-21T19:00:00Z'), '03:00')
})
