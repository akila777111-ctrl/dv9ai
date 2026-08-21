# HYDRONIK Evolution v0.1

Status: EXPERIMENTAL / FAIL-CLOSED

## Non-negotiable rules

1. DV9 CORE and sealed artifacts are immutable in this phase.
2. Builder cannot mark its own result VERIFIED.
3. NO EVIDENCE -> NO DONE.
4. NO MEASURED NULL -> NO SELF-IMPROVEMENT CLAIM.
5. External side effects require an explicit Owner Gate.
6. Promotion into CORE is forbidden in v0.1; this branch may only produce candidates and evidence.

## Evolution loop

EXPAND -> COMPETE -> VERIFY -> SYNTHESIZE -> COMPRESS -> OWNER GATE -> EVOLVE

Expansion is adaptive. `1 -> 9 -> 99 -> 999` is a capacity ceiling, not a mandatory fan-out.

## Descendant Arena

Each candidate must be isolated from siblings and evaluated against the same task contract, resource budget and evaluator.

Required descendant record:

```json
{
  "candidateId": "string",
  "parentHash": "sha256",
  "candidateHash": "sha256",
  "capability": "string",
  "hypothesis": "string",
  "changedComponents": [],
  "baselineScore": 0,
  "nullControlScore": 0,
  "candidateScore": 0,
  "testsPassed": 0,
  "regressions": 0,
  "resourceDelta": {},
  "securityDelta": {},
  "evidenceHash": "sha256",
  "verifierId": "string",
  "status": "REJECTED|EXPERIMENTAL|VERIFIED|OWNER_APPROVED"
}
```

## Measured Improvement Gate

A candidate can become VERIFIED only if all conditions are true:

- complete evidence exists;
- finite baseline/null/candidate scores exist;
- at least one test passed;
- regressions == 0;
- candidate score beats baseline by more than the configured threshold;
- candidate score beats the frozen null-control by more than the same threshold;
- verifier identity is present.

VERIFIED is not equal to merged, deployed or adopted. It means only that the measured gate accepted the evidence.

## Skill Capsule Registry

Only a compact verified capability may be proposed for reuse. Do not persist a whole descendant trajectory as a trusted skill.

A skill capsule must contain:

- `skillId`
- `problemPattern`
- `principle`
- `constraints`
- `failureCases`
- `evidenceHash`
- `sourceCandidateHash`
- `verifierId`
- `confidence`
- `status`

Allowed statuses: `SHADOW`, `VERIFIED`, `OWNER_APPROVED`, `RETIRED`.

Promotion path:

`candidate -> shadow skill -> independent replay -> verified skill -> owner approval -> reusable registry`

## Owner Gate

The gate is a separate state transition. A VERIFIED candidate remains non-authoritative until explicit owner approval.

Owner approval in v0.1 does not permit automatic merge/deploy; it only marks the artifact eligible for a later integration decision.

## Next implementation target

1. Add JSON Schema for descendant and skill capsule records.
2. Add append-only local evidence store.
3. Add independent replay verifier.
4. Add resource/security deltas to the measured gate.
5. Add CI execution after review; no automatic merge or deploy.
