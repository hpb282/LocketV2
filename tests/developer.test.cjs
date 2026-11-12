const { test } = require("node:test");
const assert = require("node:assert/strict");
const { developerContact } = require("../electron/developer.cjs");

test("developer contact IDs resolve to the supplied contact details", () => {
  assert.deepEqual(developerContact("email"), {
    text: "hophuongbac281@gmail.com",
    url: "mailto:hophuongbac281@gmail.com",
  });
  assert.deepEqual(developerContact("phone"), { text: "0349557930" });
  for (const [id, url] of [
    ["zalo", "https://zalo.me/0349557930"],
    ["instagram", "https://www.instagram.com/_hpb06/"],
    ["messenger", "https://m.me/ho.phuong.bac.836428"],
  ]) {
    assert.deepEqual(developerContact(id), { text: url, url });
  }
});

test("developer contacts reject arbitrary URLs, objects and inherited keys", () => {
  for (const input of [
    "https://example.com/",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "constructor",
    "__proto__",
    "toString",
    "",
    null,
    undefined,
    { id: "email", url: "https://example.com/" },
  ]) {
    assert.throws(() => developerContact(input), /không hợp lệ/);
  }
});
