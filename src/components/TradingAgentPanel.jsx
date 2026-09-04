import { useEffect, useMemo, useState } from "react";
import "./TradingAgentPanel.css";
import {
  TRADING_AGENT_POLICY,
  activateKillSwitch,
  createSyntheticQuote,
  createTradingState,
  pausePaperAgent,
  runPaperCycle,
  sanitizeTradingState,
  startPaperAgent,
  summarizeTradingState,
} from "../trading/engine.js";

const STORAGE_KEY = "dv9.trading.paper.v1";

function loadState() {
  if (typeof window === "undefined") return createTradingState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeTradingState(JSON.parse(raw)) : createTradingState();
  } catch {
    return createTradingState();
  }
}

function signed(value, digits = 2) {
  const number = Number(value) || 0;
  return `${number > 0 ? "+" : ""}${number.toFixed(digits)}`;
}

function money(value, digits = 2) {
  return `${Number(value || 0).toFixed(digits)} USDT`;
}

function timeLabel(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function Sparkline({ points }) {
  const values = points.slice(-72).map((point) => Number(point.equityUsd));
  if (values.length < 2) return <div className="trading-chart-empty">ожидание данных</div>;

  const width = 720;
  const height = 180;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 0.0001);
  const polyline = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - ((value - min) / spread) * (height - 22) - 11;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <svg className="trading-sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="График paper equity">
      <defs>
        <linearGradient id="tradingGlow" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline className="trading-line-shadow" points={polyline} />
      <polyline className="trading-line" points={polyline} />
    </svg>
  );
}

