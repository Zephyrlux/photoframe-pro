const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 760,
    title: "PhotoFrame Pro",
    backgroundColor: "#0F1115",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    win.loadURL(devServerUrl);
    if (process.env.OPEN_DEVTOOLS === "1") {
      win.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

async function fileToPayload(filePath) {
  const buffer = await fs.readFile(filePath);
  const stat = await fs.stat(filePath);
  const ext = path.extname(filePath).toLowerCase();
  let mime =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  let output = buffer;

  if (ext === ".tif" || ext === ".tiff") {
    output = await sharp(buffer).png().toBuffer();
    mime = "image/png";
  }

  return {
    name: path.basename(filePath),
    path: filePath,
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    dataUrl: `data:${mime};base64,${output.toString("base64")}`
  };
}

async function walkImages(dirPath, out = []) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walkImages(fullPath, out);
    } else if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) {
      out.push(fullPath);
    }
  }
  return out;
}

ipcMain.handle("select-images", async () => {
  const result = await dialog.showOpenDialog({
    title: "导入图片",
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "tif", "tiff"] }]
  });

  if (result.canceled) return [];
  return Promise.all(result.filePaths.map(fileToPayload));
});

ipcMain.handle("select-image-folder", async () => {
  const result = await dialog.showOpenDialog({
    title: "导入文件夹",
    properties: ["openDirectory"]
  });

  if (result.canceled || result.filePaths.length === 0) return [];
  const files = await walkImages(result.filePaths[0]);
  return Promise.all(files.map(fileToPayload));
});

ipcMain.handle("choose-output-directory", async () => {
  const result = await dialog.showOpenDialog({
    title: "选择输出目录",
    properties: ["openDirectory", "createDirectory"]
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle("save-exports", async (_event, payload) => {
  const { outputDirectory, files } = payload || {};
  if (!outputDirectory || !Array.isArray(files)) {
    throw new Error("缺少输出目录或导出文件。");
  }

  await fs.mkdir(outputDirectory, { recursive: true });
  const saved = [];

  for (const file of files) {
    const safeName = String(file.name || "photoframe_export.jpg").replace(/[\\/:*?"<>|]/g, "_");
    const target = path.join(outputDirectory, safeName);
    const base64 = String(file.dataUrl || "").split(",")[1];
    if (!base64) continue;
    await fs.writeFile(target, Buffer.from(base64, "base64"));
    saved.push(target);
  }

  return { saved };
});

ipcMain.handle("show-in-folder", async (_event, filePath) => {
  if (filePath) shell.showItemInFolder(filePath);
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
