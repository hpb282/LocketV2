import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../", import.meta.url);
const output = new URL("public/vision/", root);
await mkdir(output, { recursive: true });
const model = new URL("build/vision/face_landmarker.task", root);
const digest = createHash("sha256")
  .update(await readFile(model))
  .digest("hex");
if (
  digest !== "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff"
)
  throw Error("Face model checksum mismatch");
await copyFile(model, new URL("face_landmarker.task", output));
await copyFile(
  new URL("build/vision/LICENSE.txt", root),
  new URL("LICENSE.txt", output),
);
for (const name of [
  "vision_wasm_module_internal.js",
  "vision_wasm_module_internal.wasm",
])
  await copyFile(
    new URL(`node_modules/@mediapipe/tasks-vision/wasm/${name}`, root),
    new URL(name, output),
  );
await writeFile(
  new URL("NOTICE.txt", output),
  "MediaPipe Tasks Vision 1.2.3 — Google, Apache License 2.0.\nFace Landmarker model v1: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task\nhttps://github.com/google-ai-edge/mediapipe/blob/master/LICENSE\n",
);
