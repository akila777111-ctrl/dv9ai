import { createHash } from 'node:crypto'
import { appendFile, readFile } from 'node:fs/promises'

const sha256 = (value) => createHash('sha256').update(value).digest('hex')

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stableValue(value[key])
        return acc
      }, {})
  }
  return value
}

const canonical = (value) => JSON.stringify(stableValue(value))

export async function appendEvidence(path, event) {
  if (!event || typeof event !== 'object') throw new Error('invalid_evidence_event')
  if (!event.type || !event.candidateId) throw new Error('missing_evidence_identity')

  const previous = await readEvidence(path)
  const chain = verifyEvidenceChain(previous)
  if (!chain.ok) throw new Error(`evidence_chain_corrupt:${chain.reason}`)

  const prevHash = previous.length ? previous.at(-1).recordHash : '0'.repeat(64)
  const body = {
    sequence: previous.length + 1,
    timestamp: event.timestamp ?? new Date().toISOString(),
    type: event.type,
    candidateId: event.candidateId,
    payload: event.payload ?? {},
    prevHash,
  }
  const recordHash = sha256(canonical(body))
  const record = { ...body, recordHash }
  await appendFile(path, `${JSON.stringify(record)}\n`, 'utf8')
  return record
}

export async function readEvidence(path) {
  try {
    const raw = await readFile(path, 'utf8')
    return raw.split('\n').filter(Boolean).map((line) => JSON.parse(line))
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
}

export function verifyEvidenceChain(records) {
  let prevHash = '0'.repeat(64)
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    if (record.sequence !== index + 1) return { ok: false, reason: 'sequence_mismatch', index }
    if (record.prevHash !== prevHash) return { ok: false, reason: 'prev_hash_mismatch', index }
    const { recordHash, ...body } = record
    const expected = sha256(canonical(body))
    if (recordHash !== expected) return { ok: false, reason: 'record_hash_mismatch', index }
    prevHash = recordHash
  }
  return { ok: true, headHash: prevHash, count: records.length }
}
