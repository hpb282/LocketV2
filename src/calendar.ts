import type { Item } from "./types";

const pad = (value: number) => String(value).padStart(2, "0");

export function localDayKey(value: Date | number): string {
  const date = value instanceof Date ? value : new Date(value);
  if (
    !Number.isFinite(date.getTime()) ||
    date.getFullYear() < 1 ||
    date.getFullYear() > 9999
  )
    return "";
  return `${String(date.getFullYear()).padStart(4, "0")}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `Tháng ${month}, ${year}`;
}

export function dayLabel(key: string): string {
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

export function monthCells(
  key: string,
): Array<{ day: number; key: string } | null> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) throw Error("Tháng không hợp lệ.");
  const [year, month] = key.split("-").map(Number);
  if (year < 1) throw Error("Năm không hợp lệ.");
  const first = new Date(0);
  first.setHours(12, 0, 0, 0);
  first.setFullYear(year, month - 1, 1);
  const last = new Date(first);
  last.setMonth(month, 0);
  const offset = (first.getDay() + 6) % 7; // Monday through Sunday.
  const count = last.getDate();
  return Array.from(
    { length: Math.ceil((offset + count) / 7) * 7 },
    (_, index) => {
      const day = index - offset + 1;
      return day > 0 && day <= count
        ? { day, key: `${key}-${pad(day)}` }
        : null;
    },
  );
}

export function groupMomentsByDay(items: Item[]): Map<string, Item[]> {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    if (item.deletedAt) continue;
    const key = localDayKey(item.createdAt);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  for (const group of groups.values())
    group.sort((a, b) => b.createdAt - a.createdAt);
  return groups;
}

export function memoryMonths(items: Item[], today = new Date()): string[] {
  const months = new Set([localDayKey(today).slice(0, 7)]);
  for (const key of groupMomentsByDay(items).keys())
    months.add(key.slice(0, 7));
  return [...months].filter(Boolean).sort().reverse();
}
