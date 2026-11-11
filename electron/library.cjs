const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const FRAMES = [
  "none",
  "halloween",
  "christmas",
  "tet",
  "birthday",
  "polaroid",
];
const FONTS = ["basic", "hand", "bold", "neon"];
const DEFAULT_STYLE = {
  frame: "none",
  thickness: 3,
  decoration: 70,
  font: "basic",
  color: "#ffffff",
  fontSize: 28,
  background: true,
};
const DEFAULT_SETTINGS = {
  theme: "system",
  timer: 0,
  gridSize: 180,
  alwaysOnTop: true,
  mirror: true,
};
function styleOf(input = {}) {
  return {
    frame: FRAMES.includes(input.frame) ? input.frame : "none",
    thickness: Math.max(0, Math.min(12, Number(input.thickness) || 0)),
    decoration: Math.max(0, Math.min(100, Number(input.decoration) || 0)),
    font: FONTS.includes(input.font) ? input.font : "basic",
    color: /^#[0-9a-f]{6}$/i.test(input.color) ? input.color : "#ffffff",
    fontSize: Math.max(16, Math.min(64, Number(input.fontSize) || 28)),
    background: input.background !== false,
  };
}
function migrateDocument(data) {
  if (
    data &&
    typeof data.schemaVersion === "number" &&
    data.schemaVersion > 1
  ) {
    const error = Error(
      "Thư viện được tạo bằng phiên bản mới hơn. Hãy cập nhật ứng dụng.",
    );
    error.code = "UNSUPPORTED_SCHEMA";
    throw error;
  }
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.items))
    throw Error(
      "Thư viện không tương thích. Hãy kiểm tra cập nhật hoặc khôi phục bản sao lưu.",
    );
  const seen = new Set();
  for (const item of data.items) {
    if (
      !/^[a-f0-9-]{36}$/.test(item.id) ||
      seen.has(item.id) ||
      !["image", "video"].includes(item.kind) ||
      !["jpg", "png", "webp", "webm"].includes(item.ext)
    )
      throw Error("Dữ liệu thư viện không hợp lệ.");
    seen.add(item.id);
    if (typeof item.caption !== "string" || !Number.isFinite(item.createdAt))
      throw Error("Dữ liệu ảnh không hợp lệ.");
    item.style = styleOf({ ...DEFAULT_STYLE, ...item.style });
  }
  return { ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings } };
}
class Library {
  constructor(root) {
    this.root = root;
    this.file = path.join(root, "library.json");
    this.doc = null;
    this.queue = Promise.resolve();
    this.recovered = false;
  }
  async open() {
    await fs.mkdir(path.join(this.root, "media"), { recursive: true });
    try {
      this.doc = migrateDocument(
        JSON.parse(await fs.readFile(this.file, "utf8")),
      );
    } catch (error) {
      if (error.code === "UNSUPPORTED_SCHEMA") throw error;
      if (error.code === "ENOENT") {
        // A missing primary index can still have a recoverable backup.
        try {
          this.doc = migrateDocument(
            JSON.parse(await fs.readFile(`${this.file}.bak`, "utf8")),
          );
          this.recovered = true;
        } catch (backupError) {
          if (backupError.code !== "ENOENT") throw backupError;
          this.doc = {
            schemaVersion: 1,
            items: [],
            settings: { ...DEFAULT_SETTINGS },
          };
        }
      } else {
        try {
          this.doc = migrateDocument(
            JSON.parse(await fs.readFile(`${this.file}.bak`, "utf8")),
          );
          this.recovered = true;
        } catch {
          throw error;
        }
      }
    }
    if (this.recovered)
      await fs
        .rename(this.file, `${this.file}.damaged-${Date.now()}`)
        .catch(() => {});
    await this.persist(this.doc);
    return this;
  }
  async persist(doc) {
    const temp = `${this.file}.${randomUUID()}.tmp`;
    await fs.writeFile(temp, JSON.stringify(doc, null, 2), { mode: 0o600 });
    try {
      await fs.copyFile(this.file, `${this.file}.bak`);
    } catch (error) {
      if (error.code !== "ENOENT") {
        await fs.unlink(temp).catch(() => {});
        throw error;
      }
    }
    try {
      await fs.rename(temp, this.file);
    } catch (error) {
      await fs.unlink(temp).catch(() => {});
      throw error;
    }
  }
  transact(fn) {
    const task = this.queue.then(async () => {
      const next = structuredClone(this.doc);
      const result = await fn(next);
      await this.persist(next);
      this.doc = next;
      return result;
    });
    this.queue = task.catch(() => {});
    return task;
  }
  snapshot() {
    return structuredClone({
      items: this.doc.items,
      settings: this.doc.settings,
      recovered: this.recovered,
    });
  }
  item(id) {
    const item = this.doc.items.find((x) => x.id === id);
    if (!item) throw Error("Không tìm thấy khoảnh khắc.");
    return structuredClone(item);
  }
  mediaPath(id) {
    const item = this.item(id);
    return path.join(this.root, "media", `${item.id}.${item.ext}`);
  }
  async add(input, bytes) {
    if (
      !Buffer.isBuffer(bytes) ||
      bytes.length === 0 ||
      bytes.length > 40 * 1024 * 1024
    )
      throw Error("Dữ liệu ảnh/video trống hoặc vượt quá 40 MB.");
    const image = input.kind === "image";
    const ext = image
      ? { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[
          input.mime
        ]
      : input.mime?.startsWith("video/webm")
        ? "webm"
        : null;
    if (!ext || !["image", "video"].includes(input.kind))
      throw Error("Định dạng không được hỗ trợ.");
    const duration = image ? 0 : Number(input.duration);
    if (
      !image &&
      (!Number.isFinite(duration) || duration <= 0 || duration > 10.5)
    )
      throw Error("Video cần dài từ 0 đến 10 giây.");
    if (typeof input.caption !== "string" || input.caption.length > 240)
      throw Error("Ghi chú tối đa 240 ký tự.");
    if (
      !Number.isInteger(input.width) ||
      !Number.isInteger(input.height) ||
      input.width < 1 ||
      input.height < 1 ||
      input.width * input.height > 24_000_000
    )
      throw Error("Kích thước không hợp lệ.");
    const id = randomUUID();
    const file = path.join(this.root, "media", `${id}.${ext}`);
    const item = {
      id,
      kind: input.kind,
      ext,
      mime: image ? input.mime : "video/webm",
      width: input.width,
      height: input.height,
      duration,
      caption: input.caption.trim(),
      style: styleOf({ ...DEFAULT_STYLE, ...input.style }),
      favorite: false,
      createdAt: Date.now(),
      deletedAt: null,
    };
    await fs.writeFile(file, bytes, { flag: "wx", mode: 0o600 });
    try {
      await this.transact((doc) => {
        doc.items.unshift(item);
      });
    } catch (error) {
      await fs.unlink(file).catch(() => {});
      throw error;
    }
    return item;
  }
  update(id, patch) {
    return this.transact((doc) => {
      const item = doc.items.find((x) => x.id === id);
      if (!item) throw Error("Không tìm thấy khoảnh khắc.");
      if (patch.caption !== undefined) {
        if (typeof patch.caption !== "string" || patch.caption.length > 240)
          throw Error("Ghi chú tối đa 240 ký tự.");
        item.caption = patch.caption.trim();
      }
      if (patch.style !== undefined)
        item.style = styleOf({ ...item.style, ...patch.style });
      if (typeof patch.favorite === "boolean") item.favorite = patch.favorite;
      return structuredClone(item);
    });
  }
  trash(ids, restore = false) {
    if (
      !Array.isArray(ids) ||
      ids.length > 5000 ||
      ids.some((id) => typeof id !== "string")
    )
      throw Error("Lựa chọn không hợp lệ.");
    return this.transact((doc) => {
      for (const item of doc.items)
        if (ids.includes(item.id)) item.deletedAt = restore ? null : Date.now();
    });
  }
  async remove(ids) {
    if (!Array.isArray(ids) || ids.length > 5000)
      throw Error("Lựa chọn không hợp lệ.");
    const files = [];
    await this.transact((doc) => {
      for (const item of doc.items)
        if (ids.includes(item.id) && item.deletedAt)
          files.push(path.join(this.root, "media", `${item.id}.${item.ext}`));
      doc.items = doc.items.filter((x) => !(ids.includes(x.id) && x.deletedAt));
    });
    // Both indexes stop referencing removed media before physical deletion.
    await this.queue;
    await fs.copyFile(this.file, `${this.file}.bak`);
    for (const file of files)
      await fs.unlink(file).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
  }
  settings(patch) {
    return this.transact((doc) => {
      const s = doc.settings;
      if (["light", "dark", "system"].includes(patch.theme))
        s.theme = patch.theme;
      if ([0, 3, 5].includes(patch.timer)) s.timer = patch.timer;
      if (Number.isFinite(patch.gridSize))
        s.gridSize = Math.min(320, Math.max(110, patch.gridSize));
      if (typeof patch.alwaysOnTop === "boolean")
        s.alwaysOnTop = patch.alwaysOnTop;
      if (typeof patch.mirror === "boolean") s.mirror = patch.mirror;
      return { ...s };
    });
  }
}
module.exports = {
  Library,
  DEFAULT_STYLE,
  DEFAULT_SETTINGS,
  styleOf,
  migrateDocument,
};
