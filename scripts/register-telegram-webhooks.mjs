import { pathToFileURL } from "node:url";

const TELEGRAM_API = "https://api.telegram.org";
const WEBHOOK_PATH = "/api/telegram";
const ALLOWED_UPDATES = ["message", "edited_message", "callback_query"];
const SECRET_GENERATION_COMMAND =
  'node -e "console.log(require(\'node:crypto\').randomBytes(32).toString(\'base64url\'))"';

const BOT_DEFINITIONS = [
  {
    id: "system",
    tokenEnv: "TELEGRAM_SYSTEM_BOT_TOKEN",
    secretEnv: "TELEGRAM_SYSTEM_WEBHOOK_SECRET",
    expectedUsername: "DV9_SYSTEMbot",
    required: true,
  },
  {
    id: "aipilot",
    tokenEnv: "TELEGRAM_AIPILOT_BOT_TOKEN",
    secretEnv: "TELEGRAM_AIPILOT_WEBHOOK_SECRET",
  },
  {
    id: "premium",
    tokenEnv: "TELEGRAM_PREMIUM_BOT_TOKEN",
    secretEnv: "TELEGRAM_PREMIUM_WEBHOOK_SECRET",
  },
  {
    id: "construction",
    tokenEnv: "TELEGRAM_CONSTRUCTION_BOT_TOKEN",
    secretEnv: "TELEGRAM_CONSTRUCTION_WEBHOOK_SECRET",
  },
];

export const TELEGRAM_COMMANDS = [
  { command: "start", description: "Запустить DV9" },
  { command: "status", description: "Проверить состояние узла" },
  { command: "id", description: "Показать Telegram ID" },
  { command: "bots", description: "Показать сеть ботов DV9" },
  { command: "site", description: "Открыть сайт DV9" },
  { command: "help", description: "Помощь" },
];

function env(environment, name) {
  const value = environment[name];
  return typeof value === "string" ? value.trim() : "";
}

function normalizeHttpsUrl(value, name) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} должен быть корректным публичным HTTPS URL.`);
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname !== "/" && parsed.pathname !== "")
  ) {
    throw new Error(`${name} должен быть HTTPS origin без path, query, логина или пароля.`);
  }
  return parsed.origin;
}

function validateToken(token, id) {
  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) {
    throw new Error(`${id}: ${BOT_DEFINITIONS.find((bot) => bot.id === id)?.tokenEnv} имеет неверный формат.`);
  }
}

function validateSecret(secret, id) {
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(secret)) {
    throw new Error(
      `${id}: webhook secret должен содержать 16-256 символов A-Z, a-z, 0-9, _ или -. ` +
        `Создай новый локально: ${SECRET_GENERATION_COMMAND}`,
    );
  }
}

function redact(value, sensitiveValues) {
  let safe = String(value || "");
  for (const sensitive of sensitiveValues) {
    if (sensitive) safe = safe.split(sensitive).join("[REDACTED]");
  }
  return safe;
}

function loggerMethod(logger, method) {
  return typeof logger?.[method] === "function" ? logger[method].bind(logger) : () => {};
}

async function telegram(fetchImpl, token, method, body, sensitiveValues) {
  let response;
  try {
    response = await fetchImpl(`${TELEGRAM_API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(`Telegram ${method}: ошибка сети.`);
  }

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    const description = result?.description || `HTTP ${response.status}`;
    throw new Error(`Telegram ${method}: ${redact(description, sensitiveValues)}`);
  }
  return result.result;
}

function sameCommands(actual) {
  if (!Array.isArray(actual) || actual.length !== TELEGRAM_COMMANDS.length) return false;
  return TELEGRAM_COMMANDS.every(
    (expected, index) =>
      actual[index]?.command === expected.command && actual[index]?.description === expected.description,
  );
}

function sameAllowedUpdates(actual) {
  if (!Array.isArray(actual)) return true;
  return (
    actual.length === ALLOWED_UPDATES.length &&
    ALLOWED_UPDATES.every((updateType) => actual.includes(updateType))
  );
}

