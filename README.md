# DV9AI

**DV9AI** is an actively maintained AI orchestration and engineering-control project focused on auditable automation, fail-closed execution, secure agent coordination, reproducible operations and edge-aware workflows.

[![CI](https://github.com/akila777111-ctrl/dv9ai/actions/workflows/ci.yml/badge.svg)](https://github.com/akila777111-ctrl/dv9ai/actions/workflows/ci.yml)

- Production: <https://www.dv9.com.ua>
- Primary Telegram bot: <https://t.me/DV9_SYSTEMbot>
- Runtime diagnostic: <https://www.dv9.com.ua/api/telegram>

## What is in this repository

This repository currently contains the public DV9AI web/runtime layer and the supporting engineering evidence used to develop the broader DV9 architecture.

| Area | Purpose |
| --- | --- |
| Web cockpit | React/Vite interface for the DV9 public-facing control surface |
| Telegram gateway | Server-side multi-bot gateway with owner access controls |
| AI gateway | Optional OpenAI-compatible provider bridge, disabled unless explicitly enabled |
| Launch preflight | Value-redacted production checks for environment and runtime state |
| CI | Automated lint, test and build verification |
| TRL4 preparation | Reproducible laboratory-demonstrator protocol and eligibility planning |

## Engineering principles

DV9AI is developed around a few strict rules:

- **Fail closed** when authorization, configuration or runtime state is ambiguous.
- **Secrets stay server-side** and are never committed to the repository.
- **Owner-controlled activation** for sensitive or paid runtime capabilities.
- **Auditable behavior** through explicit states, receipts/logs and reproducible checks.
- **No unsupported claims**: planned, tested and production-ready states are kept separate.

## Quick start

Requirements: Node.js `^20.19.0 || >=22.12.0`.

```bash
git clone https://github.com/akila777111-ctrl/dv9ai.git
cd dv9ai
npm ci
npm test
npm run lint
npm run build
npm run dev
```

The local application uses empty/default configuration unless environment variables are provided. Copy `.env.example` only as a reference; do not commit local `.env*` files.

## Configuration and secrets

The repository intentionally contains **no production credentials**. Tokens, webhook secrets and AI provider keys belong in the deployment platform's sensitive environment-variable store.

Important variables include:

```text
TELEGRAM_SYSTEM_BOT_TOKEN
TELEGRAM_SYSTEM_WEBHOOK_SECRET
TELEGRAM_OWNER_IDS
TELEGRAM_WEBHOOK_BASE_URL
DV9_SITE_URL
VITE_TELEGRAM_BOT_URL
DV9_AI_BASE_URL
DV9_AI_API_KEY
DV9_AI_MODEL
DV9_AI_ENABLED
```

`DV9_AI_ENABLED=false` is the safe default. Preview deployments must not make paid AI-provider calls.

See [`docs/TELEGRAM_BOTS_SETUP_RU.md`](docs/TELEGRAM_BOTS_SETUP_RU.md) for the production runbook.

## Verification

Before any production change:

```bash
npm ci
npm test
npm run lint
npm run build
```

For the production preflight:

```bash
npx vercel@latest link --project dv9ai
npx vercel@latest env run -e production -- npm run launch:check
```

Webhook registration is explicit:

```bash
npx vercel@latest env run -e production -- npm run telegram:register
```

These scripts are designed not to print credential values.

## Research / demonstrator track

The repository also contains a conservative TRL4 preparation track for an auditable orchestration and recovery layer for distributed/autonomous software systems.

- [`docs/VDI_VDE_TRL4_EXECUTION_PLAN_2026-09-07.md`](docs/VDI_VDE_TRL4_EXECUTION_PLAN_2026-09-07.md)
- [`docs/VDI_VDE_TRL4_LAB_DEMO_PROTOCOL_DRAFT.md`](docs/VDI_VDE_TRL4_LAB_DEMO_PROTOCOL_DRAFT.md)

The protocol is explicitly marked as a draft. DV9AI does **not** claim TRL4 until the defined evidence gates have actually passed.

## Project status

Current public focus:

1. harden the public runtime and contributor surface;
2. keep CI reproducible and secret-safe;
3. expand auditable orchestration modules;
4. assemble repeatable laboratory evidence for failure/recovery scenarios;
5. document architecture and contribution boundaries for external collaborators.

## Contributing

Contributions are welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request.

Security issues and suspected credential exposure must **not** be posted in a public issue. See [`SECURITY.md`](SECURITY.md).

## Maintainer

Primary maintainer: [@akila777111-ctrl](https://github.com/akila777111-ctrl)

## License

A repository-wide open-source license has not yet been selected. Until a license is added, public visibility alone does not grant reuse rights beyond those provided by applicable law. License selection is an explicit maintainer decision and will be recorded separately.
