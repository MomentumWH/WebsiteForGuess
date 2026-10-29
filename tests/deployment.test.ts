import assert from 'node:assert/strict'
import { test } from 'node:test'
import handler from '../netlify/functions/football.mts'

test('unknown API routes return JSON rather than the SPA page', async () => {
  for (const path of ['/api/unknown', '/api/football/matches/invalid']) {
    const response = await handler(new Request(`https://example.test${path}`))
    assert.equal(response.status, 404)
    assert.match(response.headers.get('content-type') ?? '', /application\/json/)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
})

test('API rejects writes with an explicit method response', async () => {
  const response = await handler(
    new Request('https://example.test/api/football/matches', { method: 'POST' }),
  )
  assert.equal(response.status, 405)
  assert.equal(response.headers.get('allow'), 'GET')
})
