const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  session,
  protocol,
  net,
  shell,
  nativeImage,
} = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { Library } = require("./library.cjs");
const { createUpdateService } = require("./updater.cjs");
const { autoUpdater } = require("electron-updater");
protocol.registerSchemesAsPrivileged([
  {
    scheme: "locket",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
  {
    scheme: "media",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
]);
if (process.env.HPB_USER_DATA)
  app.setPath("userData", path.resolve(process.env.HPB_USER_DATA));
app.setName("Locket x HPB");
app.setAppUserModelId("dev.hpb282.locketv2");
const dev = !app.isPackaged && process.env.HPB_DEV === "1";
let library,
  mainWindow,
  widget,
  widgetId = null,
  updates;
const allowed = new Set();
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
  function broadcast() {
    for (const win of BrowserWindow.getAllWindows())
      win.webContents.send("hpb:changed");
  }
  function createWindow(isWidget = false) {
    const win = new BrowserWindow({
      title: "Locket x HPB",
      icon: path.join(__dirname, "..", "dist", "icon.png"),
      width: isWidget ? 360 : 1220,
      height: isWidget ? 360 : 820,
      minWidth: isWidget ? 250 : 860,
      minHeight: isWidget ? 250 : 620,
      frame: !isWidget,
      backgroundColor: "#20221e",
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        backgroundThrottling: isWidget,
      },
    });
    const contentsId = win.webContents.id;
    allowed.add(contentsId);
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (event) => event.preventDefault());
    win.on("closed", () => allowed.delete(contentsId));
    win.once("ready-to-show", () => win.show());
    if (isWidget) win.setAlwaysOnTop(library.doc.settings.alwaysOnTop);
    if (dev)
      void win.loadURL(`http://127.0.0.1:5173/${isWidget ? "?widget=1" : ""}`);
    else
      void win.loadURL(`locket://app/index.html${isWidget ? "?widget=1" : ""}`);
    return win;
  }
  function payloadObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error("Yêu cầu không hợp lệ.");
    return value;
  }
  function binary(value) {
    if (!(value instanceof Uint8Array) && !(value instanceof ArrayBuffer))
      throw Error("Dữ liệu tệp không hợp lệ.");
    const data = Buffer.from(value);
    if (data.length > 40 * 1024 * 1024) throw Error("Tệp vượt quá 40 MB.");
    return data;
  }
  async function dispatch(event, action, payload) {
    const isMain = event.sender.id === mainWindow?.webContents.id;
    if (
      !allowed.has(event.sender.id) ||
      event.senderFrame !== event.sender.mainFrame
    )
      throw Error("Yêu cầu không được phép.");
    if (
      !isMain &&
      ![
        "snapshot",
        "widget:item",
        "widget:step",
        "widget:close",
        "widget:pin",
        "widget:open",
      ].includes(action)
    )
      throw Error("Yêu cầu không được phép trong cửa sổ ảnh.");
    switch (action) {
      case "snapshot":
        return {
          ...library.snapshot(),
          version: app.getVersion(),
          desktop: true,
        };
      case "profile:update": {
        const profile = await library.updateProfile(payloadObject(payload));
        broadcast();
        return profile;
      }
      case "profile:avatar": {
        const { canceled, filePaths } = await dialog.showOpenDialog(
          mainWindow,
          {
            title: "Chọn ảnh đại diện",
            properties: ["openFile"],
            filters: [
              { name: "Ảnh", extensions: ["jpg", "jpeg", "png", "webp"] },
            ],
          },
        );
        if (canceled) return null;
        if ((await fs.stat(filePaths[0])).size > 25 * 1024 * 1024)
          throw Error("Hãy chọn ảnh nhỏ hơn 25 MB.");
        const image = nativeImage.createFromBuffer(
          await fs.readFile(filePaths[0]),
        );
        if (image.isEmpty()) throw Error("Không đọc được ảnh đại diện.");
        const { width, height } = image.getSize();
        if (width * height > 24_000_000)
          throw Error("Hãy chọn ảnh không quá 24 megapixel.");
        const side = Math.min(width, height);
        const avatar = image
          .crop({
            x: Math.floor((width - side) / 2),
            y: Math.floor((height - side) / 2),
            width: side,
            height: side,
          })
          .resize({ width: 512, height: 512, quality: "best" });
        const profile = await library.setAvatar(avatar.toJPEG(90));
        broadcast();
        return profile;
      }
      case "profile:avatar:clear": {
        const profile = await library.setAvatar(null);
        broadcast();
        return profile;
      }
      case "media:add": {
        const data = payloadObject(payload);
        const bytes = binary(data.bytes);
        if (data.kind === "image") {
          const image = nativeImage.createFromBuffer(bytes);
          if (image.isEmpty()) throw Error("Không đọc được ảnh.");
          const size = image.getSize();
          if (size.width !== data.width || size.height !== data.height)
            throw Error("Kích thước ảnh không khớp.");
        } else if (bytes.subarray(0, 4).toString("hex") !== "1a45dfa3")
          throw Error("Video WebM không hợp lệ.");
        const item = await library.add(data, bytes);
        broadcast();
        return item;
      }
      case "media:update": {
        const data = payloadObject(payload);
        const item = await library.update(data.id, payloadObject(data.patch));
        broadcast();
        return item;
      }
      case "media:trash":
        await library.trash(payloadObject(payload).ids);
        broadcast();
        return true;
      case "media:restore":
        await library.trash(payloadObject(payload).ids, true);
        broadcast();
        return true;
      case "media:delete": {
        const ids = payloadObject(payload).ids;
        if (!Array.isArray(ids) || !ids.length)
          throw Error("Hãy chọn khoảnh khắc cần xóa.");
        const { response } = await dialog.showMessageBox(mainWindow, {
          type: "warning",
          title: "Xóa vĩnh viễn?",
          message: `Xóa vĩnh viễn ${ids.length} khoảnh khắc?`,
          detail:
            "Tệp trong thư viện Locket x HPB sẽ bị xóa và không thể khôi phục. Tệp gốc bạn đã nhập từ máy không bị ảnh hưởng.",
          buttons: ["Hủy", "Xóa vĩnh viễn"],
          defaultId: 0,
          cancelId: 0,
        });
        if (response !== 1) return false;
        await library.remove(ids);
        broadcast();
        return true;
      }
      case "settings": {
        const settings = await library.settings(payloadObject(payload));
        widget?.setAlwaysOnTop(settings.alwaysOnTop);
        broadcast();
        return settings;
      }
      case "storage:open":
        await shell.openPath(library.root);
        return true;
      case "media:import": {
        const { canceled, filePaths } = await dialog.showOpenDialog(
          mainWindow,
          {
            title: "Chọn ảnh từ laptop",
            properties: ["openFile"],
            filters: [
              { name: "Ảnh", extensions: ["jpg", "jpeg", "png", "webp"] },
            ],
          },
        );
        if (canceled) return null;
        const size = (await fs.stat(filePaths[0])).size;
        if (size > 25 * 1024 * 1024) throw Error("Hãy chọn ảnh nhỏ hơn 25 MB.");
        const bytes = await fs.readFile(filePaths[0]);
        const image = nativeImage.createFromBuffer(bytes);
        if (image.isEmpty()) throw Error("Không đọc được ảnh này.");
        const { width, height } = image.getSize();
        if (width * height > 24_000_000)
          throw Error("Hãy chọn ảnh không quá 24 megapixel.");
        return image.toDataURL();
      }
      case "media:export": {
        const data = payloadObject(payload);
        let bytes, ext;
        if (data.id) {
          const item = library.item(data.id);
          bytes = await fs.readFile(library.mediaPath(item.id));
          ext = item.ext;
        } else {
          bytes = binary(data.bytes);
          ext = "png";
          if (nativeImage.createFromBuffer(bytes).isEmpty())
            throw Error("Ảnh xuất không hợp lệ.");
        }
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
          title: "Xuất khoảnh khắc",
          defaultPath: `Locket-x-HPB-${Date.now()}.${ext}`,
          filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
        });
        if (canceled || !filePath) return false;
        await fs.writeFile(filePath, bytes);
        return true;
      }
      case "widget:show":
        widgetId = payload?.id ?? null;
        if (!widget) {
          widget = createWindow(true);
          widget.on("closed", () => {
            widget = null;
          });
        } else {
          widget.show();
          broadcast();
        }
        return true;
      case "widget:item": {
        const items = library.doc.items.filter((x) => !x.deletedAt);
        const item = items.find((x) => x.id === widgetId) ?? items[0] ?? null;
        widgetId = item?.id ?? null;
        return { item, settings: library.doc.settings };
      }
      case "widget:step": {
        const items = library.doc.items.filter((x) => !x.deletedAt);
        if (items.length) {
          const index = Math.max(
            0,
            items.findIndex((x) => x.id === widgetId),
          );
          widgetId =
            items[
              (index + (payload === -1 ? -1 : 1) + items.length) % items.length
            ].id;
        }
        broadcast();
        return true;
      }
      case "widget:close":
        widget?.close();
        return true;
      case "widget:pin":
        await library.settings({
          alwaysOnTop: !library.doc.settings.alwaysOnTop,
        });
        widget?.setAlwaysOnTop(library.doc.settings.alwaysOnTop);
        broadcast();
        return true;
      case "widget:open":
        mainWindow.show();
        mainWindow.focus();
        return true;
      case "update:state":
        return updates.state();
      case "update:check":
        return updates.check(payload?.token ?? "");
      case "update:download":
        return updates.download();
      case "update:install": {
        const { response } = await dialog.showMessageBox(mainWindow, {
          type: "question",
          title: "Cài bản cập nhật",
          message: "Cài bản mới và khởi động lại Locket x HPB?",
          detail:
            "Hãy lưu khoảnh khắc đang chỉnh trước khi tiếp tục. Thư viện của bạn được giữ lại.",
          buttons: ["Để sau", "Cài đặt"],
          defaultId: 0,
          cancelId: 0,
        });
        if (response === 1) updates.install();
        return response === 1;
      }
      case "update:releases":
        await shell.openExternal("https://github.com/hpb282/LocketV2/releases");
        return true;
      default:
        throw Error("Chức năng không được hỗ trợ.");
    }
  }
  app
    .whenReady()
    .then(async () => {
      library = await new Library(
        path.join(app.getPath("userData"), "library"),
      ).open();
      protocol.handle("locket", (request) => {
        const url = new URL(request.url);
        const name =
          url.pathname === "/"
            ? "index.html"
            : decodeURIComponent(url.pathname).slice(1);
        if (
          url.host !== "app" ||
          !/^(index\.html|icon\.(svg|png)|assets\/[a-zA-Z0-9_.-]+)$/.test(name)
        )
          return new Response("Not found", { status: 404 });
        return net.fetch(
          pathToFileURL(path.join(__dirname, "..", "dist", name)).toString(),
        );
      });
      protocol.handle("media", async (request) => {
        try {
          const url = new URL(request.url);
          const id = url.pathname.slice(1);
          if (url.host === "avatar" && /^[a-f0-9-]{36}$/.test(id)) {
            const bytes = await fs.readFile(library.avatarPath(id));
            return new Response(bytes, {
              headers: {
                "Content-Type": "image/jpeg",
                "Content-Length": String(bytes.length),
                "Cache-Control": "no-store",
                "Access-Control-Allow-Origin": dev
                  ? "http://127.0.0.1:5173"
                  : "locket://app",
              },
            });
          }
          if (url.host !== "item" || !/^[a-f0-9-]{36}$/.test(id))
            return new Response(null, { status: 404 });
          const item = library.item(id);
          const bytes = await fs.readFile(library.mediaPath(id));
          const headers = {
            "Content-Type": item.mime,
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": dev
              ? "http://127.0.0.1:5173"
              : "locket://app",
          };
          const range = request.headers.get("range");
          if (range) {
            const match = range.match(/^bytes=(\d+)-(\d*)$/);
            if (!match) return new Response(null, { status: 416 });
            const start = Number(match[1]);
            const end = Math.min(
              match[2] ? Number(match[2]) : bytes.length - 1,
              bytes.length - 1,
            );
            if (start > end || start >= bytes.length)
              return new Response(null, {
                status: 416,
                headers: { "Content-Range": `bytes */${bytes.length}` },
              });
            return new Response(bytes.subarray(start, end + 1), {
              status: 206,
              headers: {
                ...headers,
                "Content-Length": String(end - start + 1),
                "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
              },
            });
          }
          return new Response(bytes, {
            headers: { ...headers, "Content-Length": String(bytes.length) },
          });
        } catch {
          return new Response(null, { status: 404 });
        }
      });
      session.defaultSession.setPermissionRequestHandler(
        (contents, permission, callback, details) =>
          callback(
            allowed.has(contents.id) &&
              permission === "media" &&
              details.isMainFrame !== false,
          ),
      );
      session.defaultSession.setPermissionCheckHandler((contents, permission) =>
        Boolean(contents && allowed.has(contents.id) && permission === "media"),
      );
      updates = createUpdateService({
        updater: autoUpdater,
        packaged: app.isPackaged,
        platform: process.platform,
        version: app.getVersion(),
        notify: (state) => {
          for (const win of BrowserWindow.getAllWindows())
            win.webContents.send("hpb:update", state);
        },
      });
      ipcMain.handle("hpb:invoke", async (event, action, payload) => {
        try {
          return { ok: true, value: await dispatch(event, action, payload) };
        } catch (error) {
          return {
            ok: false,
            error: error.message || "Không thực hiện được thao tác.",
          };
        }
      });
      mainWindow = createWindow();
      mainWindow.on("closed", () => {
        widget?.close();
        mainWindow = null;
      });
    })
    .catch((error) => {
      dialog.showErrorBox("Không mở được thư viện", error.message);
      app.quit();
    });
  app.on("window-all-closed", () => app.quit());
}
