# DV9 HYDRA — AGENT TASKS

Control-plane version: **v0.2**  
Branch: `hydra/control-plane-v0.2`  
Baseline: `main@7fbcc8185098706bf0111721c434a4856ac3f7fc`

## HYDRA-BOOT-001
ID: HYDRA-BOOT-001  
OWNER: HYDRA  
PRIORITY: P1  
STATUS: DONE  
GOAL: Bootstrap the v0.2 orchestration control plane without modifying production code.  
FILES: `control/*`  
LOCKS: control plane  
DEPENDENCIES: merged PR #7 baseline  
INPUT: repository metadata, PR #7 metadata, current dispatcher specification  
EXPECTED OUTPUT: control plane + first parallel wave  
VERIFICATION: files exist on isolated Hydra branch; no production code changed  
HANDOFF TO: CODEX, ROBERT, PERPLEXITY, GROK, DEEPSEEK  
RISK: LOW  
CREATED: 2026-08-07 10:48 +02:00  
UPDATED: 2026-08-07 11:47 +02:00

## CODEX-001
ID: CODEX-001  
OWNER: CODEX  
PRIORITY: P1  
STATUS: QUEUED  
GOAL: Re-verify the merged PR #7 baseline on current `main`, with emphasis on CI/build health and live Telegram/Vercel production readiness, and triage conflicting Vercel commit-status contexts.  
FILES: read existing source/tests/runbooks first; modify only files proven necessary by failed verification  
LOCKS: claim exact files before editing  
DEPENDENCIES: HYDRA-BOOT-001  
INPUT: `main@7fbcc8185098706bf0111721c434a4856ac3f7fc`; PR #7 verification claims; B-001 evidence: `Vercel – dv9ai` success while `Vercel – dv9ai-5a9w` and `Vercel – dv9ai-hal3` report failure  
EXPECTED OUTPUT: fresh verification report; classification of the two failing Vercel contexts; any necessary minimal fix in `agent/codex/CODEX-001`  
VERIFICATION: lint, tests, build, smoke test, git diff review, secret scan; inspect CI/check configuration; verify canonical Vercel mapping; live `/bots` and `/site` if safely available  
HANDOFF TO: GROK, DEEPSEEK, then HYDRA  
RISK: MEDIUM  
CREATED: 2026-08-07 10:48 +02:00  
UPDATED: 2026-08-07 11:47 +02:00

## ROBERT-001
ID: ROBERT-001  
OWNER: ROBERT  
PRIORITY: P2  
STATUS: QUEUED  
GOAL: Convert the current DV9AI technical baseline into a ranked product/asset roadmap and three fastest credible revenue paths.  
FILES: `docs/PRODUCT_OPPORTUNITIES.md`, `docs/REVENUE_PATHS.md`  
LOCKS: those two files only when claimed  
DEPENDENCIES: none; may run in parallel with CODEX-001  
INPUT: repository architecture and verified current capabilities  
EXPECTED OUTPUT: feasibility-ranked product map, time-to-MVP, dependencies, risks, revenue hypotheses  
VERIFICATION: each proposal linked to an existing capability or explicit missing dependency; no invented readiness  
HANDOFF TO: CODEX and HYDRA  
RISK: LOW  
CREATED: 2026-08-07 10:48 +02:00  
UPDATED: 2026-08-07 10:48 +02:00

## PERPLEXITY-001
ID: PERPLEXITY-001  
OWNER: PERPLEXITY  
PRIORITY: P2  
STATUS: QUEUED  
GOAL: Produce fresh external intelligence that can change DV9 product/architecture decisions.  
FILES: `research/EXTERNAL_INTELLIGENCE_2026-08-07.md`  
LOCKS: research file only when claimed  
DEPENDENCIES: none; independent parallel work  
INPUT: AI agents, Telegram AI products, construction AI/BIM/digital twins, grants/accelerators, current relevant standards/APIs  
EXPECTED OUTPUT: source-backed findings with date, impact, feasibility, cost/risk notes, and 10 non-duplicate ideas  
VERIFICATION: source/date/cross-check/confidence for material claims  
HANDOFF TO: ROBERT then HYDRA  
RISK: LOW  
CREATED: 2026-08-07 10:48 +02:00  
UPDATED: 2026-08-07 10:48 +02:00

## GROK-001
ID: GROK-001  
OWNER: GROK  
PRIORITY: P1  
STATUS: QUEUED  
GOAL: Defensive red-team review of the merged Telegram/Vercel architecture and production failure modes.  
FILES: `security/RED_TEAM_REPORT_2026-08-07.md`  
LOCKS: report file only when claimed  
DEPENDENCIES: may start from `main`; final pass should consume CODEX-001 and DEEPSEEK-001 results  
INPUT: current source, PR #7 changes, deployment/runtime boundaries  
EXPECTED OUTPUT: severity-ranked findings, evidence, failure scenario, fix, verification test  
VERIFICATION: no unsupported claims; findings tied to code/config/runtime evidence  
HANDOFF TO: CODEX then HYDRA  
RISK: LOW  
CREATED: 2026-08-07 10:48 +02:00  
UPDATED: 2026-08-07 11:47 +02:00

## DEEPSEEK-001
ID: DEEPSEEK-001  
OWNER: DEEPSEEK  
PRIORITY: P1  
STATUS: QUEUED  
GOAL: Design the DV9 defensive security architecture and Kali-based authorized pentest workflow for repository, local lab and staging boundaries.  
FILES: `security/DEEPSEEK_SECURITY_ARCHITECTURE_2026-08-07.md`, `security/PENTEST_SCOPE.md`  
LOCKS: those two files only when claimed  
DEPENDENCIES: may start from repository architecture; production conclusions require CODEX-001 evidence  
INPUT: current source, deployment boundaries, Telegram/Vercel architecture, secrets-handling rules, CI/runtime assumptions  
EXPECTED OUTPUT: threat model, attack-surface map, defense-in-depth controls, logging/detection plan, Kali lab design, prioritized authorized test matrix, hardening backlog  
VERIFICATION: every finding tied to evidence or explicitly marked hypothesis; active testing limited to local/staging or explicitly authorized targets; no destructive tests, credential attacks, persistence, evasion, or secret exposure  
HANDOFF TO: GROK, CODEX, then HYDRA  
RISK: MEDIUM  
CREATED: 2026-08-07 11:47 +02:00  
UPDATED: 2026-08-07 11:47 +02:00
