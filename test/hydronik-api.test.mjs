import test from 'node:test'
import assert from 'node:assert/strict'
import hydronikApi, { hydronikRuntimeSnapshot } from '../api/hydronik.js'

test('runtime snapshot is fail-closed but may expose CI-proven preview evidence', () => {
  const snapshot = hydronikRuntimeSnapshot()
  assert.equal(snapshot.ok, true)
  assert.equal(snapshot.mode, 'FAIL_CLOSED')
  assert.equal(snapshot.phase, 'VERIFIED_PREVIEW')
  assert.equal(snapshot.executionEvidence, 'CI_PROVEN')
  assert.equal(snapshot.replayVerifier, 'CI_PROVEN')
  assert.equal(snapshot.corePromotion, 'FORBIDDEN')
  assert.equal(snapshot.ownerGate, 'LOCKED')
  assert.equal(snapshot.verification?.conclusion, 'success')
  assert.equal(snapshot.verification?.verifiedCommit, '4bbed17896875b19b8b1968590aa9e7aa59746aa')
  assert.ok(snapshot.invariants.includes('NO_EVIDENCE_NO_DONE'))
  assert.ok(snapshot.invariants.includes('BUILDER_CANNOT_SELF_VERIFY'))
})

test('GET exposes HYDRONIK status and non-GET fails closed', async () => {
  const getResponse = await hydronikApi.fetch(new Request('https://dv9.local/api/hydronik'))
  const body = await getResponse.json()
  assert.equal(getResponse.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.phase, 'VERIFIED_PREVIEW')
  assert.equal(body.ownerGate, 'LOCKED')

  const postResponse = await hydronikApi.fetch(new Request('https://dv9.local/api/hydronik', { method: 'POST' }))
  assert.equal(postResponse.status, 405)
  const denied = await postResponse.json()
  assert.equal(denied.ok, false)
})
