import { evaluateProfitOpportunity, PROFIT_ENGINE_POLICY } from "../src/profit-engine/index.js";

const tool = {
  name: "evaluate_profit_opportunity",
  description: "Calculate expected net profit after fees, gas, slippage and other costs, then apply DV9 simulation-only risk and spending limits.",
  inputSchema: {
    type: "object",
    properties: {
      capitalUsd: { type: "number", minimum: 0 },
      expectedGrossReturnUsd: { type: "number" },
      expectedGrossReturnPct: { type: "number" },
      feesUsd: { type: "number", minimum: 0 },
      gasUsd: { type: "number", minimum: 0 },
      slippageBps: { type: "number", minimum: 0 },
      otherCostsUsd: { type: "number", minimum: 0 },
      liquidityUsd: { type: "number", minimum: 0 },
      chain: { type: "string" },
      jurisdictionAllowed: { type: "boolean" },
      kycRequired: { type: "boolean" },
      kycSatisfied: { type: "boolean" },
      simulationAvailable: { type: "boolean" },
      leverage: { type: "boolean" },
      unlimitedApproval: { type: "boolean" },
      withdrawalPermission: { type: "boolean" },
      singleTxUsd: { type: "number", minimum: 0 },
      smartContractRisk: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] }
    },
    required: ["capitalUsd"]
  }
};

const send = (res, payload, status = 200) => {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, { error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const { id = null, method, params = {} } = body;

  if (method === "initialize") {
    return send(res, {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "dv9-profit-gate", version: "0.1.0" }
      }
    });
  }

  if (method === "tools/list") {
    return send(res, { jsonrpc: "2.0", id, result: { tools: [tool] } });
  }

  if (method === "tools/call") {
    if (params.name !== tool.name) {
      return send(res, { jsonrpc: "2.0", id, error: { code: -32602, message: "UNKNOWN_TOOL" } }, 400);
    }
    const result = evaluateProfitOpportunity(params.arguments || {});
    return send(res, {
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result
      }
    });
  }

  if (method === "notifications/initialized") {
    return send(res, { jsonrpc: "2.0", id, result: {} });
  }

  return send(res, {
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: "METHOD_NOT_FOUND", data: { policy: PROFIT_ENGINE_POLICY } }
  }, 400);
}
