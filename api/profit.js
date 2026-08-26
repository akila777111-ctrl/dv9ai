const COINBASE_BASE = "https://api.coinbase.com/v2/prices";

async function fetchSpot(pair) {
  const response = await fetch(`${COINBASE_BASE}/${pair}/spot`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`coinbase_${pair}_${response.status}`);
  }

  const payload = await response.json();
  const amount = Number(payload?.data?.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`coinbase_${pair}_invalid_price`);
  }

  return amount;
}

export default async function handler(_req, res) {
  res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=60");

  try {
    const [btcUsd, ethUsd] = await Promise.all([
      fetchSpot("BTC-USD"),
      fetchSpot("ETH-USD"),
    ]);

    return res.status(200).json({
      ok: true,
      mode: "PAPER",
      timestamp: new Date().toISOString(),
      source: "Coinbase public spot API",
      prices: {
        BTC_USD: btcUsd,
        ETH_USD: ethUsd,
      },
      controls: {
        realTradingEnabled: false,
        walletConnected: false,
        maxExperimentCapitalEur: 10,
        maxDailyLossEur: 1,
        leverage: 0,
      },
      revenueRails: [
        {
          id: "x402",
          name: "x402 paid API",
          status: process.env.PROFIT_PAY_TO ? "CONFIGURED" : "WAITING_PAY_TO",
          payToConfigured: Boolean(process.env.PROFIT_PAY_TO),
        },
        {
          id: "agent-wallet",
          name: "limited agent wallet",
          status: "LOCKED",
          reason: "owner wallet binding required",
        },
      ],
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      mode: "PAPER",
      timestamp: new Date().toISOString(),
      error: "live_market_feed_unavailable",
      detail: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
