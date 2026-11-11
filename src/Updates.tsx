import { useEffect, useState } from "react";
import {
  RefreshCw,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  ArrowUpCircle,
  PackageOpen,
} from "lucide-react";
import { invoke } from "./api";
import type { UpdateState } from "./types";
export function Updates({
  version,
  notify,
}: {
  version: string;
  notify: (message: string) => void;
}) {
  const [state, setState] = useState<UpdateState>({
      status: "idle",
      version,
      percent: 0,
      message: "Chỉ kết nối GitHub khi bạn kiểm tra cập nhật.",
    }),
    [token, setToken] = useState("");
  useEffect(() => {
    invoke<UpdateState>("update:state")
      .then(setState)
      .catch(() => {});
    return window.hpb?.onUpdate(setState);
  }, []);
  const run = async (action: string, payload?: unknown) => {
    try {
      const next = await invoke(action, payload);
      if (next && typeof next === "object" && "status" in next) setState(next);
    } catch (error) {
      notify((error as Error).message);
    }
  };
  return (
    <section className="page settings-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">LUÔN CÓ ĐIỀU MỚI</p>
          <h1>Cập nhật ứng dụng</h1>
          <p className="subtitle">
            Tính năng mới, cùng một góc nhỏ quen thuộc.
          </p>
        </div>
      </header>
      <div className="update-card">
        <div className="update-icon">
          {state.status === "current" ? (
            <CheckCircle2 size={38} />
          ) : state.status === "downloaded" ? (
            <PackageOpen size={38} />
          ) : (
            <ArrowUpCircle size={38} />
          )}
        </div>
        <span className="version-badge">Phiên bản {version}</span>
        <h2>Locket x HPB</h2>
        <p>{state.message}</p>
        {state.latestVersion && (
          <p className="latest-version">Phiên bản mới: {state.latestVersion}</p>
        )}
        {state.status === "downloading" && (
          <div className="download-progress">
            <span style={{ width: `${state.percent}%` }} />
            <strong>{state.percent}%</strong>
          </div>
        )}
        <div className="update-actions">
          {state.status === "available" ? (
            <button
              className="btn primary"
              onClick={() => run("update:download")}
            >
              <Download size={18} />
              Tải bản cập nhật
            </button>
          ) : state.status === "downloaded" ? (
            <button
              className="btn primary"
              onClick={() => run("update:install")}
            >
              <RefreshCw size={18} />
              Cài đặt & khởi động lại
            </button>
          ) : (
            <button
              className="btn primary"
              disabled={["checking", "downloading"].includes(state.status)}
              onClick={() => {
                void run("update:check", { token });
                setToken("");
              }}
            >
              <RefreshCw
                size={18}
                className={state.status === "checking" ? "spin" : ""}
              />
              {state.status === "checking"
                ? "Đang kiểm tra…"
                : "Kiểm tra cập nhật"}
            </button>
          )}
          <button
            className="btn secondary"
            onClick={() => run("update:releases")}
          >
            <ExternalLink size={17} />
            GitHub Releases
          </button>
        </div>
      </div>
      <details className="settings-card private-update">
        <summary>Quyền truy cập cho repo GitHub riêng tư</summary>
        <p>
          Repo LocketV2 hiện riêng tư. Để kiểm tra và tải bản mới, bạn có thể
          nhập token GitHub của chính mình có quyền{" "}
          <strong>Contents: Read</strong> cho repo này. Để trống khi repo phát
          hành công khai.
        </p>
        <label className="field-label">
          Token cho phiên làm việc này
          <input
            aria-label="Token đọc bản cập nhật"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value.trim())}
            autoComplete="off"
            placeholder="GitHub token (không bắt buộc)"
          />
        </label>
        <p className="quiet-note">
          <ShieldCheck size={15} />
          Token không lưu vào thư viện hay gửi lên repository. Không cần token
          khi dùng app offline.
        </p>
      </details>
      <p className="quiet-note">
        Cập nhật giữ nguyên thư viện cá nhân. Bạn chủ động chọn thời điểm tải và
        cài.
      </p>
    </section>
  );
}
