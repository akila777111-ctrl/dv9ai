# DV9 Profit Engine Lab

Status: SIMULATION_ONLY
Verified: 2026-08-28

## Safety policy

- Base only for the first on-chain experiment.
- Maximum experiment balance: $20 equivalent.
- Maximum single transaction: $5 equivalent.
- Maximum daily outflow: $10 equivalent.
- Maximum slippage: 50 bps.
- Maximum gas budget per transaction: $0.25.
- No leverage.
- No unlimited token approvals.
- No withdrawal permission for agents.
- Owner review is required before any live transaction.
- Never store a wallet seed/private key in Git, source code, logs, prompts, or CI variables intended for public/preview builds.

## Verified opportunities

### 1. FiatDock MCP marketplace / x402

Official source: https://www.fiatdock.com/mcp-marketplace.html

Verified facts:
- Non-custodial x402 settlement in USDC on Base.
- Seller marketplace fee: 0% for the first 30 days, then 1%.
- Listing is free; optional Verified badge is separate.
- FiatDock explicitly states that, as of 2026-08-13, there had not yet been an external buyer for a third-party listing. Treat demand as experimental, not expected income.
- Germany is not listed among restricted jurisdictions in the current FiatDock terms; EUR/SEPA is supported through the provider subject to provider eligibility/KYC.

Lab action:
- Expose `api/mcp-profit.js` as the first read-only DV9 paid-tool candidate.
- Start with free/private testing. Do not attach a funded signing key to preview deployments.
- If listed, initial price target: $0.01/call. Revenue is only recognized after settled paid calls.

### 2. KyberSwap / Merkl Coinbase Tokenized Stocks cashback

Official sources:
- https://blog.kyberswap.com/earn-cashback-on-coinbase-tokenized-stocks-with-kyberswap/
- https://app.merkl.xyz/opportunities/10881504440128149607
- https://www.coinbase.com/tokenize

Verified facts:
- Campaign announced 2026-08-26.
- Eligible Epoch 1 assets on Base: GOOGLc, NVDAc, AAPLc, METAc.
- Up to 2% cashback; maximum 10 USDC per address per epoch.
- Rewards are calculated/distributed by Merkl.
- User must hold the eligible tokenized equity through the epoch.
- Geographic restrictions apply. Germany is not explicitly listed in KyberSwap's campaign exclusions, but Coinbase states availability is limited to eligible jurisdictions and the security prospectus requires compliance with applicable local securities law.

Lab action:
- Simulation only until venue-level eligibility for the specific wallet/user is positively confirmed.
- Model net result as: cashback + mark-to-market change - swap fees - gas - slippage - other costs.
- Do not treat the 2% cashback as a guaranteed positive return because equity price movement can dominate the reward.

### 3. OKX Card Happy Weekend — August 2026

Official source: https://www.okx.com/de/learn/okx-card-happy-weekend-august

Verified facts:
- Campaign ends 2026-08-30 23:59 UTC.
- Weekend 2026-08-29 to 2026-08-30 is the final campaign weekend.
- 1 USDG per cumulative $10 equivalent of qualifying card spend, capped at 10 USDG per account per campaign weekend.
- Separate regular base cashback is stated as 2% for non-VIP users, subject to OKX terms and eligibility.

Lab action:
- Use only for purchases that were already planned; do not create artificial spend.
- Opt-in and eligibility must be confirmed in the user's own OKX app before relying on the reward.

### 4. OKX 8% Deposit Bonus — August 2026

Official source: https://www.okx.com/de/learn/mica-deposit-bonus-campaign

Verified facts:
- EEA campaign deposit window ends 2026-08-31 23:59 CEST.
- 8% bonus on eligible net deposits after opt-in; minimum deposit 10 EUR.
- Paid in 26 biweekly installments over 12 months starting 2026-09-04.
- Withdrawals can reduce or pause future installments.

Lab action:
- No deposit is initiated by DV9.
- If the owner chooses to participate, first validate opt-in in the account and model the one-year lock/retention effect, counterparty exposure, tax recordkeeping, and any funding/off-ramp costs.

### 5. Binance Agent OS

Official source: https://academy.binance.com/ky-KG/articles/how-binance-agent-os-is-changing-crypto-trading

Verified facts:
- Launched 2026-08-20.
- Supports MCP-connected agents including ChatGPT/Codex-compatible workflows.
- Dedicated sub-account model; withdrawals from the assigned sub-account are blocked by default.
- User-configurable permissions and optional approval per order.

Lab action:
- Read-only first.
- If account eligibility supports Agent OS, use an isolated empty sub-account initially.
- No futures, margin, leverage, or live trading in the lab phase.

## Promotion to live mode

The lab may move beyond simulation only after all of the following are true:
1. Jurisdiction and account eligibility positively confirmed.
2. KYC/appropriateness requirements satisfied where applicable.
3. A dedicated experimental wallet/sub-account exists.
4. The wallet/sub-account contains no more than the approved experiment cap.
5. Private keys are stored outside source control.
6. Simulation produces positive expected net value after all costs under conservative assumptions.
7. Owner explicitly approves the specific live transaction or permission change.
