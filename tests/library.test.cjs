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

test("opening a 0.1 library adds the palette setting without changing its photos", async (t) => {
  const { library, root } = await fixture(t);
  const item = await library.add(sample, Buffer.from("original image"));
  await library.settings({ theme: "dark", timer: 3 });
  const file = path.join(root, "library.json");
  const legacy = JSON.parse(await fs.readFile(file, "utf8"));
  delete legacy.settings.palette;
  await fs.writeFile(file, JSON.stringify(legacy));
  const reopened = await new Library(root).open();
  assert.equal(reopened.snapshot().settings.palette, "yellow");
  assert.equal(reopened.snapshot().settings.theme, "dark");
  assert.equal(reopened.snapshot().settings.timer, 3);
  assert.deepEqual(reopened.snapshot().items, legacy.items);
  assert.equal(
    (await fs.readFile(reopened.mediaPath(item.id))).toString(),
    "original image",
  );
});

test("palette selection survives restart and rejects unsupported values", async (t) => {
  const { library, root } = await fixture(t);
  await library.settings({ palette: "pink", theme: "light" });
  await library.settings({ palette: "not-a-theme" });
  const reopened = await new Library(root).open();
  assert.equal(reopened.snapshot().settings.palette, "pink");
  assert.equal(reopened.snapshot().settings.theme, "light");
});

test("a 0.2 library gains a local profile while retaining media and neon settings", async (t) => {
  const { library, root } = await fixture(t);
  await library.add(sample, Buffer.from("original"));
  await library.settings({ palette: "blue" });
  const file = path.join(root, "library.json");
  const legacy = JSON.parse(await fs.readFile(file, "utf8"));
  delete legacy.profile;
  await fs.writeFile(file, JSON.stringify(legacy));
  const reopened = await new Library(root).open();
  assert.equal(reopened.snapshot().profile.displayName, "Bạn");
  assert.equal(reopened.snapshot().profile.avatarId, null);
  assert.equal(reopened.snapshot().settings.palette, "blue");
  assert.deepEqual(reopened.snapshot().items, legacy.items);
});

test("personal profile persists unicode names and calendar birthday without touching media", async (t) => {
  const { library, root } = await fixture(t);
  await library.updateProfile({
    displayName: "  hpb  ",
    nickname: "Góc nhỏ",
    birthday: "2000-02-29",
    bio: "Một ngày bình yên",
    location: "Hà Nội",
    avatarId: "../outside",
  });
  const reopened = await new Library(root).open();
  assert.deepEqual(reopened.snapshot().profile, {
    displayName: "hpb",
    nickname: "Góc nhỏ",
    birthday: "2000-02-29",
    bio: "Một ngày bình yên",
    location: "Hà Nội",
    avatarId: null,
  });
  assert.equal(reopened.snapshot().items.length, 0);
});

test("profile validates real birthdays and rejects future dates without corrupting saved data", async (t) => {
  const { library } = await fixture(t);
  await library.updateProfile({ displayName: "hpb", birthday: "2000-02-29" });
  for (const patch of [
    { birthday: "2023-02-29" },
    { birthday: "2026-04-31" },
    { birthday: "9999-12-31" },
    { displayName: " " },
    { bio: "x".repeat(161) },
  ]) {
    await assert.rejects(async () => library.updateProfile(patch));
  }
  assert.equal(library.snapshot().profile.displayName, "hpb");
  assert.equal(library.snapshot().profile.birthday, "2000-02-29");
});

test("avatar replacement preserves the backup avatar, prunes older files and stays outside the gallery", async (t) => {
  const { library, root } = await fixture(t);
  const a = await library.setAvatar(Buffer.from("avatar a"));
  const b = await library.setAvatar(Buffer.from("avatar b"));
  const c = await library.setAvatar(Buffer.from("avatar c"));
  const files = (await fs.readdir(path.join(root, "avatars"))).sort();
  assert.deepEqual(files, [`${b.avatarId}.jpg`, `${c.avatarId}.jpg`].sort());
  assert.throws(() => library.avatarPath(a.avatarId));
  assert.throws(() => library.avatarPath("../secret"));
  assert.equal(library.snapshot().items.length, 0);
  await fs.writeFile(path.join(root, "library.json"), "{broken");
  const recovered = await new Library(root).open();
  assert.equal(recovered.snapshot().profile.avatarId, b.avatarId);
  assert.equal(
    (await fs.readFile(recovered.avatarPath(b.avatarId))).toString(),
    "avatar b",
  );
  await recovered.setAvatar(null);
  assert.equal(recovered.snapshot().profile.avatarId, null);
});

test("failed avatar metadata write keeps the original and removes the uncommitted file", async (t) => {
  const { library, root } = await fixture(t);
  const original = await library.setAvatar(Buffer.from("original avatar"));
  const persist = library.persist.bind(library);
  library.persist = async () => {
    throw Error("disk full");
  };
  await assert.rejects(
    library.setAvatar(Buffer.from("replacement avatar")),
    /disk full/,
  );
  library.persist = persist;
  assert.equal(library.snapshot().profile.avatarId, original.avatarId);
  assert.deepEqual(await fs.readdir(path.join(root, "avatars")), [
    `${original.avatarId}.jpg`,
  ]);
  assert.equal(
    (await fs.readFile(library.avatarPath(original.avatarId))).toString(),
    "original avatar",
  );
});
