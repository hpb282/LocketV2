import { mkdir, writeFile } from "node:fs/promises";
import QRCode from "qrcode";
import developer from "../electron/developer.json" with { type: "json" };

const directory = new URL("../src/assets/developer/", import.meta.url);
await mkdir(directory, { recursive: true });
for (const contact of developer.socials) {
  const svg = await QRCode.toString(contact.url, {
    type: "svg",
    errorCorrectionLevel: "Q",
    margin: 4,
    width: 640,
    color: { dark: "#000000", light: "#ffffff" },
  });
  await writeFile(new URL(`${contact.id}.svg`, directory), svg);
}
