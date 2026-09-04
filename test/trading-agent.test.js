import test from "node:test";
import assert from "node:assert/strict";
import {
  TRADING_AGENT_POLICY,
  activateKillSwitch,
  applyPaperQuote,
  createTradingState,
  evaluateTradingRisk,
  openPaperPosition,
  startPaperAgent,
  summarizeTradingState,
} from "../src/trading/engine.js";

test("paper policy keeps live execution, leverage and withdrawals disabled", () => {
  assert.equal(TRADING_AGENT_POLICY.mode, "PAPER_ONLY");
  assert.equal(TRADING_AGENT_POLICY.allowLiveTrading, false);
  assert.equal(TRADING_AGENT_POLICY.allowLeverage, false);
  assert.equal(TRADING_AGENT_POLICY.allowWithdrawals, false);
  assert.equal(TRADING_AGENT_POLICY.maxPositionUsd, 5);
});

test("risk gate allows a bounded paper order while the agent is running", () => {
  const running = startPaperAgent(createTradingState({ capitalUsd: 20, now: 1 }), 2);
  const gate = evaluateTradingRisk(running, {
    side: "BUY",
    notionalUsd: 5,
    live: false,
    leverage: false,
    withdrawalPermission: false,
  });

  assert.equal(gate.allowed, true);
  assert.deepEqual(gate.blockers, []);
});

test("risk gate blocks live, leverage, withdrawal and oversized orders", () => {
  const running = startPaperAgent(createTradingState({ capitalUsd: 20, now: 1 }), 2);
  const gate = evaluateTradingRisk(running, {
    side: "BUY",
    notionalUsd: 10,
    live: true,
    leverage: true,
    withdrawalPermission: true,
  });

  assert.equal(gate.allowed, false);
  assert.ok(gate.blockers.includes("LIVE_TRADING_LOCKED"));
  assert.ok(gate.blockers.includes("LEVERAGE_DISABLED"));
  assert.ok(gate.blockers.includes("WITHDRAWALS_DISABLED"));
  assert.ok(gate.blockers.includes("POSITION_CAP_EXCEEDED"));
});

test("paper order reduces cash without exceeding the five dollar cap", () => {
  const running = startPaperAgent(createTradingState({ capitalUsd: 20, initialPrice: 100, now: 1 }), 2);
  const next = openPaperPosition(running, { at: 3, price: 100, notionalUsd: 5 });

  assert.equal(next.positions.length, 1);
  assert.equal(next.cashUsd, 15);
  assert.ok(next.positions[0].costBasisUsd < 5);
  assert.equal(next.receipts.at(-1).type, "PAPER_BUY");
});

test("daily loss breach pauses the paper agent and turns risk red", () => {
  const running = startPaperAgent(createTradingState({ capitalUsd: 20, initialPrice: 100, now: 1 }), 2);
  const withPosition = openPaperPosition(running, { at: 3, price: 100, notionalUsd: 5 });
  const crashed = applyPaperQuote(withPosition, { at: 4, price: 90 });

  assert.equal(crashed.riskState, "RED");
  assert.equal(crashed.status, "PAUSED");
  assert.equal(crashed.receipts.at(-1).type, "RISK_PAUSE");
});

test("owner kill switch blocks new execution", () => {
  const running = startPaperAgent(createTradingState({ capitalUsd: 20, now: 1 }), 2);
  const killed = activateKillSwitch(running, 3);
  const gate = evaluateTradingRisk(killed, { side: "BUY", notionalUsd: 1 });

  assert.equal(killed.status, "KILLED");
  assert.equal(killed.killSwitch, true);
  assert.equal(gate.allowed, false);
  assert.ok(gate.blockers.includes("KILL_SWITCH_ACTIVE"));
});

test("summary reports equity and closed-trade metrics without inventing history", () => {
  const state = createTradingState({ capitalUsd: 20, now: 1 });
  const summary = summarizeTradingState(state, 1000);

  assert.equal(summary.equityUsd, 20);
  assert.equal(summary.pnl24hUsd, 0);
  assert.equal(summary.pnl7dUsd, 0);
  assert.equal(summary.pnl30dUsd, 0);
  assert.equal(summary.winRatePct, 0);
});
