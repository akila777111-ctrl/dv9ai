# DV9 Planёрka v0.1

Status: implemented safe vertical slice  
Parent: DV9 → HYDRA control contour  
Module: `src/planerka/engine.js`

## Purpose

Planёрka is an internal HYDRA coordination layer. It does not rename DV9, replace HYDRA, or create a second execution core.

It converts one owner goal into a bounded dependency graph, prioritizes the actions that create verified progress and clear the path for other components, coordinates typed handoffs, stops at Owner Gate when required, and records every material decision.

The v0.1 slice is deliberately pure and has no network, filesystem, deployment, payment, mail, or device side effects. `DISPATCH` means “an exact action envelope is ready for an executor”; it does not grant execution authority. A later HYDRA adapter must execute the action and return independently verifiable evidence through `recordTaskResult`.

## Position in DV9

```text
OWNER goal
  → PROJECT STRATEGIST proposal
  → PLANЁRKA goal graph / priority / handoffs
  → HYDRA policy and Owner Gate
  → HYDROCOOL resource decision
  → HYDRUNYA or trusted organ executor
  → verifier evidence
  → PLANЁRKA result / dependency unlock / metrics
  → Cockpit read model
```

The intelligence contour may propose tasks or patches, but it cannot approve or execute its own proposals. Planёрka remains inside the HYDRA control contour.

## Stable UI API

```js
import {
  createPlan,
  runUntilGate,
  resolveApproval,
  recordTaskResult,
  sendAgentMessage,
  getPlanMetrics,
} from "../src/planerka/engine.js";
```

### `createPlan(input)`

Validates the goal and the entire DAG, derives `unlocks`, detects semantic duplicates, calculates priority, creates the first receipt and returns an immutable React-friendly read model.

### `runUntilGate(plan)`

Moves dependency-satisfied tasks to `READY`, blocks invalid branches, creates exact Owner Gate requests, and emits coordination-only `DISPATCH` envelopes for allowed tasks. It continues independent branches even when another branch is waiting for the owner.

The call is idempotent when no state can advance. It never calls an executor.

### `resolveApproval(plan, decision)`

Expected decision:

```js
{
  taskId: "DEPLOY",
  decision: "APPROVE", // or REJECT
  approvalId: "...",   // optional for UI convenience, exact when supplied
  proposalHash: "...", // optional for UI convenience, exact when supplied
}
```

Even when the optional fields are omitted, the decision applies only to the unique currently pending request for that task. It records and consumes the exact stored `proposalHash`; it cannot approve another task or a changed proposal. Replays fail closed.

### `recordTaskResult(plan, result)`

This is the only v0.1 path from `RUNNING` to a terminal task state. A successful result needs at least one verified evidence item. `MEDIUM` and `HIGH` risk results require a verifier different from the executor.

```js
{
  taskId: "AUDIT",
  status: "SUCCEEDED",
  actionId: "...",       // optional exact-match guard
  proposalHash: "...",   // optional exact-match guard
  evidence: [{
    type: "TEST_REPORT",
    summary: "All checks passed",
    verified: true,
    verifiedBy: "SENTINEL",
    sourceHash: "artifact-or-test-digest",
  }],
}
```

An unverified “success” becomes `BLOCKED` and cannot unlock dependants.

### `sendAgentMessage(plan, message)`

Adds a typed, bounded, deduplicated message. Messages are coordination evidence only: they cannot execute actions, approve requests, complete tasks, or increase the useful-action coefficient.

### `getPlanMetrics(plan)`

Recalculates the metrics from task/action evidence instead of trusting a self-reported counter.

## Read-model contract

Top-level shape:

```js
{
  version,
  revision,
  epoch,
  id,
  goal,
  status,
  tasks,
  messages,
  approvals,
  receipts,
  actions,
  metrics,
  mode: "COORDINATION_ONLY",
  createdAt,
  stateFingerprint,
}
```

Every task includes the fields needed by the Cockpit:

```js
{
  id,
  title,
  owner,
  status,
  dependencies,
  unlocks,
  risk,
  approvalLevel,
  priorityScore,
  evidence,
  proposalHash,
  blocker,
  currentActionId,
}
```

## Lifecycle

Plan statuses:

- `READY`
- `RUNNING`
- `WAITING_OWNER`
- `BLOCKED`
- `COMPLETED`

Task statuses:

- `PENDING`
- `READY`
- `WAITING_OWNER`
- `RUNNING`
- `DONE`
- `FAILED`
- `BLOCKED`

A dependency is cleared only by `DONE`, and `DONE` is reachable only through a verified successful result. `FAILED` and `BLOCKED` propagate a visible dependency blocker. Independent branches keep moving.

## Priority logic

Planёрka prioritizes eligible `READY` tasks. It never uses score as permission.

```text
benefit =
    0.38 × goalAlignment
  + 0.30 × expectedProgress
  + 0.22 × dependencyUnlock
  + 0.10 × evidenceConfidence

safetyAndNovelty =
    (1 - 0.55 × residualRisk)
  × (1 - 0.85 × nearDuplicate)

priorityScore = clamp01(benefit × safetyAndNovelty)
```

