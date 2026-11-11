const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const {
  monthCells,
  localDayKey,
  groupMomentsByDay,
  memoryMonths,
} = require("../src/calendar.ts");

test("calendar starts on Monday with correct month offsets and leap days", () => {
  const november = monthCells("2026-11");
  assert.equal(november.length, 42);
  assert.ok(november.slice(0, 6).every((value) => value === null));
  assert.deepEqual(november[6], { day: 1, key: "2026-11-01" });
  assert.equal(november.filter(Boolean).length, 30);
  assert.equal(monthCells("2024-02").filter(Boolean).length, 29);
  assert.equal(monthCells("2023-02").filter(Boolean).length, 28);
  assert.throws(() => monthCells("2026-13"));
});

test("moments are grouped by local day, sorted newest first and exclude trash", () => {
  const items = [
    {
      id: "a",
      createdAt: new Date(2026, 10, 11, 8).getTime(),
      deletedAt: null,
    },
    {
      id: "b",
      createdAt: new Date(2026, 10, 11, 20).getTime(),
      deletedAt: null,
    },
    {
      id: "c",
      createdAt: new Date(2026, 10, 12, 0, 5).getTime(),
      deletedAt: null,
    },
    {
      id: "deleted",
      createdAt: new Date(2026, 10, 11, 21).getTime(),
      deletedAt: 1,
    },
  ];
  const groups = groupMomentsByDay(items);
  assert.deepEqual(
    groups.get("2026-11-11").map((item) => item.id),
    ["b", "a"],
  );
  assert.deepEqual(
    groups.get("2026-11-12").map((item) => item.id),
    ["c"],
  );
  assert.deepEqual(
    items.map((item) => item.id),
    ["a", "b", "c", "deleted"],
  );
});

test("months include current month even when empty and retain older months in order", () => {
  const items = [
    { createdAt: new Date(2026, 8, 1).getTime(), deletedAt: null },
    { createdAt: new Date(2026, 9, 31).getTime(), deletedAt: null },
    { createdAt: new Date(2026, 7, 2).getTime(), deletedAt: 1 },
  ];
  assert.deepEqual(memoryMonths(items, new Date(2026, 10, 11)), [
    "2026-11",
    "2026-10",
    "2026-09",
  ]);
  assert.equal(localDayKey(NaN), "");
});

test("calendar uses the machine timezone instead of slicing a UTC ISO timestamp", () => {
  const modulePath = path.resolve(__dirname, "../src/calendar.ts");
  const script = `const {localDayKey}=require(${JSON.stringify(modulePath)});process.stdout.write(localDayKey(Date.parse('2026-11-11T18:30:00Z')));`;
  const run = (zone) =>
    execFileSync(process.execPath, ["-e", script], {
      env: { ...process.env, TZ: zone },
      encoding: "utf8",
    });
  assert.equal(run("UTC"), "2026-11-11");
  assert.equal(run("Asia/Bangkok"), "2026-11-12");
});
