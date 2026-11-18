import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
const launch = (profile: string) =>
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
const digest = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");

test("offline face stickers can be positioned, compared and saved as a copy while preserving the original", async () => {
  test.setTimeout(65000);
  const profile = await mkdtemp(join(tmpdir(), "hpb-stickers-"));
  const app = await launch(profile);
  try {
    const page = await app.firstWindow();
    await page.setViewportSize({ width: 1220, height: 820 });
    const external: string[] = [];
    const errors: string[] = [];
    page.on("request", (request) => {
      if (/^https?:/.test(request.url())) external.push(request.url());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "warning" || message.type() === "error")
        console.log("Studio browser:", message.text().slice(0, 500));
    });
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, resolve("tests/fixtures/astronaut.png"));
    await page.getByRole("button", { name: "Chọn ảnh", exact: true }).click();
    await page.getByRole("button", { name: "Sửa ghi chú trên ảnh" }).click();
    await page.getByLabel("Ghi chú trên ảnh").fill("Một chút cùng sticker");
    await page.getByLabel("Ghi chú trên ảnh").press("Enter");
    await page
      .getByRole("button", { name: "AI & Sticker", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "AI & Sticker", exact: true }),
    ).toBeVisible();
    const before = await page.evaluate(() => window.hpb!.invoke("snapshot"));
    expect(before.items).toHaveLength(1);
    const original = before.items[0];
    const originalFile = join(
      profile,
      "library",
      "media",
      `${original.id}.${original.ext}`,
    );
    const originalDigest = digest(await readFile(originalFile));
    await page
      .getByRole("button", { name: "Thêm Kính mát", exact: true })
      .click();
    await expect(
      page.getByText(
        "Đã đặt sticker theo khuôn mặt. Bạn có thể kéo để chỉnh.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 35000 });
    const stamp = page.getByRole("button", {
      name: "Sticker Kính mát",
      exact: true,
    });
    await expect(stamp).toBeVisible();
    const box = (await stamp.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 24,
      box.y + box.height / 2 + 18,
      { steps: 5 },
    );
    await page.mouse.up();
    await page.getByLabel("Xoay sticker").focus();
    await page.getByLabel("Xoay sticker").press("ArrowRight");
    await page
      .getByRole("button", { name: "Thêm Mèo nhỏ", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Xem ảnh gốc", exact: true })
      .click();
    await expect(page.locator(".studio-sticker")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Xem bản chỉnh", exact: true })
      .click();
    await expect(page.locator(".studio-sticker")).toHaveCount(2);
    expect(
      await page.locator(".studio-decoration").evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const pixels = canvas
          .getContext("2d")!
          .getImageData(0, 0, canvas.width, canvas.height).data;
        return pixels.some((value, index) => index % 4 === 3 && value > 0);
      }),
    ).toBe(true);
    await page.evaluate(() => {
      (window as any).__nativeConfirm = window.confirm;
      window.confirm = (message) => {
        (window as any).__leaveMessage = message;
        return false;
      };
    });
    await page.getByRole("button", { name: "Kỷ niệm", exact: true }).click();
    expect(await page.evaluate(() => (window as any).__leaveMessage)).toContain(
      "chưa được lưu",
    );
    await expect(page.locator(".studio-sticker")).toHaveCount(2);
    await page.evaluate(() => {
      window.confirm = (window as any).__nativeConfirm;
    });
    await page.screenshot({ path: "test-results/studio-stickers.png" });
    await page
      .getByRole("button", { name: "Lưu bản mới", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Một chút của hôm nay.", exact: true }),
    ).toBeVisible();
    const after = await page.evaluate(() => window.hpb!.invoke("snapshot"));
    expect(after.items).toHaveLength(2);
    const copy = after.items.find((item: any) => item.id !== original.id);
    expect(copy.ext).toBe("png");
    expect(copy.width).toBe(original.width);
    expect(copy.caption).toBe(original.caption);
    expect(digest(await readFile(originalFile))).toBe(originalDigest);
    expect(
      digest(
        await readFile(
          join(profile, "library", "media", `${copy.id}.${copy.ext}`),
        ),
      ),
    ).not.toBe(originalDigest);
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    await rm(profile, { recursive: true, force: true });
  }
});

test("AI setup stays in memory; controlled errors are recoverable and a generated preview saves as a separate photo", async () => {
  const profile = await mkdtemp(join(tmpdir(), "hpb-ai-"));
  let app = await launch(profile);
  try {
    let page = await app.firstWindow();
    await page.setViewportSize({ width: 1220, height: 820 });
    const image = await readFile(resolve("public/icon.png"));
    await app.evaluate(
      ({ net, dialog }, { file, b64 }) => {
        dialog.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [file],
        });
        const original = net.fetch.bind(net);
        (net as any).__aiRequests = [];
        (net as any).__aiMode = "limit";
        net.fetch = async (input, options) => {
          if (String(input) === "https://api.openai.com/v1/images/edits") {
            (net as any).__aiRequests.push({
              url: String(input),
              headers: options?.headers,
              body: options?.body,
            });
            return (net as any).__aiMode === "limit"
              ? new Response("private provider response", { status: 429 })
              : new Response(JSON.stringify({ data: [{ b64_json: b64 }] }));
          }
          return original(input, options);
        };
      },
      {
        file: resolve("tests/fixtures/astronaut.png"),
        b64: image.toString("base64"),
      },
    );
    await page.getByRole("button", { name: "Chọn ảnh", exact: true }).click();
    await page
      .getByRole("button", { name: "AI & Sticker", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "AI & Sticker", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Ảnh AI", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Tạo ảnh AI", exact: true }),
    ).toBeDisabled();
    const key = "sk-placeholder-for-native-ui-tests-only";
    await page.getByLabel("API key OpenAI").fill(key);
    await page
      .getByRole("button", { name: "Dùng khóa cho phiên này", exact: true })
      .click();
    await expect(
      page.getByText("API đã thiết lập", { exact: true }),
    ).toBeVisible();
    expect(
      await app.evaluate(({ net }) => (net as any).__aiRequests.length),
    ).toBe(0);
    // Hold local input preparation so cancelling cannot race into a later upload.
    await app.evaluate(({ net }) => {
      const fs = process.getBuiltinModule("fs/promises")!;
      const read = fs.readFile;
      fs.readFile = async (...args: any[]) => {
        const bytes = await read(...args);
        if (String(args[0]).replaceAll("\\", "/").includes("/library/media/")) {
          fs.readFile = read;
          (net as any).__readWaiting = true;
          await new Promise<void>((resume) => {
            (net as any).__resumeRead = resume;
          });
        }
        return bytes;
      };
    });
    await page.evaluate(async () => {
      const { items } = await window.hpb!.invoke("snapshot");
      (window as any).__cancelledPreparation = window
        .hpb!.invoke("ai:generate", {
          id: items[0].id,
          style: "anime",
          mode: "balanced",
        })
        .catch((error: Error) => error.message);
    });
    await expect
      .poll(() => app.evaluate(({ net }) => (net as any).__readWaiting))
      .toBe(true);
    await page.evaluate(() => window.hpb!.invoke("ai:cancel"));
    await app.evaluate(({ net }) => {
      (net as any).__resumeRead();
    });
    expect(
      await page.evaluate(() => (window as any).__cancelledPreparation),
    ).toContain("Đã dừng chuẩn bị");
    expect(
      await app.evaluate(({ net }) => (net as any).__aiRequests.length),
    ).toBe(0);
    await page.evaluate(() =>
      window.hpb!.invoke("settings", { theme: "dark", palette: "purple" }),
    );
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.setViewportSize({ width: 860, height: 620 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Tạo ảnh AI", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: "test-results/studio-ai-compact.png" });
    await page.setViewportSize({ width: 1220, height: 820 });
    await page
      .locator(".workspace")
      .evaluate((element) => element.scrollTo(0, 0));
    await page
      .locator(".studio-panel")
      .evaluate((element) => element.scrollTo(0, 0));
    await page.screenshot({ path: "test-results/studio-ai.png" });
    await page.getByRole("button", { name: "Tạo ảnh AI", exact: true }).click();
    await expect(
      page.getByText(/API đang bị giới hạn lượt dùng/),
    ).toBeVisible();
    expect(
      await app.evaluate(({ net }) => (net as any).__aiRequests.length),
    ).toBe(1);
    expect(await page.evaluate(() => window.hpb!.invoke("ai:state"))).toEqual({
      configured: true,
      busy: false,
    });
    await app.evaluate(({ net }) => {
      (net as any).__aiMode = "success";
    });
    await page.getByRole("button", { name: /Chibi/ }).click();
    await page.getByRole("button", { name: "Tạo ảnh AI", exact: true }).click();
    await expect(
      page.getByText(
        "Ảnh AI đã sẵn sàng. Bạn có thể thêm sticker hoặc lưu bản mới.",
        { exact: true },
      ),
    ).toBeVisible();
    const requests = await app.evaluate(({ net }) => (net as any).__aiRequests);
    expect(requests).toHaveLength(2);
    expect(JSON.parse(requests[1].body).prompt).toContain("chibi");
    expect(JSON.parse(requests[1].body).images).toHaveLength(1);
    const source = await page.evaluate(() => window.hpb!.invoke("snapshot"));
    expect(source.items).toHaveLength(1);
    expect(
      (
        await readFile(join(profile, "library", "library.json"), "utf8")
      ).includes(key),
    ).toBe(false);
    await page
      .getByRole("button", { name: "Lưu bản mới", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Một chút của hôm nay.", exact: true }),
    ).toBeVisible();
    const after = await page.evaluate(() => window.hpb!.invoke("snapshot"));
    expect(after.items).toHaveLength(2);
    expect(after.items[0].width).toBe(256);
    await app.close();
    app = await launch(profile);
    page = await app.firstWindow();
    expect(await page.evaluate(() => window.hpb!.invoke("ai:state"))).toEqual({
      configured: false,
      busy: false,
    });
    expect(
      (await page.evaluate(() => window.hpb!.invoke("snapshot"))).items,
    ).toHaveLength(2);
  } finally {
    await app.close();
    await rm(profile, { recursive: true, force: true });
  }
});
