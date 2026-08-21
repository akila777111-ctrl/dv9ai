import { useEffect, useState } from "react";

const INITIAL = {
  phase: "loading",
  mode: "UNKNOWN",
  executionEvidence: "UNKNOWN",
  ownerGate: "UNKNOWN",
  replayVerifier: "UNKNOWN",
  capabilities: [],
  invariants: [],
};

function Pill({ tone, children }) {
  return <span className={`statusPill statusPill--${tone}`}>{children}</span>;
}

export default function HydronikStatus() {
  const [status, setStatus] = useState(INITIAL);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/hydronik", {
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok || body?.ok !== true || !Array.isArray(body?.capabilities)) {
          throw new Error("invalid hydronik response");
        }
        setStatus({ ...body, phase: "ready" });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setStatus({ ...INITIAL, phase: "error" });
        }
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const implemented = status.capabilities.filter((item) => item.status === "IMPLEMENTED").length;
  const evidencePending = status.executionEvidence === "AWAITING_EXECUTION_EVIDENCE";

  return (
    <section className="hydronikPanel" aria-labelledby="hydronik-title">
      <div className="hydronikHeader">
        <div>
          <p className="sectionLabel">HYDRONIK Evolution Runtime</p>
          <h2 id="hydronik-title">Проверяемое самоулучшение</h2>
          <p>
            Кандидаты могут экспериментировать и конкурировать, но CORE остаётся закрыт до независимой проверки и Owner Gate.
          </p>
        </div>
        <div className="runtimeStatuses" aria-live="polite">
          {status.phase === "loading" ? <Pill tone="neutral">HYDRONIK_CHECKING</Pill> : null}
          {status.phase === "error" ? <Pill tone="error">HYDRONIK_UNAVAILABLE</Pill> : null}
          {status.phase === "ready" ? (
            <>
              <Pill tone={status.mode === "FAIL_CLOSED" ? "ok" : "warning"}>{status.mode}</Pill>
              <Pill tone={evidencePending ? "warning" : "ok"}>{status.executionEvidence}</Pill>
              <Pill tone={status.ownerGate === "LOCKED" ? "ok" : "warning"}>OWNER_GATE_{status.ownerGate}</Pill>
            </>
          ) : null}
        </div>
      </div>

      {status.phase === "ready" ? (
        <div className="hydronikGrid">
          <div className="hydronikMetric">
            <span>Capabilities</span>
            <strong>{implemented}/{status.capabilities.length}</strong>
          </div>
          <div className="hydronikMetric">
            <span>Evidence</span>
            <strong>{status.evidenceModel}</strong>
          </div>
          <div className="hydronikMetric">
            <span>Replay</span>
            <strong>{status.replayVerifier}</strong>
          </div>
          <div className="hydronikMetric">
            <span>Expansion</span>
            <strong>1 → 9 → 99 → 999</strong>
          </div>
        </div>
      ) : null}

      {status.phase === "ready" ? (
        <div className="hydronikRules">
          {status.invariants.map((rule) => (
            <code key={rule}>{rule}</code>
          ))}
        </div>
      ) : null}
    </section>
  );
}
