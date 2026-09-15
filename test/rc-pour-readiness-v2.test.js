import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/construction/rc-pour-readiness-v2.js";

const ALL_TRUE_QUERY = [
  "drawings_available=true",
  "rebar_checked=true",
  "cover_checked=true",
  "formwork_checked=true",
  "embeds_checked=true",
  "cleanliness_checked=true",
  "concrete_spec_confirmed=true",
  "access_and_sequence_checked=true",
].join("&");

function responseMock() {
  const headers = new Map();
  const response = {
    statusCode: 200,
    body: undefined,
    ended: false,
    setHeader(name, value) {
      headers.set(String(name).toLowerCase(), value);
    },
    getHeader(name) {
      return headers.get(String(name).toLowerCase());
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
  return response;
}

test("GET x402 challenge uses WHATWG URL parsing and does not touch req.query", async () => {
  const req = {
    method: "GET",
    headers: {
      host: "www.dv9.com.ua",
      "x-forwarded-proto": "https",
    },
    url: `/api/construction/rc-pour-readiness-v2?${ALL_TRUE_QUERY}`,
  };

  Object.defineProperty(req, "query", {
    get() {
      throw new Error("legacy req.query access must not be used");
    },
  });

  const res = responseMock();
  await handler(req, res);

  assert.equal(res.statusCode, 402);
  assert.equal(res.body?.x402Version, 2);
  assert.equal(
    res.body?.resource?.url,
    `https://www.dv9.com.ua/api/construction/rc-pour-readiness-v2?${ALL_TRUE_QUERY}`,
  );
  assert.equal(res.body?.error, "PAYMENT-SIGNATURE header is required");
  assert.ok(res.getHeader("payment-required"));
});

test("malformed forwarded host fails closed to the canonical DV9 origin", async () => {
  const req = {
    method: "GET",
    headers: {
      host: "www.dv9.com.ua",
      "x-forwarded-host": "bad host",
      "x-forwarded-proto": "javascript",
    },
    url: `/api/construction/rc-pour-readiness-v2?${ALL_TRUE_QUERY}`,
  };
  const res = responseMock();

  await handler(req, res);

  assert.equal(res.statusCode, 402);
  assert.equal(
    res.body?.resource?.url,
    `https://www.dv9.com.ua/api/construction/rc-pour-readiness-v2?${ALL_TRUE_QUERY}`,
  );
});
