import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const vite = spawn("npm", ["run", "dev", "--", "--port", "5173"], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

async function waitForVite() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch("http://127.0.0.1:5173");
      if (response.ok) return;
    } catch {
      await delay(500);
    }
  }
  throw new Error("Vite dev server did not start.");
}

await waitForVite();

const electron = spawn("npx", ["electron", "."], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: "http://127.0.0.1:5173"
  }
});

electron.on("exit", (code) => {
  vite.kill();
  process.exit(code ?? 0);
});
