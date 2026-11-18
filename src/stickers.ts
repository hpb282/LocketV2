import type { Face } from "./face";
const svg = (body: string, width = 200, height = 120) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`)}`;
export const stickers = [
  {
    id: "shades",
    name: "Kính mát",
    anchor: "eyes",
    ratio: 200 / 82,
    src: svg(
      '<defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#6ad5ed"/><stop offset="1" stop-color="#6750ae"/></linearGradient></defs><path d="M5 24 31 17M169 17l26 7" stroke="#171725" stroke-width="10" stroke-linecap="round"/><path d="M12 17Q42 6 78 17L74 60Q41 80 18 60ZM122 17Q156 6 188 17L182 60Q152 80 126 60Z" fill="url(#g)" stroke="#171725" stroke-width="10" stroke-linejoin="round"/><path d="M78 29Q100 14 122 29" stroke="#171725" stroke-width="9" fill="none"/><path d="m27 24 29-3m87 3 28-3" stroke="white" stroke-opacity=".65" stroke-width="4" stroke-linecap="round"/>',
      200,
      82,
    ),
  },
  {
    id: "round",
    name: "Kính tròn",
    anchor: "eyes",
    ratio: 200 / 90,
    src: svg(
      '<g fill="#fff" fill-opacity=".16" stroke="#a26221" stroke-width="8"><circle cx="46" cy="46" r="35"/><circle cx="154" cy="46" r="35"/></g><g fill="none" stroke="#ffdc73" stroke-width="4"><circle cx="46" cy="46" r="36"/><circle cx="154" cy="46" r="36"/><path d="M83 40q17-14 34 0M3 37l8-2m178 0 8 2"/></g><path d="m28 26 14-5m94 5 14-5" stroke="white" stroke-opacity=".75" stroke-width="4" stroke-linecap="round"/>',
      200,
      90,
    ),
  },
  {
    id: "cap",
    name: "Mũ lưỡi trai",
    anchor: "head",
    ratio: 200 / 125,
    src: svg(
      '<path d="M27 88V65C27 0 152 0 161 65l3 27" fill="#f2c34b" stroke="#734619" stroke-width="5"/><path d="M97 15q-15 30-8 70M30 73q66-18 131 0" fill="none" stroke="#d4972c" stroke-width="4"/><path d="M27 83q83-15 164 12c12 5-8 24-36 20L25 101Z" fill="#f9dc76" stroke="#734619" stroke-width="5" stroke-linejoin="round"/><path d="M107 43c-12-16-35 5 0 28 35-23 12-44 0-28Z" fill="#fff5ce"/><ellipse cx="95" cy="12" rx="12" ry="6" fill="#734619"/>',
      200,
      125,
    ),
  },
  {
    id: "crown",
    name: "Vương miện",
    anchor: "head",
    ratio: 200 / 130,
    src: svg(
      '<path d="m18 40 43 30 39-53 39 53 43-30-17 71H35Z" fill="#ffcf4d" stroke="#ab6a21" stroke-width="5" stroke-linejoin="round"/><path d="m35 104 129 0v14H35Z" fill="#f7b231"/><g fill="#fff2c2"><circle cx="18" cy="33" r="9"/><circle cx="100" cy="13" r="9"/><circle cx="182" cy="33" r="9"/></g><path d="m100 63 15 19-15 19-15-19Z" fill="#75dce5" stroke="#ad6a26" stroke-width="3"/><g fill="#ff8ab2"><circle cx="52" cy="88" r="7"/><circle cx="148" cy="88" r="7"/></g>',
      200,
      130,
    ),
  },
  {
    id: "ears",
    name: "Tai mèo",
    anchor: "head",
    ratio: 200 / 120,
    src: svg(
      '<path d="M19 105Q4 48 21 9q43 6 61 74M181 105q15-57-2-96-43 6-61 74" fill="#fff5e8" stroke="#80585c" stroke-width="5" stroke-linejoin="round"/><path d="M29 78q-8-29-2-47 22 10 34 43m110 4q8-29 2-47-22 10-34 43" fill="#f5a1b4"/><path d="M31 106Q100 57 169 106" fill="none" stroke="#f6d7df" stroke-width="13" stroke-linecap="round"/>',
      200,
      120,
    ),
  },
  {
    id: "cat",
    name: "Mèo nhỏ",
    anchor: "pet",
    ratio: 1,
    src: svg(
      '<path d="M31 86 24 19l58 32q19-6 37 0l58-32-6 67q19 23 12 55-8 47-83 47s-84-30-84-57q-1-27 15-45" fill="#ffd997" stroke="white" stroke-width="10" stroke-linejoin="round"/><path d="m39 65-1-23 25 16m74 0 25-16-1 23" fill="#f9a4ac"/><g fill="#624537"><ellipse cx="65" cy="111" rx="8" ry="12"/><ellipse cx="136" cy="111" rx="8" ry="12"/></g><path d="m92 131 8 7 8-7m-8 7v8q-11 13-19 0m19 0q11 13 19 0" fill="#dd7786" stroke="#624537" stroke-width="4" stroke-linecap="round"/><g stroke="#b98a54" stroke-width="4" stroke-linecap="round"><path d="m33 132 26 3m-22 13 22-5m82-8 26-3m-26 11 22 5M89 66l-5 15m27-15 5 15"/></g>',
      200,
      200,
    ),
  },
  {
    id: "dog",
    name: "Cún con",
    anchor: "pet",
    ratio: 1,
    src: svg(
      '<path d="M50 58Q100 16 150 58q43 23 32 77-8 51-82 51s-83-35-83-62q0-42 33-66" fill="#ffe4b5" stroke="white" stroke-width="10"/><path d="M57 49C-2 25 1 140 36 141q28 1 21-92m86 0c59-24 56 91 21 92q-28 1-21-92" fill="#c18b64" stroke="white" stroke-width="7"/><g fill="#624537"><ellipse cx="70" cy="104" rx="7" ry="10"/><ellipse cx="130" cy="104" rx="7" ry="10"/><path d="M84 126q16-8 32 0-3 21-16 21t-16-21"/></g><path d="M91 151v15q9 20 18 0v-15" fill="#f397a6" stroke="#624537" stroke-width="4"/><path d="M80 147q20 14 40 0" fill="none" stroke="#624537" stroke-width="4" stroke-linecap="round"/>',
      200,
      200,
    ),
  },
  {
    id: "stars",
    name: "Lấp lánh",
    anchor: "pet",
    ratio: 1,
    src: svg(
      '<path d="m100 9 22 61 63 22-63 22-22 61-22-61-63-22 63-22Z" fill="#ffe479" stroke="white" stroke-width="5" stroke-linejoin="round"/><path d="m163 130 8 23 23 8-23 8-8 23-8-23-23-8 23-8ZM36 7l7 19 19 7-19 7-7 19-7-19-19-7 19-7Z" fill="#fff2b8" stroke="white" stroke-width="3"/>',
      200,
      200,
    ),
  },
] as const;
export type StickerKind = (typeof stickers)[number]["id"];
export type Sticker = {
  id: string;
  kind: StickerKind;
  x: number;
  y: number;
  width: number;
  rotation: number;
};
export const stickerById = (id: StickerKind) =>
  stickers.find((sticker) => sticker.id === id)!;
