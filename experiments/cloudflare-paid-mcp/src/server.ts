import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { withX402, type X402Config } from "agents/x402";
import { z } from "zod";

const EXPECTED_NETWORK = "eip155:84532";
const EXPECTED_RECIPIENT = "0x64DF28C1bDB59071429fa5E22228d2a2D0Fc145f";
const EXPECTED_PRICE = 0.02;
const EXPECTED_FACILITATOR = "https://x402.org/facilitator";

function requireSafeConfig(env: Env): X402Config {
  const network = env.DV9_MCP_NETWORK;
  const recipient = env.DV9_MCP_RECIPIENT;
  const price = Number(env.DV9_MCP_PRICE_USD);
  const facilitator = env.DV9_MCP_FACILITATOR;

  if (network !== EXPECTED_NETWORK) throw new Error("FAIL_CLOSED_MAINNET_FORBIDDEN");
  if (recipient.toLowerCase() !== EXPECTED_RECIPIENT.toLowerCase()) throw new Error("FAIL_CLOSED_RECIPIENT_MISMATCH");
  if (price !== EXPECTED_PRICE) throw new Error("FAIL_CLOSED_PRICE_MISMATCH");
  if (facilitator !== EXPECTED_FACILITATOR) throw new Error("FAIL_CLOSED_FACILITATOR_MISMATCH");

  return {
    network,
    recipient: recipient as `0x${string}`,
    facilitator: { url: facilitator }
  };
}

const checklistSchema = {
  drawings_available: z.boolean(),
  rebar_checked: z.boolean(),
  cover_checked: z.boolean(),
  formwork_checked: z.boolean(),
  embeds_checked: z.boolean(),
  cleanliness_checked: z.boolean(),
  concrete_spec_confirmed: z.boolean(),
  access_and_sequence_checked: z.boolean()
};

const labels: Record<keyof typeof checklistSchema, string> = {
  drawings_available: "Approved drawings / method information available",
  rebar_checked: "Reinforcement arrangement checked",
  cover_checked: "Concrete cover checked",
  formwork_checked: "Formwork and supports checked",
  embeds_checked: "Embeds / openings / sleeves checked",
  cleanliness_checked: "Formwork and pour area cleanliness checked",
  concrete_spec_confirmed: "Concrete specification confirmed",
  access_and_sequence_checked: "Access, sequence and placement plan checked"
};

function evaluate(input: Record<keyof typeof checklistSchema, boolean>) {
  const failed = (Object.keys(labels) as Array<keyof typeof checklistSchema>)
    .filter((key) => input[key] !== true)
    .map((key) => ({ key, label: labels[key] }));

  return failed.length
    ? {
        status: "HOLD",
        failed_checks: failed,
        disclaimer:
          "Decision-support only. This is not approval to pour concrete and does not replace formal site inspection or competent-person sign-off."
      }
    : {
        status: "READY_FOR_FORMAL_REVIEW",
        failed_checks: [],
        disclaimer:
          "READY_FOR_FORMAL_REVIEW is not permission to pour concrete. Formal project acceptance remains required."
      };
}

export class Dv9PaidMcp extends McpAgent<Env> {
  server = withX402(
    new McpServer({ name: "DV9 Construction Paid MCP Shadow", version: "0.1.0-testnet" }),
    requireSafeConfig(this.env)
  );

  async init() {
    this.server.paidTool(
      "rc_pour_readiness_precheck",
      "Deterministic reinforced-concrete pour-readiness precheck. Decision-support only; not approval to pour.",
      EXPECTED_PRICE,
      checklistSchema,
      {},
      async (input) => ({
        content: [{ type: "text", text: JSON.stringify(evaluate(input), null, 2) }]
      })
    );
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname !== "/mcp") return new Response("DV9 paid MCP shadow: testnet only", { status: 404 });

    // Validate again per request so config drift fails closed before the MCP handler runs.
    requireSafeConfig(env);
    return Dv9PaidMcp.serve("/mcp", { binding: "DV9_PAID_MCP" }).fetch(request, env, ctx);
  }
};

export interface Env {
  DV9_PAID_MCP: DurableObjectNamespace;
  DV9_MCP_NETWORK: string;
  DV9_MCP_RECIPIENT: string;
  DV9_MCP_PRICE_USD: string;
  DV9_MCP_FACILITATOR: string;
}
