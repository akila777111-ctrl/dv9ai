import { readEvidence, verifyEvidenceChain } from './hydronik-evidence-store.mjs'
import { evaluateDescendant } from './hydronik-measured-gate.mjs'

export async function replayAndVerify(path, candidateId) {
  const records = await readEvidence(path)
  const chain = verifyEvidenceChain(records)
  if (!chain.ok) {
    return { ok: false, reason: `evidence_chain_invalid:${chain.reason}`, chain }
  }

  const candidateRecords = records.filter((record) => record.candidateId === candidateId)
  if (candidateRecords.length === 0) return { ok: false, reason: 'candidate_not_found' }

  const measured = candidateRecords
    .filter((record) => record.type === 'MEASUREMENT')
    .map((record) => record.payload)

  if (measured.length !== 1) {
    return { ok: false, reason: 'measurement_cardinality_invalid', count: measured.length }
  }

  const replayResult = evaluateDescendant({ candidateId, ...measured[0] })
  const claimed = candidateRecords.find((record) => record.type === 'CLAIM')?.payload

  if (claimed?.status && claimed.status !== replayResult.status) {
    return {
      ok: false,
      reason: 'claim_replay_mismatch',
      claimedStatus: claimed.status,
      replayStatus: replayResult.status,
    }
  }

  return {
    ok: true,
    candidateId,
    chain,
    replayResult,
  }
}
