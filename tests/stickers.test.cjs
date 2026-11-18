const { test } = require("node:test");
const assert = require("node:assert/strict");
test("glasses follow eye location and account for non-square image geometry", async () => {
  const { placeSticker } = await import("../src/stickers.ts");
  const face = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  face[33] = { x: 0.3, y: 0.3 };
  face[263] = { x: 0.7, y: 0.4 };
  face[10] = { x: 0.5, y: 0.1 };
  face[234] = { x: 0.2, y: 0.4 };
  face[454] = { x: 0.8, y: 0.4 };
  const position = placeSticker("shades", [face], 1000, 500);
  assert.equal(position.x, 0.5);
  assert.equal(position.y, 0.35);
  assert.ok(
    Math.abs(position.rotation - (Math.atan2(50, 400) * 180) / Math.PI) < 0.001,
  );
  assert.ok(position.width > 0.5 && position.width < 0.7);
  const head = placeSticker("cap", [face], 1000, 500);
  assert.ok(head.y < face[10].y);
  assert.ok(head.y >= 0);
});
test("no-face photos remain editable, pet stickers stay beside the subject, and all stamps are self-contained", async () => {
  const { placeSticker, stickers } = await import("../src/stickers.ts");
  const glasses = placeSticker("shades", [], 1000, 500);
  assert.equal(glasses.x, 0.5);
  assert.equal(glasses.width, 0.38);
  const pet = placeSticker("cat", [], 1000, 500);
  assert.ok(pet.x > 0.7 && pet.y > 0.7);
  for (const sticker of stickers) {
    assert.match(sticker.src, /^data:image\/svg\+xml/);
    const svg = decodeURIComponent(sticker.src.split(",")[1]);
    assert.doesNotMatch(svg, /<script|<foreignObject|href=/i);
    assert.ok(sticker.ratio > 0);
  }
});