`dependencyUnlock` is derived from the transitive descendants in the DAG. This favors work that clears the path for several downstream components. Risk and semantic duplication lower priority. An unknown risk is not merely low-priority: it is blocked.

Ties are deterministic: `priorityScore DESC`, then `task.id ASC`.

## Useful-action coefficient

The coefficient measures verified results, not activity:

```text
UAC = weighted verified useful terminal actions
      / weighted terminal action attempts
```

- A result counts as useful only after verified evidence changes the task to `DONE`.
- Failed, unverified, policy-blocked, owner-rejected, and duplicate actions remain visible as coordination waste.
- Pending approvals and running work do not enter the denominator prematurely.
- Messages, heartbeats, proposals, and repeated reads never add credit.
- With no terminal action sample, the state is `NO_SAMPLE`, not a fabricated zero or one.

`goalProgress` is calculated separately from completed task weights. This prevents a good efficiency ratio from being confused with completion of the actual goal.

## Typed component conversation

Allowed message types:

- `PROPOSE`
- `DISPATCH`
- `REQUEST_INFO`
- `PROVIDE_EVIDENCE`
- `REPORT_BLOCKER`
- `REQUEST_APPROVAL`
- `APPROVAL_DECISION`
- `HANDOFF`
- `REPORT_RESULT`
- `VALIDATION_RESULT`

Every message has `from`, `to`, `taskId`, correlation, optional causation, a bounded JSON payload, and deterministic fingerprints. Causal depth is limited. Duplicate semantic messages are rejected. Likely secret fields are rejected.

Messages cannot mutate task state by themselves. Only the engine transition APIs can do so.

## Owner Gate

| Risk | Effective policy |
|---|---|
| `SAFE` | `AUTO` unless the task explicitly asks for stricter control |
| `LOW` | `AUTO` unless the task explicitly asks for stricter control |
| `MEDIUM` | exact `OWNER` approval |
| `HIGH` | exact `OWNER` approval |
| `UNKNOWN` | `FORBIDDEN` / blocked until risk is classified |

An input cannot downgrade the policy. For example, `approvalLevel: "AUTO"` on a `HIGH` task is escalated to `OWNER`.

The v0.1 browser-safe fingerprint is an integrity/deduplication key for the pure read model, not a cryptographic identity proof. Before connecting any effectful executor, the HYDRA bridge must bind the same proposal to the signed local Owner Session, one-time nonce, policy decision, run/attempt identity, and a real `DV9-RECEIPT/1` SHA-256 receipt.

## Loop and failure protection

- Full DAG validation rejects missing dependencies, self-cycles, and indirect cycles.
- `unlocks` is derived from dependencies; a false declared mapping is rejected.
- Semantic duplicates are fenced before dispatch.
- One current action is bound to one task proposal.
- Approval and result hashes must match the current proposal.
- Approval and result replays are rejected.
- Scheduler transitions have a hard per-run bound.
- Message count, payload size, causal depth, receipt count, action count, and task count are bounded.
- Unknown schemas, states, risks, non-finite scores, and unverified evidence fail closed.
- A blocked branch does not stop an independent safe branch.

## Adapter boundary for the executable Core

The next layer should implement adapters without changing this read model:

1. Intelligence proposals enter through the HYDRA intelligence adapter with `execution_authority=false`.
2. Planёрka validates the plan and emits a coordination-only action envelope.
3. Owner-required actions are signed against the exact proposal through the local Owner Session.
4. HYDROCOOL must allow resources before any worker or organ lease is created.
5. A ready logical task is compiled to a bounded HYDRUNYA task. Planёрka remains the authority for high-level dependencies and admits a task only after verified handoffs.
6. Effectful actions must pass the canonical HYDRA execution route and receipt-before-effect gate.
7. HYDRUNYA or a trusted organ returns a result receipt.
8. A verifier supplies evidence to `recordTaskResult`.
9. Only then does Planёрka unlock downstream work and update the Cockpit metrics.

Do not enqueue the whole high-level graph into a worker queue and treat process exit code zero as goal evidence. That would let downstream work begin before Planёрka verification.

## Current boundary

Implemented now:

- immutable goal/read model;
- strict DAG and derived handoffs;
- deterministic useful-first priority;
- semantic dedupe;
- typed bounded communication;
- exact in-model Owner Gate;
- append-only decision receipts in the returned state;
- evidence-gated completion;
- useful-action and goal-progress metrics;
- fail-closed and idempotency tests.

Not implemented in v0.1:

- network or device transport;
- filesystem or database persistence;
- signed cryptographic owner identity;
- real HYDRUNYA/HYDROCOOL execution adapter;
- autonomous plan mutation or LLM-driven graph rewriting;
- external deployment, messages, payments, purchases, deletion, or credential operations.

These omissions are intentional security boundaries, not hidden simulations.
