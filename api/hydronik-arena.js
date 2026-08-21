function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function hydronikArenaSnapshot() {
  return {
    ok: true,
    service: "dv9-hydronik-descendant-arena",
    version: "0.1.0-preview",
    mode: "READ_ONLY",
    source: "NO_RUNTIME_EVIDENCE",
    ownerGate: "LOCKED",
    corePromotion: "FORBIDDEN",
    candidates: [],
    acceptanceRules: [
      "BASELINE_AND_NULL_CONTROL_REQUIRED",
      "REGRESSIONS_MUST_EQUAL_ZERO",
      "EVIDENCE_HASH_REQUIRED",
      "INDEPENDENT_VERIFIER_REQUIRED",
      "CLAIM_MUST_MATCH_REPLAY",
      "OWNER_APPROVAL_IS_SEPARATE",
    ],
    fields: [
      "candidateId",
      "baselineScore",
      "nullControlScore",
      "candidateScore",
      "testsPassed",
      "regressions",
      "evidenceHash",
      "verifierId",
      "status",
    ],
    timestamp: new Date().toISOString(),
  };
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }
    return json(hydronikArenaSnapshot());
  },
};
