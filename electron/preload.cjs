const { contextBridge, ipcRenderer } = require("electron");
const invoke = async (action, payload) => {
  const response = await ipcRenderer.invoke("hpb:invoke", action, payload);
  if (!response.ok) throw Error(response.error);
  return response.value;
};
contextBridge.exposeInMainWorld("hpb", {
  invoke,
  onChange(callback) {
    const listener = () => callback();
    ipcRenderer.on("hpb:changed", listener);
    return () => ipcRenderer.removeListener("hpb:changed", listener);
  },
  onUpdate(callback) {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("hpb:update", listener);
    return () => ipcRenderer.removeListener("hpb:update", listener);
  },
});
