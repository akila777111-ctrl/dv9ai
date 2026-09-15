const NETWORK = "eip155:8453";
const FACILITATOR_URL = "https://facilitator.openx402.ai";
const PAY_TO = "0x64DF28C1bDB59071429fa5E22228d2a2D0Fc145f";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PRICE = "20000";
const DEFAULT_PATH = "/api/construction/rc-pour-readiness-v2";
const DEFAULT_ORIGIN = "https://www.dv9.com.ua";

const CHECKS = [
  ["drawings_available", "Approved drawings / method information available"],
  ["rebar_checked", "Reinforcement arrangement checked"],
  ["cover_checked", "Concrete cover checked"],
  ["formwork_checked", "Formwork and supports checked"],
  ["embeds_checked", "Embeds / openings / sleeves checked"],
  ["cleanliness_checked", "Formwork and pour area cleanliness checked"],
  ["concrete_spec_confirmed", "Concrete specification confirmed"],
  ["access_and_sequence_checked", "Access, sequence and placement plan checked"],
];

const b64 = (value) => Buffer.from(JSON.stringify(value), "utf8").toString("base64");
const unb64 = (value) => JSON.parse(Buffer.from(String(value), "base64").toString("utf8"));

function header(req, name) {
  const key = Object.keys(req.headers || {}).find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase(),
  );
  return key ? req.headers[key] : undefined;
}

function firstForwardedValue(value) {
  return String(value || "")
    .split(",", 1)[0]
    .trim();
}

function requestUrl(req) {
  const forwardedProto = firstForwardedValue(header(req, "x-forwarded-proto"));
  const proto = forwardedProto === "http" ? "http" : "https";
  const host =
    firstForwardedValue(header(req, "x-forwarded-host")) ||
    firstForwardedValue(header(req, "host")) ||
    "www.dv9.com.ua";

  let origin;
  try {
    const base = new URL(`${proto}://${host}`);
    if (base.protocol !== "http:" && base.protocol !== "https:") throw new Error("invalid protocol");
    origin = base.origin;
  } catch {
    origin = DEFAULT_ORIGIN;
  }

  const raw = String(req.url || DEFAULT_PATH);
  const relative = raw.startsWith("/") ? raw : `/${raw.replace(/^\/+/, "")}`;

  try {
    return new URL(relative, origin);
  } catch {
    return new URL(DEFAULT_PATH, DEFAULT_ORIGIN);
  }
}

function input(req) {
  if (req.method === "GET") {
    const data = {};
    const params = requestUrl(req).searchParams;

    for (const [key] of CHECKS) {
      const value = params.get(key);
      if (value === "true" || value === "1") data[key] = true;
      else if (value === "false" || value === "0") data[key] = false;
    }

    return data;
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

function resourceUrl(req) {
  return requestUrl(req).toString();
}

function required(req) {
  return {
    x402Version: 2,
    resource: {
      url: resourceUrl(req),
      description: "DV9 RC Pour Readiness Precheck — deterministic construction decision-support",
      mimeType: "application/json",
      serviceName: "DV9 Construction API",
      tags: ["construction", "reinforced-concrete", "inspection", "precheck"],
    },
    accepts: [
      {
        scheme: "exact",
        network: NETWORK,
        amount: PRICE,
        asset: USDC,
        payTo: PAY_TO,
        maxTimeoutSeconds: 60,
        extra: {
          name: "USD Coin",
          version: "2",
          assetTransferMethod: "eip3009",
        },
      },
    ],
    extensions: {},
  };
}

function paymentRequired(res, challenge, error) {
  const body = { ...challenge, error };
  res.setHeader("PAYMENT-REQUIRED", b64(body));
  return res.status(402).json(body);
}

function evaluate(data) {
  const failed = CHECKS.filter(([key]) => data[key] !== true);

  if (failed.length) {
    return {
      status: "HOLD",
      failed_checks: failed.map(([key, label]) => ({ key, label })),
      next_actions: failed.map(([, label]) => `Resolve or formally review: ${label}.`),
      disclaimer:
        "Decision-support only. This is not approval to pour concrete and does not replace formal inspection or licensed engineering sign-off.",
    };
  }

  return {
    status: "READY_FOR_FORMAL_REVIEW",
    failed_checks: [],
    next_actions: [
      "Proceed to the project's required formal inspection / hidden-works acceptance workflow before any pour.",
    ],
    disclaimer:
      "READY_FOR_FORMAL_REVIEW is not permission to pour concrete. Formal acceptance remains required.",
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
    data = {
      success: false,
      isValid: false,
      errorReason: `facilitator_http_${response.status}`,
    };
  }

  return { ok: response.ok, data };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, PAYMENT-SIGNATURE");
  res.setHeader("Access-Control-Expose-Headers", "PAYMENT-REQUIRED, PAYMENT-RESPONSE");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const data = input(req);
  if (!data) return res.status(400).json({ error: "INVALID_INPUT" });

  const missing = CHECKS.filter(([key]) => !(key in data)).map(([key]) => key);
  if (missing.length) {
    return res.status(400).json({ error: "MISSING_REQUIRED_CHECKS", missing });
  }

  const challenge = required(req);
  const requirement = challenge.accepts[0];
  const paymentSignature = header(req, "payment-signature");

  if (!paymentSignature) {
    return paymentRequired(res, challenge, "PAYMENT-SIGNATURE header is required");
  }

  let paymentPayload;
  try {
    paymentPayload = unb64(paymentSignature);
  } catch {
    return paymentRequired(res, challenge, "PAYMENT-SIGNATURE header is invalid");
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
    return paymentRequired(res, challenge, "Payment terms mismatch");
  }

  let verification;
  try {
    verification = await facilitator("/verify", paymentPayload, requirement);
  } catch {
    return res.status(503).json({ error: "PAYMENT_VERIFICATION_UNAVAILABLE" });
  }

  if (!verification.ok || verification.data?.isValid !== true) {
    return paymentRequired(
      res,
      challenge,
      verification.data?.invalidReason ||
        verification.data?.errorReason ||
        "Payment verification failed",
    );
  }

  const result = evaluate(data);

  let settlement;
  try {
    settlement = await facilitator("/settle", paymentPayload, requirement);
  } catch {
    return res.status(503).json({ error: "PAYMENT_SETTLEMENT_UNAVAILABLE" });
  }

  if (!settlement.ok || settlement.data?.success !== true) {
    return paymentRequired(
      res,
      challenge,
      settlement.data?.errorReason || "Payment settlement failed",
    );
  }

  res.setHeader("PAYMENT-RESPONSE", b64(settlement.data));
  return res.status(200).json({
    product: "DV9_RC_POUR_READINESS/2",
    payment: {
      network: NETWORK,
      amount_usdc: 0.02,
      payer: settlement.data?.payer || verification.data?.payer || null,
      transaction: settlement.data?.transaction || null,
    },
    result,
  });
}
