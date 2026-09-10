import assert from "node:assert/strict";
import test from "node:test";

import {
  APPROVAL_DECISIONS,
  APPROVAL_LEVELS,
  createFingerprint,
  createPlan,
  getPlanMetrics,
  MESSAGE_TYPES,
  PLAN_STATUSES,
  recordTaskResult,
  resolveApproval,
  RISK_LEVELS,
  runUntilGate,
  sendAgentMessage,
  TASK_STATUSES,
  validatePlan,
} from "../src/planerka/engine.js";

const task = (id, overrides = {}) => ({
  id,
  title: `Task ${id}`,
  owner: `AGENT-${id}`,
  dependencies: [],
  risk: RISK_LEVELS.SAFE,
  goalAlignment: 1,
  expectedProgress: 0.5,
  evidenceConfidence: 1,
  ...overrides,
});

const plan = (tasks, overrides = {}) => createPlan({
  id: "PLAN-1",
  goal: {
    id: "GOAL-1",
    title: "Increase verified useful actions",
    successCriteria: ["Every required task has verified evidence"],
  },
  tasks,
  createdAt: 1_000,
  ...overrides,
});

const evidence = (verifiedBy = "SENTINEL", overrides = {}) => ({
  type: "TEST_REPORT",
  summary: "Deterministic checks passed",
  verified: true,
  verifiedBy,
  sourceHash: "source-fixture-1",
  ...overrides,
});

const errorCode = (code) => (error) => error?.code === code;

test("createPlan exposes the stable React read model and derives the DAG", () => {
  const created = plan([
    task("ROOT"),
    task("MID", { dependencies: ["ROOT"] }),
    task("LEAF", { dependencies: ["MID"] }),
  ]);

  assert.deepEqual(
    Object.keys(created).sort(),
    [
      "actions",
      "approvals",
      "createdAt",
      "epoch",
      "goal",
      "id",
      "messages",
      "metrics",
      "mode",
      "receipts",
      "revision",
      "stateFingerprint",
      "status",
      "tasks",
      "version",
    ],
  );
  assert.deepEqual(created.tasks.find((item) => item.id === "ROOT").unlocks, ["MID"]);
  assert.deepEqual(created.tasks.find((item) => item.id === "MID").unlocks, ["LEAF"]);
  assert.equal(created.tasks.find((item) => item.id === "LEAF").unlocks.length, 0);
  assert.ok(
    created.tasks.find((item) => item.id === "ROOT").prioritySignals.dependencyUnlock >
      created.tasks.find((item) => item.id === "LEAF").prioritySignals.dependencyUnlock,
  );
  assert.equal(created.tasks.every((item) => Object.hasOwn(item, "priorityScore")), true);
  assert.equal(created.tasks.every((item) => Array.isArray(item.evidence)), true);
  assert.equal(Object.isFrozen(created), true);
  assert.equal(validatePlan(created), created);
});

test("priority rewards path clearing and penalizes risk and semantic duplication", () => {
  const created = plan([
    task("PATH", { title: "Shared action", owner: "BUILDER", expectedProgress: 0.4 }),
    task("DUPLICATE", { title: "Shared action", owner: "BUILDER", expectedProgress: 0.4 }),
    task("CHILD", { dependencies: ["PATH"], expectedProgress: 0.4 }),
    task("RISKY", { risk: RISK_LEVELS.HIGH, expectedProgress: 0.4 }),
  ]);
  const path = created.tasks.find((item) => item.id === "PATH");
  const duplicate = created.tasks.find((item) => item.id === "DUPLICATE");
  const risky = created.tasks.find((item) => item.id === "RISKY");

  assert.equal(duplicate.dedupeOf, "PATH");
  assert.ok(path.priorityScore > duplicate.priorityScore);
  assert.ok(path.priorityScore > risky.priorityScore);
  assert.equal(risky.approvalLevel, APPROVAL_LEVELS.OWNER);
});

test("DAG validation rejects missing dependencies, self cycles, indirect cycles and false unlocks", () => {
  assert.throws(() => plan([task("A", { dependencies: ["MISSING"] })]), errorCode("MISSING_DEPENDENCY"));
  assert.throws(() => plan([task("A", { dependencies: ["A"] })]), errorCode("DEPENDENCY_CYCLE"));
  assert.throws(
    () => plan([task("A", { dependencies: ["B"] }), task("B", { dependencies: ["A"] })]),
    errorCode("DEPENDENCY_CYCLE"),
  );
  assert.throws(
    () => plan([task("A", { unlocks: ["B"] }), task("B")]),
    errorCode("UNLOCK_MISMATCH"),
  );
});

