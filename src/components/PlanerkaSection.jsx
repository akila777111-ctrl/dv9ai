import { useMemo, useRef, useState } from "react";
import {
  APPROVAL_DECISIONS,
  APPROVAL_LEVELS,
  createFingerprint,
  createPlan,
  getPlanMetrics,
  recordTaskResult,
  resolveApproval,
  RISK_LEVELS,
  runUntilGate,
  TASK_STATUSES,
} from "../planerka/engine";

const templates = [
  {
    label: "Монолитная плита",
    goal: "Подготовить монолитное перекрытие к безопасному бетонированию",
    criteria: "Фронт работ готов, контрольные точки закрыты evidence, ответственные подтвердили допуск",
  },
  {
    label: "Подготовить подъём",
    goal: "Подготовить безопасный подъём строительной конструкции",
    criteria: "Геометрия, груз, рабочая зона и lift plan проверены до физической операции",
  },
  {
    label: "Скрытые работы",
    goal: "Проверить и закрыть скрытые работы без потери доказательств",
    criteria: "ITP выполнен, отклонения устранены, пакет evidence принят ответственным специалистом",
  },
  {
    label: "Координация дня",
    goal: "Синхронизировать работы площадки на следующую смену",
    criteria: "Критические блокеры сняты, ресурсы подтверждены, каждый handoff имеет ответственного",
  },
];

const resourceBlueprints = {
  planerka: {
    phase: 0,
    owner: "DV9-PLANERKA",
    title: "Построить исполнимый граф цели",
    description: "Разложить цель на зависимости и выделить путь, который следует расчистить первым.",
    risk: RISK_LEVELS.SAFE,
  },
  "laser-rover": {
    phase: 1,
    owner: "DV9-LSR",
    title: "Подготовить геометрический контекст",
    description: "Проверить маршрут измерений, реперы, допуски и ожидаемый пакет геометрических данных.",
    risk: RISK_LEVELS.LOW,
  },
  "drone-fleet": {
    phase: 1,
    owner: "DV9-DRONE",
    title: "Подготовить контекст воздушной съёмки",
    description: "Проверить зону, разрешения и результат миссии до любого физического запуска.",
    risk: RISK_LEVELS.LOW,
  },
  "site-vision": {
    phase: 1,
    owner: "DV9-VISION",
    title: "Связать наблюдения с моделью",
    description: "Собрать проверяемый визуальный контекст и кандидаты отклонений для следующего контура.",
    risk: RISK_LEVELS.SAFE,
  },
  "quality-gate": {
    phase: 2,
    owner: "DV9-QUALITY-GATE",
    title: "Проверить готовность и evidence",
    description: "Удержать контрольные точки, найти пробелы доказательств и вернуть точные блокеры.",
    risk: RISK_LEVELS.SAFE,
  },
  "execution-ops": {
    phase: 3,
    owner: "DV9-OPS",
    title: "Свести ресурсы и критический путь",
    description: "Сопоставить готовность фронта, людей, материалов и техники без изменения внешних обязательств.",
    risk: RISK_LEVELS.LOW,
  },
  "crane-x": {
    phase: 4,
    owner: "DV9-CRANE-X",
    title: "Смоделировать операцию CRANE-X",
    description: "Подготовить цифровую симуляцию и ограничения; физический подъём остаётся вне этого контура.",
    risk: RISK_LEVELS.LOW,
  },
  "printer-crane": {
    phase: 4,
    owner: "DV9-PRINTER",
    title: "Смоделировать машинное задание",
    description: "Подготовить параметры и проверку коллизий без отправки задания физической машине.",
    risk: RISK_LEVELS.LOW,
  },
};

const statusLabels = {
  READY: "ГОТОВО К СТАРТУ",
  RUNNING: "В РАБОТЕ",
  WAITING_OWNER: "OWNER GATE",
  BLOCKED: "ЗАБЛОКИРОВАНО",
  COMPLETED: "ЗАВЕРШЕНО",
  PENDING: "ЖДЁТ ЗАВИСИМОСТИ",
  DONE: "ПОДТВЕРЖДЕНО",
  FAILED: "ОШИБКА",
};

