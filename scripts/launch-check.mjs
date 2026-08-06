import { pathToFileURL } from "node:url";

const REQUIRED_ENV = [
  "TELEGRAM_SYSTEM_BOT_TOKEN",
  "TELEGRAM_SYSTEM_WEBHOOK_SECRET",
  "TELEGRAM_OWNER_IDS",
  "TELEGRAM_WEBHOOK_BASE_URL",
  "DV9_SITE_URL",
  "VITE_TELEGRAM_BOT_URL",
];
const AI_ENV = ["DV9_AI_BASE_URL", "DV9_AI_API_KEY", "DV9_AI_MODEL"];
const REQUEST_TIMEOUT_MS = 10000;

function present(environment, name) {
  return typeof environment[name] === "string" && environment[name].trim().length > 0;
}

function httpsOrigin(environment, name) {
  if (!present(environment, name)) return null;
  try {
    const url = new URL(environment[name]);
    if (
      url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      (url.pathname !== "/" && url.pathname !== "")
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function loggerMethod(logger, method) {
  return typeof logger?.[method] === "function" ? logger[method].bind(logger) : () => {};
}

async function safeFetch(fetchImpl, url, accept) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetchImpl(url, {
      method: "GET",
      headers: { accept },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function runLaunchCheck({
  environment = process.env,
  fetchImpl = globalThis.fetch,
  logger = console,
} = {}) {
  const log = loggerMethod(logger, "log");
  const warn = loggerMethod(logger, "warn");
  const error = loggerMethod(logger, "error");
  const critical = [];

  log("DV9 launch preflight: значения переменных не выводятся.");
  const missing = REQUIRED_ENV.filter((name) => !present(environment, name));
  for (const name of REQUIRED_ENV) {
    log(`${present(environment, name) ? "OK" : "MISSING"} env ${name}`);
  }
  if (missing.length > 0) critical.push("required-env");

  const siteOrigin = httpsOrigin(environment, "DV9_SITE_URL");
  const webhookOrigin = httpsOrigin(environment, "TELEGRAM_WEBHOOK_BASE_URL");
  if (present(environment, "DV9_SITE_URL") && !siteOrigin) {
    error("CRITICAL DV9_SITE_URL: требуется HTTPS origin без credentials, path, query или hash.");
    critical.push("site-url-format");
  }
  if (present(environment, "TELEGRAM_WEBHOOK_BASE_URL") && !webhookOrigin) {
    error("CRITICAL TELEGRAM_WEBHOOK_BASE_URL: требуется HTTPS origin без credentials, path, query или hash.");
    critical.push("webhook-url-format");
  }
  if (siteOrigin && webhookOrigin && siteOrigin !== webhookOrigin) {
    error("CRITICAL site и Telegram webhook должны использовать один production origin.");
    critical.push("origin-mismatch");
  }

  const aiPresent = AI_ENV.filter((name) => present(environment, name));
  const aiEnabled = environment.DV9_AI_ENABLED?.trim().toLowerCase() === "true";
  const previewOnly = environment.VERCEL_ENV?.trim().toLowerCase() === "preview";
  if (aiPresent.length === 0) {
    warn("NOT_CONFIGURED AI: отсутствуют все три серверные AI-переменные.");
  } else if (aiPresent.length !== AI_ENV.length) {
    error("CRITICAL AI: серверные AI-переменные настроены частично.");
    critical.push("partial-ai-config");
  } else {
    log("OK AI env: все три серверные AI-переменные присутствуют.");
  }
  if (previewOnly) warn("PREVIEW_ONLY AI: платные provider-вызовы отключены.");
  else if (!aiEnabled) warn("AI_DISABLED: требуется явный DV9_AI_ENABLED=true после подтверждения владельца.");

  if (typeof fetchImpl !== "function") {
    error("CRITICAL runtime: fetch недоступен.");
    critical.push("fetch-unavailable");
  } else if (siteOrigin) {
    try {
      const siteResponse = await safeFetch(fetchImpl, siteOrigin, "text/html");
      if (!siteResponse.ok) {
        error(`CRITICAL production site: HTTP ${siteResponse.status}.`);
        critical.push("site-http");
      } else log(`OK production site: HTTP ${siteResponse.status}.`);
    } catch {
      error("CRITICAL production site: network/timeout failure.");
      critical.push("site-network");
    }

    try {
      const endpoint = new URL("/api/telegram", siteOrigin);
      const gatewayResponse = await safeFetch(fetchImpl, endpoint, "application/json");
      const body = await gatewayResponse.json().catch(() => null);
      if (!gatewayResponse.ok || body?.ok !== true ||
          body?.service !== "dv9-telegram-gateway" ||
          !Array.isArray(body?.configuredBots) || typeof body?.aiConfigured !== "boolean") {
        error("CRITICAL Telegram gateway: invalid HTTP or diagnostic contract.");
        critical.push("gateway-contract");
      } else {
        log(`OK Telegram gateway: HTTP ${gatewayResponse.status}.`);
        if (body.configuredBots.includes("system")) {
          log("OK Telegram system bot: deployment configuration detected.");
        } else {
          error("CRITICAL Telegram system bot: not configured in current deployment.");
          critical.push("system-bot-not-configured");
        }
        if (body.aiRuntimeStatus === "PREVIEW_ONLY") warn("PREVIEW_ONLY AI: gateway blocks provider calls.");
        else if (body.aiRuntimeStatus === "AI_DISABLED") warn("AI_DISABLED: gateway blocks provider calls.");
        else if (body.aiConfigured) log("OK AI: deployment configuration detected.");
        else warn("NOT_CONFIGURED AI: gateway reports aiConfigured=false.");
      }
    } catch {
      error("CRITICAL Telegram gateway: network/timeout failure.");
      critical.push("gateway-network");
    }
  }

  const ok = critical.length === 0;
  if (ok) log("PASS DV9 launch preflight.");
  else error(`FAIL DV9 launch preflight: critical checks failed (${critical.length}).`);
  return { ok, criticalCount: critical.length };
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  runLaunchCheck()
    .then((result) => { if (!result.ok) process.exitCode = 1; })
    .catch(() => {
      console.error("FAIL DV9 launch preflight: internal error; secret values were not logged.");
      process.exitCode = 1;
    });
}
