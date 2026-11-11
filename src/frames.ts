import type { TextStyle } from "./types";
export const frameNames = {
  none: "Không viền",
  halloween: "Halloween",
  christmas: "Giáng sinh",
  tet: "Tết",
  birthday: "Sinh nhật",
  polaroid: "Polaroid",
};
export const fontNames = {
  basic: "Cơ bản",
  hand: "Viết tay",
  bold: "Nổi bật",
  neon: "Neon",
};
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  style: TextStyle,
  caption = "",
  showCaption = true,
  bottomInset = 0,
) {
  ctx.save();
  const scale = w / 1000,
    unit = Math.min(w, h);
  const amount = style.decoration / 100;
  const line = Math.max(1, style.thickness * scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const flower = (x: number, y: number, r: number) => {
    ctx.fillStyle = "#ffce3d";
    for (let n = 0; n < 5; n++) {
      const a = (n * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.ellipse(
        x + Math.cos(a) * r * 0.6,
        y + Math.sin(a) * r * 0.6,
        r * 0.58,
        r * 0.38,
        a,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = "#d88516";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
  };
  const pine = (x: number, y: number, flip: number) => {
    ctx.strokeStyle = "#195b36";
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + flip * unit * 0.24, y + unit * 0.05);
    ctx.stroke();
    for (let n = 0; n < 10; n++) {
      const a = n / 10;
      ctx.beginPath();
      ctx.moveTo(x + flip * unit * 0.24 * a, y + unit * 0.05 * a);
      ctx.lineTo(
        x + flip * (unit * 0.24 * a + unit * 0.045),
        y + unit * 0.05 * a - unit * 0.028,
      );
      ctx.moveTo(x + flip * unit * 0.24 * a, y + unit * 0.05 * a);
      ctx.lineTo(
        x + flip * (unit * 0.24 * a + unit * 0.035),
        y + unit * 0.05 * a + unit * 0.04,
      );
      ctx.stroke();
    }
    ctx.fillStyle = "#df4040";
    for (let n = 0; n < 3; n++) {
      ctx.beginPath();
      ctx.arc(
        x + flip * (unit * 0.025 + n * unit * 0.018),
        y + unit * 0.02 * (n % 2),
        unit * 0.011,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  };
  if (style.frame !== "none") {
    ctx.strokeStyle =
      style.frame === "halloween"
        ? "#bd79ed"
        : style.frame === "christmas"
          ? "#397d4b"
          : style.frame === "polaroid"
            ? "#fff9e9"
            : "#ffd45a";
    ctx.lineWidth =
      style.frame === "polaroid" ? Math.max(12 * scale, line * 3) : line;
    ctx.strokeRect(
      ctx.lineWidth / 2,
      ctx.lineWidth / 2,
      w - ctx.lineWidth,
      h - ctx.lineWidth,
    );
  }
  if (style.frame === "tet" && amount > 0) {
    for (const flip of [1, -1]) {
      const x = flip === 1 ? unit * 0.03 : w - unit * 0.03;
      const y = unit * 0.035;
      ctx.strokeStyle = "#9b672c";
      ctx.lineWidth = 5 * scale;
      ctx.beginPath();
      ctx.moveTo(x, y + unit * 0.12);
      ctx.quadraticCurveTo(
        x + flip * unit * 0.06,
        y,
        x + flip * unit * 0.28,
        y + unit * 0.035,
      );
      ctx.stroke();
      for (let n = 0; n < Math.ceil(8 * amount); n++)
        flower(
          x + flip * unit * (0.025 + n * 0.034),
          y + unit * (n % 2 === 0 ? 0.035 : 0.065),
          unit * (0.016 + amount * 0.006),
        );
      ctx.save();
      ctx.translate(x + flip * unit * 0.025, h - unit * 0.065);
      ctx.rotate(flip * -0.2);
      ctx.fillStyle = "#d74732";
      ctx.fillRect(-unit * 0.02, -unit * 0.045, unit * 0.065, unit * 0.085);
      flower(unit * 0.012, -unit * 0.005, unit * 0.014);
      ctx.restore();
    }
  }
  if (style.frame === "christmas" && amount > 0) {
    pine(unit * 0.03, unit * 0.035, 1);
    pine(w - unit * 0.03, h - unit * 0.055, -1);
    ctx.fillStyle = "rgba(255,255,255,.85)";
    for (let n = 0; n < Math.ceil(amount * 25); n++) {
      const x = (Math.sin(n * 91.1) * 0.5 + 0.5) * w;
      const y = n % 2 ? unit * 0.03 : h - unit * 0.03;
      ctx.beginPath();
      ctx.arc(x, y, 2 * scale, 0, 7);
      ctx.fill();
    }
  }
  if (style.frame === "halloween" && amount > 0) {
    ctx.strokeStyle = "#d7b5ee";
    ctx.lineWidth = 1.5 * scale;
    for (let n = 1; n < 5; n++) {
      ctx.beginPath();
      ctx.moveTo(0, unit * n * 0.03);
      ctx.lineTo(unit * n * 0.03, 0);
      ctx.stroke();
    }
    for (let n = 0; n < 4; n++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        unit * 0.15 * Math.cos(n * 0.45),
        unit * 0.15 * Math.sin(n * 0.45),
      );
      ctx.stroke();
    }
    const x = w - unit * 0.07,
      y = h - unit * 0.065,
      r = unit * 0.045;
    ctx.fillStyle = "#f9a02e";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.8, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#33222e";
    for (const dx of [-0.3, 0.3]) {
      ctx.beginPath();
      ctx.moveTo(x + r * dx, y - r * 0.3);
      ctx.lineTo(x + r * dx - r * 0.14, y);
      ctx.lineTo(x + r * dx + r * 0.14, y);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y + r * 0.15, r * 0.4, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#627338";
    ctx.lineWidth = 5 * scale;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.8);
    ctx.lineTo(x + r * 0.1, y - r * 1.1);
    ctx.stroke();
  }
  if (style.frame === "birthday" && amount > 0) {
    const colors = ["#ffdc5f", "#ed9bbd", "#8dcfc0", "#a89be5"];
    for (let n = 0; n < Math.ceil(50 * amount); n++) {
      const x = (Math.sin(n * 51.8) * 0.5 + 0.5) * w;
      const y = n % 2 ? unit * 0.04 : h - unit * 0.04;
      ctx.fillStyle = colors[n % 4];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(n);
      ctx.fillRect(0, 0, unit * 0.012, unit * 0.006);
      ctx.restore();
    }
  }
  if (caption.trim() && showCaption) {
    let size = style.fontSize * scale;
    const family =
      style.font === "hand"
        ? '"Segoe Print", "Comic Sans MS", cursive'
        : '"Segoe UI", Arial, sans-serif';
    let lines: string[] = [];
    const wrap = () => {
      ctx.font = `${style.font === "bold" ? 700 : 500} ${size}px ${family}`;
      lines = [];
      let line = "";
      for (const word of caption.trim().split(/\s+/)) {
        if (ctx.measureText(line + word).width > w * 0.8 && line) {
          lines.push(line.trim());
          line = "";
        }
        if (ctx.measureText(word).width > w * 0.8) {
          for (const char of word) {
            if (ctx.measureText(line + char).width > w * 0.8) {
              lines.push(line);
              line = "";
            }
            line += char;
          }
          line += " ";
        } else line += word + " ";
      }
      if (line) lines.push(line.trim());
    };
    wrap();
    while (lines.length * size * 1.35 > h * 0.32 && size > 12 * scale) {
      size *= 0.9;
      wrap();
    }
    const padX = 24 * scale,
      padY = 13 * scale;
    const bw = Math.min(
      w * 0.9,
      Math.max(...lines.map((t) => ctx.measureText(t).width)) + padX * 2,
    );
    const bh = lines.length * size * 1.35 + padY * 2;
    const x = (w - bw) / 2,
      y = h - bh - unit * 0.045 - h * bottomInset;
    if (style.background) {
      ctx.fillStyle = "rgba(38,30,23,.67)";
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, Math.min(bh / 2, 28 * scale));
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.2)";
      ctx.lineWidth = scale;
      ctx.stroke();
    }
    ctx.fillStyle = style.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (style.font === "neon") {
      ctx.shadowColor = style.color;
      ctx.shadowBlur = 16 * scale;
    }
    if (style.font === "bold") {
      ctx.shadowColor = "rgba(0,0,0,.65)";
      ctx.shadowBlur = 5 * scale;
      ctx.shadowOffsetY = 2 * scale;
    }
    lines.forEach((text, n) =>
      ctx.fillText(text, w / 2, y + padY + size * 0.675 + n * size * 1.35),
    );
  }
  ctx.restore();
}
