const CAPABILITIES = Object.freeze([
  { id: "measured-improvement-gate", status: "IMPLEMENTED" },
  { id: "descendant-schema", status: "IMPLEMENTED" },
  { id: "append-only-evidence-chain", status: "IMPLEMENTED" },
  { id: "independent-replay-verifier", status: "IMPLEMENTED" },
  { id: "skill-capsule-registry", status: "PLANNED" },
]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function hydronikRuntimeSnapshot() {
  return {
    ok: true,
    service: "dv9-hydronik-evolution",
    version: "0.1.0-experimental",
    mode: "FAIL_CLOSED",
    phase: "EXPERIMENTAL",
    executionEvidence: "AWAITING_EXECUTION_EVIDENCE",
    corePromotion: "FORBIDDEN",
    ownerGate: "LOCKED",
    evidenceModel: "SHA256_HASH_CHAIN",
    replayVerifier: "IMPLEMENTED_NOT_YET_CI_PROVEN",
    expansionPolicy: "ADAPTIVE_1_9_99_999_CEILING",
    capabilities: CAPABILITIES,
    invariants: [
      "NO_EVIDENCE_NO_DONE",
      "NO_MEASURED_NULL_NO_IMPROVEMENT_CLAIM",
      "BUILDER_CANNOT_SELF_VERIFY",
      "REGRESSION_FAILS_CLOSED",
      "EXTERNAL_SIDE_EFFECT_REQUIRES_OWNER_GATE",
    ],
    timestamp: new Date().toISOString(),
  };
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }
    return json(hydronikRuntimeSnapshot());
  },
};
