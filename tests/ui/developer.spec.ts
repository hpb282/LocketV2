import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import jsQR from "jsqr";
import developer from "../../electron/developer.json" with { type: "json" };

test("developer contacts, offline QR decoding and accessible enlargement", async () => {
  const profile = await mkdtemp(join(tmpdir(), "hpb-developer-"));
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
    await page.setViewportSize({ width: 1220, height: 820 });
    const errors: string[] = [];
    const remoteRequests: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (/^https?:/.test(request.url())) remoteRequests.push(request.url());
    });
    await app.evaluate(({ shell }) => {
      (shell as any).__developerOpened = [];
      shell.openExternal = async (url) => {
        (shell as any).__developerOpened.push(url);
      };
    });
    await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
    await page.getByRole("button", { name: "Sáng", exact: true }).click();
    await page
      .getByRole("button", { name: "Người phát triển", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Người phát triển" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.locator(".workspace").evaluate((element) => element.scrollTop),
      )
      .toBe(0);
    await expect(page.locator(".developer-back")).toBeInViewport();
    await expect(
      page.getByRole("heading", { name: developer.name, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(developer.email, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(developer.phone, { exact: true }).first(),
    ).toBeVisible();
    for (const [button, value] of [
      ["Sao chép email", developer.email],
      ["Sao chép số điện thoại", developer.phone],
      ...developer.socials.map((contact) => [
        `Sao chép liên kết ${contact.label}`,
        contact.url,
      ]),
    ]) {
      await page.getByRole("button", { name: button, exact: true }).click();
      await expect
        .poll(() => app.evaluate(({ clipboard }) => clipboard.readText()))
        .toBe(value);
    }

    for (const contact of developer.socials) {
      const image = page.getByRole("img", {
        name: `Mã QR ${contact.label} của ${developer.name}`,
        exact: true,
      });
      const pixels = await image.evaluate(async (element: HTMLImageElement) => {
        await element.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 384;
        const context = canvas.getContext("2d")!;
        context.drawImage(element, 0, 0, 384, 384);
        return Array.from(context.getImageData(0, 0, 384, 384).data);
      });
      expect(jsQR(Uint8ClampedArray.from(pixels), 384, 384)?.data).toBe(
        contact.url,
      );
      await page
        .getByRole("button", { name: `Mở ${contact.label}`, exact: true })
        .click();
      const enlarge = page.getByRole("button", {
        name: `Phóng lớn mã QR ${contact.label}`,
      });
      await enlarge.click();
      const dialog = page.getByRole("dialog", {
        name: contact.label,
        exact: true,
      });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("img")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(enlarge).toBeFocused();
    }
    await page
      .getByRole("button", { name: "Viết email cho người phát triển" })
      .click();
    expect(
      await app.evaluate(({ shell }) => (shell as any).__developerOpened),
    ).toEqual([
      ...developer.socials.map((contact) => contact.url),
      `mailto:${developer.email}`,
    ]);

    await expect(page.locator(".toast")).not.toBeVisible();
    await page.screenshot({ path: "test-results/developer-light.png" });
    await page
      .getByRole("button", { name: "Cài đặt", exact: true })
      .last()
      .click();
    await page.getByRole("button", { name: "Tối", exact: true }).click();
    await page.getByRole("button", { name: "Neon Tím", exact: true }).click();
    await page
      .getByRole("button", { name: "Người phát triển", exact: true })
      .click();
    for (const qr of await page.locator(".developer-qr-button img").all()) {
      await expect(qr).toHaveCSS("background-color", "rgb(255, 255, 255)");
    }
    await page.screenshot({ path: "test-results/developer-dark.png" });
    await page.getByRole("button", { name: "Phóng lớn mã QR Zalo" }).click();
    await page.getByRole("button", { name: "Đóng mã QR" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.setViewportSize({ width: 860, height: 620 });
    await expect(
      page.getByRole("button", { name: "Mở Messenger", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(860);
    await page.screenshot({
      path: "test-results/developer-compact.png",
      fullPage: true,
    });

    for (const action of ["developer:open", "developer:copy"]) {
      for (const payload of [
        "file:///etc/passwd",
        "constructor",
        { url: "https://example.com/" },
      ]) {
        const message = await page.evaluate(
          async ({ action, payload }) => {
            try {
              await window.hpb!.invoke(action, payload);
              return "unexpected success";
            } catch (error) {
              return (error as Error).message;
            }
          },
          { action, payload },
        );
        expect(message).toContain("Thông tin liên hệ không hợp lệ");
      }
    }
    const snapshot = await page.evaluate(() => window.hpb!.invoke("snapshot"));
    expect(snapshot.items).toHaveLength(0);
    expect(snapshot.profile.displayName).toBe("Bạn");
    expect(remoteRequests).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    await rm(profile, { recursive: true, force: true });
  }
});
