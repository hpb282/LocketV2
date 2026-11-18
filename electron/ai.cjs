const ENDPOINT = "https://api.openai.com/v1/images/edits";
const STYLES = Object.freeze({
  anime:
    "a polished hand-drawn anime illustration, expressive natural eyes, delicate ink lines and beautiful cel shading",
  chibi:
    "a delightful chibi cartoon illustration, cute rounded proportions and expressive faces, with a coherent illustrated background",
  comic:
    "a premium comic-book illustration with confident ink outlines, rich flat colors and subtle halftone shading",
  cartoon3d:
    "a charming high-quality 3D animated-film illustration, soft materials, appealing shapes and cinematic lighting",
});
const MODES = Object.freeze({
  balanced: { model: "gpt-image-2.5-flare", quality: "high" },
  detail: { model: "gpt-image-2.5-sunburst", quality: "high" },
});
const MAX_INPUT = 12 * 1024 * 1024;
const MAX_OUTPUT = 16 * 1024 * 1024;

async function boundedJSON(response) {
  const reader = response.body?.getReader();
  if (!reader) throw Error("Dịch vụ AI trả về dữ liệu trống.");
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 24 * 1024 * 1024) {
        await reader.cancel();
        throw Error("Ảnh AI trả về vượt giới hạn dung lượng.");
      }
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof SyntaxError)
      throw Error("Dịch vụ AI trả về dữ liệu không hợp lệ.");
    throw error;
  } finally {
    reader.releaseLock();
  }
}

function createAIService({
  request = globalThis.fetch,
  timeout = 180_000,
} = {}) {
  let key = "";
  let active = null;
  const state = () => ({ configured: Boolean(key), busy: Boolean(active) });
  function setKey(value) {
    if (active) throw Error("Hãy dừng yêu cầu AI hiện tại trước khi đổi khóa.");
    if (
      typeof value !== "string" ||
      !/^sk-[a-zA-Z0-9_-]{16,512}$/.test(value.trim())
    )
      throw Error("API key OpenAI không hợp lệ. Hãy nhập khóa riêng của bạn.");
    key = value.trim();
    return state();
  }
  function cancel() {
    if (active) {
      active.cancelled = true;
      active.controller.abort();
    }
    return true;
  }
  function clearKey() {
    cancel();
    key = "";
    return state();
  }
  async function generate({ bytes, mime, style, mode = "balanced" }) {
    if (!key) throw Error("Hãy thiết lập API key OpenAI trước khi tạo ảnh.");
    if (active)
      throw Error("Đang có một ảnh AI được tạo. Hãy chờ hoặc dừng yêu cầu đó.");
    if (
      !Object.hasOwn(STYLES, style ?? "") ||
      !Object.hasOwn(MODES, mode ?? "")
    )
      throw Error("Phong cách hoặc chế độ AI không hợp lệ.");
    if (
      !Buffer.isBuffer(bytes) ||
      !bytes.length ||
      bytes.length > MAX_INPUT ||
      !["image/png", "image/jpeg", "image/webp"].includes(mime)
    )
      throw Error("Hãy dùng ảnh PNG, JPEG hoặc WebP không quá 12 MB.");
    const current = {
      controller: new AbortController(),
      cancelled: false,
      expired: false,
    };
    active = current;
    const timer = setTimeout(() => {
      current.expired = true;
      current.controller.abort();
    }, timeout);
    try {
      const response = await request(ENDPOINT, {
        method: "POST",
        redirect: "error",
        signal: current.controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          ...MODES[mode],
          images: [
            { image_url: `data:${mime};base64,${bytes.toString("base64")}` },
          ],
          prompt: `Transform the supplied photograph into ${STYLES[style]}. Preserve the identity and recognizable facial features of every person, their skin tones, clothing, pose, relationships, camera framing and the original scene. Stylize the whole scene consistently. Keep it wholesome and age appropriate. Do not add or remove people, invent accessories, change clothing, add text, logos, borders or watermarks. Return one finished image.`,
          n: 1,
          size: "auto",
          output_format: "png",
        }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 401)
          throw Error(
            "API key chưa đúng hoặc đã hết hiệu lực. Hãy thiết lập lại khóa.",
          );
        if (response.status === 403 || response.status === 404)
          throw Error(
            "Tài khoản API chưa có quyền dùng mô hình này. Kiểm tra quyền truy cập tại OpenAI.",
          );
        if (response.status === 429)
          throw Error(
            "API đang bị giới hạn lượt dùng hoặc hết số dư. Hãy kiểm tra tài khoản OpenAI.",
          );
        if (response.status === 400)
          throw Error(
            "Dịch vụ AI chưa xử lý được ảnh này. Kiểm tra ảnh, quyền mô hình hoặc thử phong cách khác.",
          );
        throw Error(
          "Dịch vụ AI đang gặp lỗi. Hãy thử lại sau; app không tự gửi lại yêu cầu tính phí.",
        );
      }
      const body = await boundedJSON(response);
      const encoded = body?.data?.[0]?.b64_json;
      if (
        typeof encoded !== "string" ||
        encoded.length > Math.ceil((MAX_OUTPUT * 4) / 3) + 4 ||
        !/^[a-zA-Z0-9+/=\r\n]+$/.test(encoded)
      )
        throw Error("Dịch vụ AI chưa trả về ảnh hợp lệ.");
      const result = Buffer.from(encoded, "base64");
      if (
        result.length < 33 ||
        result.length > MAX_OUTPUT ||
        result.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
        result.subarray(12, 16).toString() !== "IHDR"
      )
        throw Error("Ảnh AI trả về không phải PNG hợp lệ hoặc quá lớn.");
      const width = result.readUInt32BE(16),
        height = result.readUInt32BE(20);
      if (!width || !height || width * height > 24_000_000)
        throw Error("Ảnh AI vượt quá kích thước hỗ trợ.");
      return result;
    } catch (error) {
      if (current.cancelled)
        throw Error(
          "Đã dừng chờ tạo ảnh. Yêu cầu đã gửi vẫn có thể được dịch vụ tính phí.",
        );
      if (current.expired)
        throw Error(
          "Chờ AI quá lâu. Yêu cầu có thể vẫn đang xử lý; app không tự gửi lại để tránh tính phí hai lần.",
        );
      // Never expose provider responses, request headers or transport exceptions containing a key.
      if (error.message?.includes(key) && key)
        throw Error(
          "Chưa kết nối được dịch vụ AI. Kiểm tra Internet và tài khoản API.",
        );
      if (
        /^(Hãy |API |Tài khoản |Dịch vụ AI |Ảnh AI )/.test(error.message ?? "")
      )
        throw error;
      throw Error(
        "Chưa kết nối được dịch vụ AI. Kiểm tra Internet và tài khoản API; app không tự gửi lại yêu cầu.",
      );
    } finally {
      clearTimeout(timer);
      if (active === current) active = null;
    }
  }
  return { state, setKey, clearKey, generate, cancel };
}
module.exports = { createAIService, STYLES, MODES, MAX_INPUT };
