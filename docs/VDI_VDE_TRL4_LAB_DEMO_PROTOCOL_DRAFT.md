# DV9 TRL4 LAB DEMONSTRATOR — DRAFT PROTOCOL

Date: 2026-09-07
Purpose: produce reproducible evidence for a laboratory demonstration of the proposed cybersecurity core innovation.

## Status

DRAFT / NOT YET EXECUTED / NOT EVIDENCE OF TRL4

## 1. Core innovation under test

**Auditable orchestration and recovery layer for distributed/autonomous software systems**.

Functions under test:
- controlled worker orchestration;
- explicit execution/event receipts;
- authorization / safety gates;
- resource-aware throttling / defer behavior;
- persistent state and controlled recovery;
- reproducible audit trail after failures.

## 2. Laboratory environment

The final run must record exact values for:
- OS and version;
- CPU/RAM/storage;
- runtime versions;
- Git commit SHA;
- dependency lock hash;
- node/worker count;
- network mode;
- configuration profile;
- time source;
- log/receipt directory;
- clean-state reset command.

Secrets must not appear in evidence artefacts.

## 3. Acceptance rules

Every scenario has only three states:
- `PASS` — observed result matches the predefined criterion and evidence is preserved;
- `FAIL` — observed result contradicts criterion;
- `BLOCKED` — test could not run; blocker documented.

No manual reinterpretation of a failed criterion as PASS.

## 4. Scenarios

### S01 — clean startup

Precondition: clean persistent state.

Action:
1. start orchestrator;
2. register 3 isolated workers;
3. verify identities and expected capabilities.

PASS when:
- exactly the expected workers are registered;
- no unauthorized worker is accepted;
- startup events are recorded.

Evidence:
- startup log;
- worker registry snapshot;
- receipts / event IDs.

### S02 — deterministic task graph

Action:
1. submit a fixed task graph;
2. execute the same graph twice from clean state.

PASS when:
- required task ordering is preserved;
- terminal state is correct;
- audit trail can reconstruct what executed and in what order.

### S03 — worker crash

Action:
1. start a multi-step task;
2. kill one worker at a predefined point.

PASS when:
- failure is detected;
- unsafe continuation is blocked;
- recovery policy is applied;
- duplicate side effects are prevented or explicitly detected;
- receipt chain records failure and recovery.

### S04 — orchestrator restart / state recovery

Action:
1. stop orchestrator during a defined workflow state;
2. restart it;
3. reload persisted state.

PASS when:
- state is reconstructed according to policy;
- ambiguous work is not silently marked successful;
- recovery actions are auditable.

### S05 — resource pressure

Action:
1. reduce available resource budget or generate controlled load;
2. submit work above threshold.

PASS when:
- governor enters expected THROTTLE/DEFER/STOP mode;
- no uncontrolled worker multiplication occurs;
- reason and threshold state are recorded.

### S06 — unauthorized action

Action:
1. submit an action without required owner/role authorization.

PASS when:
- action is denied fail-closed;
- no side effect occurs;
- denial is recorded without exposing secrets.

### S07 — malformed / replayed command

Action:
1. submit malformed command;
2. replay a previously accepted command/receipt where replay protection is applicable.

PASS when:
- invalid input is rejected;
- replay is rejected or safely idempotent according to declared protocol;
- decision is auditable.

### S08 — receipt integrity

Action:
1. complete a valid run;
2. alter a stored evidence record in a controlled copy.

PASS when:
- tampering is detected by the declared integrity mechanism, or
- if tamper detection is not implemented, test is marked FAIL/BLOCKED and no contrary claim is made.

### S09 — repeated clean run

Action:
1. reset environment;
2. repeat S01–S08 from documented instructions.

PASS when:
- results are reproducible within declared tolerances;
- deviations are recorded and explained.

## 5. Metrics

Record at minimum:
- task success/failure count;
- detected failure latency;
- recovery latency;
- number of duplicate side effects;
- unauthorized actions accepted (target: 0);
- missing receipts/events;
- unrecoverable states;
- CPU/RAM peak for the run;
- total runtime;
- reproducibility delta between run 1 and run 2.

## 6. Evidence bundle

Final evidence directory should contain:

```text
trl4-evidence/
  manifest.json
  environment.txt
  commit.txt
  protocol.md
  results.md
  metrics.json
  risk-register.md
  logs/
  receipts/
  screenshots-or-diagrams/
  hashes.sha256
```

`manifest.json` must list every evidence file and SHA-256 hash.

## 7. Exit criterion

This protocol may support a TRL4 claim only after:
- all mandatory scenarios have actually run;
- results and raw evidence are preserved;
- failures are not hidden;
- the relevant scientific/consortium eligibility gates are separately satisfied;
- a competent project partner/reviewer accepts the demonstration as relevant to the call.

Until then use: **"TRL4 evidence preparation in progress"**, not **"TRL4 achieved"**.
