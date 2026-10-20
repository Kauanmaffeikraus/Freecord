"use strict";

const { app, BrowserWindow, ipcMain, desktopCapturer, session, shell, powerSaveBlocker } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const { P2PNode } = require("./p2pNode.cjs");

// Parse --peer-instance=<n> so multiple peers can run on one computer
const instanceArg = process.argv.find((a) => a.startsWith("--peer-instance="));
const instanceId = instanceArg ? instanceArg.split("=")[1] : process.env.FREECORD_INSTANCE || "1";

if (instanceId !== "1") {
  const customUserData = path.join(app.getPath("appData"), `FreecordPTB_Peer_${instanceId}`);
  app.setPath("userData", customUserData);
}

// Ensure WebRTC direct local IPv4 candidates, background media streaming, and zero-gesture autoplay
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch(
  "disable-features",
  "WebRtcHideLocalIpsWithMdns,CalculateNativeWinOcclusion,IntensiveWakeUpThrottling,ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes"
);
app.commandLine.appendSwitch("enable-usermedia-screen-capturing");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app.commandLine.appendSwitch("webrtc-max-cpu-consumption-percentage", "100");

// Reconstructed from DiscordPTB core.asar settings endpoints (REA Evidence ev_63237e0ecd1017fdd2315f484417c1cd369dec71535fc38c4967c3899b0de011)
const DEFAULT_SETTINGS = {
  MIN_WIDTH: 940,
  MIN_HEIGHT: 520,
  WINDOW_BOUNDS: { width: 1280, height: 800 },
  IS_MAXIMIZED: false,
  IS_MINIMIZED: false,
  MINIMIZE_TO_TRAY: false,
  enableHardwareAcceleration: true,
  audioSubsystem: "experimental",
  offloadAdmControls: true,
  debugLogging: true,
  releaseChannel: "ptb",
  version: "1.0.1225-p2p",
};

let mainWindow = null;
let p2pNode = null;
let appSettings = { ...DEFAULT_SETTINGS };

