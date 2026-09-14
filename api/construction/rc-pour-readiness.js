const NETWORK = "eip155:84532";
const FACILITATOR_URL = "https://x402.org/facilitator";
const PAY_TO = "0x64DF28C1bDB59071429fa5E22228d2a2D0Fc145f";
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const PRICE_USDC_ATOMIC = "20000"; // $0.02 USDC (6 decimals)

const REQUIRED_CHECKS = [
  ["drawings_available", "Approved drawings / method information available"],
  ["rebar_checked", "Reinforcement arrangement checked"],
  ["cover_checked", "Concrete cover checked"],
  ["formwork_checked", "Formwork and supports checked"],
  ["embeds_checked", "Embeds / openings / sleeves checked"],
  ["cleanliness_checked", "Formwork and pour area cleanliness checked"],
  ["concrete_spec_confirmed", "Concrete specification confirmed"],
  ["access_and_sequence_checked", "Access, sequence and placement plan checked"],
];

function encodeHeader(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function decodeHeader(value) {
  return JSON.parse(Buffer.from(String(value), "base64").toString("utf8"));
}

function getHeader(req, name) {
  const wanted = name.toLowerCase();
  const entries = Object.entries(req.headers || {});
  const found = entries.find(([key]) => key.toLowerCase() === wanted);
  return found ? found[1] : undefined;
}

function getResourceUrl(req) {
  const proto = getHeader(req, "x-forwarded-proto") || "https";
  const host = getHeader(req, "x-forwarded-host") || getHeader(req, "host") || "dv9.com.ua";
  const path = String(req.url || "/api/construction/rc-pour-readiness");
  return `${proto}://${host}${path}`;
}

function paymentRequirement(resourceUrl) {
  return {
    x402Version: 2,
    resource: {
      url: resourceUrl,
      description: "DV9 RC Pour Readiness Precheck — deterministic construction decision-support",
      mimeType: "application/json",
      serviceName: "DV9 Construction API",
      tags: ["construction", "reinforced-concrete", "inspection", "precheck"],
    },
    accepts: [
      {
        scheme: "exact",
        network: NETWORK,
        amount: PRICE_USDC_ATOMIC,
        asset: USDC_BASE_SEPOLIA,
        payTo: PAY_TO,
        maxTimeoutSeconds: 60,
        extra: { name: "USDC", version: "2" },
      },
    ],
    extensions: {},
  };
}

function send402(res, requirements, error) {
  const body = { ...requirements, error };
  res.setHeader("PAYMENT-REQUIRED", encodeHeader(body));
  res.setHeader("Cache-Control", "no-store");
  return res.status(402).json(body);
}

function parseBoolean(value) {
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return undefined;
}

function normalizeInput(req) {
  if (req.method === "GET") {
    const query = req.query || {};
    const payload = {};
    for (const [key] of REQUIRED_CHECKS) {
      const parsed = parseBoolean(query[key]);
      if (parsed !== undefined) payload[key] = parsed;
    }
    return payload;
  }

  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
}

function evaluate(payload) {
  const missing = REQUIRED_CHECKS.filter(([key]) => !(key in payload)).map(([key]) => key);
  if (missing.length) {
    return {
      status: "INCOMPLETE",
      failed_checks: missing,
      next_actions: ["Provide every required boolean checklist field."],
      disclaimer: "Decision-support only. This is not approval to pour concrete and does not replace formal site inspection or licensed engineering sign-off.",
    };
  }

  const failed = REQUIRED_CHECKS.filter(([key]) => payload[key] !== true);
  if (failed.length) {
    return {
      status: "HOLD",
      failed_checks: failed.map(([key, label]) => ({ key, label })),
      next_actions: failed.map(([, label]) => `Resolve or formally review: ${label}.`),
      disclaimer: "Decision-support only. This is not approval to pour concrete and does not replace formal site inspection or licensed engineering sign-off.",
    };
  }

  return {
    status: "READY_FOR_FORMAL_REVIEW",
    failed_checks: [],
    next_actions: ["Proceed to the project's required formal inspection / hidden-works acceptance workflow before any concrete pour."],
    disclaimer: "READY_FOR_FORMAL_REVIEW is not permission to pour concrete. Formal project acceptance and competent-person approval remain required.",
  };
}

async function facilitator(path, paymentPayload, requirement) {
  const response = await fetch(`${FACILITATOR_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      x402Version: 2,
      paymentPayload,
      paymentRequirements: requirement,
    }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = { success: false, isValid: false, errorReason: `facilitator_http_${response.status}` };
  }

  return { ok: response.ok, status: response.status, data };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, PAYMENT-SIGNATURE");
  res.setHeader("Access-Control-Expose-Headers", "PAYMENT-REQUIRED, PAYMENT-RESPONSE");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const payload = normalizeInput(req);
  if (!payload) return res.status(400).json({ error: "INVALID_JSON_BODY" });

  const missing = REQUIRED_CHECKS.filter(([key]) => !(key in payload)).map(([key]) => key);
  if (missing.length) {
    return res.status(400).json({
      error: "MISSING_REQUIRED_CHECKS",
      missing,
      example: Object.fromEntries(REQUIRED_CHECKS.map(([key]) => [key, true])),
    });
  }

  const resourceUrl = getResourceUrl(req);
  const required = paymentRequirement(resourceUrl);
  const requirement = required.accepts[0];
  const signatureHeader = getHeader(req, "payment-signature");

  if (!signatureHeader) {
    return send402(res, required, "PAYMENT-SIGNATURE header is required");
  }

  let paymentPayload;
  try {
    paymentPayload = decodeHeader(signatureHeader);
  } catch {
    return send402(res, required, "PAYMENT-SIGNATURE header is invalid base64/json");
  }

  const accepted = paymentPayload?.accepted;
  if (
    paymentPayload?.x402Version !== 2 ||
    !accepted ||
    accepted.scheme !== requirement.scheme ||
    accepted.network !== requirement.network ||
    String(accepted.amount) !== requirement.amount ||
    String(accepted.asset).toLowerCase() !== requirement.asset.toLowerCase() ||
    String(accepted.payTo).toLowerCase() !== requirement.payTo.toLowerCase()
  ) {
    return send402(res, required, "Payment terms do not match this resource");
  }

  let verified;
  try {
    verified = await facilitator("/verify", paymentPayload, requirement);
  } catch (error) {
    console.error("x402 verify unavailable", error);
    return res.status(503).json({ error: "PAYMENT_VERIFICATION_UNAVAILABLE" });
  }

  if (!verified.ok || verified.data?.isValid !== true) {
    return send402(res, required, verified.data?.invalidReason || "Payment verification failed");
  }

  const result = evaluate(payload);

  let settled;
  try {
    settled = await facilitator("/settle", paymentPayload, requirement);
  } catch (error) {
    console.error("x402 settle unavailable", error);
    return res.status(503).json({ error: "PAYMENT_SETTLEMENT_UNAVAILABLE" });
  }

  if (!settled.ok || settled.data?.success !== true) {
    return send402(res, required, settled.data?.errorReason || "Payment settlement failed");
  }

  res.setHeader("PAYMENT-RESPONSE", encodeHeader(settled.data));
  return res.status(200).json({
    product: "DV9_RC_POUR_READINESS/1",
    payment: {
      network: NETWORK,
      amount_usdc: 0.02,
      payer: settled.data?.payer || verified.data?.payer || null,
      transaction: settled.data?.transaction || null,
    },
    result,
  });
}
