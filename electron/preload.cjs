"use strict";

const { contextBridge, ipcRenderer } = require("electron");

// Reconstructed from DiscordPTB mainScreenPreload.js context-bridge-api DiscordNative
// (REA Evidence ev_63237e0ecd1017fdd2315f484417c1cd369dec71535fc38c4967c3899b0de011)
const DiscordNative = {
  isRenderer: true,
  app: {
    getReleaseChannel: () => "ptb",
    getVersion: () => ipcRenderer.invoke("FREECORD_GET_APP_VERSION"),
    spawnPeerInstance: (instanceId) => ipcRenderer.invoke("FREECORD_SPAWN_PEER_INSTANCE", instanceId),
  },
  updater: {
    checkForUpdates: () => ipcRenderer.invoke("FREECORD_CHECK_FOR_UPDATES"),
    quitAndInstall: () => ipcRenderer.invoke("FREECORD_QUIT_AND_INSTALL"),
    onUpdateStatus: (callback) => {
      const listener = (_event, status) => callback(status);
      ipcRenderer.on("FREECORD_UPDATE_STATUS", listener);
      return () => ipcRenderer.removeListener("FREECORD_UPDATE_STATUS", listener);
    },
  },
  window: {
    minimize: () => ipcRenderer.invoke("DISCORD_WINDOW_MINIMIZE"),
    maximize: () => ipcRenderer.invoke("DISCORD_WINDOW_MAXIMIZE"),
    close: () => ipcRenderer.invoke("DISCORD_WINDOW_CLOSE"),
    flashFrame: (flag = true) => ipcRenderer.invoke("DISCORD_WINDOW_FLASH", Boolean(flag)),
    focus: () => ipcRenderer.invoke("DISCORD_WINDOW_FOCUS"),
    onWindowStateChanged: (callback) => {
      const listener = (_event, state) => callback(state);
      ipcRenderer.on("DISCORD_WINDOW_STATE", listener);
      return () => ipcRenderer.removeListener("DISCORD_WINDOW_STATE", listener);
    },
  },
  settings: {
    get: (key, defaultValue) => ipcRenderer.invoke("DISCORD_SETTINGS_GET", key, defaultValue),
    set: (key, value) => ipcRenderer.invoke("DISCORD_SETTINGS_SET", key, value),
  },
  storage: {
    saveChatHistory: (data) => ipcRenderer.invoke("SAVE_CHAT_STORAGE", data),
    loadChatHistory: () => ipcRenderer.invoke("LOAD_CHAT_STORAGE"),
  },
  desktopCapture: {
    getDesktopSources: () => ipcRenderer.invoke("DISCORD_GET_DESKTOP_SOURCES"),
    setPendingDisplaySource: (sourceId) => ipcRenderer.invoke("SET_PENDING_DISPLAY_SOURCE", sourceId),
  },
  p2p: {
    getStatus: () => ipcRenderer.invoke("FREECORD_P2P_STATUS"),
    connect: (host, port) => ipcRenderer.invoke("FREECORD_P2P_CONNECT", { host, port }),
    disconnect: (peerId) => ipcRenderer.invoke("FREECORD_P2P_DISCONNECT", peerId),
    send: (packet, targetPeerId = null) =>
      ipcRenderer.invoke("FREECORD_P2P_SEND", { packet, targetPeerId }),
    updateProfile: (partialProfile) =>
      ipcRenderer.invoke("FREECORD_P2P_UPDATE_PROFILE", partialProfile),
    setVoiceState: (channelId, voiceState) =>
      ipcRenderer.invoke("FREECORD_P2P_VOICE_STATE", { channelId, voiceState }),
    beaconNow: () => ipcRenderer.invoke("FREECORD_P2P_BEACON_NOW"),
    onPeersUpdated: (callback) => {
      const listener = (_event, peers) => callback(peers);
      ipcRenderer.on("FREECORD_PEERS_UPDATED", listener);
      return () => ipcRenderer.removeListener("FREECORD_PEERS_UPDATED", listener);
    },
    onLanPeersUpdated: (callback) => {
      const listener = (_event, lanPeers) => callback(lanPeers);
      ipcRenderer.on("FREECORD_LAN_PEERS_UPDATED", listener);
      return () => ipcRenderer.removeListener("FREECORD_LAN_PEERS_UPDATED", listener);
    },
    onPeerConnected: (callback) => {
      const listener = (_event, peer) => callback(peer);
      ipcRenderer.on("FREECORD_PEER_CONNECTED", listener);
      return () => ipcRenderer.removeListener("FREECORD_PEER_CONNECTED", listener);
    },
    onPeerDisconnected: (callback) => {
      const listener = (_event, info) => callback(info);
      ipcRenderer.on("FREECORD_PEER_DISCONNECTED", listener);
      return () => ipcRenderer.removeListener("FREECORD_PEER_DISCONNECTED", listener);
    },
    onP2PEvent: (callback) => {
      const listener = (_event, event) => callback(event);
      ipcRenderer.on("FREECORD_P2P_EVENT", listener);
      return () => ipcRenderer.removeListener("FREECORD_P2P_EVENT", listener);
    },
  },
};

contextBridge.exposeInMainWorld("DiscordNative", DiscordNative);