function loadSettings() {
  try {
    const settingsPath = path.join(app.getPath("userData"), "settings.json");
    if (fs.existsSync(settingsPath)) {
      const parsed = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
      appSettings = { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {}
}

function saveSettings() {
  try {
    const settingsPath = path.join(app.getPath("userData"), "settings.json");
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(appSettings, null, 2), "utf8");
  } catch {}
}

function createMainWindow() {
  loadSettings();

  const bounds = appSettings.WINDOW_BOUNDS || { width: 1280, height: 800 };

  mainWindow = new BrowserWindow({
    title: `Freecord PTB (Peer #${instanceId})`,
    icon: path.join(__dirname, "..", "public", "logo.png"),
    width: bounds.width || 1280,
    height: bounds.height || 800,
    minWidth: appSettings.MIN_WIDTH || 940,
    minHeight: appSettings.MIN_HEIGHT || 520,
    frame: false,
    backgroundColor: "#1e1f22",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  if (appSettings.IS_MAXIMIZED) {
    mainWindow.maximize();
  }

  mainWindow.webContents.setBackgroundThrottling(false);
  mainWindow.webContents.setAudioMuted(false);

  mainWindow.on("focus", () => {
    mainWindow?.flashFrame(false);
  });

  mainWindow.on("blur", () => {
    mainWindow?.webContents.setBackgroundThrottling(false);
  });

  mainWindow.on("minimize", () => {
    mainWindow?.webContents.setBackgroundThrottling(false);
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("resize", () => {
    if (!mainWindow.isMaximized() && !mainWindow.isMinimized()) {
      appSettings.WINDOW_BOUNDS = mainWindow.getBounds();
      saveSettings();
    }
  });

  mainWindow.on("maximize", () => {
    appSettings.IS_MAXIMIZED = true;
    saveSettings();
    mainWindow?.webContents.send("DISCORD_WINDOW_STATE", { isMaximized: true });
  });

  mainWindow.on("unmaximize", () => {
    appSettings.IS_MAXIMIZED = false;
    saveSettings();
    mainWindow?.webContents.send("DISCORD_WINDOW_STATE", { isMaximized: false });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    const indexHtml = path.join(__dirname, "..", "dist", "index.html");
    mainWindow.loadFile(indexHtml);
  }
}

async function setupP2PNode() {
  p2pNode = new P2PNode({
    dataDir: app.getPath("userData"),
    instanceId,
  });

  p2pNode.on("peers-updated", (peers) => {
    mainWindow?.webContents.send("FREECORD_PEERS_UPDATED", peers);
  });

  p2pNode.on("lan-peers-updated", (lanPeers) => {
    mainWindow?.webContents.send("FREECORD_LAN_PEERS_UPDATED", lanPeers);
  });

  p2pNode.on("peer-connected", (peer) => {
    mainWindow?.webContents.send("FREECORD_PEER_CONNECTED", peer);
  });

  p2pNode.on("peer-disconnected", (info) => {
    mainWindow?.webContents.send("FREECORD_PEER_DISCONNECTED", info);
  });

  p2pNode.on("p2p-event", (event) => {
    mainWindow?.webContents.send("FREECORD_P2P_EVENT", event);
  });

  await p2pNode.start();
}

function registerIpcHandlers() {
  // Window controls (DiscordIPC)
  ipcMain.handle("DISCORD_WINDOW_MINIMIZE", () => {
    mainWindow?.minimize();
    return true;
  });

  ipcMain.handle("DISCORD_WINDOW_MAXIMIZE", () => {
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    } else {
      mainWindow.maximize();
      return true;
    }
  });

  ipcMain.handle("DISCORD_WINDOW_CLOSE", () => {
    mainWindow?.close();
    return true;
  });

  ipcMain.handle("DISCORD_WINDOW_FLASH", (_event, flag) => {
    mainWindow?.flashFrame(Boolean(flag));
    return true;
  });

  ipcMain.handle("DISCORD_WINDOW_FOCUS", () => {
    if (!mainWindow) return false;
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
    mainWindow.flashFrame(false);
    return true;
  });

  ipcMain.handle("DISCORD_SETTINGS_GET", (_event, key, defaultValue) => {
    return key in appSettings ? appSettings[key] : defaultValue;
  });

  ipcMain.handle("DISCORD_SETTINGS_SET", (_event, key, value) => {
    appSettings[key] = value;
    saveSettings();
    return true;
  });

  // Desktop Capturer for Go Live / Screen Share (matching discord_voice setDesktopSource / presentDesktopSourcePicker)
  ipcMain.handle("DISCORD_GET_DESKTOP_SOURCES", async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize: { width: 320, height: 180 },
        fetchWindowIcons: true,
      });
      return sources.map((s) => ({
        id: s.id,
        name: s.name,
        thumbnailDataUrl: s.thumbnail ? s.thumbnail.toDataURL() : null,
        displayId: s.display_id,
      }));
    } catch (err) {
      console.warn("[Freecord] desktopCapturer error:", err.message);
      return [];
    }
  });

  // P2P Node IPC
  ipcMain.handle("FREECORD_P2P_STATUS", () => {
    return p2pNode ? p2pNode.getNodeStatus() : null;
  });

  ipcMain.handle("FREECORD_P2P_CONNECT", async (_event, { host, port }) => {
    if (!p2pNode) throw new Error("Nó P2P não inicializado");
    return await p2pNode.connectToPeer(host, port);
  });

  ipcMain.handle("FREECORD_P2P_DISCONNECT", (_event, peerId) => {
    if (!p2pNode) return false;
    return p2pNode.disconnectPeer(peerId);
  });

  ipcMain.handle("FREECORD_P2P_SEND", (_event, { packet, targetPeerId }) => {
    if (!p2pNode) return 0;
    return p2pNode.broadcast(packet, targetPeerId || null);
  });

  ipcMain.handle("FREECORD_P2P_UPDATE_PROFILE", (_event, partialProfile) => {
    if (!p2pNode) return null;
    return p2pNode.updateProfile(partialProfile);
  });

  ipcMain.handle("FREECORD_P2P_VOICE_STATE", (_event, { channelId, voiceState }) => {
    if (!p2pNode) return false;
    p2pNode.setVoiceChannelState(channelId, voiceState);
    return true;
  });

  ipcMain.handle("FREECORD_P2P_BEACON_NOW", () => {
    if (!p2pNode) return false;
    p2pNode.broadcastPresenceBeacon();
    return true;
  });

  // Spawn a second peer instance on the same machine for instant P2P testing!
  ipcMain.handle("FREECORD_SPAWN_PEER_INSTANCE", (_event, targetInstanceId) => {
    const nextId = String(targetInstanceId || Number(instanceId) + 1);
    const electronExe = process.execPath;
    const appRoot = path.join(__dirname, "..");
    const child = spawn(electronExe, [appRoot, `--peer-instance=${nextId}`], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return { spawned: true, instanceId: nextId };
  });
}

app.whenReady().then(async () => {
  // Prevent Windows EcoQoS / background process throttling when Freecord is minimized or unfocused
  try {
    powerSaveBlocker.start("prevent-app-suspension");
  } catch {}

  session.defaultSession.setPermissionCheckHandler(() => true);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(true);
  });

  // Configure DisplayMedia handler so navigator.mediaDevices.getDisplayMedia works natively in Electron
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ["screen", "window"] });
      if (sources.length > 0) {
        callback({ video: sources[0], audio: "loopback" });
      } else {
        callback({});
      }
    } catch {
      callback({});
    }
  });

  registerIpcHandlers();
  await setupP2PNode();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (p2pNode) {
    p2pNode.stop();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
