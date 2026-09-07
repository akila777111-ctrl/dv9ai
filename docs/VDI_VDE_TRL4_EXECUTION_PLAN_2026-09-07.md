# DV9 / VDI-VDE — TRL4 EXECUTION & ELIGIBILITY PLAN

Date: 2026-09-07
Status: ACTIVE / DO NOT CLAIM ELIGIBILITY UNTIL GATES PASS

## 1. Target funding call

BMFTR: **Souveräne Innovationsökosysteme für Cybersicherheit und Kommunikationstechnologien**.

Submission deadline for stage-1 project sketch: **2026-10-15**.

VDI/VDE contact feedback received by email on 2026-09-07:
- demonstrator must have reached **at least TRL 4**; **TRL 5–6 recommended**;
- consortium must already be fixed when the project sketch is submitted;
- auditability, reliability and recovery can fall within the cybersecurity scope.

## 2. Formal gates from the funding conditions

Do not treat the project as eligible until every required gate below has evidence.

### GATE A — Consortium
- [ ] At least one commercial company participates.
- [ ] At least one university or research institution participates.
- [ ] A commercial company coordinates the consortium.
- [ ] All consortium partners are fixed before sketch submission.
- [ ] Written partner confirmation for the sketch is available.

### GATE B — Scientific origin / research basis
- [ ] The funded innovation is demonstrably based on innovation/research from a participating scientific institution.
- [ ] The underlying research work is identified and evidenced.
- [ ] The relationship between that research and the proposed core innovation is documented without overstating DV9's history.

**Current status: BLOCKED / not yet evidenced in this repository.**

### GATE C — Demonstrator maturity
- [ ] One precise core innovation is frozen for the funding application.
- [ ] The innovation has been successfully demonstrated in a controlled laboratory-like environment.
- [ ] A reproducible test protocol exists.
- [ ] Test inputs, failure injections, expected outcomes and actual outcomes are recorded.
- [ ] Logs / receipts / state transitions are preserved as evidence.
- [ ] Independent repeat of the demonstration is possible from documented steps.

Target: **TRL 4 minimum; TRL 5–6 preferred.**

### GATE D — IP / rights
- [ ] Core IP is identified.
- [ ] Ownership and usage rights are mapped by partner.
- [ ] Consortium has the rights needed to execute and commercialize the project.
- [ ] IP-use declaration is prepared for the formal application stage.

### GATE E — Commercialization
- [ ] Coordinating company has a central economic interest in commercialization.
- [ ] Product/service after the project is defined.
- [ ] Target customer and market problem are defined.
- [ ] Positive market perspective is evidenced.
- [ ] Industrial use case is concrete and measurable.

### GATE F — Cooperation / project execution
- [ ] Work packages and partner responsibilities exist.
- [ ] Person-month estimates exist.
- [ ] Risk management exists.
- [ ] Demonstrator termination milestone within 24 months after project start is defined.
- [ ] Cooperation agreement path is defined.
- [ ] German establishment/branch requirement at payout is verified for relevant beneficiaries.

## 3. Proposed DV9 core innovation for this call

Working definition:

> **Auditable orchestration and recovery layer for distributed / autonomous software systems** with explicit execution receipts, safety/reliability gates, resource-aware control and deterministic recovery evidence.

Scope must remain narrow enough to demonstrate scientifically and measure objectively.

Construction/industrial operations can serve as an **industrial use case**, but the funded technical core should remain the cybersecurity/reliability innovation.

## 4. TRL4 laboratory demonstrator — required evidence package

Create one reproducible demonstrator with the following controlled scenario:

1. Start 3 isolated workers/nodes under an orchestrator.
2. Execute a defined task graph.
3. Generate immutable or tamper-evident execution/event receipts.
4. Inject a worker crash.
5. Verify state reconstruction and controlled recovery.
6. Inject resource pressure and verify governor throttling/defer behavior.
7. Inject invalid/unauthorized action and verify fail-closed behavior.
8. Restart the orchestrator and verify recovery from persisted state.
9. Produce a final machine-readable and human-readable audit trail.
10. Repeat the full run from clean state.

Required artefacts:
- `LAB_DEMO_PROTOCOL.md`
- `LAB_DEMO_ARCHITECTURE.md`
- `LAB_DEMO_RESULTS.md`
- `LAB_DEMO_RISK_REGISTER.md`
- `LAB_DEMO_IP_MATRIX.md`
- `LAB_DEMO_MARKET_USE_CASE.md`
- raw logs / receipts
- exact commit SHA
- test command set
- environment specification
- pass/fail acceptance criteria

## 5. Current evidence visible in GitHub

The repository already contains engineering evidence useful for the maturity dossier:
- automated `npm test`, `npm run lint`, `npm run build` verification paths;
- GitHub Actions CI history;
- production launch preflight;
- secret-handling rules;
- explicit rollback reference;
- Telegram gateway / production deployment documentation.

These are useful supporting artefacts, but **they do not by themselves prove TRL 4 for the proposed funded core innovation**. A dedicated laboratory demonstrator and evidence package are still required.

## 6. Critical blockers as of 2026-09-07

### P0
1. **Scientific-origin gate not evidenced.** Need a participating Hochschule/Forschungseinrichtung whose research genuinely underpins the funded innovation.
2. **Consortium not fixed.** Need company + science partner, with commercial company coordinator.
3. **TRL4 dossier not yet assembled.** Existing engineering tests are not a formal demonstrator dossier.
4. **Coordinator/applicant legal status must be verified.** Do not assume current personal project status automatically satisfies the commercial-company requirement.
5. **IP matrix not yet documented.**

### P1
6. Freeze one industrial use case and measurable KPIs.
7. Prepare 12-page sketch structure.
8. Prepare work packages, budget logic and risk plan.

## 7. Execution order

1. **Eligibility first** — resolve science-origin + commercial coordinator + partner commitments.
2. **Freeze core innovation** — no broad DV9 ecosystem description in the application.
3. **Build TRL4 lab demonstrator** — reproducible, measurable, fail/recover scenarios.
4. **Create evidence dossier** — logs, receipts, protocol, results, commit SHA.
5. **Lock industrial use case** — measurable customer problem and market path.
6. **Build consortium work plan** — roles, WPs, person-months, IP.
7. **Draft stage-1 sketch** — maximum 12 A4 pages plus easy-Online form as required.
8. **Internal red-team review** — remove unsupported claims and verify every eligibility statement.
9. **Submit before 2026-10-15** only if all mandatory gates are green.

## 8. Owner rule

No statement such as `TRL4 achieved`, `eligible`, `consortium formed`, `research-origin proven`, `IP cleared`, or `partner committed` may be used externally without evidence.

This plan converts the funding conditions into engineering and consortium gates; it does not itself establish eligibility.
