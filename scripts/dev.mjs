import { spawn } from "node:child_process";
import electron from "electron";
const vite = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"],
  { stdio: "inherit" },
);
let desktop;
const stop = () => {
  vite.kill();
  desktop?.kill();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("exit", stop);
let ready = false;
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch("http://127.0.0.1:5173")).ok) {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 200));
}
if (!ready) {
  stop();
  process.exit(1);
}
desktop = spawn(electron, ["."], {
  stdio: "inherit",
  env: { ...process.env, HPB_DEV: "1" },
});
desktop.on("exit", (code) => {
  stop();
  process.exit(code ?? 0);
});
