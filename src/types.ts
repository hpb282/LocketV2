import type { PaletteId } from "./palettes";

export type Frame =
  | "none"
  | "halloween"
  | "christmas"
  | "tet"
  | "birthday"
  | "polaroid";
export type TextStyle = {
  frame: Frame;
  thickness: number;
  decoration: number;
  font: "basic" | "hand" | "bold" | "neon";
  color: string;
  fontSize: number;
  background: boolean;
};
export type Item = {
  id: string;
  kind: "image" | "video";
  ext: string;
  mime: string;
  width: number;
  height: number;
  duration: number;
  caption: string;
  style: TextStyle;
  favorite: boolean;
  createdAt: number;
  deletedAt: number | null;
};
export type Settings = {
  theme: "light" | "dark" | "system";
  palette: PaletteId;
  timer: 0 | 3 | 5;
  gridSize: number;
  alwaysOnTop: boolean;
  mirror: boolean;
};
export type Snapshot = {
  items: Item[];
  settings: Settings;
  version: string;
  desktop: boolean;
  recovered?: boolean;
};
export type UpdateState = {
  status: string;
  version: string;
  latestVersion?: string;
  percent: number;
  message: string;
};
export type Draft = {
  kind: "image" | "video";
  url: string;
  blob: Blob;
  width: number;
  height: number;
  duration: number;
};
declare global {
  interface Window {
    hpb?: {
      invoke: (action: string, payload?: unknown) => Promise<any>;
      onChange: (callback: () => void) => () => void;
      onUpdate: (callback: (state: UpdateState) => void) => () => void;
    };
  }
}
export const defaultStyle: TextStyle = {
  frame: "none",
  thickness: 3,
  decoration: 70,
  font: "basic",
  color: "#ffffff",
  fontSize: 28,
  background: true,
};
export const defaultSettings: Settings = {
  theme: "system",
  palette: "yellow",
  timer: 0,
  gridSize: 180,
  alwaysOnTop: true,
  mirror: true,
};
