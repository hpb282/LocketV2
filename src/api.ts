import { defaultSettings, defaultProfile, type Snapshot } from "./types";
export async function invoke<T = any>(
  action: string,
  payload?: unknown,
): Promise<T> {
  if (window.hpb) return window.hpb.invoke(action, payload);
  if (action === "snapshot")
    return {
      items: [],
      settings: defaultSettings,
      profile: defaultProfile,
      version: "0.3.0",
      desktop: false,
    } as T;
  throw Error("Hãy mở bản desktop Locket x HPB để dùng chức năng này.");
}
export const mediaURL = (id: string) => `media://item/${id}`;
export const snapshot = () => invoke<Snapshot>("snapshot");
export const formatDuration = (seconds: number) =>
  `00:${String(Math.min(10, Math.round(seconds))).padStart(2, "0")}`;
