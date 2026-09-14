# Contributing to DV9AI

Thanks for helping improve DV9AI.

## Development workflow

1. Create a focused branch from `main`.
2. Keep changes small enough to review and reproduce.
3. Add or update tests for behavior changes.
4. Run the complete verification set before opening a pull request:

```bash
npm ci
npm test
npm run lint
npm run build
```

## Pull-request expectations

A pull request should explain:

- what changed;
- why the change is needed;
- how it was tested;
- any security, deployment or compatibility impact;
- rollback considerations for production-facing changes.

Do not describe work as complete unless the relevant checks have actually passed.

## Security boundaries

Never commit:

- API keys, bot tokens or webhook secrets;
- `.env` files or Vercel environment exports;
- private keys, session cookies or authentication material;
- personal data that is not required for the project;
- production credentials in screenshots, logs or test fixtures.

Use synthetic values in tests and examples.

Sensitive runtime changes should preserve fail-closed defaults and explicit owner activation.

## Scope

Good contributions include reliability, tests, documentation, accessibility, reproducibility, secure orchestration, observability and contributor tooling.

Large architectural changes should first be proposed in an issue so the intended boundary and acceptance criteria are clear.
