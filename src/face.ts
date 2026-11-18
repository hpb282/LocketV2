export type Point = { x: number; y: number };
export type Face = Point[];
export function detectFaces(
  image: HTMLImageElement,
  signal?: AbortSignal,
): Promise<Face[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./face.worker.ts", import.meta.url), {
      type: "module",
    });
    let finished = false;
    const finish = (error?: Error, faces: Face[] = []) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      worker.terminate();
      error ? reject(error) : resolve(faces);
    };
    const abort = () => finish(new Error("Đã dừng nhận diện."));
    const timer = setTimeout(
      () =>
        finish(new Error("Nhận diện mất quá lâu. Hãy đặt sticker bằng tay.")),
      30_000,
    );
    worker.onmessage = (event) =>
      event.data.error
        ? finish(new Error(event.data.error))
        : finish(undefined, event.data.faces);
    worker.onerror = () =>
      finish(
        new Error(
          "Chưa mở được bộ nhận diện. Bạn vẫn có thể đặt sticker bằng tay.",
        ),
      );
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    const scale = Math.min(
      1,
      960 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    createImageBitmap(image, {
      resizeWidth: Math.max(1, Math.round(image.naturalWidth * scale)),
      resizeHeight: Math.max(1, Math.round(image.naturalHeight * scale)),
    })
      .then((bitmap) => {
        if (finished) {
          bitmap.close();
          return;
        }
        const assets = new URL("./vision", document.baseURI).href;
        worker.postMessage({ image: bitmap, assets }, [bitmap]);
      })
      .catch(() =>
        finish(new Error("Chưa đọc được ảnh để nhận diện khuôn mặt.")),
      );
  });
}
