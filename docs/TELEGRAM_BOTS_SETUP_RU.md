# Подключение Telegram-ботов DV9 к Vercel

Production-проект: `dv9ai`. Production-домен: `https://www.dv9.com.ua`.

Архитектура использует один Vercel Node Function endpoint `/api/telegram` и несколько независимых Telegram-ботов. Каждый бот имеет собственный токен и webhook secret. Telegram передаёт secret в заголовке `X-Telegram-Bot-Api-Secret-Token`; endpoint по нему выбирает нужный узел.

Главный бот — `@DV9_SYSTEMbot`. Его backend всегда работает в частном fail-closed режиме. Остальные роли уже предусмотрены:

- `DV9 SYSTEM` — центральный диспетчер;
- `DV9 AI PILOT` — AI-диалог и проекты;
- `DV9 PREMIUM` — премиум-доступ и заявки;
- `DV9 CONSTRUCTION` — стройконтроль и документы.

## 1. Обязательные переменные Vercel

Открыть Vercel Dashboard → проект `dv9ai` → Settings → Environment Variables. Добавить в `Production`:

```env
TELEGRAM_SYSTEM_BOT_TOKEN=<token от @BotFather>
TELEGRAM_SYSTEM_WEBHOOK_SECRET=<случайный secret>
TELEGRAM_OWNER_IDS=<числовой Telegram user ID; несколько через запятую>
TELEGRAM_WEBHOOK_BASE_URL=https://www.dv9.com.ua
DV9_SITE_URL=https://www.dv9.com.ua
```

`TELEGRAM_SYSTEM_BOT_TOKEN` и `TELEGRAM_SYSTEM_WEBHOOK_SECRET` нужно пометить как Sensitive. Не использовать для них префикс `VITE_`: переменные `VITE_*` попадают в клиентский bundle.

Для ссылки сайта на главного бота добавить build-time переменную:

```env
VITE_TELEGRAM_BOT_URL=https://t.me/DV9_SYSTEMbot
```

После добавления или изменения переменных обязательно сделать новый Production Redeploy: существующий deployment не получает новые значения автоматически.

## 2. Если webhook secret ещё не создан

Сгенерировать его локально:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Не отправлять результат в чат и не добавлять его в `.env.example`, Git, README, клиентский код или командную строку регистрации.

Добавить результат в Vercel Dashboard → `dv9ai` → Settings → Environment Variables:

- Name: `TELEGRAM_SYSTEM_WEBHOOK_SECRET`;
- Environment: `Production`;
- включить Sensitive;
- сохранить и сделать Production Redeploy.

## 3. Подготовить владельца

Пока `TELEGRAM_OWNER_IDS` пуст, бот разрешает только:

```text
/start
/help
/status
/id
```

Отправить `/id` боту, скопировать числовой user ID в `TELEGRAM_OWNER_IDS` и сделать Redeploy. Пробелы и запятые между несколькими ID поддерживаются.

После настройки owner ID главный бот принимает `/bots`, `/site`, неизвестные команды и свободный AI-текст только от владельца. Попытки других пользователей получают обычный ответ, а webhook всё равно подтверждается HTTP `200`, чтобы Telegram не создавал очередь повторных доставок.

Переменная `TELEGRAM_SYSTEM_PRIVATE=false` намеренно не может открыть главный системный бот. Для будущих ролей public mode допускается только явной переменной `TELEGRAM_<ROLE>_PRIVATE=false` после добавления rate limits, контроля бюджета и abuse-защиты.

## 4. Зарегистрировать webhook без локального файла с токеном

Скрипт читает секреты только из `process.env`. Он намеренно не загружает `.env`, `.env.local` и другие файлы.

Один раз связать checkout с проектом:

```bash
npx vercel@latest link --project dv9ai
```

Затем запустить регистрацию напрямую с Production environment Vercel, не записывая секреты на диск:

```bash
npx vercel@latest env run -e production -- npm run telegram:register
```

Скрипт для каждого настроенного бота:

1. проверяет токен через `getMe`;
2. для системного токена подтверждает username `@DV9_SYSTEMbot`;
3. выполняет `setMyCommands`;
4. читает `getMyCommands` и сверяет все шесть команд;
5. выполняет `setWebhook` с secret header и endpoint `https://www.dv9.com.ua/api/telegram`;
6. читает `getWebhookInfo` и проверяет URL и `allowed_updates`.

Токен и webhook secret в консоль не выводятся. Дополнительные боты регистрируются тем же скриптом после добавления соответствующей пары:

```env
TELEGRAM_AIPILOT_BOT_TOKEN=
TELEGRAM_AIPILOT_WEBHOOK_SECRET=
TELEGRAM_PREMIUM_BOT_TOKEN=
TELEGRAM_PREMIUM_WEBHOOK_SECRET=
TELEGRAM_CONSTRUCTION_BOT_TOKEN=
TELEGRAM_CONSTRUCTION_WEBHOOK_SECRET=
```

Каждый webhook secret должен быть уникальным.

## 5. Диагностика endpoint

Открыть:

```text
https://www.dv9.com.ua/api/telegram
```

GET возвращает только:

```json
{
  "ok": true,
  "service": "dv9-telegram-gateway",
  "configuredBots": ["system"],
  "aiConfigured": false,
  "timestamp": "ISO-8601 timestamp"
}
```

`configuredBots` содержит бот только когда в текущем deployment присутствуют и token, и webhook secret. Токены, ключи и secrets endpoint не возвращает.

Vercel Node runtime поддерживает используемый Web Standard handler `export default { fetch(request) { ... } }`, `Request` и `Response`: <https://vercel.com/docs/functions/runtimes/node-js>.

## 6. Проверить команды

В `@DV9_SYSTEMbot` последовательно отправить:

```text
/start
/status
/id
/bots
/site
/help
```

До добавления owner ID команды `/bots` и `/site` должны быть закрыты. После Redeploy с правильным `TELEGRAM_OWNER_IDS` все шесть команд должны отвечать владельцу.

## 7. Опциональное AI-ядро

Без этих переменных Telegram-команды работают, а `aiConfigured` остаётся `false`:

```env
DV9_AI_BASE_URL=https://integrate.api.nvidia.com/v1
DV9_AI_API_KEY=<sensitive provider key>
DV9_AI_MODEL=moonshotai/kimi-k2.6
DV9_AI_ENABLED=false
DV9_AI_TIMEOUT_MS=45000
```

Gateway ожидает OpenAI-compatible endpoint `/chat/completions`. `DV9_AI_API_KEY` хранить только как Sensitive server-side переменную Vercel. Платные вызовы требуют отдельного подтверждения владельца и `DV9_AI_ENABLED=true`; в Preview они всегда заблокированы со статусом `PREVIEW_ONLY`.

## Безопасность

- Не передавать токены или keys в чаты, issue, скриншоты и логи.
- Не коммитить `.env`, `.env.local` и выгрузки Vercel.
- Webhook принимает POST только с корректным Telegram secret header.
- Диагностический GET не раскрывает конфигурационные значения.
- Ошибки backend логируются без сырых ответов провайдера, токенов и secrets.
- При утечке Telegram token немедленно перевыпустить его через `@BotFather`, заменить в Vercel и повторить регистрацию webhook.
