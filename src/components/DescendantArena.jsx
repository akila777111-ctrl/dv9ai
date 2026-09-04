import { useEffect, useState } from "react";
import "./DescendantArena.css";

const INITIAL = {
  phase: "loading",
  mode: "UNKNOWN",
  source: "UNKNOWN",
  ownerGate: "UNKNOWN",
  corePromotion: "UNKNOWN",
  candidates: [],
  acceptanceRules: [],
};

function Pill({ tone, children }) {
  return <span className={`statusPill statusPill--${tone}`}>{children}</span>;
}

function CandidateCard({ candidate }) {
  return (
    <article className="arenaCandidate">
      <div className="arenaCandidateHeader">
        <strong>{candidate.candidateId}</strong>
        <Pill tone={candidate.status === "VERIFIED" ? "ok" : "warning"}>{candidate.status}</Pill>
      </div>
      <dl className="arenaMetrics">
        <div><dt>Baseline</dt><dd>{candidate.baselineScore}</dd></div>
        <div><dt>Null</dt><dd>{candidate.nullControlScore}</dd></div>
        <div><dt>Candidate</dt><dd>{candidate.candidateScore}</dd></div>
        <div><dt>Tests</dt><dd>{candidate.testsPassed}</dd></div>
        <div><dt>Regressions</dt><dd>{candidate.regressions}</dd></div>
      </dl>
      <div className="arenaEvidence">
        <span>Verifier</span><code>{candidate.verifierId}</code>
        <span>Evidence</span><code>{candidate.evidenceHash}</code>
      </div>
    </article>
  );
}

export default function DescendantArena() {
  const [arena, setArena] = useState(INITIAL);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/hydronik-arena", {
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok || body?.ok !== true || !Array.isArray(body?.candidates)) {
          throw new Error("invalid arena response");
        }
        setArena({ ...body, phase: "ready" });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setArena({ ...INITIAL, phase: "error" });
        }
      }
    }
    load();
    return () => controller.abort();
  }, []);

  return (
    <section className="arenaPanel" aria-labelledby="arena-title">
      <div className="arenaHeader">
        <div>
          <p className="sectionLabel">Descendant Arena</p>
          <h2 id="arena-title">Конкуренция кандидатов без доступа к CORE</h2>
          <p>Здесь появятся только реальные descendants, для которых существуют measurement + evidence + independent replay.</p>
        </div>
        <div className="runtimeStatuses" aria-live="polite">
          {arena.phase === "loading" ? <Pill tone="neutral">ARENA_CHECKING</Pill> : null}
          {arena.phase === "error" ? <Pill tone="error">ARENA_UNAVAILABLE</Pill> : null}
          {arena.phase === "ready" ? (
            <>
              <Pill tone="neutral">{arena.mode}</Pill>
              <Pill tone={arena.source === "NO_RUNTIME_EVIDENCE" ? "warning" : "ok"}>{arena.source}</Pill>
              <Pill tone="ok">OWNER_GATE_{arena.ownerGate}</Pill>
            </>
          ) : null}
        </div>
      </div>

      {arena.phase === "ready" && arena.candidates.length === 0 ? (
        <div className="arenaEmpty">
          <strong>0 candidates</strong>
          <span>Фальшивые демонстрационные результаты отключены. Arena ждёт первый доказуемый receipt.</span>
        </div>
      ) : null}

      {arena.phase === "ready" && arena.candidates.length > 0 ? (
        <div className="arenaCandidates">
          {arena.candidates.map((candidate) => <CandidateCard key={candidate.candidateId} candidate={candidate} />)}
        </div>
      ) : null}

      {arena.phase === "ready" ? (
        <div className="arenaRules">
          {arena.acceptanceRules.map((rule) => <code key={rule}>{rule}</code>)}
        </div>
      ) : null}
    </section>
  );
}
