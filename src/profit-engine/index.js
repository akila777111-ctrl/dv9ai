export const PROFIT_ENGINE_POLICY = Object.freeze({
  mode: "SIMULATION_ONLY",
  allowedChains: ["base"],
  maxExperimentUsd: 20,
  maxSingleTxUsd: 5,
  maxDailyOutflowUsd: 10,
  maxSlippageBps: 50,
  maxGasUsd: 0.25,
  allowLeverage: false,
  allowUnlimitedApprovals: false,
  allowWithdrawals: false,
  requireOwnerApprovalForLive: true,
});

const finite = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function evaluateProfitOpportunity(input = {}) {
  const capitalUsd = Math.max(0, finite(input.capitalUsd));
  const expectedGrossReturnUsd = input.expectedGrossReturnUsd != null
    ? finite(input.expectedGrossReturnUsd)
    : capitalUsd * finite(input.expectedGrossReturnPct) / 100;
  const feesUsd = Math.max(0, finite(input.feesUsd));
  const gasUsd = Math.max(0, finite(input.gasUsd));
  const slippageBps = Math.max(0, finite(input.slippageBps));
  const otherCostsUsd = Math.max(0, finite(input.otherCostsUsd));
  const liquidityUsd = Math.max(0, finite(input.liquidityUsd));
  const slippageUsd = capitalUsd * slippageBps / 10_000;
  const totalCostsUsd = feesUsd + gasUsd + slippageUsd + otherCostsUsd;
  const netUsd = expectedGrossReturnUsd - totalCostsUsd;
  const netRoiPct = capitalUsd > 0 ? (netUsd / capitalUsd) * 100 : 0;
  const liquidityRatio = capitalUsd > 0 ? liquidityUsd / capitalUsd : Infinity;

  const blockers = [];
  if (input.jurisdictionAllowed === false) blockers.push("JURISDICTION_BLOCKED");
  if (input.kycSatisfied === false && input.kycRequired === true) blockers.push("KYC_REQUIRED");
  if (input.leverage === true) blockers.push("LEVERAGE_DISABLED");
  if (input.unlimitedApproval === true) blockers.push("UNLIMITED_APPROVAL_DISABLED");
  if (input.withdrawalPermission === true) blockers.push("WITHDRAWAL_PERMISSION_DISABLED");
  if (String(input.chain || "base").toLowerCase() !== "base") blockers.push("CHAIN_NOT_ALLOWED");
  if (capitalUsd > PROFIT_ENGINE_POLICY.maxExperimentUsd) blockers.push("EXPERIMENT_CAP_EXCEEDED");
  if (finite(input.singleTxUsd, capitalUsd) > PROFIT_ENGINE_POLICY.maxSingleTxUsd) blockers.push("SINGLE_TX_CAP_EXCEEDED");
  if (gasUsd > PROFIT_ENGINE_POLICY.maxGasUsd) blockers.push("GAS_CAP_EXCEEDED");
  if (slippageBps > PROFIT_ENGINE_POLICY.maxSlippageBps) blockers.push("SLIPPAGE_CAP_EXCEEDED");
  if (input.simulationAvailable === false) blockers.push("NO_SIMULATION_PATH");

  let risk = "LOW";
  if (liquidityRatio < 20 || slippageBps > 100 || input.smartContractRisk === "HIGH") risk = "HIGH";
  else if (liquidityRatio < 100 || slippageBps > 50 || input.smartContractRisk === "MEDIUM") risk = "MEDIUM";
  if (blockers.length) risk = "HIGH";

  return {
    mode: PROFIT_ENGINE_POLICY.mode,
    allowed: blockers.length === 0,
    blockers,
    economics: {
      capitalUsd,
      expectedGrossReturnUsd,
      feesUsd,
      gasUsd,
      slippageUsd,
      otherCostsUsd,
      totalCostsUsd,
      netUsd,
      netRoiPct,
      liquidityRatio,
    },
    risk,
    safeNextAction: blockers.length
      ? "FIX_BLOCKERS_AND_RE-RUN_SIMULATION"
      : "OWNER_REVIEW_BEFORE_ANY_LIVE_TRANSACTION",
  };
}
