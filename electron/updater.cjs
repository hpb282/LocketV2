function publicError(error) {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "");
  if (
    /404|403|401|ERR_UPDATER_NO_PUBLISHED_VERSIONS|ERR_UPDATER_LATEST_VERSION_NOT_FOUND/.test(
      code + " " + message,
    )
  )
    return "Chưa có bản phát hành hoặc chưa có quyền đọc Releases. Nếu repo riêng tư, nhập token GitHub chỉ có quyền Contents: Read.";
  if (/ENOTFOUND|ECONN|ETIMEDOUT|net::/.test(code + " " + message))
    return "Không kết nối được GitHub. Bạn vẫn có thể dùng app offline và thử cập nhật sau.";
  return "Chưa cập nhật được. Hãy thử lại hoặc tải bản cài từ GitHub Releases.";
}
function createUpdateService({
  updater,
  packaged,
  platform,
  version,
  notify = () => {},
}) {
  let state = {
    status: "idle",
    version,
    percent: 0,
    message: "Chỉ kết nối GitHub khi bạn kiểm tra cập nhật.",
  };
  const set = (patch) => {
    state = { ...state, ...patch };
    notify({ ...state });
  };
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.allowDowngrade = false;
  updater.allowPrerelease = false;
  updater.logger = null;
  updater.on("checking-for-update", () =>
    set({ status: "checking", message: "Đang kiểm tra phiên bản mới…" }),
  );
  updater.on("update-available", (info) =>
    set({
      status: "available",
      latestVersion: info.version,
      message: `Đã có phiên bản ${info.version}.`,
    }),
  );
  updater.on("update-not-available", () =>
    set({ status: "current", message: "Bạn đang dùng phiên bản mới nhất." }),
  );
  updater.on("download-progress", (info) =>
    set({
      status: "downloading",
      percent: Math.round(info.percent),
      message: "Đang tải bản cập nhật…",
    }),
  );
  updater.on("update-downloaded", () =>
    set({
      status: "downloaded",
      percent: 100,
      message: "Đã tải xong. Cài đặt để khởi động lại app.",
    }),
  );
  updater.on("error", (error) =>
    set({ status: "error", message: publicError(error) }),
  );
  return {
    state: () => ({ ...state }),
    async check(token = "") {
      if (["checking", "downloading"].includes(state.status))
        return { ...state };
      if (!packaged || platform !== "win32") {
        set({
          status: "unsupported",
          message:
            "Cập nhật tự động dùng trong bản cài Windows. Bạn có thể mở GitHub Releases để xem bản mới.",
        });
        return { ...state };
      }
      if (typeof token !== "string" || token.length > 255 || /\s/.test(token))
        throw Error("Token GitHub không hợp lệ.");
      // Never persist a credential, return it to the renderer, or bake it into app-update.yml.
      updater.setFeedURL({
        provider: "github",
        owner: "hpb282",
        repo: "LocketV2",
        private: Boolean(token),
        ...(token ? { token } : {}),
      });
      set({ status: "checking", message: "Đang kiểm tra phiên bản mới…" });
      try {
        await updater.checkForUpdates();
      } catch (error) {
        set({ status: "error", message: publicError(error) });
      }
      return { ...state };
    },
    async download() {
      if (state.status !== "available")
        throw Error("Hãy kiểm tra phiên bản mới trước.");
      set({
        status: "downloading",
        percent: 0,
        message: "Đang tải bản cập nhật…",
      });
      try {
        await updater.downloadUpdate();
      } catch (error) {
        set({ status: "error", message: publicError(error) });
      }
      return { ...state };
    },
    install() {
      if (state.status !== "downloaded")
        throw Error("Bản cập nhật chưa tải xong.");
      updater.quitAndInstall(false, true);
    },
  };
}
module.exports = { createUpdateService, publicError };
