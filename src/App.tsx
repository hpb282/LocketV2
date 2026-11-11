import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  Camera,
  Images,
  Star,
  Trash2,
  Settings as SettingsIcon,
  RefreshCw,
  Cloud,
  Search,
  ImagePlus,
  Video,
  Check,
  RotateCcw,
  FolderOpen,
  Pin,
  Sun,
  Moon,
  Monitor,
  Timer,
  FlipHorizontal2,
  ChevronLeft,
  ChevronRight,
  X,
  Expand,
  Heart,
  Download,
  Palette,
} from "lucide-react";
import { invoke, mediaURL, snapshot, formatDuration } from "./api";
import {
  defaultSettings,
  type Draft,
  type Item,
  type Settings,
  type Snapshot,
  type TextStyle,
} from "./types";
import { Capture, imageDraft } from "./Capture";
import { MediaSurface } from "./MediaSurface";
import { Review } from "./Review";
import { Updates } from "./Updates";
import { palettes } from "./palettes";

type Page =
  | "camera"
  | "gallery"
  | "favorites"
  | "trash"
  | "settings"
  | "updates";
function useTheme(settings: Settings) {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.palette = settings.palette;
      document.documentElement.dataset.theme =
        settings.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : settings.theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings.theme, settings.palette]);
}
function Widget() {
  const [data, setData] = useState<{ item: Item | null; settings: Settings }>({
    item: null,
    settings: defaultSettings,
  });
  const refresh = useCallback(() => {
    invoke("widget:item")
      .then(setData)
      .catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
    return window.hpb?.onChange(refresh);
  }, [refresh]);
  useTheme(data.settings);
  return (
    <div className="widget-shell">
      <div className="widget-top drag">
        <span className="widget-brand">
          <Cloud size={15} />
          Locket x HPB
        </span>
        <div className="no-drag">
          <button
            className={`widget-btn ${data.settings.alwaysOnTop ? "pinned" : ""}`}
            aria-label="Bật tắt ghim nổi"
            onClick={() => invoke("widget:pin")}
          >
            <Pin size={15} />
          </button>
          <button
            className="widget-btn"
            aria-label="Đóng ảnh ghim"
            onClick={() => invoke("widget:close")}
          >
            <X size={17} />
          </button>
        </div>
      </div>
      {data.item ? (
        <div className="widget-photo">
          <MediaSurface
            src={mediaURL(data.item.id)}
            kind={data.item.kind}
            width={data.item.width}
            height={data.item.height}
            style={data.item.style}
            caption={data.item.caption}
            autoPlay
          />
          <button
            className="widget-step previous"
            aria-label="Ảnh trước"
            onClick={() => invoke("widget:step", -1)}
          >
            <ChevronLeft size={19} />
          </button>
          <button
            className="widget-step next"
            aria-label="Ảnh tiếp theo"
            onClick={() => invoke("widget:step", 1)}
          >
            <ChevronRight size={19} />
          </button>
        </div>
      ) : (
        <div className="widget-empty">
          <Cloud size={40} />
          <p>Chưa có khoảnh khắc nào.</p>
        </div>
      )}
      <button
        className="widget-footer drag"
        onClick={() => invoke("widget:open")}
      >
        <span className="status-dot" />
        Mở thư viện
        <Expand className="no-drag" size={16} />
      </button>
    </div>
  );
}
function MainApp() {
  const [data, setData] = useState<Snapshot>({
      items: [],
      settings: defaultSettings,
      version: "0.2.0",
      desktop: true,
    }),
    [page, setPage] = useState<Page>("camera"),
    [selected, setSelected] = useState<string | null>(null),
    [search, setSearch] = useState(""),
    [kind, setKind] = useState("all"),
    [month, setMonth] = useState(false),
    [selection, setSelection] = useState<string[]>([]),
    [selecting, setSelecting] = useState(false),
    [toast, setToast] = useState(""),
    [initialDraft, setInitialDraft] = useState<Draft | null>(null),
    [loaded, setLoaded] = useState(false);
  const notify = useCallback((text: string) => setToast(text), []);
  const refresh = useCallback(async () => {
    try {
      const result = await snapshot();
      setData(result);
      setLoaded(true);
      if (result.recovered)
        notify("Đã khôi phục thư viện từ bản sao lưu gần nhất.");
    } catch (error) {
      notify((error as Error).message);
    }
  }, [notify]);
  useEffect(() => {
    void refresh();
    return window.hpb?.onChange(() => {
      void refresh();
    });
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useTheme(data.settings);
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (error) {
      notify((error as Error).message);
    }
  };
  const settings = (patch: Partial<Settings>) => {
    void run(async () => {
      await invoke("settings", patch);
      await refresh();
    });
  };
  const navigate = (value: Page) => {
    setPage(value);
    setSelected(null);
    setSelection([]);
    setSelecting(false);
    setSearch("");
    setKind("all");
    setMonth(false);
  };
  const active = data.items.filter((item) => !item.deletedAt),
    trashed = data.items.filter((item) => item.deletedAt),
    favorites = active.filter((item) => item.favorite);
  const selectedItem = active.find((item) => item.id === selected);
  const filtered = useMemo(() => {
    const base =
      page === "trash" ? trashed : page === "favorites" ? favorites : active;
    const now = new Date();
    return base.filter(
      (item) =>
        (kind === "all" || item.kind === kind) &&
        (!month ||
          (new Date(item.createdAt).getMonth() === now.getMonth() &&
            new Date(item.createdAt).getFullYear() === now.getFullYear())) &&
        item.caption
          .toLocaleLowerCase("vi")
          .includes(search.toLocaleLowerCase("vi")),
    );
  }, [data.items, page, kind, search, month]);
  const importPhoto = () =>
    run(async () => {
      const url = await invoke<string | null>("media:import");
      if (!url) return;
      const draft = await imageDraft(url);
      navigate("camera");
      setInitialDraft(draft);
    });
  const favorite = (item: Item) =>
    run(async () => {
      await invoke("media:update", {
        id: item.id,
        patch: { favorite: !item.favorite },
      });
      await refresh();
    });
  const trash = (ids: string[]) =>
    run(async () => {
      await invoke("media:trash", { ids });
      setSelected(null);
      setSelection([]);
      await refresh();
      notify(`Đã chuyển ${ids.length} khoảnh khắc vào thùng rác.`);
    });
  const step = (delta: number) => {
    const index = active.findIndex((item) => item.id === selected);
    if (active.length)
      setSelected(active[(index + delta + active.length) % active.length].id);
  };
  const title =
    page === "trash"
      ? "Thùng rác"
      : page === "favorites"
        ? "Những điều mình thích."
        : "Tất cả khoảnh khắc.";
  return (
    <div className="app-shell">
      <aside className="nav-rail">
        <button
          className="brand"
          title="Locket x HPB"
          onClick={() => navigate("camera")}
        >
          <img src="./icon.png" alt="" />
          <span>HPB</span>
        </button>
        <nav>
          {(
            [
              { id: "camera", icon: Camera, label: "Chụp & quay" },
              { id: "gallery", icon: Images, label: "Tất cả ảnh & video" },
              { id: "favorites", icon: Star, label: "Yêu thích" },
            ] as const
          ).map((link) => (
            <button
              key={link.id}
              className={`nav-button ${page === link.id ? "active" : ""}`}
              title={link.label}
              aria-label={link.label}
              onClick={() => navigate(link.id)}
            >
              <link.icon size={24} />
              {link.id === "favorites" && favorites.length > 0 && (
                <span className="nav-dot" />
              )}
            </button>
          ))}
        </nav>
        <div className="nav-bottom">
          <button
            className={`nav-button ${page === "trash" ? "active" : ""}`}
            aria-label="Thùng rác"
            title="Thùng rác"
            onClick={() => navigate("trash")}
          >
            <Trash2 size={23} />
          </button>
          <div className="nav-divider" />
          <button
            className={`nav-button ${page === "updates" ? "active" : ""}`}
            aria-label="Cập nhật"
            title="Cập nhật ứng dụng"
            onClick={() => navigate("updates")}
          >
            <RefreshCw size={22} />
            <small>Cập nhật</small>
          </button>
          <button
            className={`nav-button ${page === "settings" ? "active" : ""}`}
            aria-label="Cài đặt"
            title="Cài đặt"
            onClick={() => navigate("settings")}
          >
            <SettingsIcon size={24} />
          </button>
        </div>
      </aside>
      <main className="workspace">
        {!data.desktop && (
          <div className="preview-banner">
            Bản xem giao diện · Hãy chạy npm run dev để mở app desktop đầy đủ.
          </div>
        )}
        {!loaded ? (
          <div className="loading">
            <Cloud className="spin" size={40} />
            <p>Đang mở góc nhỏ của bạn…</p>
          </div>
        ) : page === "camera" ? (
          <Capture
            settings={data.settings}
            recent={active}
            notify={notify}
            onSettings={settings}
            initialDraft={initialDraft}
            onConsumed={() => setInitialDraft(null)}
            onSelect={(id) => {
              setPage("gallery");
              setSelected(id);
            }}
            onSaved={(id) => {
              void refresh();
              setPage("gallery");
              setSelected(id);
              notify("Đã lưu khoảnh khắc trên máy.");
            }}
          />
        ) : page === "settings" ? (
          <section className="page settings-page">
            <header className="page-header">
              <div>
                <p className="eyebrow">THEO CÁCH CỦA BẠN</p>
                <h1>Cài đặt</h1>
                <p className="subtitle">Một góc nhỏ, vừa vặn với bạn.</p>
              </div>
            </header>
            <div className="settings-grid">
              <div className="settings-card palette-card">
                <h3>
                  <Palette size={19} />
                  Màu nền neon
                </h3>
                <div
                  className="palette-options"
                  role="group"
                  aria-label="Màu nền neon"
                >
                  {palettes.map((option) => (
                    <button
                      key={option.id}
                      className={`palette-choice ${data.settings.palette === option.id ? "selected" : ""}`}
                      aria-label={`Neon ${option.label}`}
                      aria-pressed={data.settings.palette === option.id}
                      onClick={() => settings({ palette: option.id })}
                      style={
                        {
                          "--swatch": option.accent,
                          "--swatch-rgb": option.rgb,
                          "--swatch-base": option.base,
                        } as CSSProperties
                      }
                    >
                      <span className="palette-preview">
                        <Camera size={22} />
                        {data.settings.palette === option.id && (
                          <Check size={14} className="palette-check" />
                        )}
                      </span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-card">
                <h3>
                  <Monitor size={19} />
                  Giao diện
                </h3>
                <div className="theme-options">
                  {(
                    [
                      { id: "light", label: "Sáng", Icon: Sun },
                      { id: "dark", label: "Tối", Icon: Moon },
                      { id: "system", label: "Theo hệ thống", Icon: Monitor },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.id}
                      aria-pressed={data.settings.theme === option.id}
                      className={`theme-choice ${option.id} ${data.settings.theme === option.id ? "selected" : ""}`}
                      onClick={() => settings({ theme: option.id })}
                    >
                      <div className="theme-mini">
                        <i />
                        <div>
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                      <span>
                        <option.Icon size={15} />
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-card">
                <h3>
                  <FolderOpen size={19} />
                  Ảnh & lưu trữ
                </h3>
                <p>
                  Ảnh và video được lưu trên laptop của bạn, trong thư viện
                  riêng của ứng dụng.
                </p>
                <button
                  className="btn secondary"
                  onClick={() => run(() => invoke("storage:open"))}
                >
                  <FolderOpen size={17} />
                  Mở thư mục thư viện
                </button>
                <p className="quiet-note">
                  {active.length} khoảnh khắc · {trashed.length} trong thùng rác
                </p>
              </div>
              <div className="settings-card">
                <h3>
                  <Timer size={19} />
                  Máy ảnh
                </h3>
                <p>Hẹn giờ chụp và quay</p>
                <div className="segmented">
                  {([0, 3, 5] as const).map((value) => (
                    <button
                      key={value}
                      className={data.settings.timer === value ? "active" : ""}
                      onClick={() => settings({ timer: value })}
                    >
                      {value ? `${value} giây` : "Tắt"}
                    </button>
                  ))}
                </div>
                <label className="switch-row">
                  <span>
                    <FlipHorizontal2 size={18} />
                    Lật gương webcam
                  </span>
                  <input
                    role="switch"
                    type="checkbox"
                    checked={data.settings.mirror}
                    onChange={(e) => settings({ mirror: e.target.checked })}
                  />
                </label>
              </div>
              <div className="settings-card">
                <h3>
                  <Pin size={19} />
                  Cửa sổ ảnh nhỏ
                </h3>
                <p>Giữ một khoảnh khắc bên cạnh khi bạn làm việc.</p>
                <label className="switch-row">
                  Luôn ở trên cùng
                  <input
                    role="switch"
                    type="checkbox"
                    checked={data.settings.alwaysOnTop}
                    onChange={(e) =>
                      settings({ alwaysOnTop: e.target.checked })
                    }
                  />
                </label>
                <button
                  className="btn secondary"
                  disabled={!active.length}
                  onClick={() => run(() => invoke("widget:show"))}
                >
                  <Pin size={17} />
                  Mở ảnh ghim
                </button>
              </div>
              <div className="settings-card about-card">
                <div className="about-logo">
                  <Cloud size={35} />
                </div>
                <div>
                  <h3>
                    Locket x HPB{" "}
                    <span className="version-badge">v{data.version}</span>
                  </h3>
                  <p>Nhật ký ảnh & video cá nhân · Lưu trên máy của bạn.</p>
                  <button
                    className="text-button"
                    onClick={() => navigate("updates")}
                  >
                    Kiểm tra cập nhật <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : page === "updates" ? (
          <Updates version={data.version} notify={notify} />
        ) : selectedItem ? (
          <Review
            key={selectedItem.id}
            item={selectedItem}
            notify={notify}
            onBack={() => setSelected(null)}
            onStep={step}
            onSave={async (caption: string, style: TextStyle) => {
              await invoke("media:update", {
                id: selectedItem.id,
                patch: { caption, style },
              });
              await refresh();
              notify("Đã lưu ghi chú và trang trí.");
            }}
            onFavorite={() => void favorite(selectedItem)}
            onTrash={() => void trash([selectedItem.id])}
          />
        ) : (
          <section className="page gallery-page">
            <header className="page-header">
              <div>
                <p className="eyebrow">
                  {page === "trash" ? "CÓ THỂ KHÔI PHỤC" : "MỖI NGÀY MỘT CHÚT"}
                </p>
                <h1>{title}</h1>
                <p className="subtitle">
                  {page === "trash"
                    ? `${trashed.length} khoảnh khắc đã chuyển vào thùng rác`
                    : `${page === "favorites" ? favorites.length : active.length} khoảnh khắc đã lưu`}
                </p>
              </div>
              <div className="header-actions">
                {page !== "trash" && (
                  <>
                    <button className="btn secondary" onClick={importPhoto}>
                      <ImagePlus size={18} />
                      Chọn ảnh
                    </button>
                    <button
                      className="btn primary"
                      onClick={() => navigate("camera")}
                    >
                      <Camera size={18} />
                      Chụp ảnh
                    </button>
                  </>
                )}
                <button
                  className={`btn ${selecting ? "primary" : "secondary"}`}
                  onClick={() => {
                    setSelecting(!selecting);
                    setSelection([]);
                  }}
                >
                  {selecting ? "Xong" : "Chọn"}
                </button>
              </div>
            </header>
            <div className="gallery-toolbar">
              <div className="filter-chips">
                {[
                  { id: "all", label: "Tất cả" },
                  { id: "image", label: "Ảnh" },
                  { id: "video", label: "Video" },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    className={kind === filter.id ? "selected" : ""}
                    onClick={() => setKind(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
                {page !== "trash" && (
                  <button
                    className={month ? "selected" : ""}
                    onClick={() => setMonth(!month)}
                  >
                    Tháng này
                  </button>
                )}
              </div>
              <label className="search-box">
                <Search size={18} />
                <input
                  aria-label="Tìm ghi chú"
                  placeholder="Tìm ghi chú…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    aria-label="Xóa tìm kiếm"
                    className="icon-btn"
                    onClick={() => setSearch("")}
                  >
                    <X size={15} />
                  </button>
                )}
              </label>
            </div>
            {filtered.length ? (
              <div
                className="photo-grid"
                style={{
                  gridTemplateColumns: `repeat(auto-fill,minmax(${data.settings.gridSize}px,1fr))`,
                }}
              >
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className={`photo-tile ${selection.includes(item.id) ? "selected" : ""}`}
                  >
                    <button
                      className="tile-open"
                      aria-label={`Mở ${item.caption || "khoảnh khắc"}`}
                      onClick={() => {
                        if (selecting || page === "trash") {
                          setSelecting(true);
                          setSelection((old) =>
                            old.includes(item.id)
                              ? old.filter((id) => id !== item.id)
                              : [...old, item.id],
                          );
                        } else setSelected(item.id);
                      }}
                    >
                      <MediaSurface
                        src={mediaURL(item.id)}
                        kind={item.kind}
                        style={item.style}
                        thumbnail
                      />
                      {item.kind === "video" && (
                        <>
                          <span className="video-mark">
                            <Video size={16} />
                          </span>
                          <span className="duration-badge">
                            {formatDuration(item.duration)}
                          </span>
                        </>
                      )}
                      {page === "trash" && (
                        <span className="deleted-label">
                          {new Date(item.deletedAt!).toLocaleDateString(
                            "vi-VN",
                          )}
                        </span>
                      )}
                    </button>
                    {selecting ? (
                      <button
                        className={`select-badge ${selection.includes(item.id) ? "checked" : ""}`}
                        aria-label="Chọn khoảnh khắc"
                        onClick={() =>
                          setSelection((old) =>
                            old.includes(item.id)
                              ? old.filter((id) => id !== item.id)
                              : [...old, item.id],
                          )
                        }
                      >
                        {selection.includes(item.id) && <Check size={15} />}
                      </button>
                    ) : (
                      page !== "trash" && (
                        <button
                          className={`favorite-badge ${item.favorite ? "on" : ""}`}
                          title="Yêu thích"
                          aria-label="Đánh dấu yêu thích"
                          onClick={() => void favorite(item)}
                        >
                          <Star
                            size={18}
                            fill={item.favorite ? "currentColor" : "none"}
                          />
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-orbit">
                  {page === "trash" ? (
                    <Trash2 size={42} />
                  ) : page === "favorites" ? (
                    <Heart size={42} />
                  ) : (
                    <Images size={44} />
                  )}
                </div>
                <h2>
                  {search || kind !== "all" || month
                    ? "Chưa tìm thấy khoảnh khắc."
                    : page === "trash"
                      ? "Thùng rác đang trống."
                      : page === "favorites"
                        ? "Giữ những điều bạn thích."
                        : "Khoảnh khắc đầu tiên, từ đây."}
                </h2>
                <p>
                  {page === "trash"
                    ? "Ảnh và video lỡ xóa sẽ ở đây để bạn khôi phục."
                    : page === "favorites"
                      ? "Bấm ngôi sao trên ảnh hoặc video để thêm vào đây."
                      : "Chụp bằng webcam hoặc chọn một tấm ảnh từ laptop."}
                </p>
                {page === "gallery" && !search && (
                  <button
                    className="btn primary"
                    onClick={() => navigate("camera")}
                  >
                    <Camera size={18} />
                    Ghi lại hôm nay
                  </button>
                )}
              </div>
            )}
            {selecting && selection.length > 0 && (
              <div className="selection-bar">
                <span>Đã chọn {selection.length} khoảnh khắc</span>
                <button
                  className="text-button"
                  onClick={() => setSelection(filtered.map((item) => item.id))}
                >
                  Chọn tất cả
                </button>
                {page === "trash" ? (
                  <>
                    <button
                      className="btn primary"
                      onClick={() =>
                        run(async () => {
                          await invoke("media:restore", { ids: selection });
                          setSelection([]);
                          await refresh();
                          notify("Đã khôi phục về thư viện.");
                        })
                      }
                    >
                      <RotateCcw size={17} />
                      Khôi phục
                    </button>
                    <button
                      className="btn danger-outline"
                      onClick={() =>
                        run(async () => {
                          if (
                            await invoke("media:delete", { ids: selection })
                          ) {
                            setSelection([]);
                            await refresh();
                            notify("Đã xóa vĩnh viễn.");
                          }
                        })
                      }
                    >
                      <Trash2 size={17} />
                      Xóa vĩnh viễn
                    </button>
                  </>
                ) : (
                  <button
                    className="btn danger-outline"
                    onClick={() => void trash(selection)}
                  >
                    <Trash2 size={17} />
                    Chuyển vào thùng rác
                  </button>
                )}
              </div>
            )}
            <footer className="gallery-footer">
              <span>
                <i className="status-dot" />
                Lưu trên máy
              </span>
              <label>
                Cỡ ảnh
                <input
                  aria-label="Cỡ ảnh"
                  type="range"
                  min="110"
                  max="320"
                  step="10"
                  value={data.settings.gridSize}
                  onChange={(e) =>
                    settings({ gridSize: Number(e.target.value) })
                  }
                />
              </label>
            </footer>
          </section>
        )}
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <button
            className="icon-btn"
            aria-label="Đóng thông báo"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
export default function App() {
  return new URLSearchParams(window.location.search).has("widget") ? (
    <Widget />
  ) : (
    <MainApp />
  );
}
