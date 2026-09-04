export const HYDRONIK_STATUSES = Object.freeze({
  REJECTED: 'REJECTED',
  EXPERIMENTAL: 'EXPERIMENTAL',
  VERIFIED: 'VERIFIED',
  OWNER_APPROVED: 'OWNER_APPROVED',
})

const finite = (value) => Number.isFinite(value)

export function evaluateDescendant(input) {
  const required = [
    'candidateId',
    'parentHash',
    'candidateHash',
    'baselineScore',
    'nullControlScore',
    'candidateScore',
    'testsPassed',
    'regressions',
    'evidenceHash',
    'verifierId',
  ]

  const missing = required.filter((key) => input?.[key] === undefined || input?.[key] === null || input?.[key] === '')
  if (missing.length) {
    return {
      status: HYDRONIK_STATUSES.REJECTED,
      reason: `missing_required:${missing.join(',')}`,
      ownerGateEligible: false,
    }
  }

  const scores = [input.baselineScore, input.nullControlScore, input.candidateScore]
  if (!scores.every(finite)) {
    return {
      status: HYDRONIK_STATUSES.REJECTED,
      reason: 'non_finite_score',
      ownerGateEligible: false,
    }
  }

  if (!Number.isInteger(input.testsPassed) || input.testsPassed < 0 || !Number.isInteger(input.regressions) || input.regressions < 0) {
    return {
      status: HYDRONIK_STATUSES.REJECTED,
      reason: 'invalid_test_counters',
      ownerGateEligible: false,
    }
  }

  if (input.testsPassed === 0) {
    return {
      status: HYDRONIK_STATUSES.REJECTED,
      reason: 'no_test_evidence',
      ownerGateEligible: false,
    }
  }

  if (input.regressions > 0) {
    return {
      status: HYDRONIK_STATUSES.REJECTED,
      reason: 'regressions_present',
      ownerGateEligible: false,
    }
  }

  const baselineDelta = input.candidateScore - input.baselineScore
  const nullDelta = input.candidateScore - input.nullControlScore
  const minImprovement = Number.isFinite(input.minImprovement) ? input.minImprovement : 0

  if (baselineDelta <= minImprovement || nullDelta <= minImprovement) {
    return {
      status: HYDRONIK_STATUSES.EXPERIMENTAL,
      reason: 'improvement_not_proven',
      ownerGateEligible: false,
      metrics: { baselineDelta, nullDelta, minImprovement },
    }
  }

  return {
    status: HYDRONIK_STATUSES.VERIFIED,
    reason: 'measured_improvement_proven',
    ownerGateEligible: true,
    metrics: { baselineDelta, nullDelta, minImprovement },
    receipt: {
      candidateId: input.candidateId,
      parentHash: input.parentHash,
      candidateHash: input.candidateHash,
      evidenceHash: input.evidenceHash,
      verifierId: input.verifierId,
      baselineScore: input.baselineScore,
      nullControlScore: input.nullControlScore,
      candidateScore: input.candidateScore,
      testsPassed: input.testsPassed,
      regressions: input.regressions,
    },
  }
}

export function ownerApprove(result, ownerApproval) {
  if (result?.status !== HYDRONIK_STATUSES.VERIFIED || result?.ownerGateEligible !== true) {
    throw new Error('owner_gate_denied:not_verified')
  }
  if (ownerApproval !== true) {
    throw new Error('owner_gate_denied:approval_required')
  }
  return { ...result, status: HYDRONIK_STATUSES.OWNER_APPROVED }
}