function buildConfiguration(environment) {
  const errors = [];
  const rawBaseUrl = env(environment, "TELEGRAM_WEBHOOK_BASE_URL");
  const rawSiteUrl = env(environment, "DV9_SITE_URL");
  const rawOwnerIds = env(environment, "TELEGRAM_OWNER_IDS");

  if (!rawBaseUrl) errors.push("Отсутствует обязательная TELEGRAM_WEBHOOK_BASE_URL.");
  if (!rawSiteUrl) errors.push("Отсутствует обязательная DV9_SITE_URL.");

  let baseUrl = "";
  let siteUrl = "";
  if (rawBaseUrl) {
    try {
      baseUrl = normalizeHttpsUrl(rawBaseUrl, "TELEGRAM_WEBHOOK_BASE_URL");
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (rawSiteUrl) {
    try {
      siteUrl = normalizeHttpsUrl(rawSiteUrl, "DV9_SITE_URL");
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (baseUrl && siteUrl && baseUrl !== siteUrl) {
    errors.push("TELEGRAM_WEBHOOK_BASE_URL и DV9_SITE_URL должны указывать на один origin.");
  }
  const ownerIds = rawOwnerIds
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (ownerIds.some((ownerId) => !/^\d+$/.test(ownerId))) {
    errors.push("TELEGRAM_OWNER_IDS должен содержать только числовые user ID через запятую или пробел.");
  }

  const bots = BOT_DEFINITIONS.map((definition) => ({
    ...definition,
    token: env(environment, definition.tokenEnv),
    secret: env(environment, definition.secretEnv),
  }));

  for (const bot of bots) {
    if (bot.required && !bot.token) {
      errors.push(`Отсутствует обязательная ${bot.tokenEnv}.`);
    }
    if (bot.required && !bot.secret) {
      errors.push(`Отсутствует обязательная ${bot.secretEnv}.`);
      errors.push(`Создай secret локально: ${SECRET_GENERATION_COMMAND}`);
      errors.push(
        `Добавь результат в Vercel → проект dv9ai → Settings → Environment Variables → ` +
          `${bot.secretEnv} → Sensitive → Production, затем сделай Redeploy.`,
      );
    }
    if (!bot.required && Boolean(bot.token) !== Boolean(bot.secret)) {
      errors.push(`${bot.id}: нужны обе переменные ${bot.tokenEnv} и ${bot.secretEnv}.`);
    }
  }

  const activeBots = bots.filter((bot) => bot.token && bot.secret);
  const duplicateSecretBots = activeBots.filter(
    (bot, index, all) => all.findIndex((candidate) => candidate.secret === bot.secret) !== index,
  );
  if (duplicateSecretBots.length > 0) {
    errors.push(
      `Webhook secrets должны быть уникальными. Повтор найден у: ` +
        `${duplicateSecretBots.map((bot) => bot.id).join(", ")}.`,
    );
  }

  for (const bot of activeBots) {
    try {
      validateToken(bot.token, bot.id);
      validateSecret(bot.secret, bot.id);
    } catch (error) {
      errors.push(error.message);
    }
  }

  return {
    errors,
    bots: activeBots,
    webhookUrl: baseUrl ? `${baseUrl}${WEBHOOK_PATH}` : "",
    ownerIdsConfigured: ownerIds.length > 0,
  };
}

export async function registerTelegramWebhooks({
  environment = process.env,
  fetchImpl = globalThis.fetch,
  logger = console,
} = {}) {
  const log = loggerMethod(logger, "log");
  const warn = loggerMethod(logger, "warn");
  const errorLog = loggerMethod(logger, "error");
  const configuration = buildConfiguration(environment);

  if (configuration.errors.length > 0) {
    for (const error of configuration.errors) errorLog(`❌ ${error}`);
    return { ok: false, registered: 0, failed: configuration.errors.length };
  }
  if (typeof fetchImpl !== "function") {
    errorLog("❌ Текущий Node.js runtime не предоставляет fetch.");
    return { ok: false, registered: 0, failed: 1 };
  }
  if (!configuration.ownerIdsConfigured) {
    warn(
      "⚠️ TELEGRAM_OWNER_IDS не задан: bootstrap-режим разрешит только /start, /help, /status и /id.",
    );
  }

  let registered = 0;
  let failed = 0;
  for (const bot of configuration.bots) {
    const sensitiveValues = [bot.token, bot.secret];
    try {
      const call = (method, body = {}) =>
        telegram(fetchImpl, bot.token, method, body, sensitiveValues);
      const me = await call("getMe");
      if (
        bot.expectedUsername &&
        String(me?.username || "").toLowerCase() !== bot.expectedUsername.toLowerCase()
      ) {
        throw new Error(`getMe вернул не @${bot.expectedUsername}; проверь ${bot.tokenEnv}.`);
      }

      await call("setMyCommands", { commands: TELEGRAM_COMMANDS });
      const installedCommands = await call("getMyCommands");
      if (!sameCommands(installedCommands)) {
        throw new Error("Telegram не подтвердил полный набор команд.");
      }

      await call("setWebhook", {
        url: configuration.webhookUrl,
        secret_token: bot.secret,
        allowed_updates: ALLOWED_UPDATES,
        drop_pending_updates: false,
      });
      const webhookInfo = await call("getWebhookInfo");
      if (webhookInfo?.url !== configuration.webhookUrl) {
        throw new Error("getWebhookInfo вернул неожиданный URL.");
      }
      if (!sameAllowedUpdates(webhookInfo?.allowed_updates)) {
        throw new Error("getWebhookInfo вернул неожиданный список allowed_updates.");
      }

      log(
        `✅ ${bot.id}: @${me.username}; webhook и команды проверены; ` +
          `pending updates: ${Number(webhookInfo?.pending_update_count) || 0}.`,
      );
      if (webhookInfo?.last_error_message) {
        warn(
          `⚠️ ${bot.id}: последняя ошибка доставки Telegram: ` +
            redact(webhookInfo.last_error_message, sensitiveValues),
        );
      }
      registered += 1;
    } catch (error) {
      errorLog(`❌ ${bot.id}: ${redact(error?.message || "неизвестная ошибка", sensitiveValues)}`);
      failed += 1;
    }
  }

  if (registered > 0 && failed === 0) {
    log(
      `Готово: подключено ботов — ${registered}. Endpoint: ${configuration.webhookUrl}. ` +
        "Токены и webhook secrets не выводились.",
    );
  }
  return { ok: registered > 0 && failed === 0, registered, failed };
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  registerTelegramWebhooks()
    .then((result) => {
      if (!result.ok) process.exitCode = 1;
    })
    .catch(() => {
      console.error("❌ Регистрация webhook завершилась внутренней ошибкой без изменения секретов.");
      process.exitCode = 1;
    });
}
