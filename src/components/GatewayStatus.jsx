import { useEffect, useState } from "react";

const INITIAL_STATUS = {
  phase: "loading",
  systemConfigured: false,
  deploymentMode: "UNKNOWN",
  aiStatus: "AI_DISABLED",
};

/** @param {{ tone: "preview" | "neutral" | "off" | "warning" | "ok" | "error", children: import("react").ReactNode }} props */
function StatusPill({ tone, children }) {
  return <span className={`statusPill statusPill--${tone}`}>{children}</span>;
}

export default function GatewayStatus() {
  const [status, setStatus] = useState(INITIAL_STATUS);
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

  return (
    <section className="runtimePanel" aria-labelledby="runtime-title">
      <div>
        <p className="sectionLabel">Runtime status</p>
        <h2 id="runtime-title">
          {status.phase === "loading"
            ? "Проверка runtime"
            : isPreview
              ? "Безопасный Preview-контур"
              : "Production-контур DV9"}
        </h2>
        <p>
          {isPreview
            ? "Интерфейс работает в демонстрационном режиме. Платные AI-вызовы и production API не используются."
            : "Telegram gateway работает в Production. Платные AI-вызовы остаются отключёнными до подтверждения владельца."}
        </p>
      </div>
      <div className="runtimeStatuses" aria-live="polite">
        <StatusPill tone={isPreview ? "preview" : "neutral"}>{status.deploymentMode}</StatusPill>
        <StatusPill tone={status.aiStatus === "AI_ENABLED" ? "ok" : "off"}>{status.aiStatus}</StatusPill>
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
