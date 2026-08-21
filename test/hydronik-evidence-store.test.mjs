import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { appendEvidence, readEvidence, verifyEvidenceChain } from '../scripts/hydronik-evidence-store.mjs'
import { replayAndVerify } from '../scripts/hydronik-replay-verifier.mjs'

const hash = (char) => char.repeat(64)

function measurement() {
  return {
    parentHash: hash('a'),
    candidateHash: hash('b'),
    baselineScore: 0.50,
    nullControlScore: 0.51,
    candidateScore: 0.63,
    testsPassed: 12,
    regressions: 0,
    evidenceHash: hash('c'),
    verifierId: 'verifier-independent-1',
    minImprovement: 0.05,
  }
}

test('append-only evidence chain verifies and replay reproduces VERIFIED', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dv9-hydronik-'))
  const path = join(dir, 'evidence.jsonl')
  await appendEvidence(path, { type: 'MEASUREMENT', candidateId: 'cand-1', payload: measurement(), timestamp: '2026-08-21T20:00:00.000Z' })
  await appendEvidence(path, { type: 'CLAIM', candidateId: 'cand-1', payload: { status: 'VERIFIED' }, timestamp: '2026-08-21T20:01:00.000Z' })
  const records = await readEvidence(path)
  assert.equal(verifyEvidenceChain(records).ok, true)
  const replay = await replayAndVerify(path, 'cand-1')
  assert.equal(replay.ok, true)
  assert.equal(replay.replayResult.status, 'VERIFIED')
})

test('tampering nested payload is detected by record hash', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dv9-hydronik-'))
  const path = join(dir, 'evidence.jsonl')
  await appendEvidence(path, { type: 'MEASUREMENT', candidateId: 'cand-2', payload: measurement(), timestamp: '2026-08-21T20:00:00.000Z' })
  const raw = await readFile(path, 'utf8')
  const row = JSON.parse(raw.trim())
  row.payload.candidateScore = 0.99
  await writeFile(path, `${JSON.stringify(row)}\n`, 'utf8')
  const records = await readEvidence(path)
  const check = verifyEvidenceChain(records)
  assert.equal(check.ok, false)
  assert.equal(check.reason, 'record_hash_mismatch')
})

test('replay rejects a false VERIFIED claim', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dv9-hydronik-'))
  const path = join(dir, 'evidence.jsonl')
  const weak = { ...measurement(), candidateScore: 0.53 }
  await appendEvidence(path, { type: 'MEASUREMENT', candidateId: 'cand-3', payload: weak, timestamp: '2026-08-21T20:00:00.000Z' })
  await appendEvidence(path, { type: 'CLAIM', candidateId: 'cand-3', payload: { status: 'VERIFIED' }, timestamp: '2026-08-21T20:01:00.000Z' })
  const replay = await replayAndVerify(path, 'cand-3')
  assert.equal(replay.ok, false)
  assert.equal(replay.reason, 'claim_replay_mismatch')
  assert.equal(replay.replayStatus, 'EXPERIMENTAL')
})
