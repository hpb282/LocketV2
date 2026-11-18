const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createAIService } = require("../electron/ai.cjs");
const png = fs.readFileSync(
  require("node:path").join(__dirname, "../public/icon.png"),
);
// Deliberately fake; never a live API credential.
const KEY = "sk-placeholder-for-local-unit-tests-only";
const photo = { bytes: png, mime: "image/png", style: "anime" };
const success = () =>
  new Response(
    JSON.stringify({ data: [{ b64_json: png.toString("base64") }] }),
  );

test("AI is opt-in; setting a session key makes no network request and never exposes it in state", async () => {
  let calls = 0;
  const ai = createAIService({
    request: async () => {
      calls++;
      return success();
    },
  });
  assert.deepEqual(ai.state(), { configured: false, busy: false });
  await assert.rejects(ai.generate(photo), /thiết lập API key/);
  for (const value of [
    null,
    "",
    "password",
    "sk-bad value",
    `sk-${"x".repeat(600)}`,
  ])
    assert.throws(() => ai.setKey(value), /không hợp lệ/);
  ai.setKey(KEY);
  assert.equal(calls, 0);
  assert.deepEqual(ai.state(), { configured: true, busy: false });
  assert.equal(JSON.stringify(ai.state()).includes(KEY), false);
  ai.clearKey();
  await assert.rejects(ai.generate(photo), /thiết lập/);
  assert.equal(calls, 0);
});
test("AI sends one bounded source image to the fixed official edit endpoint, preserves style and returns PNG", async () => {
  let received;
  const ai = createAIService({
    request: async (url, options) => {
      received = { url, ...options };
      return success();
    },
  });
  ai.setKey(KEY);
  assert.deepEqual(await ai.generate(photo), png);
  assert.equal(received.url, "https://api.openai.com/v1/images/edits");
  assert.equal(received.method, "POST");
  assert.equal(received.redirect, "error");
  assert.equal(received.headers.Authorization, `Bearer ${KEY}`);
  const body = JSON.parse(received.body);
  assert.equal(body.model, "gpt-image-2.5-flare");
  assert.equal(body.quality, "high");
  assert.equal(body.n, 1);
  assert.equal(body.output_format, "png");
  assert.equal(body.images.length, 1);
  assert.deepEqual(
    Buffer.from(body.images[0].image_url.split(",")[1], "base64"),
    png,
  );
  assert.equal(received.body.includes(KEY), false);
  assert.match(body.prompt, /Preserve the identity/);
  assert.deepEqual(ai.state(), { configured: true, busy: false });
});
test("invalid styles, inherited names, unsupported modes and oversized inputs never reach a paid API", async () => {
  let calls = 0;
  const ai = createAIService({
    request: async () => {
      calls++;
      return success();
    },
  });
  ai.setKey(KEY);
  for (const patch of [
    { style: "constructor" },
    { style: "__proto__" },
    { style: "unknown" },
    { mode: "unknown" },
    { mime: "image/svg+xml" },
    { bytes: Buffer.alloc(0) },
    { bytes: Buffer.alloc(12 * 1024 * 1024 + 1) },
  ])
    await assert.rejects(ai.generate({ ...photo, ...patch }));
  assert.equal(calls, 0);
});
test("authentication and rate-limit errors are sanitized and are not automatically retried", async () => {
  for (const code of [400, 401, 403, 404, 429, 500]) {
    let calls = 0;
    const ai = createAIService({
      request: async () => {
        calls++;
        return new Response(
          JSON.stringify({ error: { message: `private request ${KEY}` } }),
          { status: code },
        );
      },
    });
    ai.setKey(KEY);
    await assert.rejects(
      ai.generate(photo),
      (error) => !error.message.includes(KEY),
    );
    assert.equal(calls, 1);
    assert.equal(ai.state().busy, false);
  }
});
test("only one billable request can be active; cancellation aborts it and makes a later request possible", async () => {
  let calls = 0;
  const ai = createAIService({
    request: async (_url, { signal }) => {
      calls++;
      return new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error("aborted")), {
          once: true,
        }),
      );
    },
  });
  ai.setKey(KEY);
  const pending = ai.generate(photo);
  assert.equal(ai.state().busy, true);
  await assert.rejects(ai.generate(photo), /Đang có một ảnh/);
  assert.equal(calls, 1);
  assert.throws(() => ai.setKey(KEY), /dừng yêu cầu/);
  ai.cancel();
  await assert.rejects(pending, /vẫn có thể.*tính phí/);
  assert.equal(ai.state().busy, false);
  const next = ai.generate(photo);
  ai.clearKey();
  await assert.rejects(next, /dừng chờ/);
  assert.deepEqual(ai.state(), { configured: false, busy: false });
  assert.equal(calls, 2);
});
test("timeouts do not cause a second billable request", async () => {
  let calls = 0;
  const ai = createAIService({
    timeout: 5,
    request: async (_url, { signal }) => {
      calls++;
      return new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error("aborted"))),
      );
    },
  });
  ai.setKey(KEY);
  await assert.rejects(ai.generate(photo), /không tự gửi lại/);
  assert.equal(calls, 1);
  assert.equal(ai.state().busy, false);
});
test("provider URLs and malformed or decompression-bomb PNGs are rejected without following a URL", async () => {
  const huge = Buffer.from(png);
  huge.writeUInt32BE(100_000, 16);
  huge.writeUInt32BE(100_000, 20);
  for (const body of [
    { data: [{ url: "https://example.com/untrusted" }] },
    { data: [{ b64_json: "<script>" }] },
    { data: [{ b64_json: Buffer.from("not an image").toString("base64") }] },
    { data: [{ b64_json: huge.toString("base64") }] },
  ]) {
    let calls = 0;
    const ai = createAIService({
      request: async () => {
        calls++;
        return new Response(JSON.stringify(body));
      },
    });
    ai.setKey(KEY);
    await assert.rejects(ai.generate(photo));
    assert.equal(calls, 1);
  }
});
test("transport errors cannot echo API credentials", async () => {
  const ai = createAIService({
    request: async () => {
      throw Error(`failed Authorization: Bearer ${KEY}`);
    },
  });
  ai.setKey(KEY);
  await assert.rejects(
    ai.generate(photo),
    (error) =>
      !error.message.includes(KEY) && /Chưa kết nối/.test(error.message),
  );
});
