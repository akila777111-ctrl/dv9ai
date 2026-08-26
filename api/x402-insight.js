const FACILITATOR_URL = "https://x402.org/facilitator";
const NETWORK = "eip155:84532"; // Base Sepolia
const USDC_ASSET = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const PAY_TO = "0x64DF28C1bDB59071429fa5E22228d2a2D0Fc145f";
const PRICE_USDC_ATOMIC = "1000"; // 0.001 USDC (6 decimals)
const PRICE_USD = "$0.001";

const COINBASE_BASE = "https://api.coinbase.com/v2/prices";

function encodeHeader(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function decodeHeader(value) {
  return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
}

function getRequestOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function paymentRequirements(resourceUrl) {
  return {
    scheme: "exact",
    network: NETWORK,
    amount: PRICE_USDC_ATOMIC,
    asset: USDC_ASSET,
    payTo: PAY_TO,
    maxTimeoutSeconds: 60,
    extra: {
      name: "USDC",
      version: "2",
    },
  };
}

function paymentRequired(resourceUrl, error) {
  const payload = {
    x402Version: 2,
    resource: {
      url: resourceUrl,
      description: "DV9 Profit Engine live market insight",
      mimeType: "application/json",
    },
    accepts: [paymentRequirements(resourceUrl)],
  };

  if (error) payload.error = error;
  return payload;
}

function send402(res, resourceUrl, error = "Payment required") {
  const body = paymentRequired(resourceUrl, error);
  res.setHeader("PAYMENT-REQUIRED", encodeHeader(body));
  res.setHeader("Cache-Control", "no-store");
  return res.status(402).json(body);
}

async function facilitatorPost(path, body) {
  const response = await fetch(`${FACILITATOR_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: "facilitator_non_json_response", detail: text.slice(0, 200) };
  }

  if (!response.ok) {
    const error = new Error(`facilitator_${path.replace("/", "")}_${response.status}`);
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function fetchSpot(pair) {
  const response = await fetch(`${COINBASE_BASE}/${pair}/spot`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`market_${pair}_${response.status}`);

  const payload = await response.json();
  const amount = Number(payload?.data?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`market_${pair}_invalid_price`);
  }
  return amount;
}

async function buildPaidInsight() {
  const [btcUsd, ethUsd] = await Promise.all([
    fetchSpot("BTC-USD"),
    fetchSpot("ETH-USD"),
  ]);

  return {
    service: "DV9 Profit Engine",
    product: "live-market-insight-v1",
    timestamp: new Date().toISOString(),
    market: {
      BTC_USD: btcUsd,
      ETH_USD: ethUsd,
    },
    policy: {
      financialAdvice: false,
      execution: false,
      leverage: 0,
      mode: "DATA_ONLY",
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const resourceUrl = `${getRequestOrigin(req)}${req.url.split("?")[0]}`;
  const paymentHeader = req.headers["payment-signature"];

  if (!paymentHeader || Array.isArray(paymentHeader)) {
    return send402(res, resourceUrl);
  }

  let paymentPayload;
  try {
    paymentPayload = decodeHeader(paymentHeader);
  } catch {
    return send402(res, resourceUrl, "Invalid PAYMENT-SIGNATURE header");
  }

  const requirements = paymentRequirements(resourceUrl);
  const facilitatorRequest = {
    x402Version: 2,
    paymentPayload,
    paymentRequirements: requirements,
  };

  try {
    const verification = await facilitatorPost("/verify", facilitatorRequest);
    if (!verification?.isValid) {
      return send402(
        res,
        resourceUrl,
        verification?.invalidReason || "Payment verification failed",
      );
    }

    // Build the paid resource before settlement. If upstream market data fails,
    // no payment is settled for an unavailable product.
    const insight = await buildPaidInsight();

    const settlement = await facilitatorPost("/settle", facilitatorRequest);
    if (!settlement?.success) {
      return send402(
        res,
        resourceUrl,
        settlement?.errorReason || "Payment settlement failed",
      );
    }

    res.setHeader("PAYMENT-RESPONSE", encodeHeader(settlement));
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      ok: true,
      paid: true,
      price: PRICE_USD,
      network: NETWORK,
      asset: "USDC",
      payTo: PAY_TO,
      settlement: {
        success: true,
        payer: settlement.payer || verification.payer || null,
        transaction: settlement.transaction || null,
        amount: settlement.amount || PRICE_USDC_ATOMIC,
      },
      data: insight,
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      paid: false,
      error: "x402_service_unavailable",
      detail: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