const messageLabels = {
  PROPOSE: "Цель передана в HYDRA",
  DISPATCH: "HYDRA направила coordination envelope; внешнего исполнения нет",
  HANDOFF: "Evidence принято, следующий путь открыт",
  REQUEST_APPROVAL: "Запрошено решение владельца",
  APPROVAL_DECISION: "Решение владельца зафиксировано",
  REPORT_RESULT: "Компонент вернул проверяемый результат",
  VALIDATION_RESULT: "Результат прошёл контроль",
  REPORT_BLOCKER: "Компонент сообщил о блокере",
};

function buildTasks(selectedModules, goalContext) {
  const goalFingerprint = createFingerprint(goalContext);
  const shortGoal = goalContext.goal.slice(0, 320);
  const shortCriterion = goalContext.criteria.slice(0, 320);
  const acceptanceContext = `Цель: «${shortGoal}». Приёмка: ${shortCriterion}.`;
  const tasks = [
    {
      id: "goal-frame",
      title: "Зафиксировать цель и критерии успеха",
      description: `PROJECT_STRATEGIST нормализует намерение владельца, не расширяя его полномочия. ${acceptanceContext}`,
      owner: "PROJECT_STRATEGIST",
      dependencies: [],
      risk: RISK_LEVELS.SAFE,
      approvalLevel: APPROVAL_LEVELS.AUTO,
      goalAlignment: 1,
      expectedProgress: 0.12,
      evidenceConfidence: 1,
      dedupeKey: `planerka:goal-frame:${goalFingerprint}`,
      goalWeight: 1,
    },
  ];

  const grouped = [...selectedModules]
    .map((module) => ({ module, blueprint: resourceBlueprints[module.id] }))
    .filter((item) => item.blueprint)
    .sort((left, right) => left.blueprint.phase - right.blueprint.phase || left.module.code.localeCompare(right.module.code))
    .reduce((groups, item) => {
      const phase = item.blueprint.phase;
      if (!groups.has(phase)) groups.set(phase, []);
      groups.get(phase).push(item);
      return groups;
    }, new Map());

  let frontier = ["goal-frame"];
  for (const [phase, items] of grouped) {
    const phaseTaskIds = [];
    for (const { module, blueprint } of items) {
      const taskId = `organ-${module.code.toLowerCase()}`;
      tasks.push({
        id: taskId,
        title: blueprint.title,
        description: `${blueprint.description} ${acceptanceContext}`,
        owner: blueprint.owner,
        dependencies: [...frontier],
        risk: blueprint.risk,
        approvalLevel: APPROVAL_LEVELS.AUTO,
        goalAlignment: 0.94,
        expectedProgress: Math.max(0.08, 0.34 - phase * 0.035),
        evidenceConfidence: module.stage === "PROTOTYPE" ? 0.82 : 0.68,
        dedupeKey: `planerka:organ:${module.id}:${goalFingerprint}`,
        goalWeight: 2,
      });
      phaseTaskIds.push(taskId);
    }
    frontier = phaseTaskIds;
  }

  if (goalContext.deadline) {
    tasks.push({
      id: "deadline-readiness",
      title: "Проверить достижимость контрольного срока",
      description: `HYDROCOOL сопоставляет ресурсный путь с контрольной датой ${goalContext.deadline}; календарные обязательства не изменяются. ${acceptanceContext}`,
      owner: "DV9-HYDROCOOL",
      dependencies: [...frontier],
      risk: RISK_LEVELS.LOW,
      approvalLevel: APPROVAL_LEVELS.AUTO,
      goalAlignment: 0.96,
      expectedProgress: 0.22,
      evidenceConfidence: 0.78,
      dedupeKey: `planerka:deadline:${goalContext.deadline}:${goalFingerprint}`,
      goalWeight: 2,
    });
    frontier = ["deadline-readiness"];
  }

  tasks.push({
    id: "owner-gate",
    title: "Подтвердить симуляцию плана",
    description: "Owner проверяет критический путь, риск и границы до передачи плана в защищённый исполнительный контур.",
    owner: "OWNER-999",
    dependencies: [...frontier],
    risk: RISK_LEVELS.MEDIUM,
    approvalLevel: APPROVAL_LEVELS.OWNER,
    goalAlignment: 1,
    expectedProgress: 0.3,
    evidenceConfidence: 0.9,
    dedupeKey: `planerka:owner-gate:${goalFingerprint}`,
    goalWeight: 3,
  });

  tasks.push({
    id: "coordination-receipt",
    title: "Выпустить receipt координационного прогона",
    description: "Зафиксировать подтверждённую последовательность; receipt не даёт полномочий на внешнее исполнение.",
    owner: "DV9-RECEIPT",
    dependencies: ["owner-gate"],
    risk: RISK_LEVELS.SAFE,
    approvalLevel: APPROVAL_LEVELS.AUTO,
    goalAlignment: 0.9,
    expectedProgress: 0.12,
    evidenceConfidence: 1,
    dedupeKey: `planerka:coordination-receipt:${goalFingerprint}`,
    goalWeight: 1,
  });

  return tasks;
}

