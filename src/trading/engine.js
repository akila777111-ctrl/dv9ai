export const TRADING_AGENT_POLICY = Object.freeze({
  mode: "PAPER_ONLY",
  adapter: "OKX_SIMULATED",
  symbol: "BTC-USDT",
  startingCapitalUsd: 20,
  maxPositionUsd: 5,
  maxDailyLossPct: 1,
  maxOpenPositions: 2,
  feeBps: 10,
  allowLeverage: false,
  allowWithdrawals: false,
  allowLiveTrading: false,
  requireOwnerApprovalForLive: true,
});

const finite = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const round = (value, digits = 8) => Number(finite(value).toFixed(digits));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const uid = (prefix, at, index = 0) => `${prefix}-${Math.trunc(at)}-${index}`;

function normalizedHistory(history = []) {
  return Array.isArray(history)
    ? history
      .filter((point) => Number.isFinite(Number(point?.at)) && Number.isFinite(Number(point?.equityUsd)))
      .map((point) => ({ at: Number(point.at), equityUsd: round(point.equityUsd, 6) }))
      .slice(-240)
    : [];
}

export function createTradingState(input = {}) {
  const now = finite(input.now, Date.now());
  const capitalUsd = clamp(finite(input.capitalUsd, TRADING_AGENT_POLICY.startingCapitalUsd), 0, 1_000_000);
  const initialPrice = Math.max(1, finite(input.initialPrice, 60_000));

  return {
    schema: "DV9-TRADING-PAPER/1",
    mode: TRADING_AGENT_POLICY.mode,
    adapter: TRADING_AGENT_POLICY.adapter,
    symbol: TRADING_AGENT_POLICY.symbol,
    status: "PAUSED",
    riskState: "GREEN",
    killSwitch: false,
    capitalUsd: round(capitalUsd, 6),
    cashUsd: round(capitalUsd, 6),
    equityUsd: round(capitalUsd, 6),
    dayStartEquityUsd: round(capitalUsd, 6),
    peakEquityUsd: round(capitalUsd, 6),
    realizedPnlUsd: 0,
    unrealizedPnlUsd: 0,
    lastPrice: round(initialPrice, 2),
    priceHistory: [round(initialPrice, 2)],
    positions: [],
    trades: [],
    receipts: [{
      id: uid("receipt", now),
      at: now,
      type: "PAPER_ACCOUNT_CREATED",
      detail: `Capital ${capitalUsd.toFixed(2)} USDT · live trading locked`,
    }],
    equityHistory: [{ at: now, equityUsd: round(capitalUsd, 6) }],
    startedAt: null,
    updatedAt: now,
    tick: 0,
  };
}

export function sanitizeTradingState(raw = {}) {
  const fallback = createTradingState();
  if (!raw || typeof raw !== "object") return fallback;

  const state = {
    ...fallback,
    ...raw,
    mode: TRADING_AGENT_POLICY.mode,
    adapter: TRADING_AGENT_POLICY.adapter,
    symbol: TRADING_AGENT_POLICY.symbol,
    killSwitch: Boolean(raw.killSwitch),
    positions: Array.isArray(raw.positions) ? raw.positions.slice(0, TRADING_AGENT_POLICY.maxOpenPositions) : [],
    trades: Array.isArray(raw.trades) ? raw.trades.slice(-500) : [],
    receipts: Array.isArray(raw.receipts) ? raw.receipts.slice(-120) : fallback.receipts,
    priceHistory: Array.isArray(raw.priceHistory)
      ? raw.priceHistory.map((price) => Math.max(1, finite(price, fallback.lastPrice))).slice(-80)
      : fallback.priceHistory,
    equityHistory: normalizedHistory(raw.equityHistory),
  };

  if (!state.equityHistory.length) {
    state.equityHistory = [{ at: finite(state.updatedAt, Date.now()), equityUsd: finite(state.equityUsd, state.capitalUsd) }];
  }

  if (state.killSwitch) state.status = "KILLED";
  if (!["RUNNING", "PAUSED", "KILLED"].includes(state.status)) state.status = "PAUSED";
  if (!["GREEN", "YELLOW", "RED"].includes(state.riskState)) state.riskState = "GREEN";
  return state;
}

