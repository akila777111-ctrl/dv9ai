# DV9AI Architecture Overview

This document describes the public repository boundary, not the full private DV9 ecosystem.

## Public runtime path

```text
Browser / Web UI
      |
      v
React + Vite frontend
      |
      +----------------------+
      |                      |
      v                      v
Public runtime status   Telegram users
                             |
                             v
                    /api/telegram (server)
                             |
          +------------------+------------------+
          |                  |                  |
          v                  v                  v
     owner gate        Telegram API      optional AI gateway
                                               |
                                               v
                                  OpenAI-compatible provider
```

## Main boundaries

### Browser layer

The browser receives only public configuration. Sensitive tokens and provider keys must never use browser-exposed variables.

### Telegram gateway

`api/telegram.js` resolves configured bot roles from server-side environment variables, verifies webhook secrets, applies access rules and dispatches commands.

The system bot is designed to remain private. Other bot roles may support explicit public mode only when separately configured and protected.

### AI gateway

AI calls are optional and disabled by default. A complete provider configuration is not enough on its own: runtime activation also requires the explicit `DV9_AI_ENABLED=true` gate, and preview deployments remain blocked.

### Preflight / deployment tooling

The launch tooling verifies required environment names and public runtime contracts without printing secret values. Webhook registration reads credentials from the environment rather than from committed local files.

## Reliability model

The repository follows these design preferences:

- explicit state over implicit success;
- fail-closed authorization;
- reproducible checks before deployment;
- rollback-aware production changes;
- tests for security-sensitive control flow;
- no credential values in diagnostics;
- planned capabilities are not presented as verified capabilities.

## Demonstrator track

The TRL4 draft protocol defines repeatable scenarios for startup, deterministic task execution, worker failure, state recovery, resource pressure, unauthorized actions, replay handling and receipt integrity.

Those scenarios are a target evidence model. They must not be interpreted as completed evidence until actual runs and artefacts exist.
