import assert from "node:assert/strict";
import test from "node:test";

import telegramHandler from "../api/telegram.js";

const ENV_NAMES = [
  "TELEGRAM_SYSTEM_BOT_TOKEN",
  "TELEGRAM_SYSTEM_WEBHOOK_SECRET",
  "TELEGRAM_SYSTEM_PRIVATE",
  "TELEGRAM_OWNER_IDS",
  "DV9_AI_BASE_URL",
  "DV9_AI_API_KEY",
  "DV9_AI_MODEL",
  "DV9_SITE_URL",
];
const BOT_TOKEN = `123456:${"A".repeat(24)}`;
const WEBHOOK_SECRET = `test_${"x".repeat(24)}`;

async function withEnvironment(values, callback) {
  const previous = Object.fromEntries(ENV_NAMES.map((name) => [name, process.env[name]]));
  for (const name of ENV_NAMES) delete process.env[name];
  Object.assign(process.env, values);
  try {
    return await callback();
  } finally {
    for (const name of ENV_NAMES) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
}

function telegramApiResponse(result) {
  return new Response(JSON.stringify({ ok: true, result }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function telegramFetchRecorder() {
  const calls = [];
  return {
    calls,
    fetch: async (url, options) => {
      calls.push({
        method: new URL(url).pathname.split("/").at(-1),
        body: JSON.parse(options.body),
      });
      return telegramApiResponse(true);
    },
  };
}

function updateRequest(text, fromId = 42, secret = WEBHOOK_SECRET) {
  return new Request("https://www.dv9.com.ua/api/telegram", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": secret,
    },
    body: JSON.stringify({
      update_id: 100,
      message: {
        text,
        chat: { id: fromId },
        from: { id: fromId },
      },
    }),
  });
}

test("GET exposes only the safe diagnostic contract", async () => {
  await withEnvironment(
    {
      TELEGRAM_SYSTEM_BOT_TOKEN: BOT_TOKEN,
      TELEGRAM_SYSTEM_WEBHOOK_SECRET: WEBHOOK_SECRET,
      DV9_SITE_URL: "https://www.dv9.com.ua",
    },
    async () => {
      const response = await telegramHandler.fetch(
        new Request("https://www.dv9.com.ua/api/telegram"),
      );
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.deepEqual(Object.keys(body).sort(), [
        "aiConfigured",
        "configuredBots",
        "ok",
        "service",
        "timestamp",
      ]);
      assert.deepEqual(body.configuredBots, ["system"]);
      assert.equal(body.aiConfigured, false);
      assert.equal(Number.isNaN(Date.parse(body.timestamp)), false);
      assert.equal(JSON.stringify(body).includes(BOT_TOKEN), false);
      assert.equal(JSON.stringify(body).includes(WEBHOOK_SECRET), false);
    },
  );
});

test("webhook rejects a wrong secret but acknowledges bootstrap restrictions", async () => {
  await withEnvironment(
    {
      TELEGRAM_SYSTEM_BOT_TOKEN: BOT_TOKEN,
      TELEGRAM_SYSTEM_WEBHOOK_SECRET: WEBHOOK_SECRET,
      DV9_SITE_URL: "https://www.dv9.com.ua",
    },
    async () => {
      const originalFetch = globalThis.fetch;
      const recorder = telegramFetchRecorder();
      globalThis.fetch = recorder.fetch;
      try {
        const unauthorized = await telegramHandler.fetch(updateRequest("/start", 42, "wrong"));
        assert.equal(unauthorized.status, 401);

        for (const command of ["/start", "/help", "/status", "/id"]) {
          const before = recorder.calls.length;
          const response = await telegramHandler.fetch(updateRequest(command));
          assert.equal(response.status, 200);
          assert.equal(recorder.calls.length, before + 1);
          assert.equal(recorder.calls.at(-1).method, "sendMessage");
        }

        for (const blockedInput of ["/bots", "/site", "Запусти AI-задачу"]) {
          const before = recorder.calls.length;
          const response = await telegramHandler.fetch(updateRequest(blockedInput));
          assert.equal(response.status, 200);
          assert.equal(recorder.calls.length, before + 1);
          assert.match(recorder.calls.at(-1).body.text, /TELEGRAM_OWNER_IDS/);
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
});

test("all six commands work for the owner and AI remains owner-only", async () => {
  await withEnvironment(
    {
      TELEGRAM_SYSTEM_BOT_TOKEN: BOT_TOKEN,
      TELEGRAM_SYSTEM_WEBHOOK_SECRET: WEBHOOK_SECRET,
      TELEGRAM_SYSTEM_PRIVATE: "false",
      TELEGRAM_OWNER_IDS: "42",
      DV9_SITE_URL: "https://www.dv9.com.ua",
    },
    async () => {
      const originalFetch = globalThis.fetch;
      const recorder = telegramFetchRecorder();
      globalThis.fetch = recorder.fetch;
      try {
        for (const command of ["/start", "/status", "/id", "/bots", "/site", "/help"]) {
          const before = recorder.calls.length;
          const response = await telegramHandler.fetch(updateRequest(command, 42));
          assert.equal(response.status, 200);
          assert.equal(recorder.calls.length, before + 1);
          assert.equal(recorder.calls.at(-1).method, "sendMessage");
        }

        const ownerAiStart = recorder.calls.length;
        const ownerAiResponse = await telegramHandler.fetch(updateRequest("Проверь систему", 42));
        assert.equal(ownerAiResponse.status, 200);
        assert.deepEqual(
          recorder.calls.slice(ownerAiStart).map((call) => call.method),
          ["sendChatAction", "sendMessage"],
        );

        const outsiderStart = recorder.calls.length;
        const outsiderResponse = await telegramHandler.fetch(updateRequest("Проверь систему", 99));
        assert.equal(outsiderResponse.status, 200);
        assert.deepEqual(
          recorder.calls.slice(outsiderStart).map((call) => call.method),
          ["sendMessage"],
        );
        assert.match(recorder.calls.at(-1).body.text, /ограничен владельцем/);
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
});
