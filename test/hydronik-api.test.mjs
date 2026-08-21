import test from 'node:test'
import assert from 'node:assert/strict'
import hydronikApi, { hydronikRuntimeSnapshot } from '../api/hydronik.js'

test('runtime snapshot is fail-closed and cannot claim execution PASS', () => {
  const snapshot = hydronikRuntimeSnapshot()
  assert.equal(snapshot.ok, true)
  assert.equal(snapshot.mode, 'FAIL_CLOSED')
  assert.equal(snapshot.phase, 'EXPERIMENTAL')
  assert.equal(snapshot.executionEvidence, 'AWAITING_EXECUTION_EVIDENCE')
  assert.equal(snapshot.corePromotion, 'FORBIDDEN')
  assert.equal(snapshot.ownerGate, 'LOCKED')
  assert.ok(snapshot.invariants.includes('NO_EVIDENCE_NO_DONE'))
  assert.ok(snapshot.invariants.includes('BUILDER_CANNOT_SELF_VERIFY'))
})

test('GET exposes HYDRONIK status and non-GET fails closed', async () => {
  const getResponse = await hydronikApi.fetch(new Request('https://dv9.local/api/hydronik'))
  const body = await getResponse.json()
  assert.equal(getResponse.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.ownerGate, 'LOCKED')

  const postResponse = await hydronikApi.fetch(new Request('https://dv9.local/api/hydronik', { method: 'POST' }))
  assert.equal(postResponse.status, 405)
  const denied = await postResponse.json()
  assert.equal(denied.ok, false)
})