export const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));
export function placeSticker(
  kind: StickerKind,
  faces: Face[],
  imageWidth: number,
  imageHeight: number,
): Omit<Sticker, "id"> {
  const definition = stickerById(kind);
  const fallback = {
    kind,
    x: definition.anchor === "pet" ? 0.79 : 0.5,
    y:
      definition.anchor === "eyes"
        ? 0.42
        : definition.anchor === "head"
          ? 0.22
          : 0.8,
    width: definition.anchor === "pet" ? 0.23 : 0.38,
    rotation: 0,
  };
  if (definition.anchor === "pet" || !faces.length) return fallback;
  const face = [...faces].sort((a, b) => {
    const span = (f: Face) =>
      (Math.max(...f.map((p) => p.x)) - Math.min(...f.map((p) => p.x))) *
      (Math.max(...f.map((p) => p.y)) - Math.min(...f.map((p) => p.y)));
    return span(b) - span(a);
  })[0];
  const left = face[33],
    right = face[263],
    top = face[10];
  if (!left || !right || !top) return fallback;
  const eyeWidth = Math.hypot(
    (right.x - left.x) * imageWidth,
    (right.y - left.y) * imageHeight,
  );
  const rotation =
    (Math.atan2(
      (right.y - left.y) * imageHeight,
      (right.x - left.x) * imageWidth,
    ) *
      180) /
    Math.PI;
  const cheekWidth =
    face[234] && face[454]
      ? Math.hypot(
          (face[454].x - face[234].x) * imageWidth,
          (face[454].y - face[234].y) * imageHeight,
        )
      : eyeWidth * 1.9;
  const width = clamp(
    (definition.anchor === "eyes" ? eyeWidth * 1.48 : cheekWidth * 1.22) /
      imageWidth,
    0.08,
    0.85,
  );
  return {
    kind,
    x: clamp(
      definition.anchor === "eyes" ? (left.x + right.x) / 2 : top.x,
      0,
      1,
    ),
    y: clamp(
      definition.anchor === "eyes"
        ? (left.y + right.y) / 2
        : top.y -
            (((width * imageWidth) / definition.ratio) * 0.22) / imageHeight,
      0,
      1,
    ),
    width,
    rotation,
  };
}
export async function loadImage(src: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = src;
  await image.decode();
  return image;
}
export async function renderStickerPhoto(src: string, layers: Sticker[]) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d")!;
  context.drawImage(image, 0, 0);
  for (const layer of layers) {
    const definition = stickerById(layer.kind);
    const stamp = await loadImage(definition.src);
    const width = layer.width * canvas.width,
      height = width / definition.ratio;
    context.save();
    context.translate(layer.x * canvas.width, layer.y * canvas.height);
    context.rotate((layer.rotation * Math.PI) / 180);
    context.drawImage(stamp, -width / 2, -height / 2, width, height);
    context.restore();
  }
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(Error("Chưa xuất được ảnh sticker.")),
      "image/png",
    ),
  );
  return { blob, width: canvas.width, height: canvas.height };
}
