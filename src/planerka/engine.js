export const PLANERKA_VERSION = "DV9-PLANERKA/0.1";
export const PLANERKA_RECEIPT_VERSION = "DV9-PLANERKA-RECEIPT/0.1";
export const PLANERKA_MESSAGE_VERSION = "DV9-PLANERKA-MESSAGE/0.1";

export const PLAN_STATUSES = Object.freeze({
  READY: "READY",
  RUNNING: "RUNNING",
  WAITING_OWNER: "WAITING_OWNER",
  BLOCKED: "BLOCKED",
  COMPLETED: "COMPLETED",
});

export const TASK_STATUSES = Object.freeze({
  PENDING: "PENDING",
  READY: "READY",
  WAITING_OWNER: "WAITING_OWNER",
  RUNNING: "RUNNING",
  DONE: "DONE",
  FAILED: "FAILED",
  BLOCKED: "BLOCKED",
});

export const RISK_LEVELS = Object.freeze({
  SAFE: "SAFE",
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  UNKNOWN: "UNKNOWN",
});

export const APPROVAL_LEVELS = Object.freeze({
  AUTO: "AUTO",
  OWNER: "OWNER",
  FORBIDDEN: "FORBIDDEN",
});

export const APPROVAL_DECISIONS = Object.freeze({
  APPROVE: "APPROVE",
  REJECT: "REJECT",
});

export const MESSAGE_TYPES = Object.freeze({
  PROPOSE: "PROPOSE",
  DISPATCH: "DISPATCH",
  REQUEST_INFO: "REQUEST_INFO",
  PROVIDE_EVIDENCE: "PROVIDE_EVIDENCE",
  REPORT_BLOCKER: "REPORT_BLOCKER",
  REQUEST_APPROVAL: "REQUEST_APPROVAL",
  APPROVAL_DECISION: "APPROVAL_DECISION",
  HANDOFF: "HANDOFF",
  REPORT_RESULT: "REPORT_RESULT",
  VALIDATION_RESULT: "VALIDATION_RESULT",
});

export const PLANERKA_LIMITS = Object.freeze({
  maxTasks: 128,
  maxDependencies: 32,
  maxMessages: 256,
  maxReceipts: 1024,
  maxActions: 256,
  maxCausalDepth: 16,
  maxPayloadBytes: 16 * 1024,
  maxTextLength: 4096,
});

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const SECRET_KEYS = new Set([
  "authorization",
  "api_key",
  "apikey",
  "cookie",
  "password",
  "passwd",
  "private_key",
  "secret",
  "token",
]);
const POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const PLAN_INPUT_FIELDS = new Set(["id", "goal", "tasks", "createdAt"]);
const GOAL_FIELDS = new Set(["id", "title", "successCriteria"]);
const TASK_INPUT_FIELDS = new Set([
  "id",
  "title",
  "description",
  "owner",
  "dependencies",
  "unlocks",
  "risk",
  "approvalLevel",
  "goalAlignment",
  "expectedProgress",
  "evidenceConfidence",
  "dedupeKey",
  "goalWeight",
]);
const EVIDENCE_FIELDS = new Set([
  "type",
  "summary",
  "verified",
  "verifiedBy",
  "sourceHash",
]);
const MESSAGE_INPUT_FIELDS = new Set([
  "type",
  "from",
  "to",
  "taskId",
  "correlationId",
  "causationId",
  "payload",
]);
const APPROVAL_INPUT_FIELDS = new Set([
  "taskId",
  "decision",
  "approvalId",
  "proposalHash",
]);
const RESULT_INPUT_FIELDS = new Set([
  "taskId",
  "status",
  "evidence",
  "actionId",
  "proposalHash",
]);
const TERMINAL_ACTIONS = new Set([
  "SUCCEEDED",
  "FAILED",
  "FAILED_VALIDATION",
  "REJECTED_DUPLICATE",
  "REJECTED_OWNER",
  "BLOCKED_POLICY",
]);

const RISK_FACTOR = Object.freeze({
  SAFE: 0,
  LOW: 0.2,
  MEDIUM: 0.5,
  HIGH: 0.8,
  UNKNOWN: 1,
});
const APPROVAL_RANK = Object.freeze({ AUTO: 0, OWNER: 1, FORBIDDEN: 2 });

export class PlanerkaError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "PlanerkaError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

function fail(code, message, details) {
  throw new PlanerkaError(code, message, details);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactObject(value, fields, code, label) {
  if (!isPlainObject(value) || Object.keys(value).some((key) => !fields.has(key))) {
    fail(code, `${label} must be an exact plain object`);
  }
}

function assertIdentifier(value, label, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || !IDENTIFIER.test(value)) {
    fail("INVALID_IDENTIFIER", `${label} is invalid`);
  }
}

function assertText(value, label, { maximum = PLANERKA_LIMITS.maxTextLength } = {}) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maximum) {
    fail("INVALID_TEXT", `${label} is invalid`);
  }
}

function assertUnit(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    fail("INVALID_SCORE_INPUT", `${label} must be a finite number in [0, 1]`);
  }
}

