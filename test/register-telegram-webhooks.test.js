import assert from "node:assert/strict";
import test from "node:test";

import {
  registerTelegramWebhooks,
  TELEGRAM_COMMANDS,
} from "../scripts/register-telegram-webhooks.mjs";

const BOT_TOKEN = `123456:${"A".repeat(24)}`;
const WEBHOOK_SECRET = `test_${"x".repeat(24)}`;
const BASE_ENV = {
  TELEGRAM_SYSTEM_BOT_TOKEN: BOT_TOKEN,
  TELEGRAM_SYSTEM_WEBHOOK_SECRET: WEBHOOK_SECRET,
  TELEGRAM_OWNER_IDS: "42",
  TELEGRAM_WEBHOOK_BASE_URL: "https://www.dv9.com.ua",
  DV9_SITE_URL: "https://www.dv9.com.ua",
};

function recordingLogger() {
  const entries = [];
  return {
    entries,
    logger: {
      log: (message) => entries.push(["log", message]),
      warn: (message) => entries.push(["warn", message]),
      error: (message) => entries.push(["error", message]),
    },
  };
}

function telegramResponse(result) {
  return new Response(JSON.stringify({ ok: true, result }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

test("missing webhook secret fails safely and prints only a generation command", async () => {
  const recording = recordingLogger();
  const result = await registerTelegramWebhooks({
    environment: {
      ...BASE_ENV,
      TELEGRAM_SYSTEM_WEBHOOK_SECRET: "",
    },
    fetchImpl: async () => {
      throw new Error("network must not be called");
    },
    logger: recording.logger,
  });
  const output = recording.entries.map(([, message]) => message).join("\n");

  assert.equal(result.ok, false);
  assert.equal(result.registered, 0);
  assert.match(output, /randomBytes\(32\)/);
  assert.match(output, /Vercel → проект dv9ai → Settings → Environment Variables/);
  assert.match(output, /Sensitive → Production/);
  assert.equal(output.includes(BOT_TOKEN), false);
  assert.equal(output.includes(WEBHOOK_SECRET), false);
});

test("registration verifies identity, commands and webhook without logging secrets", async () => {
  const recording = recordingLogger();
  const calls = [];
  const fetchImpl = async (url, options) => {
    const method = new URL(url).pathname.split("/").at(-1);
    const body = JSON.parse(options.body);
    calls.push({ method, body });

    if (method === "getMe") {
      return telegramResponse({ id: 123456, is_bot: true, username: "DV9_SYSTEMbot" });
    }
    if (method === "getMyCommands") return telegramResponse(TELEGRAM_COMMANDS);
    if (method === "getWebhookInfo") {
      return telegramResponse({
        url: "https://www.dv9.com.ua/api/telegram",
        pending_update_count: 0,
        allowed_updates: ["message", "edited_message", "callback_query"],
      });
    }
    return telegramResponse(true);
  };

  const result = await registerTelegramWebhooks({
    environment: BASE_ENV,
    fetchImpl,
    logger: recording.logger,
  });
  const output = recording.entries.map(([, message]) => message).join("\n");

  assert.deepEqual(
    calls.map((call) => call.method),
    ["getMe", "setMyCommands", "getMyCommands", "setWebhook", "getWebhookInfo"],
  );
  assert.deepEqual(
    calls.find((call) => call.method === "setMyCommands").body.commands.map(({ command }) => command),
    ["start", "status", "id", "bots", "site", "help"],
  );
  assert.equal(
    calls.find((call) => call.method === "setWebhook").body.url,
    "https://www.dv9.com.ua/api/telegram",
  );
  assert.equal(result.ok, true);
  assert.equal(result.registered, 1);
  assert.equal(output.includes(BOT_TOKEN), false);
  assert.equal(output.includes(WEBHOOK_SECRET), false);
});
