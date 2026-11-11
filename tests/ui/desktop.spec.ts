import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
test("offline desktop capture, edit, export, favorite, restore, widget and video", async () => {
  const profile = await mkdtemp(join(tmpdir(), "hpb-e2e-"));
  const app = await electron.launch({
    args: [
      ".",
      ...(process.platform === "linux"
        ? ["--no-sandbox", "--ozone-platform=headless"]
        : []),
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
    env: { ...process.env, HPB_USER_DATA: profile, HPB_DEV: "0" },
    timeout: 30000,
  });
  try {
    const page = await app.firstWindow();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await expect(
      page.getByRole("region", { name: "Máy ảnh", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Chụp ảnh", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Chụp ảnh", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Khoảnh khắc vừa chụp" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sửa ghi chú trên ảnh" }).click();
    await page.getByLabel("Ghi chú trên ảnh").fill("Một chiều thử app");
    await page.getByLabel("Ghi chú trên ảnh").press("Enter");
    await page.getByRole("button", { name: "Công cụ", exact: true }).click();
    await page.getByRole("button", { name: "Tết", exact: true }).click();
    await page
      .getByRole("button", { name: "Lưu khoảnh khắc", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Một chút của hôm nay." }),
    ).toBeVisible();
    const snap = await page.evaluate(() => window.hpb!.invoke("snapshot"));
    expect(snap.items).toHaveLength(1);
    expect(snap.items[0].caption).toBe("Một chiều thử app");
    expect(snap.items[0].style.frame).toBe("tet");
    await page
      .locator(".review-actions")
      .getByRole("button", { name: "Yêu thích", exact: true })
      .click();
    const exported = join(profile, "exported.png");
    await app.evaluate(({ dialog }, file) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
    }, exported);
    await page.getByRole("button", { name: "Xuất ảnh", exact: true }).click();
    await expect
      .poll(async () => {
        try {
          return (await stat(exported)).size;
        } catch {
          return 0;
        }
      })
      .toBeGreaterThan(100);
    await page.getByRole("button", { name: "Ghim", exact: true }).click();
    await expect.poll(() => app.windows().length).toBe(2);
    const widget = app.windows().find((w) => w !== page)!;
    await expect(widget.getByText("Locket x HPB")).toBeVisible();
    await page.evaluate(() =>
      window.hpb!.invoke("settings", { palette: "blue" }),
    );
    await expect(page.locator("html")).toHaveAttribute("data-palette", "blue");
    await expect(widget.locator("html")).toHaveAttribute(
      "data-palette",
      "blue",
    );
    await widget
      .getByRole("button", { name: "Đóng ảnh ghim" })
      .click({ noWaitAfter: true });
    await expect.poll(() => app.windows().length).toBe(1);
    await page.getByRole("button", { name: "Quay về", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Tất cả khoảnh khắc." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mở Một chiều thử app" }).click();
    await page
      .getByRole("button", { name: "Chuyển vào thùng rác", exact: true })
      .click();
    await page.getByRole("button", { name: "Thùng rác", exact: true }).click();
    await page.getByRole("button", { name: "Mở Một chiều thử app" }).click();
    await page.getByRole("button", { name: "Khôi phục", exact: true }).click();
    await expect(page.getByText("Thùng rác đang trống.")).toBeVisible();
    await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
    await page.getByRole("button", { name: "Tối", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page
      .getByRole("button", { name: "Chụp & quay", exact: true })
      .click();
    await page.getByRole("button", { name: "Video 10s", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Bắt đầu quay", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Bắt đầu quay", exact: true })
      .click();
    await expect(page.getByText("ĐANG QUAY")).toBeVisible();
    // Exercise the actual automatic ten-second stop, not just the UI's counter.
    await expect(
      page.getByRole("heading", { name: "Video vừa quay" }),
    ).toBeVisible({ timeout: 16000 });
    await page.getByRole("button", { name: "Lưu video", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Một chút của hôm nay." }),
    ).toBeVisible();
    const after = await page.evaluate(() => window.hpb!.invoke("snapshot"));
    expect(after.items).toHaveLength(2);
    expect(after.items[0].kind).toBe("video");
    expect(after.items[0].duration).toBeLessThanOrEqual(10);
    expect(after.items[0].duration).toBeGreaterThan(9);
    await page.getByRole("button", { name: "Quay về", exact: true }).click();
    await page.screenshot({ path: "test-results/library-dark.png" });
    await page.getByRole("button", { name: "Cập nhật", exact: true }).click();
    await page
      .getByRole("button", { name: "Kiểm tra cập nhật", exact: true })
      .click();
    await expect(
      page.getByText(/Cập nhật tự động dùng trong bản cài Windows/),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    await rm(profile, { recursive: true, force: true });
  }
});

test("native import, light mode and neon palette persist across restart", async () => {
  const profile = await mkdtemp(join(tmpdir(), "hpb-import-"));
  const launch = () =>
    electron.launch({
      args: [
        ".",
        ...(process.platform === "linux"
          ? ["--no-sandbox", "--ozone-platform=headless"]
          : []),
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
      env: { ...process.env, HPB_USER_DATA: profile, HPB_DEV: "0" },
      timeout: 30000,
    });
  let app = await launch();
  try {
    let page = await app.firstWindow();
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, resolve("public/icon.png"));
    await page.getByRole("button", { name: "Chọn ảnh", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Khoảnh khắc vừa chụp" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sửa ghi chú trên ảnh" }).click();
    await page.getByLabel("Ghi chú trên ảnh").fill("Ảnh nhập từ laptop");
    await page.getByLabel("Ghi chú trên ảnh").press("Enter");
    await page
      .getByRole("button", { name: "Lưu khoảnh khắc", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Một chút của hôm nay." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
    await page.getByRole("button", { name: "Sáng", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const paletteGroup = page.getByRole("group", { name: "Màu nền neon" });
    await expect(paletteGroup.getByRole("button")).toHaveCount(7);
    const backgrounds = new Set<string>();
    for (const [id, label] of [
      ["yellow", "Vàng"],
      ["blue", "Xanh dương"],
      ["green", "Xanh lá"],
      ["red", "Đỏ"],
      ["purple", "Tím"],
      ["cyan", "Cyan"],
      ["pink", "Hồng"],
    ]) {
      const choice = paletteGroup.getByRole("button", {
        name: `Neon ${label}`,
        exact: true,
      });
      await choice.click();
      await expect(page.locator("html")).toHaveAttribute("data-palette", id);
      await expect(choice).toHaveAttribute("aria-pressed", "true");
      backgrounds.add(
        await page.evaluate(() =>
          getComputedStyle(document.documentElement)
            .getPropertyValue("--bg")
            .trim(),
        ),
      );
    }
    expect(backgrounds.size).toBe(7);
    await page.screenshot({ path: "test-results/neon-settings-light.png" });
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    await expect(
      page.getByRole("region", { name: "Máy ảnh", exact: true }),
    ).toBeVisible();
    const snap = await page.evaluate(() => window.hpb!.invoke("snapshot"));
    expect(snap.items).toHaveLength(1);
    expect(snap.items[0].caption).toBe("Ảnh nhập từ laptop");
    expect(snap.settings.theme).toBe("light");
    expect(snap.settings.palette).toBe("pink");
    await expect(page.locator("html")).toHaveAttribute("data-palette", "pink");
    await page.screenshot({ path: "test-results/camera-neon-pink.png" });
    await page.getByRole("button", { name: "Tất cả ảnh & video" }).click();
    await expect(
      page.getByRole("button", { name: "Mở Ảnh nhập từ laptop" }),
    ).toBeVisible();
    await page.screenshot({ path: "test-results/library-light.png" });
  } finally {
    await app.close();
    await rm(profile, { recursive: true, force: true });
  }
});