export function evaluateTradingRisk(state, order = {}) {
  const current = sanitizeTradingState(state);
  const notionalUsd = Math.max(0, finite(order.notionalUsd));
  const blockers = [];

  if (current.killSwitch || current.status === "KILLED") blockers.push("KILL_SWITCH_ACTIVE");
  if (current.status !== "RUNNING") blockers.push("AGENT_NOT_RUNNING");
  if (order.live === true) blockers.push("LIVE_TRADING_LOCKED");
  if (order.leverage === true) blockers.push("LEVERAGE_DISABLED");
  if (order.withdrawalPermission === true) blockers.push("WITHDRAWALS_DISABLED");
  if (notionalUsd <= 0) blockers.push("INVALID_NOTIONAL");
  if (notionalUsd > TRADING_AGENT_POLICY.maxPositionUsd) blockers.push("POSITION_CAP_EXCEEDED");
  if (current.positions.length >= TRADING_AGENT_POLICY.maxOpenPositions && order.side === "BUY") blockers.push("OPEN_POSITION_CAP_EXCEEDED");
  if (order.side === "BUY" && notionalUsd > current.cashUsd) blockers.push("INSUFFICIENT_CASH");

  const dailyPnlPct = current.dayStartEquityUsd > 0
    ? ((current.equityUsd - current.dayStartEquityUsd) / current.dayStartEquityUsd) * 100
    : 0;
  if (dailyPnlPct <= -TRADING_AGENT_POLICY.maxDailyLossPct) blockers.push("DAILY_LOSS_LIMIT_REACHED");

  return {
    allowed: blockers.length === 0,
    blockers,
    dailyPnlPct: round(dailyPnlPct, 4),
    riskState: blockers.length ? "RED" : current.riskState,
  };
}

function appendReceipt(state, receipt) {
  return {
    ...state,
    receipts: [...state.receipts, receipt].slice(-120),
  };
}

function recalcEquity(state, price, at) {
  const positions = state.positions.map((position) => {
    const marketValueUsd = position.quantity * price;
    const unrealizedPnlUsd = marketValueUsd - position.costBasisUsd;
    return {
      ...position,
      marketValueUsd: round(marketValueUsd, 6),
      unrealizedPnlUsd: round(unrealizedPnlUsd, 6),
    };
  });

  const unrealizedPnlUsd = positions.reduce((sum, position) => sum + position.unrealizedPnlUsd, 0);
  const positionsValueUsd = positions.reduce((sum, position) => sum + position.marketValueUsd, 0);
  const equityUsd = state.cashUsd + positionsValueUsd;
  const peakEquityUsd = Math.max(state.peakEquityUsd, equityUsd);
  const drawdownPct = peakEquityUsd > 0 ? ((equityUsd - peakEquityUsd) / peakEquityUsd) * 100 : 0;
  const dailyPnlPct = state.dayStartEquityUsd > 0
    ? ((equityUsd - state.dayStartEquityUsd) / state.dayStartEquityUsd) * 100
    : 0;

  let riskState = "GREEN";
  if (dailyPnlPct <= -TRADING_AGENT_POLICY.maxDailyLossPct) riskState = "RED";
  else if (dailyPnlPct <= -(TRADING_AGENT_POLICY.maxDailyLossPct * 0.6) || drawdownPct <= -1) riskState = "YELLOW";

  const status = riskState === "RED" && state.status === "RUNNING" ? "PAUSED" : state.status;

  return {
    ...state,
    positions,
    equityUsd: round(equityUsd, 6),
    peakEquityUsd: round(peakEquityUsd, 6),
    unrealizedPnlUsd: round(unrealizedPnlUsd, 6),
    riskState,
    status,
    updatedAt: at,
    equityHistory: [...state.equityHistory, { at, equityUsd: round(equityUsd, 6) }].slice(-240),
  };
}

export function applyPaperQuote(inputState, quote = {}) {
  const state = sanitizeTradingState(inputState);
  const at = finite(quote.at, Date.now());
  const price = Math.max(1, finite(quote.price, state.lastPrice));
  const next = recalcEquity({
    ...state,
    lastPrice: round(price, 2),
    priceHistory: [...state.priceHistory, round(price, 2)].slice(-80),
    tick: finite(state.tick) + 1,
  }, price, at);

  if (state.status === "RUNNING" && next.status === "PAUSED" && next.riskState === "RED") {
    return appendReceipt(next, {
      id: uid("receipt", at, next.tick),
      at,
      type: "RISK_PAUSE",
      detail: `Daily loss limit ${TRADING_AGENT_POLICY.maxDailyLossPct}% reached`,
    });
  }

  return next;
}

