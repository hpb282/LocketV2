import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  SlidersHorizontal,
  RotateCcw,
  Save,
  Star,
  Pin,
  Download,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Draft, Item, TextStyle } from "./types";
import { defaultStyle } from "./types";
import { MediaSurface } from "./MediaSurface";
import { Tools } from "./Tools";
import { drawOverlay } from "./frames";
import { invoke, mediaURL } from "./api";
export function Review({
  item,
  draft,
  onSave,
  onBack,
  onRetake,
  onFavorite,
  onTrash,
  onStep,
  notify,
}: {
  item?: Item;
  draft?: Draft;
  onSave: (caption: string, style: TextStyle) => Promise<void>;
  onBack: () => void;
  onRetake?: () => void;
  onFavorite?: () => void;
  onTrash?: () => void;
  onStep?: (delta: number) => void;
  notify: (message: string) => void;
}) {
  const media = draft ?? item!;
  const src = draft?.url ?? mediaURL(item!.id);
  const [caption, setCaption] = useState(item?.caption ?? ""),
    [style, setStyle] = useState<TextStyle>(item?.style ?? { ...defaultStyle });
  const [tools, setTools] = useState(false),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false);
  const edit = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setCaption(item?.caption ?? "");
    setStyle(item?.style ?? { ...defaultStyle });
    setEditing(false);
  }, [item?.id, draft?.url]);
  const changed =
    !item ||
    caption !== item.caption ||
    JSON.stringify(style) !== JSON.stringify(item.style);
  const leave = (callback: () => void) => {
    if (
      changed &&
      (!item ? caption.length > 0 || style.frame !== "none" : true) &&
      !window.confirm("Bỏ các thay đổi chưa lưu?")
    )
      return;
    callback();
  };
  const action = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const exportMedia = async () => {
    if (media.kind === "video") {
      await invoke("media:export", { id: item!.id });
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = media.width;
    canvas.height = media.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawOverlay(ctx, canvas.width, canvas.height, style, caption);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value ? resolve(value) : reject(Error("Không xuất được ảnh.")),
        "image/png",
      ),
    );
    if (
      await invoke("media:export", {
        bytes: new Uint8Array(await blob.arrayBuffer()),
      })
    )
      notify("Đã xuất ảnh kèm ghi chú và khung viền.");
  };
  useEffect(() => {
    if (!onStep) return;
    const handler = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest("input,textarea")) return;
      if (event.key === "ArrowLeft") leave(() => onStep(-1));
      if (event.key === "ArrowRight") leave(() => onStep(1));
      if (event.key === "Escape") leave(onBack);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  return (
    <section className="page review-page">
      <header className="page-header">
        <div className="heading-line">
          <button
            className="icon-btn"
            title="Quay về"
            onClick={() => leave(onBack)}
          >
            <ArrowLeft />
          </button>
          <div>
            <p className="eyebrow">
              {draft ? "VỪA GHI LẠI" : "KHOẢNH KHẮC CỦA MÌNH"}
            </p>
            <h1>
              {draft
                ? draft.kind === "image"
                  ? "Khoảnh khắc vừa chụp"
                  : "Video vừa quay"
                : "Một chút của hôm nay."}
            </h1>
            {item && (
              <p className="subtitle">
                {new Date(item.createdAt).toLocaleString("vi-VN")}
              </p>
            )}
          </div>
        </div>
        <button
          className={`btn ${tools ? "primary" : "secondary"}`}
          onClick={() => setTools(!tools)}
        >
          <SlidersHorizontal size={18} />
          Công cụ
        </button>
      </header>
      <div className={`editor-layout ${tools ? "expanded" : ""}`}>
        <div className="editor-main">
          <div className="neon-frame review-frame">
            <div className="editable-photo">
              <MediaSurface
                src={src}
                kind={media.kind}
                width={media.width}
                height={media.height}
                style={style}
                caption={editing ? "" : caption}
                controls
              />
              {editing ? (
                <textarea
                  ref={edit}
                  autoFocus
                  className="inline-note"
                  style={media.kind === "video" ? { bottom: "18%" } : undefined}
                  aria-label="Ghi chú trên ảnh"
                  placeholder="Thêm một ghi chú…"
                  maxLength={240}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  onBlur={() => setEditing(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      setEditing(false);
                    }
                    if (e.key === "Escape") setEditing(false);
                  }}
                />
              ) : (
                <button
                  className={`note-hotspot ${caption ? "has-note" : ""}`}
                  style={
                    media.kind === "video"
                      ? { bottom: "16%", height: "18%" }
                      : undefined
                  }
                  aria-label="Sửa ghi chú trên ảnh"
                  onClick={() => setEditing(true)}
                >
                  {!caption && (
                    <>
                      <Pencil size={15} />
                      Thêm một ghi chú
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="review-actions">
            {onRetake && (
              <button
                className="btn secondary"
                disabled={busy}
                onClick={() => leave(onRetake)}
              >
                <RotateCcw size={18} />
                {media.kind === "video" ? "Quay lại" : "Chụp lại"}
              </button>
            )}
            {item && (
              <>
                <button
                  className={`btn ghost ${item.favorite ? "is-favorite" : ""}`}
                  onClick={onFavorite}
                >
                  <Star
                    size={18}
                    fill={item.favorite ? "currentColor" : "none"}
                  />
                  Yêu thích
                </button>
                <button
                  className="btn ghost"
                  onClick={() =>
                    action(() => invoke("widget:show", { id: item.id }))
                  }
                >
                  <Pin size={18} />
                  Ghim
                </button>
                <button
                  className="btn ghost"
                  onClick={() => action(exportMedia)}
                >
                  <Download size={18} />
                  {item.kind === "video" ? "Xuất video gốc" : "Xuất ảnh"}
                </button>
                <button
                  className="icon-btn danger"
                  title="Chuyển vào thùng rác"
                  onClick={onTrash}
                >
                  <Trash2 size={19} />
                </button>
              </>
            )}
            <button
              className="btn primary save-button"
              disabled={busy || (!changed && Boolean(item))}
              onClick={() => action(() => onSave(caption, style))}
            >
              <Save size={18} />
              {busy
                ? "Đang lưu…"
                : item
                  ? "Lưu thay đổi"
                  : media.kind === "video"
                    ? "Lưu video"
                    : "Lưu khoảnh khắc"}
            </button>
          </div>
          {onStep && (
            <div className="photo-pagination">
              <button
                className="icon-btn"
                aria-label="Ảnh trước"
                onClick={() => leave(() => onStep(-1))}
              >
                <ChevronLeft />
              </button>
              <span>← → để chuyển · Esc để quay lại</span>
              <button
                className="icon-btn"
                aria-label="Ảnh tiếp theo"
                onClick={() => leave(() => onStep(1))}
              >
                <ChevronRight />
              </button>
            </div>
          )}
          <p className="quiet-note">
            {item?.kind === "video"
              ? "Ghi chú và khung viền được giữ trong app. Xuất video gốc giữ tệp quay ban đầu."
              : "Bấm vào ghi chú để chỉnh sửa. Ảnh gốc luôn được giữ trong thư viện."}
          </p>
        </div>
        {tools && (
          <Tools
            style={style}
            onStyle={setStyle}
            caption={caption}
            onCaption={setCaption}
            src={media.kind === "image" ? src : "./icon.svg"}
            onClose={() => setTools(false)}
          />
        )}
      </div>
    </section>
  );
}
