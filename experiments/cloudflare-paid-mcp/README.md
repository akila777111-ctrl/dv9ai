# DV9 Cloudflare paid MCP shadow

Status: **TESTNET-ONLY / NO DEPLOY / NO SPEND**.

This experiment exposes the deterministic DV9 RC Pour Readiness precheck as an MCP `paidTool` using Cloudflare Agents SDK + x402. It is intentionally locked to Base Sepolia (`eip155:84532`) and the public DV9 receive address.

## Why

Cloudflare documents paid MCP tools as a first-class x402 flow. This gives DV9 a second machine-native sales surface in addition to the existing HTTP x402 endpoint, while keeping the product deterministic and cheap to serve.

## Safety gates

- Base Sepolia only.
- Price fixed at `$0.02` test USDC equivalent.
- Recipient fixed to `0x64DF28C1bDB59071429fa5E22228d2a2D0Fc145f`.
- Testnet facilitator fixed to `https://x402.org/facilitator`.
- No buyer private key, seed phrase, CDP secret, or Cloudflare token in the repository.
- Repository `deploy` script deliberately exits non-zero.
- Production network, facilitator, deployment, paid plan changes, and external terms remain OWNER GATE.

## Unit economics candidate

Production formula only; no profit is assumed before a measured settlement:

`net_per_call = 0.020 - facilitator_fee - settlement_gas - marginal_worker_cost - accounting_allocation - applicable_tax`

Current reference points:

- CDP facilitator: first 1,000 transactions/month free, then `$0.001/transaction`; on-chain gas is separate.
- Cloudflare Workers Free: up to 100,000 requests/day; Workers Standard includes 10M requests/month and CPU allowance. Within included quotas, marginal Worker request cost can be approximately zero.

## Test plan

1. Run repository tests; all safety invariants must pass.
2. Install this subproject separately and run TypeScript check.
3. Local Wrangler smoke: `/mcp` must advertise one paid tool.
4. Base Sepolia payment only, funded from faucet/test USDC.
5. Verify `HOLD` and `READY_FOR_FORMAL_REVIEW` outputs.
6. Do not deploy or switch to mainnet without a separate OWNER-approved step.
