const COINBASE_BASE = "https://api.coinbase.com/v2/prices";
const OWNER_APPROVED_PAY_TO = "0x64DF28C1bDB59071429fa5E22228d2a2D0Fc145f";
const BASE_CHAIN_ID = 8453;

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

    const payTo = process.env.PROFIT_PAY_TO || OWNER_APPROVED_PAY_TO;
    const payToConfigured = /^0x[a-fA-F0-9]{40}$/.test(payTo);

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
        receiveAddressBound: payToConfigured,
        maxExperimentCapitalEur: 10,
        maxDailyLossEur: 1,
        leverage: 0,
      },
      revenueRails: [
        {
          id: "x402",
          name: "x402 paid API",
          status: payToConfigured ? "PAY_TO_BOUND" : "WAITING_PAY_TO",
          payToConfigured,
          payToAddress: payToConfigured ? payTo : null,
          network: "base",
          chainId: BASE_CHAIN_ID,
          preferredAsset: "USDC",
          signingEnabled: false,
        },
        {
          id: "agent-wallet",
          name: "limited agent wallet",
          status: "LOCKED",
          reason: "signing permission not granted",
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
