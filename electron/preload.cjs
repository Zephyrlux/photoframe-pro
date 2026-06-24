const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("photoFrameAPI", {
  selectImages: () => ipcRenderer.invoke("select-images"),
  selectImageFolder: () => ipcRenderer.invoke("select-image-folder"),
  chooseOutputDirectory: () => ipcRenderer.invoke("choose-output-directory"),
  saveExports: (payload) => ipcRenderer.invoke("save-exports", payload),
  showInFolder: (filePath) => ipcRenderer.invoke("show-in-folder", filePath)
});