function simulateUntilGate(plan) {
  let next = runUntilGate(plan);

  for (let pass = 0; pass < 32; pass += 1) {
    const running = next.tasks.filter((task) => task.status === TASK_STATUSES.RUNNING);
    if (running.length === 0) break;

    for (const task of running) {
      next = recordTaskResult(next, {
        taskId: task.id,
        status: "SUCCEEDED",
        actionId: task.currentActionId,
        proposalHash: task.proposalHash,
        evidence: [
          {
            type: "SIMULATION",
            summary: `Координационный результат «${task.title}» проверен; внешнего действия не было.`,
            verified: true,
            verifiedBy: "DV9-SIM-VERIFIER",
            sourceHash: `sim-${task.proposalHash}`,
          },
        ],
      });
    }

    next = runUntilGate(next);
    if (next.status === "WAITING_OWNER") break;
  }

  return next;
}

function taskStateText(task) {
  if (task.blocker) return task.blocker.replaceAll("_", " ");
  if (task.status === TASK_STATUSES.PENDING && task.dependencies.length) return `Ждёт: ${task.dependencies.join(" · ")}`;
  if (task.status === TASK_STATUSES.DONE && task.unlocks.length) return `Открыл путь: ${task.unlocks.join(" · ")}`;
  if (task.status === TASK_STATUSES.DONE) return "Evidence принято";
  if (task.status === TASK_STATUSES.WAITING_OWNER) return "Точное решение остаётся за владельцем";
  return task.description;
}

function taskLanes(tasks) {
  const depth = new Map();
  const lanes = new Map();
  for (const task of tasks) {
    const level = task.dependencies.length === 0
      ? 0
      : 1 + Math.max(...task.dependencies.map((dependency) => depth.get(dependency) ?? 0));
    depth.set(task.id, level);
    if (!lanes.has(level)) lanes.set(level, []);
    lanes.get(level).push(task);
  }
  return [...lanes.entries()];
}

