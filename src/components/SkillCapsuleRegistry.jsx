import { useEffect, useState } from "react";
import "./SkillCapsuleRegistry.css";

const INITIAL = {
  phase: "loading",
  mode: "UNKNOWN",
  ownerGate: "UNKNOWN",
  state: "UNKNOWN",
  skills: [],
  counts: { total: 0, verified: 0, ownerApproved: 0 },
  invariants: [],
};

function Pill({ tone, children }) {
  return <span className={`statusPill statusPill--${tone}`}>{children}</span>;
}

export default function SkillCapsuleRegistry() {
  const [registry, setRegistry] = useState(INITIAL);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/hydronik-skills", {
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok || body?.ok !== true || !Array.isArray(body?.skills)) {
          throw new Error("invalid skill registry response");
        }
        setRegistry({ ...body, phase: "ready" });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setRegistry({ ...INITIAL, phase: "error" });
        }
      }
    }

    load();
    return () => controller.abort();
  }, []);

  return (
    <section className="skillRegistry" aria-labelledby="skills-title">
      <div className="skillRegistryHeader">
        <div>
          <p className="sectionLabel">HYDRONIK Skill Capsule Registry</p>
          <h2 id="skills-title">Проверенные навыки, а не память обо всём</h2>
          <p>
            В реестр допускаются только компактные способности с evidence, replay-проверкой и отдельным Owner Gate.
          </p>
        </div>
        <div className="runtimeStatuses" aria-live="polite">
          {registry.phase === "loading" ? <Pill tone="neutral">SKILLS_CHECKING</Pill> : null}
          {registry.phase === "error" ? <Pill tone="error">SKILLS_UNAVAILABLE</Pill> : null}
          {registry.phase === "ready" ? (
            <>
              <Pill tone="neutral">{registry.mode}</Pill>
              <Pill tone={registry.state === "NO_VERIFIED_CAPSULES" ? "warning" : "ok"}>{registry.state}</Pill>
              <Pill tone={registry.ownerGate === "LOCKED" ? "ok" : "warning"}>OWNER_GATE_{registry.ownerGate}</Pill>
            </>
          ) : null}
        </div>
      </div>

      {registry.phase === "ready" ? (
        <>
          <div className="skillMetrics">
            <div><span>Total</span><strong>{registry.counts.total}</strong></div>
            <div><span>Verified</span><strong>{registry.counts.verified}</strong></div>
            <div><span>Owner approved</span><strong>{registry.counts.ownerApproved}</strong></div>
            <div><span>Promotion</span><strong>SHADOW → VERIFIED → OWNER</strong></div>
          </div>

          {registry.skills.length === 0 ? (
            <div className="skillEmpty">
              <strong>0 trusted skills</strong>
              <p>Ни одна capability ещё не прошла evidence + independent replay + Owner approval.</p>
            </div>
          ) : (
            <div className="skillList">
              {registry.skills.map((skill) => (
                <article key={skill.skillId} className="skillCard">
                  <h3>{skill.skillId}</h3>
                  <p>{skill.problemPattern}</p>
                  <code>{skill.status}</code>
                </article>
              ))}
            </div>
          )}

          <div className="skillRules">
            {registry.invariants.map((rule) => <code key={rule}>{rule}</code>)}
          </div>
        </>
      ) : null}
    </section>
  );
}
