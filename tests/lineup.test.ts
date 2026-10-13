import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  changeFormation,
  emptyLineup,
  formations,
  placePlayer,
  readLineup,
  removePlayer,
} from '../src/data/lineup.ts'

test('every formation has eleven unique positions including exactly one goalkeeper', () => {
  for (const formation of formations) {
    assert.equal(formation.slots.length, 11)
    assert.equal(new Set(formation.slots.map((s) => s.id)).size, 11)
    assert.equal(formation.slots.filter((s) => s.role === 'GK').length, 1)
    assert.ok(formation.slots.every((s) => s.x > 0 && s.x < 100 && s.y > 0 && s.y < 100))
  }
})
test('moving players exchanges occupied slots, prevents duplicates and preserves the original draft', () => {
  const original = { ...emptyLineup(), assignments: { rw: 'saka', st: 'havertz' } }
  const swapped = placePlayer(original, 'saka', 'st')
  assert.deepEqual(swapped.assignments, { rw: 'havertz', st: 'saka' })
  assert.deepEqual(original.assignments, { rw: 'saka', st: 'havertz' })
  const moved = placePlayer(swapped, 'saka', 'lw')
  assert.deepEqual(moved.assignments, { rw: 'havertz', lw: 'saka' })
  assert.equal(placePlayer(moved, 'saka', 'lw'), moved)
  assert.equal(placePlayer(moved, 'saka', 'invalid'), moved)
})
test('placing from the bench returns the replaced player; removing clears only the requested player', () => {
  const original = { ...emptyLineup(), assignments: { gk: 'raya', rw: 'saka', st: 'havertz' } }
  const replaced = placePlayer(original, 'jesus', 'st')
  assert.deepEqual(replaced.assignments, { gk: 'raya', rw: 'saka', st: 'jesus' })
  assert.deepEqual(removePlayer(replaced, 'saka').assignments, { gk: 'raya', st: 'jesus' })
})
test('all template conversions preserve all eleven players and the goalkeeper without duplicates', () => {
  for (const origin of formations) {
    const original = {
      version: 1 as const,
      formation: origin.id,
      assignments: Object.fromEntries(origin.slots.map((s, i) => [s.id, `player-${i}`])),
    }
    for (const target of formations) {
      const converted = changeFormation(original, target.id)
      assert.deepEqual(
        Object.values(converted.assignments).sort(),
        Object.values(original.assignments).sort(),
      )
      assert.equal(converted.assignments.gk, original.assignments.gk)
      assert.equal(new Set(Object.values(converted.assignments)).size, 11)
      assert.ok(
        Object.keys(converted.assignments).every((id) => target.slots.some((s) => s.id === id)),
      )
    }
  }
})
test('saved drafts round trip and malformed or duplicated saved assignments are rejected', () => {
  const original = placePlayer(emptyLineup('3421'), 'fpl-223340', 'ram')
  assert.deepEqual(readLineup(JSON.parse(JSON.stringify(original))), original)
  for (const value of [
    null,
    [],
    {},
    { ...original, version: 2 },
    { ...original, formation: 'unknown' },
    { ...original, assignments: [] },
    { ...original, assignments: { ram: 1 } },
    { ...original, assignments: { ram: '' } },
    { ...original, assignments: { nonexistent: 'saka' } },
    { ...original, assignments: { ram: 'saka', lam: 'saka' } },
  ])
    assert.equal(readLineup(value), null)
})

test('formation conversion favors the same position group over a closer unrelated empty slot', () => {
  const draft = { ...emptyLineup('3421'), assignments: { gk: 'raya', lam: 'rice', st: 'saka' } }
  const converted = changeFormation(draft, '532')
  assert.equal(converted.assignments.lcm, 'rice')
  assert.equal(converted.assignments.lst, 'saka')
  assert.equal(converted.assignments.gk, 'raya')
})
