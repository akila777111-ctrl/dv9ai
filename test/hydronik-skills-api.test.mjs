import test from 'node:test'
import assert from 'node:assert/strict'
import skillApi, { skillRegistrySnapshot } from '../api/hydronik-skills.js'

test('skill registry is read-only and empty until verified capsules exist', () => {
  const snapshot = skillRegistrySnapshot()
  assert.equal(snapshot.ok, true)
  assert.equal(snapshot.mode, 'READ_ONLY')
  assert.equal(snapshot.ownerGate, 'LOCKED')
  assert.equal(snapshot.state, 'NO_VERIFIED_CAPSULES')
  assert.equal(snapshot.skills.length, 0)
  assert.equal(snapshot.counts.total, 0)
  assert.ok(snapshot.invariants.includes('NO_EVIDENCE_NO_SKILL_PROMOTION'))
  assert.ok(snapshot.invariants.includes('NO_FULL_TRAJECTORY_AS_TRUSTED_SKILL'))
})

test('GET exposes registry and writes fail closed', async () => {
  const getResponse = await skillApi.fetch(new Request('https://dv9.local/api/hydronik-skills'))
  const body = await getResponse.json()
  assert.equal(getResponse.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.ownerGate, 'LOCKED')

  const postResponse = await skillApi.fetch(new Request('https://dv9.local/api/hydronik-skills', { method: 'POST' }))
  assert.equal(postResponse.status, 405)
  const denied = await postResponse.json()
  assert.equal(denied.ok, false)
})