function deepFreeze(value) {
  if (Array.isArray(value)) value.forEach(deepFreeze);
  else if (isPlainObject(value)) Object.values(value).forEach(deepFreeze);
  return value && typeof value === "object" ? Object.freeze(value) : value;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

// This browser-safe fingerprint binds state inside the pure UI model. It is not a
// replacement for the signed SHA-256 Owner Session used by the executable Core.
export function createFingerprint(value) {
  const bytes = new TextEncoder().encode(stableStringify(value));
  let hash = 0xcbf29ce484222325n;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

function inspectJson(value, path = "payload", seen = new Set()) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("INVALID_PAYLOAD", `${path} contains a non-finite number`);
    return;
  }
  if (typeof value !== "object") fail("INVALID_PAYLOAD", `${path} is not JSON-safe`);
  if (seen.has(value)) fail("INVALID_PAYLOAD", `${path} contains a cycle`);
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectJson(item, `${path}[${index}]`, seen));
  } else {
    if (!isPlainObject(value)) fail("INVALID_PAYLOAD", `${path} must contain plain objects`);
    for (const [key, item] of Object.entries(value)) {
      const normalized = key.toLowerCase();
      if (POLLUTION_KEYS.has(key)) fail("INVALID_PAYLOAD", `${path} contains a prohibited key`);
      if (SECRET_KEYS.has(normalized)) fail("SECRET_FIELD", `${path} contains a likely secret field`);
      inspectJson(item, `${path}.${key}`, seen);
    }
  }
  seen.delete(value);
}

function normalizeIdList(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > PLANERKA_LIMITS.maxDependencies) {
    fail("INVALID_DEPENDENCIES", `${label} is invalid`);
  }
  value.forEach((item) => assertIdentifier(item, label));
  if (new Set(value).size !== value.length) fail("INVALID_DEPENDENCIES", `${label} contains duplicates`);
  return [...value].sort();
}

function normalizeGoal(goal, planId) {
  if (typeof goal === "string") {
    assertText(goal, "goal");
    return {
      id: `${planId}:goal`,
      title: goal.trim(),
      successCriteria: [goal.trim()],
    };
  }
  assertExactObject(goal, GOAL_FIELDS, "INVALID_GOAL", "goal");
  assertIdentifier(goal.id, "goal.id");
  assertText(goal.title, "goal.title");
  if (
    !Array.isArray(goal.successCriteria) ||
    goal.successCriteria.length === 0 ||
    goal.successCriteria.length > 32
  ) {
    fail("INVALID_GOAL", "goal.successCriteria is invalid");
  }
  goal.successCriteria.forEach((criterion) => assertText(criterion, "success criterion", { maximum: 1024 }));
  return {
    id: goal.id,
    title: goal.title.trim(),
    successCriteria: [...goal.successCriteria],
  };
}

function policyApprovalFor(risk) {
  if (risk === RISK_LEVELS.UNKNOWN) return APPROVAL_LEVELS.FORBIDDEN;
  if (risk === RISK_LEVELS.MEDIUM || risk === RISK_LEVELS.HIGH) return APPROVAL_LEVELS.OWNER;
  return APPROVAL_LEVELS.AUTO;
}

function effectiveApproval(risk, requested) {
  const policy = policyApprovalFor(risk);
  if (requested === undefined) return policy;
  if (!Object.hasOwn(APPROVAL_LEVELS, requested)) {
    fail("INVALID_APPROVAL_LEVEL", "task.approvalLevel is invalid");
  }
  return APPROVAL_RANK[requested] > APPROVAL_RANK[policy] ? requested : policy;
}

function normalizeTask(raw, index, taskCount) {
  assertExactObject(raw, TASK_INPUT_FIELDS, "INVALID_TASK", "task");
  assertIdentifier(raw.id, "task.id");
  assertText(raw.title, "task.title", { maximum: 256 });
  assertIdentifier(raw.owner, "task.owner");
  if (raw.description !== undefined) assertText(raw.description, "task.description");
  const dependencies = normalizeIdList(raw.dependencies, "task.dependencies");
  const declaredUnlocks = raw.unlocks === undefined ? null : normalizeIdList(raw.unlocks, "task.unlocks");
  if (dependencies.includes(raw.id)) fail("DEPENDENCY_CYCLE", "task cannot depend on itself");
  const risk = raw.risk ?? RISK_LEVELS.UNKNOWN;
  if (!Object.hasOwn(RISK_LEVELS, risk)) fail("INVALID_RISK", "task.risk is invalid");
  const goalAlignment = raw.goalAlignment ?? 1;
  const expectedProgress = raw.expectedProgress ?? 1 / taskCount;
  const evidenceConfidence = raw.evidenceConfidence ?? 0.5;
  assertUnit(goalAlignment, "task.goalAlignment");
  assertUnit(expectedProgress, "task.expectedProgress");
  assertUnit(evidenceConfidence, "task.evidenceConfidence");
  const goalWeight = raw.goalWeight ?? 1;
  if (!Number.isSafeInteger(goalWeight) || goalWeight < 1 || goalWeight > 1000) {
    fail("INVALID_GOAL_WEIGHT", "task.goalWeight is invalid");
  }
  const dedupeKey = (raw.dedupeKey ?? `${raw.owner}:${raw.title}`).trim().toLowerCase();
  if (dedupeKey.length === 0 || dedupeKey.length > 512) fail("INVALID_DEDUPE_KEY", "task.dedupeKey is invalid");
  return {
    id: raw.id,
    title: raw.title.trim(),
    owner: raw.owner,
    status: TASK_STATUSES.PENDING,
    dependencies,
    unlocks: [],
    risk,
    approvalLevel: effectiveApproval(risk, raw.approvalLevel),
    priorityScore: 0,
    evidence: [],
    description: (raw.description ?? raw.title).trim(),
    goalAlignment,
    expectedProgress,
    evidenceConfidence,
    dedupeKey,
    dedupeOf: null,
    goalWeight,
    proposalHash: null,
    blocker: null,
    currentActionId: null,
    inputOrder: index,
    declaredUnlocks,
  };
}

