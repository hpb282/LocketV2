import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  RotateCcw,
  Save,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Sticker as StickerIcon,
  Trash2,
  X,
} from "lucide-react";
import type { Item, StudioWork, TextStyle } from "./types";
import { invoke, mediaURL } from "./api";
import { drawOverlay } from "./frames";
import { detectFaces, type Face } from "./face";
import {
  clamp,
  loadImage,
  placeSticker,
  renderStickerPhoto,
  stickerById,
  stickers,
  type Sticker,
  type StickerKind,
} from "./stickers";

const styles = [
  {
    id: "anime",
    label: "Anime",
    icon: "✦",
    note: "Nét vẽ mềm, màu trong trẻo",
  },
  { id: "chibi", label: "Chibi", icon: "♡", note: "Tỉ lệ nhỏ xinh, dễ thương" },
  {
    id: "comic",
    label: "Truyện tranh",
    icon: "▧",
    note: "Viền mực, màu nổi bật",
  },
  {
    id: "cartoon3d",
    label: "Hoạt hình 3D",
    icon: "◈",
    note: "Khối mềm và ánh sáng đẹp",
  },
];
type AIState = { configured: boolean; busy: boolean };
export default function PhotoStudio({
  item,
  caption,
  style,
  onClose,
  onCreated,
  onWorkChange,
  notify,
}: {
  item: Item;
  caption: string;
  style: TextStyle;
  onClose: () => void;
  onCreated: (id: string) => Promise<void>;
  onWorkChange?: (work: StudioWork) => void;
  notify: (message: string) => void;
}) {
  const original = mediaURL(item.id);
  const [photo, setPhoto] = useState({
    src: original,
    width: item.width,
    height: item.height,
  });
  const [layers, setLayers] = useState<Sticker[]>([]),
    [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"stickers" | "ai">("stickers");
  const [ai, setAI] = useState<AIState>({ configured: false, busy: false });
  const [key, setKey] = useState(""),
    [editingKey, setEditingKey] = useState(false),
    [savingKey, setSavingKey] = useState(false);
  const [styleId, setStyleId] = useState("anime"),
    [mode, setMode] = useState("balanced");
  const [generating, setGenerating] = useState(false),
    [detecting, setDetecting] = useState(false),
    [saving, setSaving] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false),
    [autoPlace, setAutoPlace] = useState(true),
    [status, setStatus] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const picture = useRef<HTMLDivElement>(null),
    decoration = useRef<HTMLCanvasElement>(null),
    alive = useRef(true),
    faceAbort = useRef<AbortController | null>(null);
  const faceCache = useRef<{ src: string; faces: Face[] } | null>(null),
    urls = useRef(new Set<string>());
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const layer = layers.find((value) => value.id === selected);
  const busy = generating || detecting || saving;
  useEffect(() => {
    alive.current = true;
    void invoke<AIState>("ai:state")
      .then((value) => {
        if (alive.current) setAI(value);
      })
      .catch((error) => notify(error.message));
    return () => {
      alive.current = false;
      faceAbort.current?.abort();
      void invoke("ai:cancel").catch(() => {});
      for (const url of urls.current) URL.revokeObjectURL(url);
    };
  }, []);
  useEffect(() => {
    onWorkChange?.({ dirty: hasChanges, requesting: generating, saving });
  }, [hasChanges, generating, saving, onWorkChange]);
  useEffect(
    () => () =>
      onWorkChange?.({ dirty: false, requesting: false, saving: false }),
    [onWorkChange],
  );
  useEffect(() => {
    const draw = () => {
      if (!picture.current || !decoration.current) return;
      const box = picture.current.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const canvas = decoration.current;
      canvas.width = Math.max(1, Math.round(box.width * ratio));
      canvas.height = Math.max(1, Math.round(box.height * ratio));
      const context = canvas.getContext("2d");
      if (context)
        drawOverlay(
          context,
          canvas.width,
          canvas.height,
          showOriginal ? item.style : style,
          showOriginal ? item.caption : caption,
        );
    };
    const observer = new ResizeObserver(draw);
    if (picture.current) observer.observe(picture.current);
    draw();
    return () => observer.disconnect();
  }, [showOriginal, item.style, item.caption, style, caption]);
  const patchLayer = (patch: Partial<Sticker>) => {
    setLayers((previous) =>
      previous.map((value) =>
        value.id === selected ? { ...value, ...patch } : value,
      ),
    );
    setHasChanges(true);
  };
  function close() {
    if (saving) return;
    if (
      (hasChanges || generating) &&
      !window.confirm(
        generating
          ? "Rời trình chỉnh sửa và dừng chờ AI? Yêu cầu đã gửi vẫn có thể được tính phí."
          : "Bản chỉnh chưa được lưu. Quay về ảnh gốc?",
      )
    )
      return;
    faceAbort.current?.abort();
    if (generating) void invoke("ai:cancel");
    onClose();
  }
  async function addSticker(kind: StickerKind) {
    if (busy) return;
    if (layers.length >= 20) {
      notify("Mỗi ảnh hỗ trợ tối đa 20 sticker.");
      return;
    }
    let faces: Face[] = [];
    const definition = stickerById(kind);
    if (autoPlace && definition.anchor !== "pet") {
      if (faceCache.current?.src === photo.src) faces = faceCache.current.faces;
      else {
        setDetecting(true);
        setStatus("Đang tìm vị trí khuôn mặt trên laptop…");
        const controller = new AbortController();
        faceAbort.current = controller;
        try {
          const image = await loadImage(photo.src);
          faces = await detectFaces(image, controller.signal);
          faceCache.current = { src: photo.src, faces };
        } catch (error) {
          if (alive.current) notify((error as Error).message);
        } finally {
          if (alive.current) {
            setDetecting(false);
            setStatus("");
          }
          faceAbort.current = null;
        }
      }
      if (!faces.length && alive.current)
        notify(
          "Chưa thấy khuôn mặt rõ. Bạn có thể kéo sticker đến vị trí mong muốn.",
        );
    }
    if (!alive.current) return;
    const value = {
      id: crypto.randomUUID(),
      ...placeSticker(kind, faces, photo.width, photo.height),
    };
    setLayers((previous) => [...previous, value]);
    setSelected(value.id);
    setShowOriginal(false);
    setHasChanges(true);
    setStatus(
      faces.length
        ? "Đã đặt sticker theo khuôn mặt. Bạn có thể kéo để chỉnh."
        : "",
    );
  }
  const pointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    value: Sticker,
  ) => {
    if (busy || showOriginal) return;
    event.preventDefault();
    const bounds = picture.current!.getBoundingClientRect();
    drag.current = {
      id: value.id,
      dx: (event.clientX - bounds.left) / bounds.width - value.x,
      dy: (event.clientY - bounds.top) / bounds.height - value.y,
    };
    setSelected(value.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    const bounds = picture.current!.getBoundingClientRect(),
      active = drag.current;
    const x = clamp(
        (event.clientX - bounds.left) / bounds.width - active.dx,
        0,
        1,
      ),
      y = clamp((event.clientY - bounds.top) / bounds.height - active.dy, 0, 1);
    setLayers((previous) =>
      previous.map((value) =>
        value.id === active.id ? { ...value, x, y } : value,
      ),
    );
    setHasChanges(true);
  };
  async function saveKey() {
    setSavingKey(true);
    try {
      setAI(await invoke("ai:key", key));
      setKey("");
      setEditingKey(false);
      notify("Đã thiết lập AI cho lần mở app này.");
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setSavingKey(false);
    }
  }
  async function generate() {
    if (busy || !ai.configured) return;
    setGenerating(true);
    setStatus("AI đang vẽ lại ảnh. Thời gian tùy ảnh và dịch vụ…");
    try {
      const result = await invoke<{
        bytes: Uint8Array;
        width: number;
        height: number;
      }>("ai:generate", { id: item.id, style: styleId, mode });
      if (!alive.current) return;
      const blob = new Blob([new Uint8Array(result.bytes)], {
        type: "image/png",
      });
      const url = URL.createObjectURL(blob);
      urls.current.add(url);
      await loadImage(url);
      if (!alive.current) {
        URL.revokeObjectURL(url);
        return;
      }
      setPhoto({ src: url, width: result.width, height: result.height });
      setLayers([]);
      setSelected(null);
      faceCache.current = null;
      setShowOriginal(false);
      setHasChanges(true);
      setStatus(
        "Ảnh AI đã sẵn sàng. Bạn có thể thêm sticker hoặc lưu bản mới.",
      );
    } catch (error) {
      if (alive.current) {
        notify((error as Error).message);
        setStatus("");
      }
    } finally {
      if (alive.current) setGenerating(false);
    }
  }
  async function save() {
    if (busy || !hasChanges) return;
    setSaving(true);
    try {
      const output = await renderStickerPhoto(photo.src, layers);
      const copy = await invoke<Item>("media:add", {
        kind: "image",
        mime: "image/png",
        width: output.width,
        height: output.height,
        duration: 0,
        caption,
        style,
        bytes: new Uint8Array(await output.blob.arrayBuffer()),
      });
      setHasChanges(false);
      await onCreated(copy.id);
    } catch (error) {
      if (alive.current) notify((error as Error).message);
    } finally {
      if (alive.current) setSaving(false);
    }
  }
  return (
    <section className="page studio-page">
      <header className="page-header studio-header">
        <div className="heading-line">
          <button
            className="icon-btn"
            aria-label="Đóng AI và Sticker"
            disabled={saving}
            onClick={close}
          >
            <ArrowLeft />
          </button>
          <div>
            <h1>AI & Sticker</h1>
            <p className="subtitle">
              Một phiên bản mới cho khoảnh khắc của bạn.
            </p>
          </div>
        </div>
        <button
          className="btn primary"
          disabled={busy || !hasChanges}
          onClick={() => void save()}
        >
          <Save size={17} />
          {saving ? "Đang lưu…" : "Lưu bản mới"}
        </button>
      </header>
      <div className="studio-layout">
        <div className="studio-main">
          <div className="studio-stage">
            <div
              className="neon-frame studio-photo-frame"
              style={
                {
                  "--photo-ratio": showOriginal
                    ? item.width / item.height
                    : photo.width / photo.height,
                } as CSSProperties
              }
            >
              <div className="studio-picture" ref={picture}>
                <img
                  className="studio-base"
                  src={showOriginal ? original : photo.src}
                  alt={showOriginal ? "Ảnh gốc" : "Ảnh đang chỉnh"}
                  draggable={false}
                />
                {!showOriginal &&
                  layers.map((value) => {
                    const definition = stickerById(value.kind);
                    return (
                      <button
                        key={value.id}
                        className={`studio-sticker ${value.id === selected ? "selected" : ""}`}
                        aria-label={`Sticker ${definition.name}`}
                        aria-pressed={value.id === selected}
                        style={{
                          left: `${value.x * 100}%`,
                          top: `${value.y * 100}%`,
                          width: `${value.width * 100}%`,
                          aspectRatio: definition.ratio,
                          transform: `translate(-50%,-50%) rotate(${value.rotation}deg)`,
                        }}
                        onPointerDown={(event) => pointerDown(event, value)}
                        onPointerMove={pointerMove}
                        onPointerUp={() => {
                          drag.current = null;
                        }}
                        onPointerCancel={() => {
                          drag.current = null;
                        }}
                        onClick={() => setSelected(value.id)}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Delete" ||
                            event.key === "Backspace"
                          ) {
                            event.preventDefault();
                            setLayers((old) =>
                              old.filter((sticker) => sticker.id !== value.id),
                            );
                            setSelected(null);
                            setHasChanges(true);
                          } else if (
                            [
                              "ArrowLeft",
                              "ArrowRight",
                              "ArrowUp",
                              "ArrowDown",
                            ].includes(event.key)
                          ) {
                            event.preventDefault();
                            const step = event.shiftKey ? 0.05 : 0.01;
                            patchLayer({
                              x: clamp(
                                value.x +
                                  (event.key === "ArrowRight"
                                    ? step
                                    : event.key === "ArrowLeft"
                                      ? -step
                                      : 0),
                                0,
                                1,
                              ),
                              y: clamp(
                                value.y +
                                  (event.key === "ArrowDown"
                                    ? step
                                    : event.key === "ArrowUp"
                                      ? -step
                                      : 0),
                                0,
                                1,
                              ),
                            });
                          }
                        }}
                      >
                        <img src={definition.src} alt="" draggable={false} />
                      </button>
                    );
                  })}
                <canvas
                  className="studio-decoration"
                  ref={decoration}
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
          <div className="studio-compare">
            <button
              className={`btn ${showOriginal ? "primary" : "secondary"}`}
              aria-pressed={showOriginal}
              disabled={busy}
              onClick={() => setShowOriginal((value) => !value)}
            >
              {showOriginal ? "Xem bản chỉnh" : "Xem ảnh gốc"}
            </button>
            <button
              className="btn ghost"
              disabled={busy || !hasChanges}
              onClick={() => {
                setPhoto({
                  src: original,
                  width: item.width,
                  height: item.height,
                });
                setLayers([]);
                setSelected(null);
                setHasChanges(false);
                setShowOriginal(false);
                faceCache.current = null;
                setStatus("");
              }}
            >
              <RotateCcw size={16} />
              Về ảnh gốc
            </button>
          </div>
          <p className="studio-privacy">
            <ShieldCheck size={15} />
            Ảnh gốc được giữ riêng trong thư viện.
          </p>
          {status && (
            <p className="studio-status" role="status">
              {busy && <LoaderCircle className="spin" size={16} />} {status}
            </p>
          )}
        </div>
        <aside className="studio-panel" aria-label="Công cụ AI và Sticker">
          <div className="segmented studio-tabs">
            <button
              className={tab === "stickers" ? "active" : ""}
              onClick={() => setTab("stickers")}
            >
              <StickerIcon size={16} />
              Sticker
            </button>
            <button
              className={tab === "ai" ? "active" : ""}
              onClick={() => setTab("ai")}
            >
              <Sparkles size={16} />
              Ảnh AI
            </button>
          </div>
          {tab === "stickers" ? (
            <>
              <label className="switch-row studio-autoface">
                <span>
                  <ScanFace size={17} />
                  Tự đặt theo khuôn mặt
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={autoPlace}
                  disabled={busy}
                  onChange={(event) => setAutoPlace(event.target.checked)}
                />
              </label>
              <p className="quiet-note studio-hint">
                Nhận diện ngay trên laptop. Kéo sticker để chỉnh vị trí.
              </p>
              <div className="studio-sticker-grid">
                {stickers.map((value) => (
                  <button
                    key={value.id}
                    disabled={busy}
                    aria-label={`Thêm ${value.name}`}
                    onClick={() => void addSticker(value.id)}
                  >
                    <img src={value.src} alt="" />
                    <span>{value.name}</span>
                  </button>
                ))}
              </div>
              {layer && (
                <div className="studio-layer-controls">
                  <h3>{stickerById(layer.kind).name}</h3>
                  <label className="range-label">
                    Kích thước <span>{Math.round(layer.width * 100)}%</span>
                    <input
                      aria-label="Kích thước sticker"
                      type="range"
                      min="8"
                      max="85"
                      value={Math.round(layer.width * 100)}
                      disabled={busy}
                      onChange={(event) =>
                        patchLayer({ width: Number(event.target.value) / 100 })
                      }
                    />
                  </label>
                  <label className="range-label">
                    Xoay <span>{Math.round(layer.rotation)}°</span>
                    <input
                      aria-label="Xoay sticker"
                      type="range"
                      min="-180"
                      max="180"
                      value={Math.round(layer.rotation)}
                      disabled={busy}
                      onChange={(event) =>
                        patchLayer({ rotation: Number(event.target.value) })
                      }
                    />
                  </label>
                  <div className="studio-layer-actions">
                    <button
                      className="btn secondary"
                      disabled={busy || layers.length >= 20}
                      onClick={() => {
                        const copy = {
                          ...layer,
                          id: crypto.randomUUID(),
                          x: clamp(layer.x + 0.04, 0, 1),
                          y: clamp(layer.y + 0.04, 0, 1),
                        };
                        setLayers((old) => [...old, copy]);
                        setSelected(copy.id);
                        setHasChanges(true);
                      }}
                    >
                      <Copy size={15} />
                      Nhân đôi
                    </button>
                    <button
                      className="btn danger-outline"
                      disabled={busy}
                      onClick={() => {
                        setLayers((old) =>
                          old.filter((value) => value.id !== selected),
                        );
                        setSelected(null);
                        setHasChanges(true);
                      }}
                    >
                      <Trash2 size={15} />
                      Xóa
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="studio-style-grid">
                {styles.map((value) => (
                  <button
                    key={value.id}
                    className={styleId === value.id ? "selected" : ""}
                    disabled={busy}
                    aria-pressed={styleId === value.id}
                    onClick={() => setStyleId(value.id)}
                  >
                    <span className="studio-style-symbol">{value.icon}</span>
                    <strong>{value.label}</strong>
                    <small>{value.note}</small>
                    {styleId === value.id && <Check size={14} />}
                  </button>
                ))}
              </div>
              <label className="studio-mode">
                Chất lượng
                <select
                  aria-label="Chế độ tạo ảnh AI"
                  value={mode}
                  disabled={busy}
                  onChange={(event) => setMode(event.target.value)}
                >
                  <option value="balanced">Đẹp & nhanh</option>
                  <option value="detail">Ưu tiên chi tiết</option>
                </select>
              </label>
              <div className="studio-api">
                <div className="studio-api-title">
                  <KeyRound size={16} />
                  <strong>
                    {ai.configured ? "API đã thiết lập" : "Thiết lập OpenAI"}
                  </strong>
                  {ai.configured && (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => setEditingKey((value) => !value)}
                    >
                      Đổi khóa
                    </button>
                  )}
                </div>
                {(!ai.configured || editingKey) && (
                  <>
                    <label className="studio-key">
                      API key của bạn
                      <input
                        type="password"
                        aria-label="API key OpenAI"
                        autoComplete="off"
                        spellCheck={false}
                        value={key}
                        disabled={busy || savingKey}
                        onChange={(event) => setKey(event.target.value)}
                        placeholder="sk-…"
                      />
                    </label>
                    <button
                      className="btn secondary"
                      disabled={!key.trim() || busy || savingKey}
                      onClick={() => void saveKey()}
                    >
                      {savingKey
                        ? "Đang thiết lập…"
                        : "Dùng khóa cho phiên này"}
                    </button>
                  </>
                )}
                <p>
                  Khóa chỉ giữ cho lần mở app này, không lưu vào thư viện hay
                  gửi lên GitHub.
                </p>
                <div className="studio-api-links">
                  <button
                    className="text-button"
                    onClick={() =>
                      void invoke("ai:keys").catch((error) =>
                        notify(error.message),
                      )
                    }
                  >
                    Lấy API key <ExternalLink size={12} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      void invoke("ai:pricing").catch((error) =>
                        notify(error.message),
                      )
                    }
                  >
                    Xem phí API <ExternalLink size={12} />
                  </button>
                  {ai.configured && (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        void invoke<AIState>("ai:forget")
                          .then((value) => {
                            setAI(value);
                            setKey("");
                          })
                          .catch((error) => notify(error.message))
                      }
                    >
                      Quên khóa
                    </button>
                  )}
                </div>
              </div>
              <p className="studio-network-note">
                Bấm tạo sẽ gửi ảnh gốc này đến OpenAI. API tính phí riêng theo
                tài khoản của bạn. Mỗi lần bấm tạo là một yêu cầu mới.
              </p>
              {generating ? (
                <button
                  className="btn secondary studio-generate"
                  onClick={() => void invoke("ai:cancel")}
                >
                  <X size={16} />
                  Dừng chờ
                </button>
              ) : (
                <button
                  className="btn primary studio-generate"
                  disabled={busy || !ai.configured}
                  onClick={() => void generate()}
                >
                  <Sparkles size={17} />
                  Tạo ảnh AI
                </button>
              )}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