test("runUntilGate authorizes coordination only and performs no external effect", () => {
  const started = runUntilGate(plan([task("A")]));
  const running = started.tasks[0];
  const action = started.actions[0];

  assert.equal(started.status, PLAN_STATUSES.RUNNING);
  assert.equal(running.status, TASK_STATUSES.RUNNING);
  assert.equal(action.status, "AUTHORIZED");
  assert.ok(started.messages.some((message) => message.type === MESSAGE_TYPES.DISPATCH));
  assert.ok(started.receipts.some((receipt) => receipt.type === "ACTION_AUTHORIZED"));
  assert.equal(
    started.messages.find((message) => message.type === MESSAGE_TYPES.DISPATCH).payload.externalExecutionAuthority,
    false,
  );
  assert.equal(getPlanMetrics(started).usefulActionState, "NO_SAMPLE");
});

test("verified result clears the path, then the next risky task stops at Owner Gate", () => {
  let current = runUntilGate(plan([
    task("AUDIT", { owner: "AUDITOR" }),
    task("PUBLISH", {
      owner: "DEPLOYER",
      dependencies: ["AUDIT"],
      risk: RISK_LEVELS.MEDIUM,
    }),
  ]));
  current = recordTaskResult(current, {
    taskId: "AUDIT",
    status: "SUCCEEDED",
    evidence: [evidence("AUDITOR")],
  });
  current = runUntilGate(current);

  assert.equal(current.tasks.find((item) => item.id === "AUDIT").status, TASK_STATUSES.DONE);
  assert.equal(current.tasks.find((item) => item.id === "PUBLISH").status, TASK_STATUSES.WAITING_OWNER);
  assert.equal(current.status, PLAN_STATUSES.WAITING_OWNER);
  assert.equal(current.approvals.length, 1);
  assert.equal(current.approvals[0].proposalHash, current.tasks[1].proposalHash);
  assert.ok(current.messages.some((message) => message.type === MESSAGE_TYPES.HANDOFF));
  assert.ok(current.messages.some((message) => message.type === MESSAGE_TYPES.REQUEST_APPROVAL));
  assert.equal(getPlanMetrics(current).usefulActionCoefficient, 1);
});

test("approval is exact, one-time, and bound to the current proposal", () => {
  let current = runUntilGate(plan([task("RISK", { risk: RISK_LEVELS.HIGH })]));
  const request = current.approvals[0];

  assert.throws(
    () => resolveApproval(current, {
      taskId: "RISK",
      decision: APPROVAL_DECISIONS.APPROVE,
      proposalHash: "wrong-proposal",
    }),
    errorCode("APPROVAL_MISMATCH"),
  );
  current = resolveApproval(current, {
    taskId: "RISK",
    decision: APPROVAL_DECISIONS.APPROVE,
    approvalId: request.id,
    proposalHash: request.proposalHash,
  });
  assert.throws(
    () => resolveApproval(current, { taskId: "RISK", decision: APPROVAL_DECISIONS.APPROVE }),
    errorCode("APPROVAL_NOT_PENDING"),
  );
  current = runUntilGate(current);
  assert.equal(current.tasks[0].status, TASK_STATUSES.RUNNING);
  assert.equal(current.approvals[0].consumedAt !== null, true);
  assert.equal(current.actions[0].status, "AUTHORIZED");
});

test("owner rejection propagates through the dependent branch", () => {
  let current = runUntilGate(plan([
    task("OWNER-GATE", { risk: RISK_LEVELS.MEDIUM }),
    task("RECEIPT", { dependencies: ["OWNER-GATE"] }),
  ]));
  const request = current.approvals[0];

  current = resolveApproval(current, {
    taskId: "OWNER-GATE",
    decision: APPROVAL_DECISIONS.REJECT,
    approvalId: request.id,
    proposalHash: request.proposalHash,
  });
  current = runUntilGate(current);

  assert.equal(current.tasks.find((item) => item.id === "OWNER-GATE").status, TASK_STATUSES.BLOCKED);
  assert.equal(current.tasks.find((item) => item.id === "RECEIPT").status, TASK_STATUSES.BLOCKED);
  assert.equal(current.status, PLAN_STATUSES.BLOCKED);
  assert.equal(current.actions[0].status, "REJECTED_OWNER");
});

test("approved high-risk result requires an independent verifier", () => {
  let current = runUntilGate(plan([task("RISK", { owner: "BUILDER", risk: RISK_LEVELS.HIGH })]));
  current = resolveApproval(current, { taskId: "RISK", decision: "APPROVE" });
  current = runUntilGate(current);

  assert.throws(
    () => recordTaskResult(current, {
      taskId: "RISK",
      status: "SUCCEEDED",
      evidence: [evidence("BUILDER")],
    }),
    errorCode("INDEPENDENT_VERIFIER_REQUIRED"),
  );
  current = recordTaskResult(current, {
    taskId: "RISK",
    status: "SUCCEEDED",
    evidence: [evidence("SENTINEL")],
  });
  assert.equal(current.status, PLAN_STATUSES.COMPLETED);
  assert.equal(current.metrics.goalProgress, 1);
  assert.equal(current.metrics.usefulActionCoefficient, 1);
});