export default function TradingAgentPanel() {
  const [state, setState] = useState(loadState);
  const summary = useMemo(() => summarizeTradingState(state), [state]);
  const latestReceipts = state.receipts.slice(-7).reverse();
  const position = state.positions[0] || null;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The prototype remains usable even when browser storage is unavailable.
    }
  }, [state]);

  useEffect(() => {
    if (state.status !== "RUNNING" || state.killSwitch) return undefined;
    const timer = window.setInterval(() => {
      setState((current) => {
        const quote = createSyntheticQuote(current, Date.now());
        return runPaperCycle(current, quote);
      });
    }, 1500);
    return () => window.clearInterval(timer);
  }, [state.status, state.killSwitch]);

  function start() {
    setState((current) => startPaperAgent(current));
  }

  function pause() {
    setState((current) => pausePaperAgent(current));
  }

  function kill() {
    setState((current) => activateKillSwitch(current));
  }

  function reset() {
    const next = createTradingState({
      capitalUsd: TRADING_AGENT_POLICY.startingCapitalUsd,
      initialPrice: state.lastPrice,
      now: Date.now(),
    });
    setState(next);
  }

  const statusClass = state.status.toLowerCase();
  const riskClass = summary.riskState.toLowerCase();

  return (
    <section className="future-section trading-section" id="trading">
      <div className="section-rail" aria-hidden="true"><span>05</span><i /></div>
      <div className="trading-shell">
        <header className="trading-head">
          <div>
            <span className="future-kicker">FINANCE / PAPER EXECUTION</span>
            <h2>TRADING AGENT <em>COCKPIT</em></h2>
            <p>Рабочий локальный прототип: синтетический рынок, paper-сделки, лимиты HYDRA, receipts и Owner Kill Switch. Реальные деньги и API-секреты не используются.</p>
          </div>
          <div className="trading-head-status">
            <span className={`trading-status ${statusClass}`}><i />{state.status}</span>
            <small>{state.adapter} · {state.symbol}</small>
          </div>
        </header>

        <div className="trading-metrics">
          <article>
            <span>EQUITY</span>
            <b>{money(summary.equityUsd)}</b>
            <small>cash {money(summary.cashUsd)}</small>
          </article>
          <article>
            <span>DAY P&amp;L</span>
            <b className={summary.dayPnlUsd < 0 ? "negative" : "positive"}>{signed(summary.dayPnlUsd, 3)} USDT</b>
            <small>{signed(summary.dayPnlPct, 3)}%</small>
          </article>
          <article>
            <span>24H REALIZED</span>
            <b className={summary.pnl24hUsd < 0 ? "negative" : "positive"}>{signed(summary.pnl24hUsd, 3)}</b>
            <small>USDT</small>
          </article>
          <article>
            <span>7D / 30D</span>
            <b>{signed(summary.pnl7dUsd, 3)} / {signed(summary.pnl30dUsd, 3)}</b>
            <small>realized USDT</small>
          </article>
          <article>
            <span>WIN RATE</span>
            <b>{summary.trades ? `${summary.winRatePct.toFixed(1)}%` : "—"}</b>
            <small>{summary.trades} closed trades</small>
          </article>
          <article>
            <span>DRAWDOWN</span>
            <b className={summary.drawdownPct < 0 ? "negative" : ""}>{summary.drawdownPct.toFixed(3)}%</b>
            <small>from paper peak</small>
          </article>
        </div>

        <div className="trading-layout">
          <article className="trading-market-card">
            <div className="trading-card-head">
              <div><span>SYNTHETIC MARKET</span><b>{state.symbol}</b></div>
              <div><small>LAST</small><strong>{state.lastPrice.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}</strong></div>
            </div>
            <div className="trading-chart-wrap">
              <Sparkline points={state.equityHistory} />
              <div className="trading-chart-overlay">
                <span>LOCAL PAPER EQUITY</span>
                <b>{state.tick.toString().padStart(4, "0")} TICKS</b>
              </div>
            </div>
            <div className="trading-position">
              <span>OPEN POSITION</span>
              {position ? (
                <div>
                  <b>{position.symbol}</b>
                  <strong>{money(position.marketValueUsd, 3)}</strong>
                  <em className={position.unrealizedPnlUsd < 0 ? "negative" : "positive"}>{signed(position.unrealizedPnlUsd, 4)} P&amp;L</em>
                </div>
              ) : <p>Нет позиции · стратегия ожидает подтверждённый сигнал.</p>}
            </div>
          </article>

          <aside className="trading-risk-card">
            <div className="trading-card-head">
              <div><span>HYDRA RISK GOVERNOR</span><b className={`risk-${riskClass}`}>{summary.riskState}</b></div>
              <small>FAIL CLOSED</small>
            </div>
            <div className="risk-gauge">
              <div><span style={{ width: `${Math.min(100, Math.abs(summary.dayPnlPct) / TRADING_AGENT_POLICY.maxDailyLossPct * 100)}%` }} /></div>
              <p><b>{Math.abs(summary.dayPnlPct).toFixed(3)}%</b> / {TRADING_AGENT_POLICY.maxDailyLossPct}% дневного лимита</p>
            </div>
            <dl className="risk-rules">
              <div><dt>CAPITAL</dt><dd>{money(TRADING_AGENT_POLICY.startingCapitalUsd)}</dd></div>
              <div><dt>MAX POSITION</dt><dd>{money(TRADING_AGENT_POLICY.maxPositionUsd)}</dd></div>
              <div><dt>OPEN POSITIONS</dt><dd>{summary.openPositions} / {TRADING_AGENT_POLICY.maxOpenPositions}</dd></div>
              <div><dt>LEVERAGE</dt><dd>OFF</dd></div>
              <div><dt>WITHDRAWALS</dt><dd>OFF</dd></div>
              <div><dt>LIVE TRADING</dt><dd className="locked">LOCKED</dd></div>
            </dl>
            <p className="risk-note">Красный риск автоматически ставит paper-agent на PAUSE. Kill Switch блокирует новые исполнения до сброса paper-сессии.</p>
          </aside>
        </div>

        <div className="trading-controls">
          <div className="trading-control-buttons">
            <button className="trading-start" onClick={start} disabled={state.status === "RUNNING" || state.killSwitch}>▶ START PAPER</button>
            <button onClick={pause} disabled={state.status !== "RUNNING" || state.killSwitch}>Ⅱ PAUSE</button>
            <button className="trading-kill" onClick={kill} disabled={state.killSwitch}>◆ KILL SWITCH</button>
            <button onClick={reset}>↻ RESET PAPER</button>
          </div>
          <div className="trading-lock">
            <span>OWNER NODE 999</span>
            <b>LIVE EXECUTION DISABLED</b>
          </div>
        </div>

        <div className="trading-receipts">
          <div className="trading-card-head">
            <div><span>RECEIPT TRAIL</span><b>Последние события</b></div>
            <small>{state.receipts.length} total</small>
          </div>
          <div className="receipt-list">
            {latestReceipts.map((receipt) => (
              <article key={receipt.id}>
                <time>{timeLabel(receipt.at)}</time>
                <b>{receipt.type}</b>
                <p>{receipt.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
