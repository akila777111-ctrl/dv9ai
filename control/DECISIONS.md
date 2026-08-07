# DV9 HYDRA — DECISIONS

## D-001 — Isolated control-plane branch
Date: 2026-08-07  
Decision: bootstrap Hydra v0.2 on `hydra/control-plane-v0.2`, not directly on `main`.  
Reason: Codex and other agents may be working in parallel; control-plane bootstrap must not disturb production code.  
Status: ACTIVE

## D-002 — Verified evidence beats remembered state
Date: 2026-08-07  
Decision: PR #7 metadata is accepted as historical evidence only. Fresh runtime/build verification is required before declaring current production health DONE.  
Status: ACTIVE

## D-003 — First wave is intentionally non-overlapping
Date: 2026-08-07  
Decision: CODEX verifies/repairs production engineering; ROBERT writes product/revenue docs; PERPLEXITY writes external research; GROK writes a defensive review.  
Reason: maximize parallelism without shared-file edits.  
Status: ACTIVE

## D-004 — HYDRA owns control-plane files
Date: 2026-08-07  
Decision: `control/*` is single-writer by HYDRA during bootstrap. Agents provide handoffs; HYDRA updates orchestration state.  
Status: ACTIVE

## D-005 — No autonomous irreversible production or financial actions
Date: 2026-08-07  
Decision: deployment-destructive, secret-rotation, DNS-destructive, mainnet, liquidity, purchases, exchange submissions, or real financial actions require owner approval.  
Status: ACTIVE
