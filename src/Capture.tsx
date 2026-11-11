import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Video,
  ImagePlus,
  Mic,
  MicOff,
  Timer,
  RefreshCw,
  Square,
  Cloud,
  AlertCircle,
} from "lucide-react";
import fixWebmDuration from "fix-webm-duration";
import { Review } from "./Review";
import type { Draft, Item, Settings, TextStyle } from "./types";
import { invoke, mediaURL } from "./api";
import { MediaSurface } from "./MediaSurface";
export async function imageDraft(url: string): Promise<Draft> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const scale = Math.min(1, 2048 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(Error("Không đọc được ảnh.")),
      "image/jpeg",
      0.92,
    ),
  );
  return {
    kind: "image",
    url: URL.createObjectURL(blob),
    blob,
    width: canvas.width,
    height: canvas.height,
    duration: 0,
  };
}
export function Capture({
  settings,
  recent,
  onSaved,
  notify,
  onSettings,
  initialDraft,
  onConsumed,
  onSelect,
}: {
  settings: Settings;
  recent: Item[];
  onSaved: (id: string) => void;
  notify: (message: string) => void;
  onSettings: (patch: Partial<Settings>) => void;
  initialDraft: Draft | null;
  onConsumed: () => void;
  onSelect: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(initialDraft),
    [mode, setMode] = useState<"image" | "video">("image"),
    [mic, setMic] = useState(false),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false),
    [recording, setRecording] = useState(false),
    [processing, setProcessing] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [countdown, setCountdown] = useState(0),
    [device, setDevice] = useState(""),
    [devices, setDevices] = useState<MediaDeviceInfo[]>([]),
    [retry, setRetry] = useState(0);
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    recorder = useRef<MediaRecorder | null>(null),
    mounted = useRef(true),
    autoStop = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    ticker = useRef<ReturnType<typeof setInterval> | undefined>(undefined),
    raf = useRef(0),
    draftRef = useRef<Draft | null>(draft),
    cancelCountdown = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelCountdown.current = true;
      clearTimeout(autoStop.current);
      clearInterval(ticker.current);
      cancelAnimationFrame(raf.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      if (draftRef.current) URL.revokeObjectURL(draftRef.current.url);
    };
  }, []);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    if (initialDraft) {
      setDraft(initialDraft);
      onConsumed();
    }
  }, [initialDraft]);
  useEffect(() => {
    if (draft) return;
    let canceled = false;
    setReady(false);
    setError("");
    navigator.mediaDevices
      ?.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 960 },
          ...(device ? { deviceId: { exact: device } } : {}),
        },
        audio: mode === "video" && mic,
      })
      .then(async (media) => {
        if (canceled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = media;
        if (video.current) {
          video.current.srcObject = media;
          await video.current.play();
        }
        if (!canceled) {
          setReady(true);
          setDevices(
            (await navigator.mediaDevices.enumerateDevices()).filter(
              (d) => d.kind === "videoinput",
            ),
          );
        }
      })
      .catch((reason) => {
        if (canceled) return;
        const name = reason?.name;
        setError(
          name === "NotAllowedError"
            ? "Chưa được cấp quyền camera. Hãy cho phép webcam trong cài đặt quyền riêng tư của Windows rồi thử lại."
            : name === "NotFoundError"
              ? "Chưa tìm thấy webcam. Bạn vẫn có thể chọn ảnh từ laptop."
              : "Không mở được webcam. Hãy đóng ứng dụng khác đang dùng camera rồi thử lại.",
        );
      });
    if (!navigator.mediaDevices)
      setError(
        "Webcam chỉ hoạt động trong bản desktop hoặc môi trường trình duyệt an toàn.",
      );
    return () => {
      canceled = true;
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
    };
  }, [draft, device, mic, mode, retry]);
  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (reason) {
      notify((reason as Error).message);
    }
  };
  const takePhoto = async () => {
    if (!video.current || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.current.videoWidth;
    canvas.height = video.current.videoHeight;
    const ctx = canvas.getContext("2d")!;
    if (settings.mirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video.current, 0, 0);
    setDraft(await imageDraft(canvas.toDataURL("image/jpeg", 0.94)));
  };
  const stopRecording = () => {
    if (recorder.current?.state === "recording") {
      setProcessing(true);
      recorder.current.stop();
    }
    clearTimeout(autoStop.current);
    clearInterval(ticker.current);
    cancelAnimationFrame(raf.current);
  };
  const startRecording = () => {
    if (!video.current || !stream.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.current.videoWidth;
    canvas.height = video.current.videoHeight;
    const ctx = canvas.getContext("2d")!;
    const draw = () => {
      if (video.current) {
        ctx.save();
        if (settings.mirror) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video.current, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      raf.current = requestAnimationFrame(draw);
    };
    draw();
    const output = canvas.captureStream(30);
    for (const track of stream.current.getAudioTracks()) output.addTrack(track);
    const mime = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ].find((value) => MediaRecorder.isTypeSupported(value));
    if (!mime) {
      cancelAnimationFrame(raf.current);
      throw Error("Thiết bị chưa hỗ trợ quay WebM.");
    }
    const recordingStream = new MediaRecorder(output, {
      mimeType: mime,
      videoBitsPerSecond: 4_000_000,
    });
    recorder.current = recordingStream;
    const chunks: Blob[] = [];
    const start = performance.now();
    recordingStream.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recordingStream.onerror = () => {
      stopRecording();
      notify("Quay video bị gián đoạn. Hãy thử lại.");
    };
    recordingStream.onstop = async () => {
      clearTimeout(autoStop.current);
      clearInterval(ticker.current);
      cancelAnimationFrame(raf.current);
      output.getVideoTracks().forEach((track) => track.stop());
      const duration = Math.min(10, (performance.now() - start) / 1000);
      if (!mounted.current) return;
      try {
        const raw = new Blob(chunks, { type: "video/webm" });
        if (!raw.size) throw Error("Video trống. Hãy quay lại.");
        const blob = await fixWebmDuration(raw, duration * 1000, {
          logger: false,
        });
        if (mounted.current)
          setDraft({
            kind: "video",
            url: URL.createObjectURL(blob),
            blob,
            width: canvas.width,
            height: canvas.height,
            duration,
          });
      } catch (reason) {
        notify((reason as Error).message);
      } finally {
        if (mounted.current) {
          setRecording(false);
          setProcessing(false);
        }
      }
    };
    recordingStream.start(200);
    setRecording(true);
    setElapsed(0);
    ticker.current = setInterval(
      () => setElapsed(Math.min(10, (performance.now() - start) / 1000)),
      100,
    );
    autoStop.current = setTimeout(stopRecording, 10_000);
  };
  const capture = async () => {
    if (!ready || recording || processing || countdown) return;
    cancelCountdown.current = false;
    for (let n = settings.timer; n > 0; n--) {
      setCountdown(n);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (cancelCountdown.current || !mounted.current) return;
    }
    setCountdown(0);
    if (mode === "image") await takePhoto();
    else startRecording();
  };
  const importPhoto = () =>
    run(async () => {
      const url = await invoke<string | null>("media:import");
      if (url) setDraft(await imageDraft(url));
    });
  if (draft)
    return (
      <Review
        draft={draft}
        onBack={() => {
          URL.revokeObjectURL(draft.url);
          setDraft(null);
        }}
        onRetake={() => {
          URL.revokeObjectURL(draft.url);
          setDraft(null);
        }}
        notify={notify}
        onSave={async (caption: string, style: TextStyle) => {
          const item = await invoke<Item>("media:add", {
            kind: draft.kind,
            mime: draft.blob.type,
            width: draft.width,
            height: draft.height,
            duration: draft.duration,
            caption,
            style,
            bytes: new Uint8Array(await draft.blob.arrayBuffer()),
          });
          onSaved(item.id);
        }}
      />
    );
  return (
    <section className="page capture-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">GÓC NHỎ CỦA BẠN</p>
          <h1>Giữ lại một chút hôm nay.</h1>
          <p className="subtitle">
            Những điều bình thường, những khoảnh khắc đáng nhớ.
          </p>
        </div>
        <span className="date-label">
          {new Date().toLocaleDateString("vi-VN", {
            day: "numeric",
            month: "long",
          })}
        </span>
      </header>
      <div className="capture-layout">
        <div className="camera-column">
          <div className="segmented capture-mode">
            <button
              disabled={recording || processing || countdown > 0}
              className={mode === "image" ? "active" : ""}
              onClick={() => setMode("image")}
            >
              <Camera size={17} />
              Ảnh
            </button>
            <button
              disabled={recording || processing || countdown > 0}
              className={mode === "video" ? "active" : ""}
              onClick={() => setMode("video")}
            >
              <Video size={18} />
              Video 10s
            </button>
          </div>
          <div className="live-camera">
            <video
              ref={video}
              muted
              playsInline
              className={settings.mirror ? "mirrored" : ""}
            />
            {!ready && (
              <div className="camera-placeholder">
                <div className="camera-orbit">
                  <Camera size={44} />
                </div>
                <h2>{error ? "Camera chưa sẵn sàng" : "Đang mở webcam…"}</h2>
                <p>{error || "Một khoảnh khắc nhỏ, chỉ dành cho bạn."}</p>
                {error && (
                  <button
                    className="btn secondary"
                    onClick={() => setRetry((x) => x + 1)}
                  >
                    <RefreshCw size={16} />
                    Thử lại
                  </button>
                )}
              </div>
            )}
            {ready && (
              <div className="camera-top-controls">
                <label className="camera-device">
                  <Camera size={15} />
                  <select
                    aria-label="Chọn webcam"
                    value={device}
                    disabled={recording || countdown > 0}
                    onChange={(e) => setDevice(e.target.value)}
                  >
                    <option value="">Webcam mặc định</option>
                    {devices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || "Webcam"}
                      </option>
                    ))}
                  </select>
                </label>
                {mode === "video" && (
                  <button
                    className="camera-device"
                    disabled={recording || countdown > 0}
                    onClick={() => setMic(!mic)}
                  >
                    {mic ? <Mic size={16} /> : <MicOff size={16} />}{" "}
                    {mic ? "Bật mic" : "Tắt mic"}
                  </button>
                )}
              </div>
            )}
            {countdown > 0 && (
              <div className="countdown" role="status">
                {countdown}
              </div>
            )}
            {recording && (
              <>
                <div className="recording-badge">
                  <i />
                  ĐANG QUAY <strong>{elapsed.toFixed(1)} / 10s</strong>
                </div>
                <div className="recording-progress">
                  <span style={{ width: `${elapsed * 10}%` }} />
                </div>
              </>
            )}
          </div>
          <div className="shutter-row">
            <button
              className="btn secondary"
              disabled={recording || processing || countdown > 0}
              onClick={importPhoto}
            >
              <ImagePlus size={18} />
              Chọn ảnh
            </button>
            <button
              aria-label={
                recording
                  ? "Dừng quay"
                  : mode === "image"
                    ? "Chụp ảnh"
                    : "Bắt đầu quay"
              }
              className={`shutter ${mode === "video" ? "video-mode" : ""} ${recording ? "is-recording" : ""}`}
              disabled={((!ready || processing) && !recording) || countdown > 0}
              onClick={() => (recording ? stopRecording() : run(capture))}
            >
              {recording ? (
                <Square size={28} fill="currentColor" />
              ) : mode === "video" ? (
                <span className="record-circle" />
              ) : null}
            </button>
            <button
              className="btn ghost timer-button"
              disabled={recording || processing || countdown > 0}
              onClick={() =>
                onSettings({
                  timer:
                    settings.timer === 0 ? 3 : settings.timer === 3 ? 5 : 0,
                })
              }
            >
              <Timer size={22} />
              <span>{settings.timer ? `${settings.timer}s` : "Hẹn giờ"}</span>
            </button>
          </div>
          <p className="quiet-note">
            {processing
              ? "Đang xử lý video…"
              : countdown
                ? "Sẵn sàng nhé…"
                : mode === "video"
                  ? "Tự dừng ở giây thứ 10 · Có thể dừng sớm"
                  : "Chụp một lần, giữ lại thật lâu."}
          </p>
        </div>
        <aside className="recent-panel">
          <h3>
            Gần đây <span>{recent.length}</span>
          </h3>
          {recent.slice(0, 3).map((item) => (
            <button
              className="recent-item"
              key={item.id}
              onClick={() => onSelect(item.id)}
            >
              <MediaSurface
                src={mediaURL(item.id)}
                kind={item.kind}
                style={item.style}
                thumbnail
              />
              {item.kind === "video" && (
                <Video size={18} className="recent-video" />
              )}
            </button>
          ))}
          {!recent.length && (
            <div className="recent-empty">
              <Cloud size={30} />
              <p>Ảnh và video mới sẽ ở đây.</p>
            </div>
          )}
          <p className="local-caption">
            <span className="status-dot" />
            Lưu trên máy
          </p>
        </aside>
      </div>
    </section>
  );
}
