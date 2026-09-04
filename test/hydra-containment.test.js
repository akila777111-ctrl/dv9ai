import test from "node:test";
import assert from "node:assert/strict";

import {
  containmentConfig,
  containmentRuntimeStatus,
  egressDecision,
} from "../lib/hydra-containment.js";

function env(overrides = {}) {
  return {
    DV9_CONTAINMENT_MODE: "ENFORCE",
    DV9_CONTAINMENT_KILL_SWITCH: "false",
    DV9_AI_EGRESS_ALLOWLIST: "api.openai.com,api.example.com",
    ...overrides,
  };
}

test("containment defaults to ENFORCE for invalid mode", () => {
  assert.equal(containmentConfig(env({ DV9_CONTAINMENT_MODE: "wat" })).mode, "ENFORCE");
});

test("kill switch blocks all egress", () => {
  const decision = egressDecision(
    "https://api.openai.com/v1/chat/completions",
    env({ DV9_CONTAINMENT_KILL_SWITCH: "true" }),
  );
  assert.deepEqual(decision, {
    allowed: false,
    reason: "kill-switch",
    mode: "ENFORCE",
  });
});

test("kill switch also blocks egress when containment mode is OFF", () => {
  assert.deepEqual(
    egressDecision(
      "https://api.openai.com/v1/chat/completions",
      env({ DV9_CONTAINMENT_MODE: "OFF", DV9_CONTAINMENT_KILL_SWITCH: "true" }),
    ),
    { allowed: false, reason: "kill-switch", mode: "OFF" },
  );
});

test("ENFORCE allows only explicitly allowlisted HTTPS hosts", () => {
  assert.equal(
    egressDecision("https://api.openai.com/v1/chat/completions", env()).allowed,
    true,
  );
  assert.deepEqual(
    egressDecision("https://unlisted.example/v1/chat/completions", env()),
    { allowed: false, reason: "host-not-allowlisted", mode: "ENFORCE" },
  );
});

test("HTTP and local/private destinations are blocked", () => {
  assert.equal(
    egressDecision("http://api.openai.com/v1/chat/completions", env()).reason,
    "https-required",
  );
  assert.equal(
    egressDecision(
      "https://127.0.0.1/v1/chat/completions",
      env({ DV9_AI_EGRESS_ALLOWLIST: "127.0.0.1" }),
    ).reason,
    "local-or-private-egress-forbidden",
  );
  assert.equal(
    egressDecision(
      "https://192.168.1.50/v1/chat/completions",
      env({ DV9_AI_EGRESS_ALLOWLIST: "192.168.1.50" }),
    ).reason,
    "local-or-private-egress-forbidden",
  );
});

test("IPv6 local, link-local, unique-local and mapped private destinations are blocked", () => {
  const destinations = [
    "https://[::]/v1/chat/completions",
    "https://[::1]/v1/chat/completions",
    "https://[fe80::1]/v1/chat/completions",
    "https://[febf::1]/v1/chat/completions",
    "https://[fc00::1]/v1/chat/completions",
    "https://[fdff::1]/v1/chat/completions",
    "https://[::ffff:127.0.0.1]/v1/chat/completions",
    "https://[::ffff:10.0.0.1]/v1/chat/completions",
    "https://[::ffff:169.254.1.1]/v1/chat/completions",
    "https://[::ffff:172.16.0.1]/v1/chat/completions",
    "https://[::ffff:192.168.1.1]/v1/chat/completions",
  ];

  for (const destination of destinations) {
    assert.equal(
      egressDecision(destination, env({ DV9_CONTAINMENT_MODE: "AUDIT" })).reason,
      "local-or-private-egress-forbidden",
      destination,
    );
  }
});

test("AUDIT permits unlisted public HTTPS while preserving guardrails", () => {
  const decision = egressDecision(
    "https://unlisted.example/v1/chat/completions",
    env({ DV9_CONTAINMENT_MODE: "AUDIT" }),
  );
  assert.deepEqual(decision, {
    allowed: true,
    reason: "audit-only-unlisted",
    mode: "AUDIT",
  });
});

test("runtime status exposes policy state but no allowlist contents", () => {
  assert.deepEqual(containmentRuntimeStatus(env()), {
    mode: "ENFORCE",
    killSwitch: false,
    egressPolicy: "HTTPS_ALLOWLIST_ONLY",
  });
});
