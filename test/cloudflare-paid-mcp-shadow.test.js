import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const configPath = new URL("../experiments/cloudflare-paid-mcp/wrangler.jsonc", import.meta.url);
const serverPath = new URL("../experiments/cloudflare-paid-mcp/src/server.ts", import.meta.url);
const pkgPath = new URL("../experiments/cloudflare-paid-mcp/package.json", import.meta.url);

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const server = fs.readFileSync(serverPath, "utf8");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

test("paid MCP shadow remains Base Sepolia only", () => {
  assert.equal(config.vars.DV9_MCP_NETWORK, "eip155:84532");
  assert.match(server, /EXPECTED_NETWORK = "eip155:84532"/);
  assert.match(server, /FAIL_CLOSED_MAINNET_FORBIDDEN/);
});

test("paid MCP shadow keeps capped price and recipient", () => {
  assert.equal(config.vars.DV9_MCP_PRICE_USD, "0.02");
  assert.equal(
    config.vars.DV9_MCP_RECIPIENT,
    "0x64DF28C1bDB59071429fa5E22228d2a2D0Fc145f"
  );
  assert.match(server, /EXPECTED_PRICE = 0\.02/);
  assert.match(server, /FAIL_CLOSED_PRICE_MISMATCH/);
  assert.match(server, /FAIL_CLOSED_RECIPIENT_MISMATCH/);
});

test("paid MCP shadow cannot deploy from repository script", () => {
  assert.match(pkg.scripts.deploy, /OWNER GATE REQUIRED/);
  assert.match(pkg.scripts.deploy, /exit 2/);
});

test("paid MCP shadow contains no credential names or buyer private key", () => {
  const combined = `${JSON.stringify(config)}\n${server}`;
  assert.doesNotMatch(combined, /CDP_API_KEY_SECRET|CLIENT_TEST_PK|PRIVATE_KEY|SEED_PHRASE/);
});
