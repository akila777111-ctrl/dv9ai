# DV9 x402 owner test

Approved cap: 0.02 USDC for one real owner-gated technical test.

Production candidate:
- endpoint: `/api/construction/rc-pour-readiness-v2`
- network: Base mainnet (`eip155:8453`)
- asset: USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- amount: 20,000 atomic units = 0.02 USDC
- payTo: `0x64DF28C1bDB59071429fa5E22228d2a2D0Fc145f`
- facilitator: `https://facilitator.openx402.ai`
- client page: `/pay-test.html`

Safety invariants:
- client hard-fails if network, asset, payTo, or price differ from the constants above;
- no seed/private key is requested or stored;
- signing happens only inside the user's EVM wallet via EIP-712;
- authorization expires after 5 minutes and uses a random 32-byte nonce;
- no automated retry after a failed settlement;
- a self-payment validates the rail but is not counted as revenue.
