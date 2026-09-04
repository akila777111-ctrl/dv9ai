# HYDRONIK Evolution v0.1

Status: IMPLEMENTED / AWAITING EXECUTION EVIDENCE

## Non-negotiable rules

1. DV9 CORE and sealed artifacts are immutable in this phase.
2. Builder cannot mark its own result VERIFIED.
3. NO EVIDENCE -> NO DONE.
4. NO MEASURED NULL -> NO SELF-IMPROVEMENT CLAIM.
5. External side effects require an explicit Owner Gate.
6. Promotion into CORE is forbidden in v0.1; this branch may only produce candidates and evidence.

## Evolution loop

EXPAND -> COMPETE -> MEASURE -> REPLAY -> VERIFY -> SYNTHESIZE -> COMPRESS -> OWNER GATE -> EVOLVE

Expansion is adaptive. `1 -> 9 -> 99 -> 999` is a capacity ceiling, not a mandatory fan-out.

## Descendant Arena

Each candidate must be isolated from siblings and evaluated against the same task contract, resource budget and evaluator.

The machine-readable descendant contract is now defined in `schemas/hydronik-descendant.schema.json`.

## Measured Improvement Gate

`scripts/hydronik-measured-gate.mjs` allows VERIFIED only when:

- complete evidence exists;
- finite baseline/null/candidate scores exist;
- at least one test passed;
- regressions == 0;
- candidate score beats baseline by more than the configured threshold;
- candidate score beats the frozen null-control by more than the same threshold;
- verifier identity is present.

VERIFIED is not equal to merged, deployed or adopted. It means only that the measured gate accepted the evidence.

## Append-only Evidence Store

`scripts/hydronik-evidence-store.mjs` stores JSONL records as a SHA-256 hash chain.

Every record carries sequence, timestamp, type, candidate identity, payload, previous hash and record hash. Nested payloads are recursively canonicalized before hashing. Appending refuses to continue if the existing chain is corrupt.

This makes evidence tamper-evident, not magically tamper-proof. Durable immutability still requires later filesystem/object-lock policy or signed external checkpoints.

## Independent Replay Verifier

`scripts/hydronik-replay-verifier.mjs`:

1. validates the complete evidence chain;
2. selects one candidate;
3. requires exactly one MEASUREMENT record in v0.1;
4. re-runs the measured gate from recorded inputs;
5. rejects a stored CLAIM whose status disagrees with replay.

A stored VERIFIED claim therefore cannot be trusted merely because it exists.

## Tests

`test/hydronik-measured-gate.test.mjs` covers promotion and Owner Gate rules.

`test/hydronik-evidence-store.test.mjs` covers:

- valid hash chain and deterministic replay;
- nested evidence tampering detection;
- refusal to append onto a corrupt chain;
- false VERIFIED claim detection.

## Skill Capsule Registry

Only a compact verified capability may be proposed for reuse. Do not persist a whole descendant trajectory as a trusted skill.

A future skill capsule must include problem pattern, principle/capability, constraints, failure cases, evidence references, source lineage, verifier identity, confidence/version and status.

Promotion path remains:

`candidate -> shadow skill -> independent replay -> verified skill -> owner approval -> reusable registry`

No capsule promotion is implemented in v0.1.

## Owner Gate

The gate is a separate state transition. A VERIFIED candidate remains non-authoritative until explicit owner approval.

Owner approval in v0.1 does not permit automatic merge/deploy; it only marks the artifact eligible for a later integration decision.

## Verification status

Code and tests are present in the branch, but GitHub Actions has not yet supplied execution evidence for the current branch. Therefore the correct status is not PASS.

Current status: IMPLEMENTED / AWAITING EXECUTION EVIDENCE.

## Next safe layer

1. Wire offline JSON Schema instance validation.
2. Add semantic graph/reference/resource-bound validation.
3. Move evidence behind immutable/object-lock capable storage or signed checkpointing.
4. Add deterministic resource measurements and replay fixtures.
5. Build Skill Capsule Registry only after the arena itself is verified.
