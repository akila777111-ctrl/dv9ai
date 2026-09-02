import { useEffect, useState } from "react";

const INITIAL_STATUS = {
  phase: "loading",
  systemConfigured: false,
  deploymentMode: "UNKNOWN",
  aiStatus: "UNKNOWN",
};

/** @param {{ tone: "preview" | "neutral" | "off" | "warning" | "ok" | "error", children: import("react").ReactNode }} props */
function StatusPill({ tone, children }) {
  return <span className={`statusPill statusPill--${tone}`}>{children}</span>;
}

function normalizeMode(value) {
  if (typeof value !== "string" || !value.trim()) return "UNKNOWN";
  return value.trim().toUpperCase();
}

function normalizeAiStatus(value) {
  if (typeof value !== "string" || !value.trim()) return "UNKNOWN";
  return value.trim().toUpperCase();
}

export default function GatewayStatus() {
  const [status, setStatus] = useState(INITIAL_STATUS);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStatus() {
      try {
        const response = await fetch("/api/telegram", {
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        const body = await response.json();

        if (!response.ok || body?.ok !== true) {
          throw new Error("invalid gateway response");
        }

        const configuredBots = Array.isArray(body?.configuredBots) ? body.configuredBots : [];
        setStatus({
          phase: "ready",
          systemConfigured: configuredBots.includes("system"),
          deploymentMode: normalizeMode(body?.deploymentMode),
          aiStatus: normalizeAiStatus(body?.aiRuntimeStatus),
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setStatus({ ...INITIAL_STATUS, phase: "error" });
        }
      }
    }

    loadStatus();
    return () => controller.abort();
  }, []);

  const aiTone = status.aiStatus.includes("ENABLED") || status.aiStatus.includes("READY") || status.aiStatus.includes("ONLINE")
    ? "ok"
    : status.aiStatus === "UNKNOWN"
      ? "neutral"
      : "warning";

  return (
    <section className="runtimePanel" aria-labelledby="runtime-title">
      <div>
        <p className="sectionLabel">LIVE / CONNECTOR STATUS</p>
        <h2 id="runtime-title">
          {status.phase === "loading"
            ? "Синхронизация с DV9 runtime"
            : status.phase === "error"
              ? "Runtime сейчас не отвечает"
              : "DV9 runtime обнаружен"}
        </h2>
        <p>
          {status.phase === "loading"
            ? "Читаю фактическое состояние gateway и подключённых сервисов."
            : status.phase === "error"
              ? "Интерфейс продолжает работать; runtime появится здесь автоматически после подключения."
              : "Панель показывает состояние, которое сообщает backend. Политики, ключи и права подключаются отдельной конфигурацией."}
        </p>
      </div>
      <div className="runtimeStatuses" aria-live="polite">
        <StatusPill tone={status.phase === "error" ? "error" : "neutral"}>{status.deploymentMode}</StatusPill>
        <StatusPill tone={aiTone}>{status.aiStatus}</StatusPill>
        {status.phase === "loading" ? <StatusPill tone="neutral">SYNCING</StatusPill> : null}
        {status.phase === "ready" ? (
          <StatusPill tone={status.systemConfigured ? "ok" : "warning"}>
            {status.systemConfigured ? "SYSTEM_CONNECTOR_READY" : "SYSTEM_CONNECTOR_OPEN"}
          </StatusPill>
        ) : null}
        {status.phase === "error" ? <StatusPill tone="error">GATEWAY_OFFLINE</StatusPill> : null}
      </div>
    </section>
  );
}
