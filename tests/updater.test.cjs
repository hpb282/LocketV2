const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createUpdateService, publicError } = require("../electron/updater.cjs");
class FakeUpdater extends EventEmitter {
  setFeedURL(feed) {
    this.feed = feed;
  }
  async checkForUpdates() {
    this.emit("update-available", { version: "0.2.0" });
  }
  async downloadUpdate() {
    this.emit("download-progress", { percent: 50 });
    this.emit("update-downloaded");
  }
  quitAndInstall() {
    this.installed = true;
  }
}
test("updates require explicit check, download and install; no automatic downloads", async () => {
  const updater = new FakeUpdater();
  const states = [];
  const service = createUpdateService({
    updater,
    packaged: true,
    platform: "win32",
    version: "0.1.0",
    notify: (state) => states.push(state),
  });
  assert.equal(updater.autoDownload, false);
  assert.equal(updater.autoInstallOnAppQuit, false);
  assert.throws(() => service.install());
  await service.check();
  assert.equal(service.state().status, "available");
  await service.download();
  assert.equal(service.state().status, "downloaded");
  service.install();
  assert.equal(updater.installed, true);
  assert.ok(states.some((x) => x.percent === 50));
});
test("private repo token stays out of UI state and error messages", async () => {
  const updater = new FakeUpdater();
  const service = createUpdateService({
    updater,
    packaged: true,
    platform: "win32",
    version: "0.1.0",
  });
  await service.check("test_private_token");
  assert.equal(updater.feed.private, true);
  assert.equal(updater.feed.token, "test_private_token");
  assert.ok(!JSON.stringify(service.state()).includes("test_private_token"));
  assert.ok(
    !publicError({ message: "401 test_private_token" }).includes(
      "test_private_token",
    ),
  );
});
test("network failure remains recoverable and does not crash offline app", async () => {
  const updater = new FakeUpdater();
  updater.checkForUpdates = async () => {
    throw Object.assign(Error("connection lost"), { code: "ENOTFOUND" });
  };
  const service = createUpdateService({
    updater,
    packaged: true,
    platform: "win32",
    version: "0.1.0",
  });
  await service.check();
  assert.equal(service.state().status, "error");
  assert.match(service.state().message, /offline/);
  updater.checkForUpdates = async () => updater.emit("update-not-available");
  await service.check();
  assert.equal(service.state().status, "current");
});
test("development builds explain update availability without contacting network", async () => {
  const updater = new FakeUpdater();
  updater.checkForUpdates = async () => {
    throw Error("Should never request");
  };
  const service = createUpdateService({
    updater,
    packaged: false,
    platform: "linux",
    version: "0.1.0",
  });
  await service.check();
  assert.equal(service.state().status, "unsupported");
});
