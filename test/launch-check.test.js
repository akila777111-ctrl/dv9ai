import assert from "node:assert/strict";
import test from "node:test";

import { runLaunchCheck } from "../scripts/launch-check.mjs";

const SECRET_TOKEN = `123456:${"SENSITIVE_TOKEN_".repeat(2)}`;
const SECRET_WEBHOOK = `SENSITIVE_WEBHOOK_${"x".repeat(20)}`;
const SECRET_AI_KEY = `SENSITIVE_AI_KEY_${"y".repeat(20)}`;
const COMPLETE_ENV = {
  TELEGRAM_SYSTEM_BOT_TOKEN: SECRET_TOKEN,
  TELEGRAM_SYSTEM_WEBHOOK_SECRET: SECRET_WEBHOOK,
  TELEGRAM_OWNER_IDS: "42",
  TELEGRAM_WEBHOOK_BASE_URL: "https://www.dv9.com.ua",
  DV9_SITE_URL: "https://www.dv9.com.ua",
  VITE_TELEGRAM_BOT_URL: "https://t.me/DV9_SYSTEMbot",
  DV9_AI_BASE_URL: "https://ai.example.invalid/v1",
  DV9_AI_API_KEY: SECRET_AI_KEY,
  DV9_AI_MODEL: "example-model",
};

function recordingLogger() {
  const messages = [];
  return {
    messages,
    logger: {
      log: (message) => messages.push(message),
      warn: (message) => messages.push(message),
      error: (message) => messages.push(message),
    },
  };
}

function productionFetch({
  configuredBots = ["system"],
  aiConfigured = true,
  aiRuntimeStatus = aiConfigured ? "AI_ENABLED" : "AI_DISABLED",
} = {}) {
  return async (url) => {
    if (new URL(url).pathname === "/api/telegram") {
      return new Response(JSON.stringify({
        ok: true,
        service: "dv9-telegram-gateway",
        configuredBots,
        aiConfigured,
        aiRuntimeStatus,
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("ok", { status: 200 });
  };
}

test("preflight passes without logging secret values", async () => {
  const recording = recordingLogger();
  const result = await runLaunchCheck({
    environment: COMPLETE_ENV,
    fetchImpl: productionFetch(),
    logger: recording.logger,
  });
  const output = recording.messages.join("\n");

  assert.deepEqual(result, { ok: true, criticalCount: 0 });
  assert.equal(output.includes(SECRET_TOKEN), false);
  assert.equal(output.includes(SECRET_WEBHOOK), false);
  assert.equal(output.includes(SECRET_AI_KEY), false);
  assert.match(output, /PASS DV9 launch preflight/);
});

test("preflight fails for missing variables and an unconfigured system bot", async () => {
  const recording = recordingLogger();
  const result = await runLaunchCheck({
    environment: {
      DV9_SITE_URL: COMPLETE_ENV.DV9_SITE_URL,
      TELEGRAM_WEBHOOK_BASE_URL: COMPLETE_ENV.TELEGRAM_WEBHOOK_BASE_URL,
    },
    fetchImpl: productionFetch({ configuredBots: [], aiConfigured: false }),
    logger: recording.logger,
  });
  const output = recording.messages.join("\n");

  assert.equal(result.ok, false);
  assert.ok(result.criticalCount >= 2);
  assert.match(output, /MISSING env TELEGRAM_SYSTEM_BOT_TOKEN/);
  assert.match(output, /system bot: not configured/);
  assert.match(output, /AI_DISABLED/);
});

test("preflight treats partial AI configuration as critical", async () => {
  const recording = recordingLogger();
  const result = await runLaunchCheck({
    environment: { ...COMPLETE_ENV, DV9_AI_MODEL: "" },
    fetchImpl: productionFetch(),
    logger: recording.logger,
  });

  assert.equal(result.ok, false);
  assert.match(recording.messages.join("\n"), /AI: серверные AI-переменные настроены частично/);
});

test("preflight reports preview-only AI without exposing provider values", async () => {
  const recording = recordingLogger();
  const result = await runLaunchCheck({
    environment: { ...COMPLETE_ENV, VERCEL_ENV: "preview", DV9_AI_ENABLED: "true" },
    fetchImpl: productionFetch({ aiConfigured: false }),
    logger: recording.logger,
  });

  assert.equal(result.ok, true);
  assert.match(recording.messages.join("\n"), /PREVIEW_ONLY AI/);
  assert.equal(recording.messages.join("\n").includes(SECRET_AI_KEY), false);
});

test("preflight fails when containment blocks an enabled AI runtime", async () => {
  const recording = recordingLogger();
  const result = await runLaunchCheck({
    environment: { ...COMPLETE_ENV, DV9_AI_ENABLED: "true" },
    fetchImpl: productionFetch({
      aiConfigured: false,
      aiRuntimeStatus: "AI_BLOCKED_BY_CONTAINMENT",
    }),
    logger: recording.logger,
  });
  const output = recording.messages.join("\n");

  assert.equal(result.ok, false);
  assert.match(output, /CRITICAL AI_BLOCKED_BY_CONTAINMENT/);
  assert.match(output, /FAIL DV9 launch preflight/);
  assert.equal(output.includes(SECRET_AI_KEY), false);
});
