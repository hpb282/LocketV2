export const palettes = [
  {
    id: "yellow",
    label: "Vàng",
    accent: "#ffd45a",
    rgb: "255 212 90",
    base: "#242116",
  },
  {
    id: "blue",
    label: "Xanh dương",
    accent: "#8bbcff",
    rgb: "83 153 255",
    base: "#141e30",
  },
  {
    id: "green",
    label: "Xanh lá",
    accent: "#7be4ad",
    rgb: "68 222 147",
    base: "#14271f",
  },
  {
    id: "red",
    label: "Đỏ",
    accent: "#ff9299",
    rgb: "255 87 104",
    base: "#2b181e",
  },
  {
    id: "pink",
    label: "Hồng",
    accent: "#ffa0d7",
    rgb: "255 102 190",
    base: "#2b1929",
  },
  {
    id: "purple",
    label: "Tím",
    accent: "#bda6ff",
    rgb: "163 120 255",
    base: "#221a32",
  },
  {
    id: "cyan",
    label: "Cyan",
    accent: "#7ce4ee",
    rgb: "62 218 237",
    base: "#13292c",
  },
] as const;

export type PaletteId = (typeof palettes)[number]["id"];