test("unverified success fails closed and cannot unlock its dependent", () => {
  let current = runUntilGate(plan([
    task("A"),
    task("B", { dependencies: ["A"] }),
  ]));
  current = recordTaskResult(current, {
    taskId: "A",
    status: "SUCCEEDED",
    evidence: [evidence("SENTINEL", { verified: false })],
  });
  current = runUntilGate(current);

  assert.equal(current.tasks.find((item) => item.id === "A").status, TASK_STATUSES.BLOCKED);
  assert.equal(current.tasks.find((item) => item.id === "B").status, TASK_STATUSES.BLOCKED);
  assert.equal(current.status, PLAN_STATUSES.BLOCKED);
  assert.equal(current.metrics.usefulActionCoefficient, 0);
});

test("unknown risk blocks its branch while an independent safe branch can proceed", () => {
  const current = runUntilGate(plan([
    task("UNKNOWN", { risk: RISK_LEVELS.UNKNOWN }),
    task("DEPENDENT", { dependencies: ["UNKNOWN"] }),
    task("SAFE"),
  ]));

  assert.equal(current.tasks.find((item) => item.id === "UNKNOWN").status, TASK_STATUSES.BLOCKED);
  assert.equal(current.tasks.find((item) => item.id === "DEPENDENT").status, TASK_STATUSES.BLOCKED);
  assert.equal(current.tasks.find((item) => item.id === "SAFE").status, TASK_STATUSES.RUNNING);
  assert.equal(current.actions.find((action) => action.taskId === "UNKNOWN").status, "BLOCKED_POLICY");
});

test("semantic duplicate is stopped and visible as coordination waste", () => {
  let current = runUntilGate(plan([
    task("PRIMARY", { owner: "BUILDER", title: "Build artifact" }),
    task("COPY", { owner: "BUILDER", title: "Build artifact" }),
  ]));
  assert.equal(current.tasks.find((item) => item.id === "COPY").status, TASK_STATUSES.BLOCKED);
  current = recordTaskResult(current, {
    taskId: "PRIMARY",
    status: "SUCCEEDED",
    evidence: [evidence("BUILDER")],
  });

  assert.equal(current.metrics.actionAttempts, 2);
  assert.equal(current.metrics.verifiedUsefulActions, 1);
  assert.equal(current.metrics.coordinationWaste, 1);
  assert.equal(current.metrics.usefulActionCoefficient, 0.5);
});

test("typed messages are bounded, deduplicated, secret-safe, and never create metric credit", () => {
  const created = plan([task("A")]);
  const withMessage = sendAgentMessage(created, {
    type: MESSAGE_TYPES.REQUEST_INFO,
    from: "AGENT-A",
    to: "HYDRA",
    taskId: "A",
    correlationId: "QUESTION-1",
    payload: { question: "Which acceptance criterion is blocking?" },
  });

  assert.equal(withMessage.messages.at(-1).type, MESSAGE_TYPES.REQUEST_INFO);
  assert.equal(getPlanMetrics(withMessage).usefulActionState, "NO_SAMPLE");
  assert.throws(
    () => sendAgentMessage(withMessage, {
      type: MESSAGE_TYPES.REQUEST_INFO,
      from: "AGENT-A",
      to: "HYDRA",
      taskId: "A",
      correlationId: "QUESTION-1",
      payload: { question: "Which acceptance criterion is blocking?" },
    }),
    errorCode("MESSAGE_DUPLICATE"),
  );
  assert.throws(
    () => sendAgentMessage(created, {
      type: MESSAGE_TYPES.PROVIDE_EVIDENCE,
      from: "AGENT-A",
      to: "HYDRA",
      taskId: "A",
      payload: { secret: "must-not-enter-the-plan" },
    }),
    errorCode("SECRET_FIELD"),
  );
});

test("same input and repeated idle run are deterministic", () => {
  const inputTasks = [task("A"), task("B", { dependencies: ["A"] })];
  const first = plan(inputTasks);
  const second = plan(inputTasks);
  assert.deepEqual(first, second);
  assert.equal(createFingerprint(first.goal), createFingerprint(second.goal));

  const running = runUntilGate(first);
  const repeated = runUntilGate(running);
  assert.deepEqual(repeated, running);
  assert.equal(repeated.receipts.length, running.receipts.length);
  assert.equal(repeated.messages.length, running.messages.length);
});

test("state and receipt tampering are rejected before scheduling", () => {
  const created = plan([task("A")]);
  const changedState = JSON.parse(JSON.stringify(created));
  changedState.tasks[0].status = TASK_STATUSES.DONE;
  assert.throws(() => runUntilGate(changedState), errorCode("PLAN_TAMPERED"));

  const changedReceipt = JSON.parse(JSON.stringify(created));
  changedReceipt.receipts[0].status = "succeeded";
  changedReceipt.stateFingerprint = createFingerprint({ ...changedReceipt, stateFingerprint: null });
  assert.throws(() => runUntilGate(changedReceipt), errorCode("RECEIPT_TAMPERED"));
});
