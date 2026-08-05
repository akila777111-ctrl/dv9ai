# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## DV9 production launch

Production: <https://www.dv9.com.ua>
Telegram diagnostic: <https://www.dv9.com.ua/api/telegram>
Primary bot: [@DV9_SYSTEMbot](https://t.me/DV9_SYSTEMbot)

A successful site response does not prove that Telegram or AI is configured. Use the preflight and manual checks below. Vite 8 requires Node.js `^20.19.0 || >=22.12.0`.

### Local verification

```bash
npm ci
npm test
npm run lint
npm run build
```

Local `.env*` files are ignored. `.env.example` contains empty placeholders only. Never commit Vercel exports, bot tokens, webhook secrets, AI keys or previously published credentials.

### Vercel Production variables

Open Vercel Dashboard → project `dv9ai` → Settings → Environment Variables:

| Variable | Scope | Sensitive | Required |
|---|---|---:|---:|
| `TELEGRAM_SYSTEM_BOT_TOKEN` | server | yes | yes |
| `TELEGRAM_SYSTEM_WEBHOOK_SECRET` | server | yes | yes |
| `TELEGRAM_OWNER_IDS` | server | no | yes |
| `TELEGRAM_WEBHOOK_BASE_URL` | server | no | yes |
| `DV9_SITE_URL` | server | no | yes |
| `VITE_TELEGRAM_BOT_URL` | browser/build | no | yes |
| `DV9_AI_BASE_URL` | server | no | optional complete AI set |
| `DV9_AI_API_KEY` | server | yes | optional complete AI set |
| `DV9_AI_MODEL` | server | no | optional complete AI set |

Use `https://www.dv9.com.ua` for both production origins and `https://t.me/DV9_SYSTEMbot` for the public browser link. Enter values only in Vercel. Previously published Telegram tokens are compromised and must be revoked/reissued through BotFather before use.

After changing variables, create a new deployment; existing deployments do not receive new values. Preserve the currently READY deployment and commit `a913387` as rollback references until the replacement is verified.

### Safe preflight and webhook registration

The preflight outputs variable names and component status, never values. It validates required presence, production HTTPS URLs, site HTTP, `GET /api/telegram`, deployed system-bot status and complete-or-absent AI configuration. Critical failures return a non-zero exit code.

Link once, then inject Production variables without writing a local env file:

```bash
npx vercel@latest link --project dv9ai
npx vercel@latest env run -e production -- npm run launch:check
```

Expected final gateway state:

```json
{
  "ok": true,
  "service": "dv9-telegram-gateway",
  "configuredBots": ["system"],
  "aiConfigured": false
}
```

`aiConfigured` may be true only when all three server-side AI variables are present.

After preflight succeeds, register and verify the webhook with one command:

```bash
npx vercel@latest env run -e production -- npm run telegram:register
```

The registration script verifies `@DV9_SYSTEMbot`, installs commands, sets the secret-protected webhook and reads the resulting Telegram configuration. It does not log token or webhook-secret values.

Run preflight again after registration:

```bash
npx vercel@latest env run -e production -- npm run launch:check
```

### Manual owner verification

As an ID included in `TELEGRAM_OWNER_IDS`, open [@DV9_SYSTEMbot](https://t.me/DV9_SYSTEMbot) and verify:

```text
/start
/id
/status
/bots
/site
```

The owner must receive a response to every command before the bot is described as live. AI is not live until the endpoint reports `aiConfigured: true` and an owner-only prompt succeeds.

### Rollback

Do not merge until the Vercel preview passes browser checks. If a later production promotion fails, reassign production to the previously READY Vercel deployment. Code baseline before launch work: `a913387` on `main`.

Detailed behavior: [docs/TELEGRAM_BOTS_SETUP_RU.md](docs/TELEGRAM_BOTS_SETUP_RU.md).
