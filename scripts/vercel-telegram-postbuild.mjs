import { pathToFileURL } from "node:url";

import { registerTelegramWebhooks } from "./register-telegram-webhooks.mjs";

export async function runVercelTelegramPostbuild({
  environment = process.env,
  register = registerTelegramWebhooks,
  logger = console,
} = {}) {
  if (environment.VERCEL_ENV !== "production") {
    logger.log("Telegram webhook postbuild: skipped outside Vercel Production.");
    return { ok: true, skipped: true };
  }

  logger.log("Telegram webhook postbuild: verifying Production bot identity, commands and webhook.");
  const result = await register({ environment, logger });
  return { ...result, skipped: false };
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runVercelTelegramPostbuild()
    .then((result) => {
      if (!result.ok) process.exitCode = 1;
    })
    .catch(() => {
      console.error("Telegram webhook postbuild failed without exposing credentials.");
      process.exitCode = 1;
    });
}
