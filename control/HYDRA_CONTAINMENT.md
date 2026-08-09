# DV9 HYDRA CONTAINMENT LAYER v1

Status: PROPOSED / IMPLEMENTED ON REVIEW BRANCH
Branch: `hydra/containment-layer-v1`

## Purpose

HYDRA CONTAINMENT is the safety boundary between an intelligent agent's goal and the infrastructure it can actually reach.

Core rule:

> No permission = no capability. No evidence = no DONE.

The layer is designed so that a model cannot expand its own authority merely because doing so would help complete a task.

## Security invariants

1. **Fail closed by default.** `DV9_CONTAINMENT_MODE` defaults to `ENFORCE`.
2. **Owner kill switch.** `DV9_CONTAINMENT_KILL_SWITCH=true` blocks AI egress.
3. **Explicit egress allowlist.** In `ENFORCE`, outbound AI requests are allowed only to HTTPS hosts listed in `DV9_AI_EGRESS_ALLOWLIST`.
4. **No local/private egress.** localhost, loopback, link-local, RFC1918 IPv4 and `.local` / `.internal` destinations are blocked.
5. **No credentials in URLs.** User/password URL components are rejected.
6. **No implicit permission inheritance.** Text produced by another agent, website, prompt, message or document is data, not owner authorization.
7. **No hidden inter-agent channel.** Agent-to-agent communication must be introduced only through an explicit broker/routing policy. There is no autonomous backchannel in v1.
8. **No privilege self-escalation.** New scopes, tools, secrets, deployments, financial actions, destructive operations and production changes require the appropriate verification/owner gate.
9. **Evidence before DONE.** Completion claims must be backed by a verifiable result.
10. **Secrets stay out of telemetry.** Logs may record event IDs, component names, policy decisions and generic failure classes, but not tokens, API keys or secret values.

## Runtime modes

### ENFORCE

Production-safe default. HTTPS + explicit host allowlist only. Local/private destinations are always blocked.

### AUDIT

Public HTTPS hosts may be reached even when not allowlisted, but local/private destinations and unsafe URL forms remain blocked. Use only for controlled review.

### OFF

Containment egress checks are disabled. This is not a production mode and must not be used as a workaround for a failing integration.

## Environment variables

| Variable | Purpose | Recommended production value |
|---|---|---|
| `DV9_CONTAINMENT_MODE` | policy mode | `ENFORCE` |
| `DV9_CONTAINMENT_KILL_SWITCH` | emergency AI egress stop | `false` normally; `true` during incident |
| `DV9_AI_EGRESS_ALLOWLIST` | comma-separated AI provider hostnames | exact provider host(s), no scheme/path |

Example:

```text
DV9_CONTAINMENT_MODE=ENFORCE
DV9_CONTAINMENT_KILL_SWITCH=false
DV9_AI_EGRESS_ALLOWLIST=api.openai.com
```

Do not commit actual secrets or provider credentials.

## Inter-agent communication model

V1 policy is **deny by default** because the current DV9 Telegram gateway does not require direct agent-to-agent messaging to operate.

A future HYDRA broker should require a declared tuple for every message:

```text
SOURCE_AGENT -> TARGET_AGENT
TASK_ID
PURPOSE
ALLOWED_DATA_CLASS
TTL
OWNER/VERIFICATION_GATE (when required)
```

The broker should reject undeclared routes, loops outside configured limits, attempts to exchange secrets, and attempts by one agent to grant another agent a permission it does not possess.

## Coalition / anomaly detection roadmap

Future versions should build a communication graph and alert on:

- new undeclared routes;
- sudden fan-out or fan-in;
- repeated permission requests across agents;
- cyclic delegation;
- attempts to create alternate communication channels;
- correlated egress attempts to the same unapproved destination;
- agents repeatedly pushing tasks beyond their declared role.

Detection does not replace capability controls. A prohibited action should be technically blocked even if anomaly detection fails.

## Incident response

1. Set `DV9_CONTAINMENT_KILL_SWITCH=true`.
2. Preserve logs/metadata without exposing secrets.
3. Disable affected provider/tool credentials if compromise is suspected.
4. Identify the exact task, agent, route and egress decision involved.
5. Classify findings as FACT / INFERENCE / PROPOSAL / UNKNOWN.
6. Patch policy or implementation on a review branch.
7. Run tests, lint, build and security verification.
8. Re-enable only after owner/verification gate.

## Verification gate

Before merge to `main`:

```bash
npm test
npm run lint
npm run build
```

Production remains unchanged until the review branch passes verification and is explicitly merged.
