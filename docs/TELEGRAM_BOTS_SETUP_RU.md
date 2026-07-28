# Подключение Telegram-ботов DV9 к Vercel

Архитектура использует один защищённый Vercel endpoint `/api/telegram` и несколько независимых Telegram-ботов. Каждый бот имеет собственный токен и собственный webhook secret; secret приходит от Telegram в заголовке и определяет, какой узел получил сообщение.

## Роли

- `DV9 SYSTEM` — центральный частный диспетчер.
- `DV9 AI PILOT` — AI-диалог и проекты; сначала закрытый, позже можно открыть.
- `DV9 PREMIUM` — премиум-доступ и заявки; сначала закрытый.
- `DV9 CONSTRUCTION` — стройконтроль и документы; сначала закрытый.

Названия в Telegram могут отличаться. Важны токены от `@BotFather` и переменные окружения.

## 1. Получить токены

В Telegram открыть `@BotFather` → `/mybots` → выбрать бота → `API Token`.

Не отправлять токены в чаты, скриншоты, GitHub, клиентский React-код или переменные с префиксом `VITE_`.

## 2. Добавить секреты в Vercel

Vercel → проект DV9 → Settings → Environment Variables. Добавить для Production и Preview:

- `TELEGRAM_SYSTEM_BOT_TOKEN`
- `TELEGRAM_SYSTEM_WEBHOOK_SECRET`
- `TELEGRAM_AIPILOT_BOT_TOKEN`
- `TELEGRAM_AIPILOT_WEBHOOK_SECRET`
- другие пары по необходимости
- `DV9_AI_BASE_URL`
- `DV9_AI_API_KEY`
- `DV9_AI_MODEL`
- `DV9_SITE_URL`
- `VITE_TELEGRAM_BOT_URL`

Webhook secret — случайная строка минимум 16 символов из букв, цифр, `_` и `-`. Пример генерации:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

После изменения переменных сделать новый deployment: старые deployment не получают новые значения автоматически.

## 3. Зарегистрировать webhook

Локально создать `.env.local` по образцу `.env.example`, затем выполнить:

```bash
npm run telegram:register
```

Скрипт:

1. Проверит токены через `getMe`.
2. Установит меню команд.
3. Привяжет всех настроенных ботов к `https://ВАШ-ДОМЕН/api/telegram`.
4. Покажет текущий webhook и последнюю ошибку Telegram, если она есть.

## 4. Проверить

Открыть:

```text
https://ВАШ-ДОМЕН/api/telegram
```

Ответ должен содержать `ok: true`, список `configuredBots` и состояние AI.

Затем в Telegram отправить главному боту:

```text
/start
/status
/id
```

После `/id` добавить свой числовой ID в `TELEGRAM_OWNER_IDS` и заново развернуть проект. До этого частные боты разрешают только безопасные команды запуска и определения ID, а AI-запросы блокируют. После Redeploy доступ получит только владелец.

## 5. AI-провайдер

Gateway ожидает OpenAI-compatible endpoint `/chat/completions`.

Для NVIDIA NIM:

```env
DV9_AI_BASE_URL=https://integrate.api.nvidia.com/v1
DV9_AI_MODEL=moonshotai/kimi-k2.6
```

Для Moonshot:

```env
DV9_AI_BASE_URL=https://api.moonshot.ai/v1
DV9_AI_MODEL=YOUR_AVAILABLE_MODEL
```

Ключ хранится только в `DV9_AI_API_KEY` на сервере Vercel.

## Безопасность

- Токены и AI-ключи никогда не помещаются в `src/` и не имеют префикс `VITE_`.
- Webhook проверяется через `X-Telegram-Bot-Api-Secret-Token`.
- `DV9 SYSTEM` можно ограничить по `TELEGRAM_OWNER_IDS`.
- В диагностике не выводятся токены или ключи.
- При утечке токена его нужно немедленно перевыпустить в `@BotFather`.

Для публичного запуска отдельного бота установи соответствующую переменную `TELEGRAM_<ROLE>_PRIVATE=false` только после подключения лимитов, журналирования и защиты от расхода API-баланса.