export function openPaperPosition(inputState, order = {}) {
  let state = sanitizeTradingState(inputState);
  const at = finite(order.at, Date.now());
  const price = Math.max(1, finite(order.price, state.lastPrice));
  const notionalUsd = Math.max(0, finite(order.notionalUsd));
  const gate = evaluateTradingRisk(state, { ...order, side: "BUY", notionalUsd });
  if (!gate.allowed) {
    return appendReceipt(state, {
      id: uid("receipt", at, state.tick),
      at,
      type: "ORDER_BLOCKED",
      detail: gate.blockers.join(" · "),
    });
  }

  const feeUsd = notionalUsd * TRADING_AGENT_POLICY.feeBps / 10_000;
  const costBasisUsd = notionalUsd - feeUsd;
  const quantity = costBasisUsd / price;
  const position = {
    id: uid("position", at, state.positions.length),
    symbol: state.symbol,
    openedAt: at,
    entryPrice: round(price, 2),
    quantity: round(quantity, 12),
    costBasisUsd: round(costBasisUsd, 6),
    feeOpenUsd: round(feeUsd, 6),
    marketValueUsd: round(costBasisUsd, 6),
    unrealizedPnlUsd: 0,
  };

  state = {
    ...state,
    cashUsd: round(state.cashUsd - notionalUsd, 6),
    positions: [...state.positions, position],
  };
  state = recalcEquity(state, price, at);
  return appendReceipt(state, {
    id: uid("receipt", at, state.tick),
    at,
    type: "PAPER_BUY",
    detail: `${state.symbol} · ${notionalUsd.toFixed(2)} USDT @ ${price.toFixed(2)}`,
  });
}

export function closePaperPosition(inputState, positionId, order = {}) {
  let state = sanitizeTradingState(inputState);
  const at = finite(order.at, Date.now());
  const price = Math.max(1, finite(order.price, state.lastPrice));
  const position = state.positions.find((item) => item.id === positionId);
  if (!position) return state;

  const grossValueUsd = position.quantity * price;
  const feeCloseUsd = grossValueUsd * TRADING_AGENT_POLICY.feeBps / 10_000;
  const cashInUsd = grossValueUsd - feeCloseUsd;
  const pnlUsd = cashInUsd - position.costBasisUsd - position.feeOpenUsd;
  const pnlPct = position.costBasisUsd > 0 ? (pnlUsd / position.costBasisUsd) * 100 : 0;
  const trade = {
    id: uid("trade", at, state.trades.length),
    symbol: position.symbol,
    openedAt: position.openedAt,
    closedAt: at,
    entryPrice: position.entryPrice,
    exitPrice: round(price, 2),
    notionalUsd: round(position.costBasisUsd + position.feeOpenUsd, 6),
    pnlUsd: round(pnlUsd, 6),
    pnlPct: round(pnlPct, 4),
    feesUsd: round(position.feeOpenUsd + feeCloseUsd, 6),
  };

  state = {
    ...state,
    cashUsd: round(state.cashUsd + cashInUsd, 6),
    realizedPnlUsd: round(state.realizedPnlUsd + pnlUsd, 6),
    positions: state.positions.filter((item) => item.id !== positionId),
    trades: [...state.trades, trade].slice(-500),
  };
  state = recalcEquity(state, price, at);
  return appendReceipt(state, {
    id: uid("receipt", at, state.tick),
    at,
    type: "PAPER_SELL",
    detail: `${state.symbol} · ${pnlUsd >= 0 ? "+" : ""}${pnlUsd.toFixed(3)} USDT`,
  });
}

function movingAverage(values, size) {
  if (!values.length) return 0;
  const slice = values.slice(-size);
  return slice.reduce((sum, value) => sum + value, 0) / slice.length;
}

export function decidePaperAction(inputState) {
  const state = sanitizeTradingState(inputState);
  const prices = state.priceHistory;
  if (prices.length < 10) return { action: "HOLD", reason: "WARMUP" };

  const fast = movingAverage(prices, 4);
  const slow = movingAverage(prices, 10);
  const trendPct = slow > 0 ? ((fast - slow) / slow) * 100 : 0;
  const position = state.positions[0];

  if (!position && trendPct > 0.08) {
    return {
      action: "BUY",
      reason: "FAST_MA_ABOVE_SLOW",
      notionalUsd: Math.min(TRADING_AGENT_POLICY.maxPositionUsd, Math.max(0, state.cashUsd)),
    };
  }

  if (position) {
    const currentPnlPct = position.costBasisUsd > 0
      ? ((position.quantity * state.lastPrice - position.costBasisUsd) / position.costBasisUsd) * 100
      : 0;
    if (currentPnlPct >= 0.35) return { action: "SELL", reason: "TAKE_PROFIT", positionId: position.id };
    if (currentPnlPct <= -0.25) return { action: "SELL", reason: "STOP_LOSS", positionId: position.id };
    if (trendPct < -0.05) return { action: "SELL", reason: "TREND_REVERSAL", positionId: position.id };
  }

  return { action: "HOLD", reason: "NO_EDGE" };
}

