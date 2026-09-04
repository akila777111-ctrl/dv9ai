import test from 'node:test'
import assert from 'node:assert/strict'
import arenaApi, { hydronikArenaSnapshot } from '../api/hydronik-arena.js'

test('arena starts empty instead of fabricating descendants', () => {
  const snapshot = hydronikArenaSnapshot()
  assert.equal(snapshot.ok, true)
  assert.equal(snapshot.mode, 'READ_ONLY')
  assert.equal(snapshot.source, 'NO_RUNTIME_EVIDENCE')
  assert.equal(snapshot.ownerGate, 'LOCKED')
  assert.equal(snapshot.corePromotion, 'FORBIDDEN')
  assert.deepEqual(snapshot.candidates, [])
  assert.ok(snapshot.acceptanceRules.includes('CLAIM_MUST_MATCH_REPLAY'))
  assert.ok(snapshot.acceptanceRules.includes('OWNER_APPROVAL_IS_SEPARATE'))
})

test('arena endpoint is GET-only', async () => {
  const getResponse = await arenaApi.fetch(new Request('https://dv9.local/api/hydronik-arena'))
  const body = await getResponse.json()
  assert.equal(getResponse.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.candidates.length, 0)

  const postResponse = await arenaApi.fetch(new Request('https://dv9.local/api/hydronik-arena', { method: 'POST' }))
  assert.equal(postResponse.status, 405)
  const denied = await postResponse.json()
  assert.equal(denied.ok, false)
})
