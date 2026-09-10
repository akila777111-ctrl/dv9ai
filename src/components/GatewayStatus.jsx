import { useEffect, useMemo, useState } from "react";

const INITIAL_STATUS = {
  phase: "loading",
  systemConfigured: false,
  deploymentMode: "UNKNOWN",
  aiStatus: "UNKNOWN",
  checkedAt: null,
};

/** @param {{ tone: "preview" | "neutral" | "off" | "warning" | "ok" | "error", children: import("react").ReactNode }} props */
function StatusPill({ tone, children }) {
  return <span className={`statusPill statusPill--${tone}`}>{children}</span>;
}

function getRuntimeCopy(status) {
  if (status.phase === "loading") {
    return {
      title: "Проверяем связь с ядром",
      text: "Публичный интерфейс загружен. Runtime-статус появится только после подтверждённого ответа API.",
    };
  }

  if (status.phase === "error") {
    return {
      title: "Статус ядра не подтверждён",
      text: "Сайт доступен, но runtime endpoint сейчас не дал проверяемого ответа. Система не заявляет Production-ready без доказательства.",
    };
  }

  if (status.deploymentMode === "PREVIEW_ONLY") {
    return {
      title: "Безопасный Preview-контур",
      text: "Интерфейс работает в демонстрационном режиме. Платные AI-вызовы и production API не используются.",
    };
  }

  if (!status.systemConfigured) {
    return {
      title: "Production-контур требует настройки",
      text: "Runtime ответил, но готовность системного Telegram-бота не подтверждена.",
    };
  }

  return {
    title: "Production-контур DV9",
    text: "Telegram gateway подтверждён runtime API. Платные AI-вызовы отображаются как включённые только при явном ответе AI_ENABLED.",
  };
}

export default function GatewayStatus() {
  const [status, setStatus] = useState(INITIAL_STATUS);
  const copy = useMemo(() => getRuntimeCopy(status), [status]);
  const isPreview = status.deploymentMode === "PREVIEW_ONLY";

  useEffect(() => {
    const controller = new AbortController();

    async function loadStatus() {
      try {
        const response = await fetch("/api/telegram", {
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok || body?.ok !== true || !Array.isArray(body?.configuredBots)) {
          throw new Error("invalid gateway response");
        }
        setStatus({
          phase: "ready",
          systemConfigured: body.configuredBots.includes("system"),
          deploymentMode: body.deploymentMode === "PREVIEW_ONLY" ? "PREVIEW_ONLY" : "STANDARD",
          aiStatus: body.aiRuntimeStatus === "AI_ENABLED" ? "AI_ENABLED" : "AI_DISABLED",
          checkedAt: new Date().toISOString(),
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setStatus({ ...INITIAL_STATUS, phase: "error", checkedAt: new Date().toISOString() });
        }
      }
    }

    loadStatus();
    return () => controller.abort();
  }, []);

  const checkedLabel = status.checkedAt
    ? new Intl.DateTimeFormat("ru", { hour: "2-digit", minute: "2-digit" }).format(new Date(status.checkedAt))
    : null;

  return (
    <section className={`runtimePanel runtimePanel--${status.phase}`} aria-labelledby="runtime-title">
      <div>
        <p className="sectionLabel">Runtime status / evidence first</p>
        <h2 id="runtime-title">{copy.title}</h2>
        <p>{copy.text}</p>
        {checkedLabel ? <small className="runtimeChecked">Последняя проверка: {checkedLabel}</small> : null}
      </div>
      <div className="runtimeStatuses" aria-live="polite">
        <StatusPill tone={status.phase === "error" ? "error" : isPreview ? "preview" : "neutral"}>
          {status.phase === "error" ? "RUNTIME_UNKNOWN" : status.deploymentMode}
        </StatusPill>
        <StatusPill tone={status.aiStatus === "AI_ENABLED" ? "ok" : status.aiStatus === "AI_DISABLED" ? "off" : "neutral"}>
          {status.aiStatus}
        </StatusPill>
        {status.phase === "loading" ? <StatusPill tone="neutral">GATEWAY_CHECKING</StatusPill> : null}
        {status.phase === "ready" ? (
          <StatusPill tone={status.systemConfigured ? "ok" : "warning"}>
            {status.systemConfigured ? "SYSTEM_BOT_READY" : "SYSTEM_BOT_CONFIG_REQUIRED"}
          </StatusPill>
        ) : null}
        {status.phase === "error" ? <StatusPill tone="error">GATEWAY_UNAVAILABLE</StatusPill> : null}
      </div>
    </section>
  );
}
