import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateDescendant, ownerApprove, HYDRONIK_STATUSES } from '../scripts/hydronik-measured-gate.mjs'

const base = {
  candidateId: 'cand-001',
  parentHash: 'parent-sha256',
  candidateHash: 'candidate-sha256',
  baselineScore: 0.70,
  nullControlScore: 0.71,
  candidateScore: 0.80,
  testsPassed: 12,
  regressions: 0,
  evidenceHash: 'evidence-sha256',
  verifierId: 'verifier-001',
  minImprovement: 0.01,
}

test('verified candidate requires measured improvement over baseline and null control', () => {
  const result = evaluateDescendant(base)
  assert.equal(result.status, HYDRONIK_STATUSES.VERIFIED)
  assert.equal(result.ownerGateEligible, true)
  assert.equal(result.receipt.candidateId, base.candidateId)
})

test('candidate is experimental when improvement is not proven', () => {
  const result = evaluateDescendant({ ...base, candidateScore: 0.715 })
  assert.equal(result.status, HYDRONIK_STATUSES.EXPERIMENTAL)
  assert.equal(result.ownerGateEligible, false)
})

test('candidate with regressions is rejected fail-closed', () => {
  const result = evaluateDescendant({ ...base, regressions: 1 })
  assert.equal(result.status, HYDRONIK_STATUSES.REJECTED)
  assert.equal(result.reason, 'regressions_present')
})

test('missing evidence is rejected', () => {
  const result = evaluateDescendant({ ...base, evidenceHash: '' })
  assert.equal(result.status, HYDRONIK_STATUSES.REJECTED)
  assert.match(result.reason, /missing_required/)
})

test('owner approval cannot promote an unverified candidate', () => {
  const experimental = evaluateDescendant({ ...base, candidateScore: 0.715 })
  assert.throws(() => ownerApprove(experimental, true), /not_verified/)
})

test('verified candidate needs explicit owner approval', () => {
  const verified = evaluateDescendant(base)
  assert.throws(() => ownerApprove(verified, false), /approval_required/)
  const approved = ownerApprove(verified, true)
  assert.equal(approved.status, HYDRONIK_STATUSES.OWNER_APPROVED)
})
