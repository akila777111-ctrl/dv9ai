# DV9 HYDRA — FILE LOCKS

Updated: 2026-08-07 10:48 +02:00

| FILE | OWNER | TASK_ID | LOCKED_AT | PURPOSE |
|---|---|---|---|---|
| `control/AGENT_TASKS.md` | HYDRA | HYDRA-BOOT-001 | 2026-08-07 10:48 +02:00 | orchestration state |
| `control/STATUS_BOARD.md` | HYDRA | HYDRA-BOOT-001 | 2026-08-07 10:48 +02:00 | orchestration state |
| `control/DECISIONS.md` | HYDRA | HYDRA-BOOT-001 | 2026-08-07 10:48 +02:00 | decision log |
| `control/BLOCKERS.md` | HYDRA | HYDRA-BOOT-001 | 2026-08-07 10:48 +02:00 | blocker registry |
| `control/INTEGRATION_QUEUE.md` | HYDRA | HYDRA-BOOT-001 | 2026-08-07 10:48 +02:00 | integration ordering |
| `control/FILE_LOCKS.md` | HYDRA | HYDRA-BOOT-001 | 2026-08-07 10:48 +02:00 | lock registry |
| `control/AGENT_HANDOFFS.md` | HYDRA | HYDRA-BOOT-001 | 2026-08-07 10:48 +02:00 | handoff registry |
| `control/AUTOMATION_BACKLOG.md` | HYDRA | HYDRA-BOOT-001 | 2026-08-07 10:48 +02:00 | automation registry |

## Rule

Agents read `control/*` but do not edit these files during bootstrap. They report results to HYDRA. HYDRA releases or reassigns a lock when a task state requires it.

Agent-specific implementation/research files are unlocked until the corresponding task is CLAIMED; then the claiming agent records the exact file set before editing.