function assertDag(tasks) {
  const map = new Map(tasks.map((task) => [task.id, task]));
  if (map.size !== tasks.length) fail("DUPLICATE_TASK", "task ids must be unique");
  for (const task of tasks) {
    for (const dependency of task.dependencies) {
      if (!map.has(dependency)) {
        fail("MISSING_DEPENDENCY", `task ${task.id} depends on missing task ${dependency}`);
      }
    }
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(taskId) {
    if (visiting.has(taskId)) fail("DEPENDENCY_CYCLE", "task dependency graph contains a cycle");
    if (visited.has(taskId)) return;
    visiting.add(taskId);
    map.get(taskId).dependencies.forEach(visit);
    visiting.delete(taskId);
    visited.add(taskId);
  }
  [...map.keys()].sort().forEach(visit);
}

function deriveUnlocks(tasks) {
  const unlocks = new Map(tasks.map((task) => [task.id, []]));
  for (const task of tasks) {
    for (const dependency of task.dependencies) unlocks.get(dependency).push(task.id);
  }
  for (const task of tasks) {
    const derived = unlocks.get(task.id).sort();
    if (
      task.declaredUnlocks !== null &&
      stableStringify(task.declaredUnlocks) !== stableStringify(derived)
    ) {
      fail("UNLOCK_MISMATCH", `task ${task.id} unlocks do not match dependencies`);
    }
    task.unlocks = derived;
    delete task.declaredUnlocks;
  }
}

function descendantRatio(taskId, tasks) {
  if (tasks.length <= 1) return 1;
  const map = new Map(tasks.map((task) => [task.id, task]));
  const found = new Set();
  const visit = (id) => {
    for (const next of map.get(id).unlocks) {
      if (!found.has(next)) {
        found.add(next);
        visit(next);
      }
    }
  };
  visit(taskId);
  return found.size / (tasks.length - 1);
}

function round6(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function calculatePriorityScore({
  goalAlignment,
  expectedProgress,
  dependencyUnlock,
  evidenceConfidence,
  residualRisk,
  nearDuplicate,
}) {
  const values = [
    goalAlignment,
    expectedProgress,
    dependencyUnlock,
    evidenceConfidence,
    residualRisk,
    nearDuplicate,
  ];
  values.forEach((value, index) => assertUnit(value, `priority signal ${index}`));
  const benefit =
    0.38 * goalAlignment +
    0.3 * expectedProgress +
    0.22 * dependencyUnlock +
    0.1 * evidenceConfidence;
  const safetyAndNovelty = (1 - 0.55 * residualRisk) * (1 - 0.85 * nearDuplicate);
  return round6(Math.max(0, Math.min(1, benefit * safetyAndNovelty)));
}

function proposalHash(planId, epoch, task) {
  return createFingerprint({
    protocol: PLANERKA_VERSION,
    planId,
    epoch,
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      owner: task.owner,
      dependencies: task.dependencies,
      unlocks: task.unlocks,
      risk: task.risk,
      approvalLevel: task.approvalLevel,
      dedupeKey: task.dedupeKey,
      goalWeight: task.goalWeight,
    },
  });
}

function populatePlanningSignals(planId, epoch, tasks) {
  const firstByDedupeKey = new Map();
  for (const task of tasks) {
    if (firstByDedupeKey.has(task.dedupeKey)) task.dedupeOf = firstByDedupeKey.get(task.dedupeKey);
    else firstByDedupeKey.set(task.dedupeKey, task.id);
    const dependencyUnlock = descendantRatio(task.id, tasks);
    const nearDuplicate = task.dedupeOf === null ? 0 : 1;
    task.priorityScore = calculatePriorityScore({
      goalAlignment: task.goalAlignment,
      expectedProgress: task.expectedProgress,
      dependencyUnlock,
      evidenceConfidence: task.evidenceConfidence,
      residualRisk: RISK_FACTOR[task.risk],
      nearDuplicate,
    });
    task.prioritySignals = {
      goalAlignment: task.goalAlignment,
      expectedProgress: task.expectedProgress,
      dependencyUnlock: round6(dependencyUnlock),
      evidenceConfidence: task.evidenceConfidence,
      residualRisk: RISK_FACTOR[task.risk],
      nearDuplicate,
    };
    task.proposalHash = proposalHash(planId, epoch, task);
  }
}

function eventTime(plan) {
  return plan.createdAt + plan.receipts.length + plan.messages.length + plan.actions.length + plan.approvals.length;
}

function appendReceipt(
  plan,
  type,
  status,
  { taskId = null, actionId = null, correlationId = null, reason = null, input = null, output = null } = {},
) {
  if (plan.receipts.length >= PLANERKA_LIMITS.maxReceipts) fail("RECEIPT_LIMIT", "receipt limit reached");
  const receipt = {
    version: PLANERKA_RECEIPT_VERSION,
    id: `${plan.id}:receipt:${plan.receipts.length + 1}`,
    type,
    planId: plan.id,
    taskId,
    actionId,
    correlationId,
    status,
    reason,
    sequence: plan.receipts.length + 1,
    createdAt: eventTime(plan),
    inputFingerprint: input === null ? null : createFingerprint(input),
    outputFingerprint: output === null ? null : createFingerprint(output),
    receiptFingerprint: null,
  };
  receipt.receiptFingerprint = createFingerprint({ ...receipt, receiptFingerprint: null });
  plan.receipts.push(receipt);
  return receipt;
}

function messageDepth(plan, causationId) {
  if (causationId === null) return 1;
  let depth = 1;
  let current = plan.messages.find((message) => message.id === causationId);
  if (!current) fail("MISSING_CAUSATION", "causationId does not reference a known message");
  const seen = new Set();
  while (current) {
    if (seen.has(current.id)) fail("MESSAGE_LOOP", "message causation contains a cycle");
    seen.add(current.id);
    depth += 1;
    if (depth > PLANERKA_LIMITS.maxCausalDepth) fail("MESSAGE_DEPTH", "message causal depth exceeded");
    current = current.causationId === null
      ? null
      : plan.messages.find((message) => message.id === current.causationId);
  }
  return depth;
}

function appendMessageRaw(plan, input, { dedupe = true } = {}) {
  if (plan.messages.length >= PLANERKA_LIMITS.maxMessages) fail("MESSAGE_LIMIT", "message limit reached");
  const taskId = input.taskId ?? null;
  assertIdentifier(input.from, "message.from");
  assertIdentifier(input.to, "message.to");
  assertIdentifier(taskId, "message.taskId", true);
  if (taskId !== null && !plan.tasks.some((task) => task.id === taskId)) {
    fail("UNKNOWN_TASK", "message references an unknown task");
  }
  if (!Object.hasOwn(MESSAGE_TYPES, input.type)) fail("INVALID_MESSAGE_TYPE", "message.type is invalid");
  const correlationId = input.correlationId ?? plan.id;
  const causationId = input.causationId ?? null;
  assertIdentifier(correlationId, "message.correlationId");
  assertIdentifier(causationId, "message.causationId", true);
  const payload = input.payload ?? {};
  inspectJson(payload);
  if (new TextEncoder().encode(stableStringify(payload)).length > PLANERKA_LIMITS.maxPayloadBytes) {
    fail("MESSAGE_TOO_LARGE", "message payload is too large");
  }
  messageDepth(plan, causationId);
  const dedupeFingerprint = createFingerprint({
    type: input.type,
    from: input.from,
    to: input.to,
    taskId,
    correlationId,
    causationId,
    payload,
  });
  if (dedupe && plan.messages.some((message) => message.dedupeFingerprint === dedupeFingerprint)) {
    fail("MESSAGE_DUPLICATE", "duplicate semantic message rejected");
  }
  const message = {
    version: PLANERKA_MESSAGE_VERSION,
    id: `${plan.id}:message:${plan.messages.length + 1}`,
    type: input.type,
    from: input.from,
    to: input.to,
    taskId,
    correlationId,
    causationId,
    causalDepth: messageDepth(plan, causationId),
    payload: cloneJson(payload),
    sequence: plan.messages.length + 1,
    createdAt: eventTime(plan),
    dedupeFingerprint,
    messageFingerprint: null,
  };
  message.messageFingerprint = createFingerprint({ ...message, messageFingerprint: null });
  plan.messages.push(message);
  return message;
}

function taskById(plan, taskId) {
  const task = plan.tasks.find((candidate) => candidate.id === taskId);
  if (!task) fail("UNKNOWN_TASK", `unknown task ${taskId}`);
  return task;
}

function actionById(plan, actionId) {
  const action = plan.actions.find((candidate) => candidate.id === actionId);
  if (!action) fail("UNKNOWN_ACTION", `unknown action ${actionId}`);
  return action;
}

function currentApproval(plan, task) {
  return plan.approvals.find(
    (approval) => approval.taskId === task.id && approval.proposalHash === task.proposalHash && approval.status === "PENDING",
  ) ?? null;
}

function approvedDecision(plan, task) {
  return [...plan.approvals].reverse().find(
    (approval) => approval.taskId === task.id && approval.proposalHash === task.proposalHash && approval.status === "APPROVED",
  ) ?? null;
}

function createAction(plan, task, status) {
  if (plan.actions.length >= PLANERKA_LIMITS.maxActions) fail("ACTION_LIMIT", "action limit reached");
  const action = {
    id: `${plan.id}:action:${plan.actions.length + 1}`,
    taskId: task.id,
    owner: task.owner,
    proposalHash: task.proposalHash,
    risk: task.risk,
    approvalLevel: task.approvalLevel,
    priorityScore: task.priorityScore,
    status,
    attempt: 1,
    approvalId: null,
    useful: false,
    evidenceFingerprint: null,
    createdAt: eventTime(plan),
    finishedAt: null,
  };
  plan.actions.push(action);
  task.currentActionId = action.id;
  return action;
}

function blockTask(plan, task, reason, actionStatus) {
  const action = task.currentActionId === null
    ? createAction(plan, task, actionStatus)
    : actionById(plan, task.currentActionId);
  action.status = actionStatus;
  action.finishedAt = eventTime(plan);
  task.status = TASK_STATUSES.BLOCKED;
  task.blocker = reason;
  appendReceipt(plan, "TASK_BLOCKED", "blocked", {
    taskId: task.id,
    actionId: action.id,
    reason,
    input: { proposalHash: task.proposalHash },
  });
  appendMessageRaw(plan, {
    type: MESSAGE_TYPES.REPORT_BLOCKER,
    from: "HYDRA",
    to: task.owner,
    taskId: task.id,
    payload: { reason, proposalHash: task.proposalHash },
  });
}

function propagateAndReady(plan) {
  let changed = false;
  for (const task of plan.tasks) {
    if (![TASK_STATUSES.PENDING, TASK_STATUSES.READY].includes(task.status)) continue;
    const dependencies = task.dependencies.map((dependency) => taskById(plan, dependency));
    const failed = dependencies.find((dependency) =>
      [TASK_STATUSES.BLOCKED, TASK_STATUSES.FAILED].includes(dependency.status),
    );
    if (failed) {
      task.status = TASK_STATUSES.BLOCKED;
      task.blocker = `DEPENDENCY_BLOCKED:${failed.id}`;
      appendReceipt(plan, "TASK_BLOCKED_BY_DEPENDENCY", "blocked", {
        taskId: task.id,
        reason: task.blocker,
      });
      appendMessageRaw(plan, {
        type: MESSAGE_TYPES.REPORT_BLOCKER,
        from: "HYDRA",
        to: task.owner,
        taskId: task.id,
        payload: { reason: task.blocker, dependencyId: failed.id },
      });
      changed = true;
      continue;
    }
    if (task.status === TASK_STATUSES.PENDING && dependencies.every((dependency) => dependency.status === TASK_STATUSES.DONE)) {
      task.status = TASK_STATUSES.READY;
      task.blocker = null;
      appendReceipt(plan, "TASK_READY", "accepted", {
        taskId: task.id,
        input: { dependencies: task.dependencies },
      });
      if (dependencies.length > 0) {
        appendMessageRaw(plan, {
          type: MESSAGE_TYPES.HANDOFF,
          from: "HYDRA",
          to: task.owner,
          taskId: task.id,
          payload: {
            accepted: true,
            dependencyIds: task.dependencies,
            evidenceFingerprints: dependencies.flatMap((dependency) =>
              dependency.evidence.map((evidence) => evidence.fingerprint),
            ),
          },
        });
      }
      changed = true;
    }
  }
  return changed;
}

function requestOwnerApproval(plan, task) {
  let action = task.currentActionId === null ? null : actionById(plan, task.currentActionId);
  if (action === null) action = createAction(plan, task, "WAITING_OWNER");
  const existing = currentApproval(plan, task);
  if (existing) {
    task.status = TASK_STATUSES.WAITING_OWNER;
    return;
  }
  const approval = {
    id: `${plan.id}:approval:${plan.approvals.length + 1}`,
    taskId: task.id,
    actionId: action.id,
    proposalHash: task.proposalHash,
    status: "PENDING",
    requestedAt: eventTime(plan),
    decidedAt: null,
    consumedAt: null,
  };
  plan.approvals.push(approval);
  action.approvalId = approval.id;
  action.status = "WAITING_OWNER";
  task.status = TASK_STATUSES.WAITING_OWNER;
  appendReceipt(plan, "OWNER_APPROVAL_REQUIRED", "owner_required", {
    taskId: task.id,
    actionId: action.id,
    correlationId: approval.id,
    reason: `risk=${task.risk};approval=${task.approvalLevel}`,
    input: { proposalHash: task.proposalHash },
  });
  appendMessageRaw(plan, {
    type: MESSAGE_TYPES.REQUEST_APPROVAL,
    from: "HYDRA",
    to: "OWNER",
    taskId: task.id,
    correlationId: approval.id,
    payload: {
      approvalId: approval.id,
      proposalHash: task.proposalHash,
      risk: task.risk,
      title: task.title,
    },
  });
}

function dispatchTask(plan, task) {
  let action = task.currentActionId === null ? null : actionById(plan, task.currentActionId);
  if (action !== null && action.proposalHash !== task.proposalHash) {
    fail("ACTION_STALE", "existing action no longer matches the task proposal");
  }
  if (action === null) action = createAction(plan, task, "AUTHORIZED");
  const approval = task.approvalLevel === APPROVAL_LEVELS.OWNER ? approvedDecision(plan, task) : null;
  if (task.approvalLevel === APPROVAL_LEVELS.OWNER && approval === null) {
    fail("OWNER_REQUIRED", "task cannot be dispatched without exact owner approval");
  }
  if (approval) {
    if (approval.consumedAt !== null) fail("APPROVAL_REPLAY", "owner approval was already consumed");
    approval.consumedAt = eventTime(plan);
    action.approvalId = approval.id;
  }
  action.status = "AUTHORIZED";
  task.status = TASK_STATUSES.RUNNING;
  appendReceipt(plan, "ACTION_AUTHORIZED", "running", {
    taskId: task.id,
    actionId: action.id,
    correlationId: action.approvalId,
    input: {
      proposalHash: task.proposalHash,
      approvalId: action.approvalId,
      coordinationOnly: true,
    },
  });
  appendMessageRaw(plan, {
    type: MESSAGE_TYPES.DISPATCH,
    from: "HYDRA",
    to: task.owner,
    taskId: task.id,
    correlationId: action.id,
    payload: {
      actionId: action.id,
      proposalHash: action.proposalHash,
      coordinationOnly: true,
      externalExecutionAuthority: false,
    },
  });
}

function derivePlanStatus(plan) {
  if (plan.tasks.every((task) => task.status === TASK_STATUSES.DONE)) return PLAN_STATUSES.COMPLETED;
  if (plan.tasks.some((task) => task.status === TASK_STATUSES.WAITING_OWNER)) return PLAN_STATUSES.WAITING_OWNER;
  if (plan.tasks.some((task) => task.status === TASK_STATUSES.RUNNING)) return PLAN_STATUSES.RUNNING;
  if (plan.tasks.some((task) => [TASK_STATUSES.PENDING, TASK_STATUSES.READY].includes(task.status))) {
    return PLAN_STATUSES.READY;
  }
  return PLAN_STATUSES.BLOCKED;
}

function metricsFor(plan) {
  const totalWeight = plan.tasks.reduce((sum, task) => sum + task.goalWeight, 0);
  const completedWeight = plan.tasks
    .filter((task) => task.status === TASK_STATUSES.DONE)
    .reduce((sum, task) => sum + task.goalWeight, 0);
  const terminalActions = plan.actions.filter((action) => TERMINAL_ACTIONS.has(action.status));
  const attemptedWeight = terminalActions.reduce(
    (sum, action) => sum + taskById(plan, action.taskId).goalWeight,
    0,
  );
  const usefulWeight = terminalActions
    .filter((action) => action.useful === true)
    .reduce((sum, action) => sum + taskById(plan, action.taskId).goalWeight, 0);
  const uac = attemptedWeight === 0 ? null : round6(usefulWeight / attemptedWeight);
  const totalEdges = plan.tasks.reduce((sum, task) => sum + task.dependencies.length, 0);
  const verifiedEdges = plan.tasks.reduce(
    (sum, task) => sum + task.dependencies.filter((dependency) => taskById(plan, dependency).status === TASK_STATUSES.DONE).length,
    0,
  );
  return {
    protocol: PLANERKA_VERSION,
    planId: plan.id,
    goalProgress: round6(completedWeight / totalWeight),
    usefulActionCoefficient: uac,
    usefulActionState: uac === null ? "NO_SAMPLE" : "MEASURED",
    usefulActionPercent: uac === null ? null : round6(uac * 100),
    actionAttempts: terminalActions.length,
    verifiedUsefulActions: terminalActions.filter((action) => action.useful === true).length,
    coordinationWaste: terminalActions.filter((action) => action.useful !== true).length,
    dependencyUnlockProgress: totalEdges === 0 ? 1 : round6(verifiedEdges / totalEdges),
    tasks: {
      total: plan.tasks.length,
      done: plan.tasks.filter((task) => task.status === TASK_STATUSES.DONE).length,
      running: plan.tasks.filter((task) => task.status === TASK_STATUSES.RUNNING).length,
      waitingOwner: plan.tasks.filter((task) => task.status === TASK_STATUSES.WAITING_OWNER).length,
      blocked: plan.tasks.filter((task) =>
        [TASK_STATUSES.BLOCKED, TASK_STATUSES.FAILED].includes(task.status),
      ).length,
    },
    nextTaskIds: plan.tasks
      .filter((task) => task.status === TASK_STATUSES.READY)
      .sort((left, right) => right.priorityScore - left.priorityScore || left.id.localeCompare(right.id))
      .map((task) => task.id),
  };
}

function finalize(plan, previousRevision, changed) {
  plan.status = derivePlanStatus(plan);
  if (changed) plan.revision = previousRevision + 1;
  plan.metrics = metricsFor(plan);
  plan.stateFingerprint = createFingerprint({ ...plan, stateFingerprint: null });
  return deepFreeze(plan);
}

function verifyRuntimePlan(plan) {
  if (!isPlainObject(plan) || plan.version !== PLANERKA_VERSION) fail("INVALID_PLAN", "plan version is invalid");
  assertIdentifier(plan.id, "plan.id");
  if (!Number.isSafeInteger(plan.revision) || plan.revision < 1 || !Number.isSafeInteger(plan.epoch) || plan.epoch < 1) {
    fail("INVALID_PLAN", "plan revision or epoch is invalid");
  }
  if (!Object.hasOwn(PLAN_STATUSES, plan.status)) fail("INVALID_PLAN", "plan status is invalid");
  if (!Array.isArray(plan.tasks) || !Array.isArray(plan.messages) || !Array.isArray(plan.approvals) || !Array.isArray(plan.receipts) || !Array.isArray(plan.actions)) {
    fail("INVALID_PLAN", "plan collections are invalid");
  }
  if (createFingerprint({ ...plan, stateFingerprint: null }) !== plan.stateFingerprint) {
    fail("PLAN_TAMPERED", "plan state fingerprint mismatch");
  }
  assertDag(plan.tasks);
  for (const task of plan.tasks) {
    if (!Object.hasOwn(TASK_STATUSES, task.status)) fail("INVALID_TASK", "task status is invalid");
    if (proposalHash(plan.id, plan.epoch, task) !== task.proposalHash) {
      fail("PLAN_TAMPERED", `task ${task.id} proposal hash mismatch`);
    }
    const derived = plan.tasks.filter((candidate) => candidate.dependencies.includes(task.id)).map((candidate) => candidate.id).sort();
    if (stableStringify(derived) !== stableStringify(task.unlocks)) {
      fail("PLAN_TAMPERED", `task ${task.id} unlocks are inconsistent`);
    }
  }
  for (const receipt of plan.receipts) {
    const expected = createFingerprint({ ...receipt, receiptFingerprint: null });
    if (receipt.version !== PLANERKA_RECEIPT_VERSION || expected !== receipt.receiptFingerprint) {
      fail("RECEIPT_TAMPERED", "receipt fingerprint mismatch");
    }
  }
  for (const message of plan.messages) {
    const expected = createFingerprint({ ...message, messageFingerprint: null });
    if (message.version !== PLANERKA_MESSAGE_VERSION || expected !== message.messageFingerprint) {
      fail("MESSAGE_TAMPERED", "message fingerprint mismatch");
    }
  }
  return plan;
}

export function validatePlan(plan) {
  verifyRuntimePlan(plan);
  return plan;
}

export function createPlan(input) {
  assertExactObject(input, PLAN_INPUT_FIELDS, "INVALID_PLAN", "plan input");
  if (!Array.isArray(input.tasks) || input.tasks.length === 0 || input.tasks.length > PLANERKA_LIMITS.maxTasks) {
    fail("INVALID_PLAN", "plan.tasks must be a bounded non-empty array");
  }
  const provisionalId = input.id ?? `plan-${createFingerprint({ goal: input.goal, tasks: input.tasks })}`;
  assertIdentifier(provisionalId, "plan.id");
  const createdAt = input.createdAt ?? 0;
  if (!Number.isSafeInteger(createdAt) || createdAt < 0) fail("INVALID_PLAN", "plan.createdAt is invalid");
  const tasks = input.tasks.map((task, index) => normalizeTask(task, index, input.tasks.length));
  assertDag(tasks);
  deriveUnlocks(tasks);
  const epoch = 1;
  populatePlanningSignals(provisionalId, epoch, tasks);
  const plan = {
    version: PLANERKA_VERSION,
    revision: 1,
    epoch,
    id: provisionalId,
    goal: normalizeGoal(input.goal, provisionalId),
    status: PLAN_STATUSES.READY,
    tasks,
    messages: [],
    approvals: [],
    receipts: [],
    actions: [],
    metrics: null,
    mode: "COORDINATION_ONLY",
    createdAt,
    stateFingerprint: null,
  };
  appendReceipt(plan, "PLAN_CREATED", "accepted", {
    input: {
      goal: plan.goal,
      taskIds: tasks.map((task) => task.id),
      mode: plan.mode,
    },
  });
  appendMessageRaw(plan, {
    type: MESSAGE_TYPES.PROPOSE,
    from: "PROJECT_STRATEGIST",
    to: "HYDRA",
    payload: { goalId: plan.goal.id, taskIds: tasks.map((task) => task.id) },
  });
  plan.metrics = metricsFor(plan);
  plan.stateFingerprint = createFingerprint({ ...plan, stateFingerprint: null });
  return deepFreeze(plan);
}

export function runUntilGate(plan) {
  verifyRuntimePlan(plan);
  if ([PLAN_STATUSES.COMPLETED, PLAN_STATUSES.BLOCKED].includes(plan.status)) return plan;
  const next = cloneJson(plan);
  const previousRevision = next.revision;
  let changed = false;
  let transitions = 0;
  const transitionLimit = next.tasks.length * 4 + 8;

  while (transitions < transitionLimit) {
    let passChanged = propagateAndReady(next);
    changed ||= passChanged;
    const ready = next.tasks
      .filter((task) => task.status === TASK_STATUSES.READY)
      .sort((left, right) => right.priorityScore - left.priorityScore || left.id.localeCompare(right.id));
    if (ready.length === 0) {
      if (!passChanged) break;
      transitions += 1;
      continue;
    }
    for (const task of ready) {
      if (task.approvalLevel === APPROVAL_LEVELS.FORBIDDEN || task.risk === RISK_LEVELS.UNKNOWN) {
        blockTask(next, task, "UNKNOWN_OR_FORBIDDEN_RISK", "BLOCKED_POLICY");
      } else if (task.dedupeOf !== null) {
        blockTask(next, task, `SEMANTIC_DUPLICATE:${task.dedupeOf}`, "REJECTED_DUPLICATE");
      } else if (task.approvalLevel === APPROVAL_LEVELS.OWNER && approvedDecision(next, task) === null) {
        requestOwnerApproval(next, task);
      } else {
        dispatchTask(next, task);
      }
      changed = true;
      transitions += 1;
      if (transitions >= transitionLimit) break;
    }
  }
  if (transitions >= transitionLimit && next.tasks.some((task) => task.status === TASK_STATUSES.READY)) {
    fail("LOOP_GUARD", "scheduler transition budget exhausted");
  }
  return finalize(next, previousRevision, changed);
}

export function resolveApproval(plan, input) {
  verifyRuntimePlan(plan);
  assertExactObject(input, APPROVAL_INPUT_FIELDS, "INVALID_APPROVAL", "approval decision");
  assertIdentifier(input.taskId, "approval.taskId");
  const decision = String(input.decision ?? "").toUpperCase();
  if (!Object.hasOwn(APPROVAL_DECISIONS, decision)) fail("INVALID_APPROVAL", "approval decision is invalid");
  const next = cloneJson(plan);
  const previousRevision = next.revision;
  const task = taskById(next, input.taskId);
  if (task.status !== TASK_STATUSES.WAITING_OWNER) fail("APPROVAL_NOT_PENDING", "task is not waiting for owner");
  const approval = currentApproval(next, task);
  if (!approval) fail("APPROVAL_NOT_PENDING", "exact approval request is not pending");
  if (input.approvalId !== undefined && input.approvalId !== approval.id) {
    fail("APPROVAL_MISMATCH", "approval id does not match the pending request");
  }
  if (input.proposalHash !== undefined && input.proposalHash !== approval.proposalHash) {
    fail("APPROVAL_MISMATCH", "proposal hash does not match the pending request");
  }
  if (approval.proposalHash !== task.proposalHash) fail("APPROVAL_STALE", "approval no longer matches task proposal");
  const action = actionById(next, approval.actionId);
  approval.decidedAt = eventTime(next);
  const approved = decision === APPROVAL_DECISIONS.APPROVE;
  approval.status = approved ? "APPROVED" : "REJECTED";
  action.status = approved ? "APPROVED" : "REJECTED_OWNER";
  task.status = approved ? TASK_STATUSES.READY : TASK_STATUSES.BLOCKED;
  task.blocker = approved ? null : "OWNER_REJECTED";
  if (!approved) action.finishedAt = eventTime(next);
  appendReceipt(next, approved ? "OWNER_APPROVED" : "OWNER_REJECTED", approved ? "accepted" : "blocked", {
    taskId: task.id,
    actionId: action.id,
    correlationId: approval.id,
    reason: approved ? "EXACT_PROPOSAL_APPROVED" : "OWNER_REJECTED",
    input: { approvalId: approval.id, proposalHash: approval.proposalHash, decision },
  });
  appendMessageRaw(next, {
    type: MESSAGE_TYPES.APPROVAL_DECISION,
    from: "OWNER",
    to: "HYDRA",
    taskId: task.id,
    correlationId: approval.id,
    payload: { approvalId: approval.id, proposalHash: approval.proposalHash, decision },
  });
  return finalize(next, previousRevision, true);
}

function normalizeEvidence(input, task, action, evidenceIndex) {
  assertExactObject(input, EVIDENCE_FIELDS, "INVALID_EVIDENCE", "evidence");
  assertIdentifier(input.type, "evidence.type");
  assertIdentifier(input.verifiedBy, "evidence.verifiedBy");
  assertText(input.summary, "evidence.summary", { maximum: 2048 });
  if (typeof input.verified !== "boolean") fail("INVALID_EVIDENCE", "evidence.verified must be boolean");
  if (input.sourceHash !== undefined && input.sourceHash !== null) {
    assertText(input.sourceHash, "evidence.sourceHash", { maximum: 256 });
  }
  if (
    input.verified === true &&
    [RISK_LEVELS.MEDIUM, RISK_LEVELS.HIGH].includes(task.risk) &&
    input.verifiedBy === task.owner
  ) {
    fail("INDEPENDENT_VERIFIER_REQUIRED", "medium and high risk results require an independent verifier");
  }
  const evidence = {
    id: `${task.id}:evidence:${evidenceIndex}`,
    type: input.type,
    summary: input.summary.trim(),
    verified: input.verified,
    verifiedBy: input.verifiedBy,
    sourceHash: input.sourceHash ?? null,
    actionId: action.id,
    proposalHash: action.proposalHash,
    fingerprint: null,
  };
  evidence.fingerprint = createFingerprint({ ...evidence, fingerprint: null });
  return evidence;
}

export function recordTaskResult(plan, input) {
  verifyRuntimePlan(plan);
  assertExactObject(input, RESULT_INPUT_FIELDS, "INVALID_RESULT", "task result");
  assertIdentifier(input.taskId, "result.taskId");
  const status = String(input.status ?? "").toUpperCase();
  if (!new Set(["SUCCEEDED", "FAILED"]).has(status)) fail("INVALID_RESULT", "result.status is invalid");
  const next = cloneJson(plan);
  const previousRevision = next.revision;
  const task = taskById(next, input.taskId);
  if (task.status !== TASK_STATUSES.RUNNING || task.currentActionId === null) {
    fail("RESULT_NOT_EXPECTED", "task has no running authorized action");
  }
  const action = actionById(next, task.currentActionId);
  if (input.actionId !== undefined && input.actionId !== action.id) fail("RESULT_MISMATCH", "action id mismatch");
  if (input.proposalHash !== undefined && input.proposalHash !== action.proposalHash) {
    fail("RESULT_MISMATCH", "proposal hash mismatch");
  }
  if (action.proposalHash !== task.proposalHash || action.status !== "AUTHORIZED") {
    fail("RESULT_STALE", "result does not match an authorized current proposal");
  }
  const evidenceInputs = input.evidence ?? [];
  if (!Array.isArray(evidenceInputs) || evidenceInputs.length > 32) fail("INVALID_EVIDENCE", "evidence list is invalid");
  const evidence = evidenceInputs.map((item, index) => normalizeEvidence(item, task, action, task.evidence.length + index + 1));
  const verified = evidence.length > 0 && evidence.every((item) => item.verified === true);
  action.finishedAt = eventTime(next);
  if (status === "SUCCEEDED" && verified) {
    task.status = TASK_STATUSES.DONE;
    task.evidence.push(...evidence);
    action.status = "SUCCEEDED";
    action.useful = true;
    action.evidenceFingerprint = createFingerprint(evidence.map((item) => item.fingerprint));
    appendReceipt(next, "TASK_RESULT_VERIFIED", "succeeded", {
      taskId: task.id,
      actionId: action.id,
      input: { proposalHash: action.proposalHash },
      output: { evidence: evidence.map((item) => item.fingerprint), unlocks: task.unlocks },
    });
    appendMessageRaw(next, {
      type: MESSAGE_TYPES.REPORT_RESULT,
      from: task.owner,
      to: "HYDRA",
      taskId: task.id,
      correlationId: action.id,
      payload: { status: "VERIFIED", evidence: evidence.map((item) => item.fingerprint), unlocks: task.unlocks },
    });
  } else if (status === "SUCCEEDED") {
    task.status = TASK_STATUSES.BLOCKED;
    task.blocker = "UNVERIFIED_RESULT";
    task.evidence.push(...evidence);
    action.status = "FAILED_VALIDATION";
    appendReceipt(next, "TASK_RESULT_UNVERIFIED", "failed", {
      taskId: task.id,
      actionId: action.id,
      reason: task.blocker,
      input: { proposalHash: action.proposalHash },
      output: { evidence: evidence.map((item) => item.fingerprint) },
    });
    appendMessageRaw(next, {
      type: MESSAGE_TYPES.VALIDATION_RESULT,
      from: "HYDRA",
      to: task.owner,
      taskId: task.id,
      correlationId: action.id,
      payload: { status: "REJECTED", reason: task.blocker },
    });
  } else {
    task.status = TASK_STATUSES.FAILED;
    task.blocker = "EXECUTION_FAILED";
    task.evidence.push(...evidence);
    action.status = "FAILED";
    appendReceipt(next, "TASK_RESULT_FAILED", "failed", {
      taskId: task.id,
      actionId: action.id,
      reason: task.blocker,
      input: { proposalHash: action.proposalHash },
      output: { evidence: evidence.map((item) => item.fingerprint) },
    });
    appendMessageRaw(next, {
      type: MESSAGE_TYPES.REPORT_RESULT,
      from: task.owner,
      to: "HYDRA",
      taskId: task.id,
      correlationId: action.id,
      payload: { status: "FAILED", evidence: evidence.map((item) => item.fingerprint) },
    });
  }
  return finalize(next, previousRevision, true);
}

export function sendAgentMessage(plan, input) {
  verifyRuntimePlan(plan);
  assertExactObject(input, MESSAGE_INPUT_FIELDS, "INVALID_MESSAGE", "message input");
  const next = cloneJson(plan);
  const previousRevision = next.revision;
  const message = appendMessageRaw(next, input);
  appendReceipt(next, "MESSAGE_RECORDED", "accepted", {
    taskId: message.taskId,
    correlationId: message.correlationId,
    input: { messageFingerprint: message.messageFingerprint, type: message.type },
  });
  return finalize(next, previousRevision, true);
}

export function getPlanMetrics(plan) {
  verifyRuntimePlan(plan);
  return deepFreeze(metricsFor(plan));
}
