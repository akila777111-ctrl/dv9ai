import assert from "node:assert/strict";
import test from "node:test";

import { runVercelTelegramPostbuild } from "../scripts/vercel-telegram-postbuild.mjs";

function recordingLogger() {
  const entries = [];
  return {
    entries,
    logger: {
      log: (message) => entries.push(String(message)),
      warn: (message) => entries.push(String(message)),
      error: (message) => entries.push(String(message)),
    },
  };
}

test("postbuild skips local and Preview builds", async () => {
  let calls = 0;
  const recording = recordingLogger();
  const result = await runVercelTelegramPostbuild({
    environment: { VERCEL_ENV: "preview" },
    register: async () => {
      calls += 1;
      return { ok: true };
    },
    logger: recording.logger,
  });

  assert.deepEqual(result, { ok: true, skipped: true });
  assert.equal(calls, 0);
  assert.match(recording.entries.join("\n"), /skipped outside Vercel Production/);
});

test("postbuild registers only in Vercel Production without logging credentials", async () => {
  const token = `123456:${"A".repeat(24)}`;
  const secret = `secret_${"x".repeat(24)}`;
  const environment = {
    VERCEL_ENV: "production",
    TELEGRAM_SYSTEM_BOT_TOKEN: token,
    TELEGRAM_SYSTEM_WEBHOOK_SECRET: secret,
  };
  const recording = recordingLogger();
  let receivedEnvironment;
  const result = await runVercelTelegramPostbuild({
    environment,
    register: async ({ environment: received }) => {
      receivedEnvironment = received;
      return { ok: true, registered: 1, failed: 0 };
    },
    logger: recording.logger,
  });
  const output = recording.entries.join("\n");

  assert.equal(receivedEnvironment, environment);
  assert.deepEqual(result, {
    ok: true,
    registered: 1,
    failed: 0,
    skipped: false,
  });
  assert.equal(output.includes(token), false);
  assert.equal(output.includes(secret), false);
});
