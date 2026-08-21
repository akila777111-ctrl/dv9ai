const SKILLS = Object.freeze([])

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export function skillRegistrySnapshot() {
  return {
    ok: true,
    service: 'dv9-hydronik-skill-registry',
    version: '0.1.0-experimental',
    mode: 'READ_ONLY',
    ownerGate: 'LOCKED',
    promotionPolicy: 'SHADOW_TO_VERIFIED_TO_OWNER_APPROVED',
    trustedSkillPolicy: 'CAPSULE_ONLY_NO_FULL_TRAJECTORY',
    statuses: ['SHADOW', 'VERIFIED', 'OWNER_APPROVED', 'RETIRED'],
    skills: SKILLS,
    counts: {
      total: SKILLS.length,
      verified: SKILLS.filter((skill) => skill.status === 'VERIFIED').length,
      ownerApproved: SKILLS.filter((skill) => skill.status === 'OWNER_APPROVED').length,
    },
    state: SKILLS.length === 0 ? 'NO_VERIFIED_CAPSULES' : 'CAPSULES_AVAILABLE',
    invariants: [
      'NO_EVIDENCE_NO_SKILL_PROMOTION',
      'NO_FULL_TRAJECTORY_AS_TRUSTED_SKILL',
      'INDEPENDENT_REPLAY_REQUIRED',
      'OWNER_APPROVAL_REQUIRED_FOR_REUSE',
    ],
    timestamp: new Date().toISOString(),
  }
}

export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return json({ ok: false, error: 'Method not allowed' }, 405)
    }
    return json(skillRegistrySnapshot())
  },
}
