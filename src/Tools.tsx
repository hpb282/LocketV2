import { ChevronRight, Check, Type, Frame } from "lucide-react";
import { frameNames, fontNames } from "./frames";
import { MediaSurface } from "./MediaSurface";
import type { TextStyle } from "./types";
import { useState } from "react";
export function Tools({
  style,
  onStyle,
  caption,
  onCaption,
  src,
  onClose,
}: {
  style: TextStyle;
  onStyle: (s: TextStyle) => void;
  caption: string;
  onCaption: (s: string) => void;
  src: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"frames" | "text">("frames");
  const patch = (value: Partial<TextStyle>) => onStyle({ ...style, ...value });
  return (
    <aside className="tools-panel">
      <div className="panel-heading">
        <h3>Trang trí khoảnh khắc</h3>
        <button className="icon-btn" title="Thu gọn công cụ" onClick={onClose}>
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="segmented">
        <button
          className={tab === "frames" ? "active" : ""}
          onClick={() => setTab("frames")}
        >
          <Frame size={16} />
          Khung viền
        </button>
        <button
          className={tab === "text" ? "active" : ""}
          onClick={() => setTab("text")}
        >
          <Type size={16} />
          Chữ
        </button>
      </div>
      {tab === "frames" ? (
        <>
          <div className="frame-grid">
            {Object.entries(frameNames).map(([id, name]) => (
              <button
                key={id}
                aria-label={name}
                className={`frame-choice ${style.frame === id ? "selected" : ""}`}
                onClick={() => patch({ frame: id as TextStyle["frame"] })}
              >
                <MediaSurface
                  src={src}
                  kind="image"
                  style={{ ...style, frame: id as TextStyle["frame"] }}
                  thumbnail
                />
                {style.frame === id && (
                  <Check className="choice-check" size={18} />
                )}
                <span>{name}</span>
              </button>
            ))}
          </div>
          <label className="range-label">
            Độ dày viền <span>{style.thickness}</span>
            <input
              aria-label="Độ dày viền"
              type="range"
              min="0"
              max="12"
              value={style.thickness}
              onChange={(e) => patch({ thickness: Number(e.target.value) })}
            />
          </label>
          <label className="range-label">
            Mức trang trí <span>{style.decoration}%</span>
            <input
              aria-label="Mức trang trí"
              type="range"
              min="0"
              max="100"
              value={style.decoration}
              onChange={(e) => patch({ decoration: Number(e.target.value) })}
            />
          </label>
        </>
      ) : (
        <>
          <label className="field-label">
            Ghi chú
            <textarea
              maxLength={240}
              placeholder="Thêm một chút cảm xúc…"
              value={caption}
              onChange={(e) => onCaption(e.target.value)}
            />
            <small>{caption.length} / 240</small>
          </label>
          <div className="font-grid">
            {Object.entries(fontNames).map(([id, name]) => (
              <button
                key={id}
                className={`font-choice font-${id} ${style.font === id ? "selected" : ""}`}
                onClick={() => patch({ font: id as TextStyle["font"] })}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="colors" aria-label="Màu chữ">
            {["#ffffff", "#ffd45a", "#f697bd", "#9de0c5", "#272b25"].map(
              (color) => (
                <button
                  key={color}
                  aria-label={`Chữ màu ${color}`}
                  title={color}
                  style={{ background: color }}
                  className={style.color === color ? "selected" : ""}
                  onClick={() => patch({ color })}
                />
              ),
            )}
            <label title="Chọn màu khác">
              <input
                aria-label="Chọn màu chữ khác"
                type="color"
                value={style.color}
                onChange={(e) => patch({ color: e.target.value })}
              />
            </label>
          </div>
          <label className="range-label">
            Cỡ chữ <span>{style.fontSize}</span>
            <input
              aria-label="Cỡ chữ"
              type="range"
              min="16"
              max="64"
              value={style.fontSize}
              onChange={(e) => patch({ fontSize: Number(e.target.value) })}
            />
          </label>
          <label className="switch-row">
            Nền ghi chú
            <input
              type="checkbox"
              role="switch"
              checked={style.background}
              onChange={(e) => patch({ background: e.target.checked })}
            />
          </label>
        </>
      )}
    </aside>
  );
}