export default function PlanerkaSection({ modules, resourceIds, onToggleResource }) {
  const [goal, setGoal] = useState(templates[0].goal);
  const [criteria, setCriteria] = useState(templates[0].criteria);
  const [deadline, setDeadline] = useState("");
  const [plan, setPlan] = useState(null);
  const [planConfigKey, setPlanConfigKey] = useState("");
  const [error, setError] = useState("");
  const goalRef = useRef(null);
  const criteriaRef = useRef(null);
  const statusRef = useRef(null);

  const selectedModules = useMemo(
    () => modules.filter((module) => resourceIds.includes(module.id)),
    [modules, resourceIds],
  );
  const currentConfigKey = JSON.stringify({
    goal: goal.trim(),
    criteria: criteria.trim(),
    deadline,
    resourceIds: [...resourceIds].sort(),
  });
  const configurationChanged = Boolean(plan && currentConfigKey !== planConfigKey);
  const metrics = useMemo(() => (plan ? getPlanMetrics(plan) : null), [plan]);
  const lanes = useMemo(() => (plan ? taskLanes(plan.tasks) : []), [plan]);
  const pendingApproval = plan?.approvals.find((approval) => approval.status === "PENDING") || null;
  const activeTemplate = templates.find((template) => template.goal === goal && template.criteria === criteria)?.label || null;
  const today = new Date().toISOString().slice(0, 10);

  function applyTemplate(template) {
    setGoal(template.goal);
    setCriteria(template.criteria);
    setError("");
  }

  function createCoordinationPlan(event) {
    event.preventDefault();
    setError("");

    if (!goal.trim() || !criteria.trim()) {
      setError("Зафиксируй цель и измеримый критерий успеха.");
      window.setTimeout(() => (!goal.trim() ? goalRef.current : criteriaRef.current)?.focus(), 0);
      return;
    }
    if (selectedModules.length === 0) {
      setError("Выбери хотя бы один орган DV9 для координации.");
      return;
    }
    if (deadline && deadline < today) {
      setError("Контрольный срок не может быть в прошлом.");
      return;
    }

    try {
      const successCriteria = [criteria.trim()];
      if (deadline) successCriteria.push(`Контрольный срок: ${deadline}`);
      const created = createPlan({
        goal: {
          id: "GOAL-OWNER-001",
          title: goal.trim(),
          successCriteria,
        },
        tasks: buildTasks(selectedModules, { goal: goal.trim(), criteria: criteria.trim(), deadline }),
        createdAt: Date.now(),
      });
      setPlan(simulateUntilGate(created));
      setPlanConfigKey(currentConfigKey);
      window.setTimeout(() => statusRef.current?.focus(), 0);
    } catch (caught) {
      setError(`${caught.code ? `${caught.code}: ` : ""}${caught.message || "Не удалось построить план."}`);
    }
  }

  function decide(decision) {
    if (!plan || !pendingApproval) return;
    try {
      const decided = resolveApproval(plan, {
        taskId: pendingApproval.taskId,
        decision,
        approvalId: pendingApproval.id,
        proposalHash: pendingApproval.proposalHash,
      });
      setPlan(decision === APPROVAL_DECISIONS.APPROVE ? simulateUntilGate(decided) : runUntilGate(decided));
      setError("");
      window.setTimeout(() => statusRef.current?.focus(), 0);
    } catch (caught) {
      setError(`${caught.code ? `${caught.code}: ` : ""}${caught.message || "Решение не принято."}`);
    }
  }

  return (
    <section className="future-section planerka-section" id="planerka">
      <div className="section-rail" aria-hidden="true"><span>04</span><i /></div>
      <div className="future-section-head">
        <div><span className="future-kicker">HYDRA / PLANЁRKA 0.1</span><h2>Задай цель.<br /><em>Система расчистит путь.</em></h2></div>
        <p>Рабочая демонстрация строит привязанный к цели ресурсный DAG, передаёт synthetic evidence между органами и останавливает существенное решение у владельца. Никакая техника, публикация или внешняя команда отсюда не запускается.</p>
      </div>

      <div className="planerka-mode" role="note">
        <span><i /> COORDINATION_ONLY</span>
        <b>DEMO · FAIL CLOSED</b>
        <p>В этой версии результаты синтетические, а browser receipt использует локальный fingerprint. Подписанный Owner Session и реальные исполнители подключаются только через защищённый HYDRA Core API.</p>
      </div>

      <div className="planerka-workspace">
        <form className="goal-composer" onSubmit={createCoordinationPlan}>
          <div className="planerka-panel-head">
            <span>01 / OWNER INTENT</span>
            <b>Постановка цели</b>
          </div>
          <div className="goal-templates" role="group" aria-label="Шаблоны целей">
            {templates.map((template) => (
              <button
                type="button"
                key={template.label}
                className={activeTemplate === template.label ? "is-active" : ""}
                aria-pressed={activeTemplate === template.label}
                onClick={() => applyTemplate(template)}
              >
                {template.label}
              </button>
            ))}
          </div>
          <label className="planerka-field" htmlFor="planerka-goal">
            <span>Цель владельца</span>
            <textarea
              ref={goalRef}
              id="planerka-goal"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              rows="3"
              maxLength="4096"
              required
              aria-invalid={Boolean(error && !goal.trim())}
              aria-describedby={error ? "planerka-form-error" : undefined}
            />
          </label>
          <label className="planerka-field" htmlFor="planerka-criteria">
            <span>Критерий успеха</span>
            <textarea
              ref={criteriaRef}
              id="planerka-criteria"
              value={criteria}
              onChange={(event) => setCriteria(event.target.value)}
              rows="3"
              maxLength="1024"
              required
              aria-invalid={Boolean(error && !criteria.trim())}
              aria-describedby={error ? "planerka-form-error" : undefined}
            />
          </label>
          <label className="planerka-field planerka-field--deadline" htmlFor="planerka-deadline">
            <span>Контрольный срок <em>добавит readiness-задачу</em></span>
            <input id="planerka-deadline" type="date" min={today} value={deadline} onChange={(event) => setDeadline(event.target.value)} aria-describedby={error ? "planerka-form-error" : undefined} />
          </label>

          <fieldset className="resource-inventory" aria-describedby={error ? "planerka-form-error" : undefined}>
            <legend>02 / ДОСТУПНЫЕ ОРГАНЫ</legend>
            <div>
              {modules.map((module) => (
                <label key={module.id} className={resourceIds.includes(module.id) ? "is-selected" : ""}>
                  <input
                    type="checkbox"
                    checked={resourceIds.includes(module.id)}
                    onChange={() => onToggleResource(module.id)}
                  />
                  <span><b>{module.code}</b>{module.title}<small>{module.stage}</small></span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && <div className="planerka-error" id="planerka-form-error" role="alert"><b>PLAN BLOCKED</b>{error}</div>}
          {configurationChanged && <div className="planerka-warning" role="status">Входные данные изменились. Перестрой план, чтобы зафиксировать новую версию.</div>}
          <button className="planerka-build" type="submit">
            <span>{plan ? "Перестроить execution DAG" : "Построить execution DAG"}</span><b>→</b>
          </button>
        </form>

        <div className="planerka-console">
          <div className="planerka-console__top">
            <div className="planerka-panel-head">
              <span>03 / EXECUTION GRAPH</span>
              <b ref={statusRef} tabIndex="-1" role="status" aria-live="polite">{plan ? statusLabels[plan.status] : "ОЖИДАЕТ ЦЕЛЬ"}</b>
            </div>
            {plan && <code>REV {plan.revision} · {plan.id.slice(-8).toUpperCase()}</code>}
          </div>

          {!plan ? (
            <div className="planerka-empty">
              <span>9</span>
              <b>PLANЁRKA READY</b>
              <p>Выбери органы и построй план. Здесь появятся зависимости, handoff, Owner Gate и receipts.</p>
            </div>
          ) : (
            <>
              <div className="plan-metrics">
                <article>
                  <span>Прогресс цели</span>
                  <b>{Math.round(metrics.goalProgress * 100)}%</b>
                  <progress max="100" value={metrics.goalProgress * 100} aria-label="Прогресс цели" />
                </article>
                <article>
                  <span>КПД симуляции</span>
                  <b>{metrics.usefulActionState === "NO_SAMPLE" ? "—" : `${Math.round(metrics.usefulActionPercent)}%`}</b>
                  <small>{metrics.verifiedUsefulActions} synthetic verified / {metrics.actionAttempts} attempts</small>
                </article>
                <article>
                  <span>Расчищено зависимостей</span>
                  <b>{Math.round(metrics.dependencyUnlockProgress * 100)}%</b>
                  <small>Шум: {metrics.coordinationWaste} действий</small>
                </article>
              </div>

              <div className="plan-dag" aria-label="Граф задач по уровням зависимостей">
                {lanes.map(([level, laneTasks]) => (
                  <section className="dag-lane" key={level}>
                    <div className="dag-lane__head"><span>LANE {String(level + 1).padStart(2, "0")}</span><b>{laneTasks.length > 1 ? `PARALLEL × ${laneTasks.length}` : "DEPENDENCY STEP"}</b></div>
                    <div className="dag-lane__tasks">
                      {laneTasks.map((task) => (
                        <article key={task.id} className={`task-state--${task.status.toLowerCase()}`}>
                          <div className="task-card__head">
                            <span>{task.owner}</span>
                            <em>{statusLabels[task.status] || task.status}</em>
                          </div>
                          <h3>{task.title}</h3>
                          <p>{taskStateText(task)}</p>
                          <div className="task-card__links">
                            <span><small>NEEDS</small>{task.dependencies.length ? task.dependencies.join(" · ") : "OWNER GOAL"}</span>
                            <span><small>UNLOCKS</small>{task.unlocks.length ? task.unlocks.join(" · ") : "FINAL STATE"}</span>
                          </div>
                          <div className="task-card__meta">
                            <span>RISK {task.risk}</span>
                            <span>PRIORITY {Math.round(task.priorityScore * 100)}</span>
                            <span>{task.evidence.length} SYNTH EVIDENCE</span>
                            {task.evidence[0] && <span>BY {task.evidence[0].verifiedBy}</span>}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              {pendingApproval && (
                <section className="owner-gate-card" aria-labelledby="owner-gate-title">
                  <div><span>04 / OWNER GATE</span><b id="owner-gate-title">Требуется твоё решение</b></div>
                  <p>Цель: <strong>«{plan.goal.title}»</strong>. Критерий: {plan.goal.successCriteria.join(" · ")}. Подтверждение связано с proposal <code>{pendingApproval.proposalHash}</code> и разрешает только продолжение этой симуляции, не внешнее действие.</p>
                  <div>
                    <button type="button" disabled={configurationChanged} onClick={() => decide(APPROVAL_DECISIONS.REJECT)}>Отклонить</button>
                    <button type="button" disabled={configurationChanged} onClick={() => decide(APPROVAL_DECISIONS.APPROVE)}>Подтвердить симуляцию</button>
                  </div>
                  {configurationChanged && <small>Сначала перестрой план: входные данные изменились после создания этой версии.</small>}
                </section>
              )}

              {plan.status === "COMPLETED" && (
                <div className="planerka-complete"><i />Координационный прогон подтверждён. Внешние действия не запускались.</div>
              )}
              {plan.status === "BLOCKED" && !pendingApproval && (
                <div className="planerka-error"><b>PLAN BLOCKED</b>Ветка остановлена политикой или решением владельца. Независимые действия не получили внешних полномочий.</div>
              )}
            </>
          )}
        </div>
      </div>

      {plan && (
        <div className="planerka-ledger">
          <section>
            <div className="planerka-panel-head"><span>05 / AGENT MESSAGES</span><b>Структурированный разговор</b></div>
            <div className="agent-feed">
              {plan.messages.slice(-8).reverse().map((message) => (
                <article key={message.id}>
                  <span>{message.type}</span>
                  <div><b>{message.from} → {message.to}</b><p>{messageLabels[message.type] || "Сообщение зафиксировано"}{message.taskId ? ` · TASK ${message.taskId}` : ""}</p></div>
                  <small>#{message.sequence}</small>
                </article>
              ))}
            </div>
          </section>
          <section>
            <div className="planerka-panel-head"><span>06 / EVIDENCE LEDGER</span><b>Последние receipts</b></div>
            <div className="receipt-feed">
              {plan.receipts.slice(-8).reverse().map((receipt) => (
                <article key={receipt.id}>
                  <i className={receipt.status === "blocked" || receipt.status === "failed" ? "is-alert" : ""} />
                  <div><b>{receipt.type.replaceAll("_", " ")}{receipt.taskId ? ` · ${receipt.taskId}` : ""}</b><span>{receipt.status} · #{receipt.sequence}</span></div>
                  <code>{receipt.receiptFingerprint.slice(0, 8)}</code>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
