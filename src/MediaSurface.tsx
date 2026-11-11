import { useEffect, useRef } from "react";
import { drawOverlay } from "./frames";
import type { TextStyle } from "./types";
export function MediaSurface({
  src,
  kind,
  style,
  caption = "",
  width = 4,
  height = 3,
  thumbnail = false,
  controls = false,
  autoPlay = false,
}: {
  src: string;
  kind: "image" | "video";
  style: TextStyle;
  caption?: string;
  width?: number;
  height?: number;
  thumbnail?: boolean;
  controls?: boolean;
  autoPlay?: boolean;
}) {
  const wrapper = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => {
      if (!canvas.current || !wrapper.current) return;
      const box = wrapper.current.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.current.width = Math.max(1, box.width * ratio);
      canvas.current.height = Math.max(1, box.height * ratio);
      const ctx = canvas.current.getContext("2d");
      if (ctx)
        drawOverlay(
          ctx,
          canvas.current.width,
          canvas.current.height,
          style,
          caption,
          !thumbnail,
          kind === "video" && controls ? 0.12 : 0,
        );
    };
    const observer = new ResizeObserver(draw);
    if (wrapper.current) observer.observe(wrapper.current);
    draw();
    return () => observer.disconnect();
  }, [style, caption, thumbnail, kind, controls]);
  return (
    <div
      ref={wrapper}
      className={`media-surface ${thumbnail ? "thumbnail" : ""}`}
      style={{ aspectRatio: thumbnail ? "1" : `${width}/${height}` }}
    >
      {kind === "image" ? (
        <img
          src={src}
          alt={caption || "Khoảnh khắc đã lưu"}
          draggable={false}
        />
      ) : (
        <video
          src={src}
          controls={controls}
          autoPlay={autoPlay}
          muted={autoPlay || thumbnail}
          loop={autoPlay}
          playsInline
          preload={thumbnail ? "metadata" : "auto"}
        />
      )}
      <canvas className="decoration" ref={canvas} aria-hidden="true" />
    </div>
  );
}
