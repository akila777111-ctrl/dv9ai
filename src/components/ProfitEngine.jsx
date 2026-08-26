import { useEffect, useMemo, useState } from "react";
import "./ProfitEngine.css";

const PAPER_CAPITAL_EUR = 10;
const STORAGE_KEY = "dv9_profit_engine_v1";

function formatMoney(value, currency = "EUR") {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function loadPaperState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePaperState(value) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // localStorage is optional; dashboard still works without persistence.
  }
}

export default function ProfitEngine() {
  const [feed, setFeed] = useState(null);
  const [paper, setPaper] = useState(() => loadPaperState());
  const [status, setStatus] = useState("CONNECTING");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch("/api/profit", { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
          throw new Error(payload?.error || `profit_feed_${response.status}`);
        }

        if (cancelled) return;
        setFeed(payload);
        setStatus("ACTIVE");
        setError("");

        setPaper((current) => {
          if (current?.entry?.BTC_USD && current?.entry?.ETH_USD) return current;

          const initial = {
            startedAt: payload.timestamp,
            capitalEur: PAPER_CAPITAL_EUR,
            entry: {
              BTC_USD: payload.prices.BTC_USD,
              ETH_USD: payload.prices.ETH_USD,
            },
          };
          savePaperState(initial);
          return initial;
        });
      } catch (err) {
        if (cancelled) return;
        setStatus("DEGRADED");
        setError(err instanceof Error ? err.message : "unknown_error");
      }
    }

    refresh();
    const timer = window.setInterval(refresh, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const metrics = useMemo(() => {
    if (!feed?.prices || !paper?.entry) {
      return { pnlEur: 0, pnlPct: 0, currentEur: PAPER_CAPITAL_EUR };
    }

    const btcReturn = feed.prices.BTC_USD / paper.entry.BTC_USD - 1;
    const ethReturn = feed.prices.ETH_USD / paper.entry.ETH_USD - 1;
    const portfolioReturn = (btcReturn + ethReturn) / 2;
    const pnlEur = paper.capitalEur * portfolioReturn;

    return {
      pnlEur,
      pnlPct: portfolioReturn * 100,
      currentEur: paper.capitalEur + pnlEur,
    };
  }, [feed, paper]);

  function resetPaper() {
    if (!feed?.prices) return;

    const next = {
      startedAt: feed.timestamp,
      capitalEur: PAPER_CAPITAL_EUR,
      entry: {
        BTC_USD: feed.prices.BTC_USD,
        ETH_USD: feed.prices.ETH_USD,
      },
    };
    savePaperState(next);
    setPaper(next);
  }

  const x402Testnet = feed?.revenueRails?.find((rail) => rail.id === "x402-testnet");
  const x402Mainnet = feed?.revenueRails?.find((rail) => rail.id === "x402-mainnet");

  return (
    <section className="profitEngine" id="profit-engine">
      <div className="profitHeader">
        <div>
          <p className="profitEyebrow">DV9 HYDRA CAPITAL</p>
          <h2>Profit Engine</h2>
          <p className="profitSubline">
            Живые котировки + честный paper P&amp;L. Реальные деньги считаются отдельно.
          </p>
        </div>
        <span className={`profitStatus profitStatus--${status.toLowerCase()}`}>
          {status}
        </span>
      </div>

      <div className="profitGrid">
        <article className="profitMetric">
          <span>REALIZED REVENUE</span>
          <strong>{formatMoney(0)}</strong>
          <small>Только подтверждённые mainnet settlement receipts</small>
        </article>

        <article className="profitMetric">
          <span>PAPER P&amp;L</span>
          <strong className={metrics.pnlEur >= 0 ? "profitPositive" : "profitNegative"}>
            {metrics.pnlEur >= 0 ? "+" : ""}{formatMoney(metrics.pnlEur)}
          </strong>
          <small>
            {metrics.pnlPct >= 0 ? "+" : ""}{metrics.pnlPct.toFixed(3)}% от €{PAPER_CAPITAL_EUR}
          </small>
        </article>

        <article className="profitMetric">
          <span>x402 TESTNET</span>
          <strong>{x402Testnet?.status || "CHECKING"}</strong>
          <small>
            {x402Testnet?.payToConfigured
              ? `$0.001 • Base Sepolia • ${x402Testnet.endpoint}`
              : "Нужен pay-to адрес"}
          </small>
        </article>

        <article className="profitMetric">
          <span>x402 MAINNET</span>
          <strong>{x402Mainnet?.status || "CHECKING"}</strong>
          <small>
            {x402Mainnet?.status === "READY_FOR_OWNER_TEST"
              ? "Base mainnet готов к малому owner-test"
              : "Нужна production-аутентификация facilitator"}
          </small>
        </article>
      </div>

      <div className="profitMarket">
        <div>
          <span>BTC / USD</span>
          <strong>{feed?.prices?.BTC_USD ? formatMoney(feed.prices.BTC_USD, "USD") : "—"}</strong>
        </div>
        <div>
          <span>ETH / USD</span>
          <strong>{feed?.prices?.ETH_USD ? formatMoney(feed.prices.ETH_USD, "USD") : "—"}</strong>
        </div>
        <div>
          <span>Risk Gate</span>
          <strong>MICRO ONLY</strong>
        </div>
        <button type="button" onClick={resetPaper} disabled={!feed?.prices}>
          Reset paper baseline
        </button>
      </div>

      <div className="profitRules">
        <span>LIVE TRADING: OFF</span>
        <span>MAX TEST CAPITAL: €10</span>
        <span>MAX DAILY LOSS: €1</span>
        <span>UNKNOWN CONTRACT: DENY</span>
      </div>

      {paper?.startedAt && (
        <p className="profitTimestamp">
          Paper baseline: {new Date(paper.startedAt).toLocaleString("de-DE")}
          {feed?.timestamp ? ` • Feed: ${new Date(feed.timestamp).toLocaleTimeString("de-DE")}` : ""}
        </p>
      )}

      {error && <p className="profitError">Feed error: {error}</p>}
    </section>
  );
}
