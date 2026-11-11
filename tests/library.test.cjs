const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { Library, DEFAULT_STYLE } = require("../electron/library.cjs");
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hpb-library-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { root, library: await new Library(root).open() };
}
const sample = {
  kind: "image",
  mime: "image/jpeg",
  width: 640,
  height: 480,
  caption: "Một chiều yên",
  style: DEFAULT_STYLE,
};
test("save, reopen and preserve original bytes separately from decorations", async (t) => {
  const { root, library } = await fixture(t);
  const bytes = Buffer.from("test image payload");
  const item = await library.add(sample, bytes);
  await library.update(item.id, {
    caption: "Ghi chú mới",
    style: { frame: "tet" },
    favorite: true,
  });
  const reopened = await new Library(root).open();
  assert.equal(reopened.item(item.id).caption, "Ghi chú mới");
  assert.equal(reopened.item(item.id).style.frame, "tet");
  assert.equal(reopened.item(item.id).favorite, true);
  assert.deepEqual(await fs.readFile(reopened.mediaPath(item.id)), bytes);
});
test("concurrent metadata writes preserve all items and settings", async (t) => {
  const { root, library } = await fixture(t);
  const items = await Promise.all(
    Array.from({ length: 12 }, (_, n) =>
      library.add({ ...sample, caption: `Ảnh ${n}` }, Buffer.from("image")),
    ),
  );
  await Promise.all(
    items.map((item, n) => library.update(item.id, { caption: `Mới ${n}` })),
  );
  await library.settings({ theme: "dark", timer: 3 });
  const reopened = await new Library(root).open();
  assert.equal(reopened.snapshot().items.length, 12);
  assert.ok(
    reopened.snapshot().items.every((x) => x.caption.startsWith("Mới")),
  );
  assert.equal(reopened.snapshot().settings.theme, "dark");
});
test("trash and restore keep metadata, frames and media", async (t) => {
  const { library } = await fixture(t);
  const item = await library.add(
    { ...sample, style: { ...DEFAULT_STYLE, frame: "christmas" } },
    Buffer.from("image"),
  );
  await library.trash([item.id]);
  assert.ok(library.item(item.id).deletedAt);
  await library.trash([item.id], true);
  assert.equal(library.item(item.id).deletedAt, null);
  assert.equal(library.item(item.id).style.frame, "christmas");
  assert.ok((await fs.stat(library.mediaPath(item.id))).isFile());
});
test("permanent deletion only deletes trashed items and removes stale backup references", async (t) => {
  const { library, root } = await fixture(t);
  const keep = await library.add(sample, Buffer.from("a"));
  const gone = await library.add(sample, Buffer.from("b"));
  const gonePath = library.mediaPath(gone.id);
  await library.trash([gone.id]);
  await library.remove([gone.id, keep.id]);
  assert.equal(library.snapshot().items.length, 1);
  assert.equal(library.snapshot().items[0].id, keep.id);
  await assert.rejects(fs.stat(gonePath), { code: "ENOENT" });
  const backup = JSON.parse(
    await fs.readFile(path.join(root, "library.json.bak"), "utf8"),
  );
  assert.ok(!backup.items.some((x) => x.id === gone.id));
});
test("reject invalid video duration and oversized captions without creating files", async (t) => {
  const { library, root } = await fixture(t);
  await assert.rejects(
    library.add(
      { ...sample, kind: "video", mime: "video/webm", duration: 11 },
      Buffer.from("v"),
    ),
    /10 giây/,
  );
  await assert.rejects(
    library.add({ ...sample, caption: "x".repeat(241) }, Buffer.from("i")),
    /240/,
  );
  assert.deepEqual(await fs.readdir(path.join(root, "media")), []);
  assert.throws(() => library.mediaPath("../secret"), /Không tìm thấy/);
});
test("recover corrupt primary index from backup instead of silently resetting", async (t) => {
  const { library, root } = await fixture(t);
  const item = await library.add(sample, Buffer.from("i"));
  await library.settings({ theme: "light" });
  await fs.writeFile(path.join(root, "library.json"), "{broken");
  const recovered = await new Library(root).open();
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.snapshot().items[0].id, item.id);
  assert.ok(
    (await fs.readdir(root)).some((name) => name.includes(".damaged-")),
  );
});
test("never overwrite a library from a newer app version", async (t) => {
  const { root } = await fixture(t);
  const future = JSON.stringify({ schemaVersion: 2, items: [], settings: {} });
  await fs.writeFile(path.join(root, "library.json"), future);
  await assert.rejects(new Library(root).open(), /phiên bản mới hơn/);
  assert.equal(
    await fs.readFile(path.join(root, "library.json"), "utf8"),
    future,
  );
});
test("invalid mutation leaves current and persisted metadata unchanged", async (t) => {
  const { library, root } = await fixture(t);
  const item = await library.add(sample, Buffer.from("i"));
  await assert.rejects(library.update(item.id, { caption: "x".repeat(241) }));
  await library.update(item.id, { favorite: true });
  assert.equal(library.item(item.id).caption, sample.caption);
  const reopened = await new Library(root).open();
  assert.equal(reopened.item(item.id).favorite, true);
});
