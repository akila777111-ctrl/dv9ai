import { existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const TELEGRAM_API = "https://api.telegram.org";

function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const separator = line.indexOf("=");
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

loadLocalEnv();

const botDefinitions = [
  ["system", "TELEGRAM_SYSTEM_BOT_TOKEN", "TELEGRAM_SYSTEM_WEBHOOK_SECRET"],
  ["aipilot", "TELEGRAM_AIPILOT_BOT_TOKEN", "TELEGRAM_AIPILOT_WEBHOOK_SECRET"],
  ["premium", "TELEGRAM_PREMIUM_BOT_TOKEN", "TELEGRAM_PREMIUM_WEBHOOK_SECRET"],
  ["construction", "TELEGRAM_CONSTRUCTION_BOT_TOKEN", "TELEGRAM_CONSTRUCTION_WEBHOOK_SECRET"],
];

const baseUrl = String(process.env.TELEGRAM_WEBHOOK_BASE_URL || process.env.DV9_SITE_URL || "")
  .trim()
  .replace(/\/$/, "");

if (!baseUrl.startsWith("https://")) {
  console.error("TELEGRAM_WEBHOOK_BASE_URL должен быть публичным HTTPS-адресом, например https://dv9.com.ua");
  process.exit(1);
}

const webhookUrl = `${baseUrl}/api/telegram`;

const configuredSecrets = botDefinitions
  .map(([id, , secretEnv]) => [id, String(process.env[secretEnv] || "").trim()])
  .filter(([, secret]) => secret);
const duplicateSecrets = configuredSecrets.filter(
  ([, secret], index, all) => all.findIndex(([, candidate]) => candidate === secret) !== index,
);
if (duplicateSecrets.length > 0) {
  console.error(`Webhook secrets должны быть уникальными. Повтор найден у: ${duplicateSecrets.map(([id]) => id).join(", ")}`);
  process.exit(1);
}

function validateSecret(secret, id) {
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(secret)) {
    throw new Error(
      `${id}: webhook secret должен содержать 16-256 символов A-Z, a-z, 0-9, _ или -. Сгенерируй: ${randomBytes(24).toString("hex")}`,
    );
  }
}

async function telegram(token, method, body = {}) {
  const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    throw new Error(result?.description || `HTTP ${response.status}`);
  }
  return result.result;
}

const commands = [
  { command: "start", description: "Запустить DV9" },
  { command: "status", description: "Проверить состояние узла" },
  { command: "id", description: "Показать Telegram ID" },
  { command: "bots", description: "Показать сеть ботов DV9" },
  { command: "site", description: "Открыть сайт DV9" },
  { command: "help", description: "Помощь" },
];

let registered = 0;
for (const [id, tokenEnv, secretEnv] of botDefinitions) {
  const token = String(process.env[tokenEnv] || "").trim();
  const secret = String(process.env[secretEnv] || "").trim();
  if (!token && !secret) continue;
  if (!token || !secret) {
    console.error(`${id}: нужны обе переменные ${tokenEnv} и ${secretEnv}`);
    process.exitCode = 1;
    continue;
  }

  try {
    validateSecret(secret, id);
    const me = await telegram(token, "getMe");
    await telegram(token, "setMyCommands", { commands });
    await telegram(token, "setWebhook", {
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message", "edited_message", "callback_query"],
      drop_pending_updates: false,
    });
    const info = await telegram(token, "getWebhookInfo");
    console.log(`✅ ${id}: @${me.username} → ${info.url || webhookUrl}`);
    if (info.last_error_message) {
      console.warn(`   Последняя ошибка Telegram: ${info.last_error_message}`);
    }
    registered += 1;
  } catch (error) {
    console.error(`❌ ${id}: ${error.message}`);
    process.exitCode = 1;
  }
}

if (registered === 0) {
  console.error("Не найдено ни одной пары BOT_TOKEN + WEBHOOK_SECRET в .env.local или переменных окружения.");
  process.exitCode = 1;
} else {
  console.log(`\nГотово: подключено ботов — ${registered}. Endpoint: ${webhookUrl}`);
}
