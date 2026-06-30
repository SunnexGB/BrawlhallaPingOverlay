const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bhl", {
  getRegions: () => ipcRenderer.invoke("regions:get"),
  selectRegion: (host) => ipcRenderer.send("region:select", host),
  onPing: (cb) => ipcRenderer.on("ping:update", (_, v) => cb(v)),
});