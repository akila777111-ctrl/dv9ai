import test from "node:test";
import assert from "node:assert/strict";
import { evaluateProfitOpportunity } from "../src/profit-engine/index.js";

test("computes net after fees, gas and slippage", () => {
  const result = evaluateProfitOpportunity({
    capitalUsd: 5,
    expectedGrossReturnPct: 2,
    feesUsd: 0.01,
    gasUsd: 0.02,
    slippageBps: 20,
    otherCostsUsd: 0,
    liquidityUsd: 10_000,
    chain: "base",
    jurisdictionAllowed: true,
    simulationAvailable: true,
    singleTxUsd: 5,
  });

  assert.equal(result.allowed, true);
  assert.ok(Math.abs(result.economics.netUsd - 0.06) < 1e-9);
  assert.equal(result.risk, "LOW");
});

test("blocks spending above the single transaction cap", () => {
  const result = evaluateProfitOpportunity({
    capitalUsd: 10,
    expectedGrossReturnPct: 2,
    liquidityUsd: 100_000,
    chain: "base",
    jurisdictionAllowed: true,
    simulationAvailable: true,
    singleTxUsd: 10,
  });

  assert.equal(result.allowed, false);
  assert.ok(result.blockers.includes("SINGLE_TX_CAP_EXCEEDED"));
});

test("blocks leverage, unlimited approval and withdrawal permission", () => {
  const result = evaluateProfitOpportunity({
    capitalUsd: 5,
    liquidityUsd: 100_000,
    chain: "base",
    jurisdictionAllowed: true,
    simulationAvailable: true,
    singleTxUsd: 5,
    leverage: true,
    unlimitedApproval: true,
    withdrawalPermission: true,
  });

  assert.equal(result.allowed, false);
  assert.ok(result.blockers.includes("LEVERAGE_DISABLED"));
  assert.ok(result.blockers.includes("UNLIMITED_APPROVAL_DISABLED"));
  assert.ok(result.blockers.includes("WITHDRAWAL_PERMISSION_DISABLED"));
});