export function runPaperCycle(inputState, quote = {}) {
  let state = applyPaperQuote(inputState, quote);
  if (state.status !== "RUNNING" || state.killSwitch || state.riskState === "RED") return state;

  const decision = decidePaperAction(state);
  if (decision.action === "BUY" && decision.notionalUsd > 0) {
    state = openPaperPosition(state, {
      at: quote.at,
      price: state.lastPrice,
      notionalUsd: decision.notionalUsd,
    });
  } else if (decision.action === "SELL") {
    state = closePaperPosition(state, decision.positionId, {
      at: quote.at,
      price: state.lastPrice,
    });
  }

  return state;
}

export function startPaperAgent(inputState, at = Date.now()) {
  const state = sanitizeTradingState(inputState);
  if (state.killSwitch) return state;
  return appendReceipt({
    ...state,
    status: "RUNNING",
    startedAt: state.startedAt || at,
    updatedAt: at,
  }, {
    id: uid("receipt", at, state.tick),
    at,
    type: "AGENT_STARTED",
    detail: "Paper strategy running · live trading locked",
  });
}

export function pausePaperAgent(inputState, at = Date.now()) {
  const state = sanitizeTradingState(inputState);
  if (state.killSwitch) return state;
  return appendReceipt({ ...state, status: "PAUSED", updatedAt: at }, {
    id: uid("receipt", at, state.tick),
    at,
    type: "AGENT_PAUSED",
    detail: "Owner paused paper execution",
  });
}

export function activateKillSwitch(inputState, at = Date.now()) {
  const state = sanitizeTradingState(inputState);
  return appendReceipt({
    ...state,
    status: "KILLED",
    killSwitch: true,
    riskState: "RED",
    updatedAt: at,
  }, {
    id: uid("receipt", at, state.tick),
    at,
    type: "KILL_SWITCH",
    detail: "New execution blocked by OWNER NODE 999",
  });
}

export function createSyntheticQuote(inputState, at = Date.now()) {
  const state = sanitizeTradingState(inputState);
  const tick = finite(state.tick) + 1;
  const wave = Math.sin(tick / 4.3) * 0.0018 + Math.sin(tick / 13.7) * 0.0011;
  const drift = Math.sin(tick / 37) * 0.00035;
  const nextPrice = Math.max(1, state.lastPrice * (1 + wave + drift));
  return { at, price: round(nextPrice, 2), source: "SYNTHETIC_DEMO" };
}

function sumTradePnl(trades, fromAt) {
  return trades
    .filter((trade) => finite(trade.closedAt) >= fromAt)
    .reduce((sum, trade) => sum + finite(trade.pnlUsd), 0);
}

export function summarizeTradingState(inputState, now = Date.now()) {
  const state = sanitizeTradingState(inputState);
  const wins = state.trades.filter((trade) => finite(trade.pnlUsd) > 0).length;
  const winRatePct = state.trades.length ? (wins / state.trades.length) * 100 : 0;
  const drawdownPct = state.peakEquityUsd > 0
    ? ((state.equityUsd - state.peakEquityUsd) / state.peakEquityUsd) * 100
    : 0;
  const dayPnlUsd = state.equityUsd - state.dayStartEquityUsd;
  const dayPnlPct = state.dayStartEquityUsd > 0 ? (dayPnlUsd / state.dayStartEquityUsd) * 100 : 0;

  return {
    equityUsd: round(state.equityUsd, 4),
    cashUsd: round(state.cashUsd, 4),
    dayPnlUsd: round(dayPnlUsd, 4),
    dayPnlPct: round(dayPnlPct, 4),
    pnl24hUsd: round(sumTradePnl(state.trades, now - 86_400_000), 4),
    pnl7dUsd: round(sumTradePnl(state.trades, now - 7 * 86_400_000), 4),
    pnl30dUsd: round(sumTradePnl(state.trades, now - 30 * 86_400_000), 4),
    winRatePct: round(winRatePct, 2),
    drawdownPct: round(drawdownPct, 4),
    openPositions: state.positions.length,
    trades: state.trades.length,
    riskState: state.riskState,
    status: state.status,
  };
}
