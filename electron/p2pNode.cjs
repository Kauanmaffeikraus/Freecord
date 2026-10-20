"use strict";

const net = require("node:net");
const dgram = require("node:dgram");
const os = require("node:os");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { EventEmitter } = require("node:events");

const DISCOVERY_PORTS = [49150, 49151, 49152, 49153];
const MULTICAST_ADDR = "239.255.42.99";

function getLocalIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const results = [];
  for (const [name, infos] of Object.entries(interfaces)) {
    if (!infos) continue;
    for (const info of infos) {
      if (info.family === "IPv4" && !info.internal) {
        results.push({
          interface: name,
          address: info.address,
          netmask: info.netmask,
        });
      }
    }
  }
  if (results.length === 0) {
    results.push({ interface: "Loopback", address: "127.0.0.1", netmask: "255.0.0.0" });
  }
  return results;
}

function computePairwiseFingerprint(peerIdA, peerIdB) {
  const sorted = [String(peerIdA), String(peerIdB)].sort().join(":");
  const hash = crypto.createHash("sha256").update(`freecord-mls-v1:${sorted}`).digest("hex");
  // Format in groups of 4 hex chars like Discord's MLS pairwise fingerprint
  return hash
    .slice(0, 32)
    .match(/.{1,4}/g)
    .join(" ")
    .toUpperCase();
}

class P2PNode extends EventEmitter {
  constructor({ dataDir, instanceId = "1" }) {
    super();
    this.dataDir = dataDir;
    this.instanceId = String(instanceId);
    this.stateFile = path.join(dataDir, `freecord-state-${this.instanceId}.json`);

    this.profile = this.loadInitialProfile();
    this.tcpServer = null;
    this.tcpPort = 0;
    this.udpSocket = null;
    this.udpBoundPort = 0;
    this.beaconTimer = null;
    this.pingTimer = null;

    // Map<peerId, { socket, info, address, port, connectedAt, rttMs, fingerprint, buffer }>
    this.peers = new Map();
    // Map<peerId, { peerId, username, tag, avatarColor, status, customStatus, host, tcpPort, lastSeen, addresses }>
    this.discoveredLanPeers = new Map();

    // Voice channel presence: Map<channelId, Set<peerId>>
    this.voicePresence = new Map();
    this.currentVoiceChannelId = null;
    this.currentVoiceState = {
      muted: false,
      deafened: false,
      speaking: false,
      screenSharing: false,
      videoEnabled: false,
    };
  }

  loadInitialProfile() {
    const randomHex = crypto.randomBytes(4).toString("hex");
    const tag = String(Math.floor(1000 + Math.random() * 9000));
    const colors = ["#5865F2", "#57F287", "#FEE75C", "#EB459E", "#ED4245", "#00B0F4", "#9B59B6"];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    const defaultName =
      this.instanceId === "1"
        ? `Peer_${randomHex.slice(0, 4).toUpperCase()}`
        : `Peer_${this.instanceId}_${randomHex.slice(0, 4).toUpperCase()}`;

    const defaults = {
      peerId: `fc_${randomHex}`,
      displayName: defaultName,
      username: defaultName.toLowerCase(),
      tag,
      pronouns: "",
      bio: "Serverless P2P Node running on Freecord PTB.",
      avatarColor,
      avatarUrl: null,
      bannerColor: "#5865f2",
      bannerUrl: null,
      accentColorPrimary: "#1e1f22",
      accentColorSecondary: "#2b2d31",
      status: "online",
      statusEmoji: "⚡",
      customStatus: "Connected via Direct P2P (Serverless)",
      badges: ["P2P Node", "Early Adopter"],
    };

    try {
      if (fs.existsSync(this.stateFile)) {
        const saved = JSON.parse(fs.readFileSync(this.stateFile, "utf8"));
        if (saved && saved.profile && saved.profile.peerId) {
          return {
            ...defaults,
            ...saved.profile,
            displayName: saved.profile.displayName || saved.profile.username || defaults.displayName,
          };
        }
      }
    } catch (err) {
      console.warn("[Freecord P2P] Failed to load profile:", err.message);
    }

    this.saveProfile(defaults);
    return defaults;
  }

  saveProfile(profile) {
    this.profile = { ...this.profile, ...profile };
    try {
      fs.mkdirSync(this.dataDir, { recursive: true });
      let existing = {};
      if (fs.existsSync(this.stateFile)) {
        existing = JSON.parse(fs.readFileSync(this.stateFile, "utf8"));
      }
      existing.profile = this.profile;
      fs.writeFileSync(this.stateFile, JSON.stringify(existing, null, 2), "utf8");
    } catch (err) {
      console.warn("[Freecord P2P] Failed to save profile:", err.message);
    }
  }

  async start() {
    await this.startTcpServer();
    await this.startUdpDiscovery();

    this.beaconTimer = setInterval(() => {
      this.broadcastPresenceBeacon();
      this.pruneStaleLanPeers();
    }, 3000);

    this.pingTimer = setInterval(() => {
      this.pingConnectedPeers();
    }, 4000);

    // Immediate initial beacon
    setTimeout(() => this.broadcastPresenceBeacon(), 300);

    return this.getNodeStatus();
  }

  startTcpServer() {
    return new Promise((resolve, reject) => {
      this.tcpServer = net.createServer((socket) => {
        this.handleSocketConnection(socket, false);
      });

      this.tcpServer.on("error", (err) => {
        console.error("[Freecord P2P] TCP Server Error:", err.message);
      });

      // Listen on 0.0.0.0 so both LAN/VPN peers and localhost instances can connect
      this.tcpServer.listen(0, "0.0.0.0", () => {
        const addr = this.tcpServer.address();
        this.tcpPort = addr.port;
        console.log(`[Freecord P2P] TCP Mesh Node listening on 0.0.0.0:${this.tcpPort}`);
        resolve(this.tcpPort);
      });
    });
  }

  startUdpDiscovery() {
    return new Promise((resolve) => {
      const tryBindPort = (index) => {
        if (index >= DISCOVERY_PORTS.length) {
          // Bind any ephemeral port if all standard discovery ports are occupied
          const fallback = dgram.createSocket({ type: "udp4", reuseAddr: true });
          fallback.bind(0, "0.0.0.0", () => {
            this.setupUdpSocket(fallback);
            resolve();
          });
          return;
        }

        const port = DISCOVERY_PORTS[index];
        const sock = dgram.createSocket({ type: "udp4", reuseAddr: true });

        sock.once("error", () => {
          try {
            sock.close();
          } catch {}
          tryBindPort(index + 1);
        });

        sock.bind(port, "0.0.0.0", () => {
          this.setupUdpSocket(sock);
          resolve();
        });
      };

      tryBindPort(0);
    });
  }

  setupUdpSocket(sock) {
    this.udpSocket = sock;
    this.udpBoundPort = sock.address().port;
    try {
      sock.setBroadcast(true);
    } catch {}
    try {
      sock.addMembership(MULTICAST_ADDR);
    } catch {}

    sock.on("message", (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString("utf8"));
        if (data?.magic !== "FREECORD_BEACON_V1") return;
        if (!data.peerId || data.peerId === this.profile.peerId) return;

        const host = rinfo.address === "0.0.0.0" ? "127.0.0.1" : rinfo.address;
        const peerRecord = {
          peerId: data.peerId,
          username: data.username || "Peer",
          tag: data.tag || "0000",
          avatarColor: data.avatarColor || "#5865F2",
          status: data.status || "online",
          customStatus: data.customStatus || "",
          host,
          tcpPort: Number(data.tcpPort),
          addresses: Array.isArray(data.addresses) ? data.addresses : [host],
          lastSeen: Date.now(),
          isConnected: this.peers.has(data.peerId),
        };

        const isNew = !this.discoveredLanPeers.has(data.peerId);
        this.discoveredLanPeers.set(data.peerId, peerRecord);

        if (isNew) {
          this.emit("lan-peers-updated", this.getLanPeersList());
          // Auto-connect to newly discovered LAN/local peers if not already connected!
          // Tie-breaker or immediate connect if we don't have a socket yet
          if (!this.peers.has(data.peerId) && data.tcpPort > 0) {
            this.connectToPeer(host, data.tcpPort).catch(() => {});
          }
        } else {
          this.emit("lan-peers-updated", this.getLanPeersList());
        }
      } catch {
        // Ignore non-Freecord UDP packets
      }
    });

    console.log(`[Freecord P2P] UDP Discovery active on port ${this.udpBoundPort}`);
  }

  broadcastPresenceBeacon() {
    if (!this.udpSocket || !this.tcpPort) return;
    const localAddrs = getLocalIPv4Addresses().map((a) => a.address);
    const payload = Buffer.from(
      JSON.stringify({
        magic: "FREECORD_BEACON_V1",
        peerId: this.profile.peerId,
        username: this.profile.username,
        tag: this.profile.tag,
        avatarColor: this.profile.avatarColor,
        status: this.profile.status,
        customStatus: this.profile.customStatus,
        tcpPort: this.tcpPort,
        addresses: localAddrs,
        timestamp: Date.now(),
      }),
      "utf8"
    );

    for (const port of DISCOVERY_PORTS) {
      // 1. Localhost (for multi-instance testing on same PC)
      this.udpSocket.send(payload, 0, payload.length, port, "127.0.0.1", () => {});
      // 2. LAN Broadcast
      this.udpSocket.send(payload, 0, payload.length, port, "255.255.255.255", () => {});
      // 3. Multicast group
      this.udpSocket.send(payload, 0, payload.length, port, MULTICAST_ADDR, () => {});
    }
  }

  pruneStaleLanPeers() {
    const now = Date.now();
    let changed = false;
    for (const [peerId, rec] of this.discoveredLanPeers.entries()) {
      if (now - rec.lastSeen > 15000) {
        this.discoveredLanPeers.delete(peerId);
        changed = true;
      } else {
        const connected = this.peers.has(peerId);
        if (rec.isConnected !== connected) {
          rec.isConnected = connected;
          changed = true;
        }
      }
    }
    if (changed) {
      this.emit("lan-peers-updated", this.getLanPeersList());
    }
  }

  connectToPeer(host, port) {
    return new Promise((resolve, reject) => {
      const cleanHost = String(host).trim();
      const cleanPort = Number(port);
      if (!cleanHost || !Number.isFinite(cleanPort) || cleanPort <= 0 || cleanPort > 65535) {
        return reject(new Error("Endereço IP ou Porta inválidos."));
      }

      if (
        (cleanHost === "127.0.0.1" || cleanHost === "localhost") &&
        cleanPort === this.tcpPort
      ) {
        return reject(new Error("Não é possível conectar na própria porta local."));
      }

      // Check if already connected to this host:port
      for (const peer of this.peers.values()) {
        if (peer.address === cleanHost && peer.port === cleanPort) {
          return resolve(this.serializePeer(peer));
        }
      }

      const socket = net.createConnection({ host: cleanHost, port: cleanPort, timeout: 6000 });

      const onError = (err) => {
        socket.destroy();
        reject(new Error(`Falha ao conectar em ${cleanHost}:${cleanPort} (${err.message})`));
      };

      socket.once("error", onError);
      socket.once("timeout", () => onError(new Error("Tempo limite esgotado")));

      socket.once("connect", () => {
        socket.removeListener("error", onError);
        this.handleSocketConnection(socket, true, cleanHost, cleanPort, resolve);
      });
    });
  }

  handleSocketConnection(socket, isInitiator, remoteHostOverride = null, remotePortOverride = null, onHandshakeResolve = null) {
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 5000);

    let buffer = "";
    let associatedPeerId = null;

    const sendRaw = (obj) => {
      if (socket.destroyed) return false;
      try {
        socket.write(JSON.stringify(obj) + "\n");
        return true;
      } catch {
        return false;
      }
    };

    // Send HELLO handshake immediately
    sendRaw({
      type: "HELLO",
      profile: this.profile,
      tcpPort: this.tcpPort,
      addresses: getLocalIPv4Addresses().map((a) => a.address),
      voiceChannelId: this.currentVoiceChannelId || null,
      voiceState: this.currentVoiceState || {},
      timestamp: Date.now(),
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let newlineIdx;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (!line) continue;

        try {
          const packet = JSON.parse(line);
          this.handlePacket(socket, sendRaw, packet, {
            isInitiator,
            remoteHostOverride,
            remotePortOverride,
            getAssociatedPeerId: () => associatedPeerId,
            setAssociatedPeerId: (id) => {
              associatedPeerId = id;
            },
            onHandshakeResolve,
          });
        } catch (err) {
          console.warn("[Freecord P2P] Malformed packet ignored:", err.message);
        }
      }
    });

    const cleanup = () => {
      if (associatedPeerId && this.peers.get(associatedPeerId)?.socket === socket) {
        const departing = this.peers.get(associatedPeerId);
        this.peers.delete(associatedPeerId);
        // Remove from voice channels
        for (const [chId, set] of this.voicePresence.entries()) {
          if (set.has(associatedPeerId)) {
            set.delete(associatedPeerId);
          }
        }
        this.emit("peers-updated", this.getConnectedPeersList());
        this.emit("peer-disconnected", {
          peerId: associatedPeerId,
          profile: departing?.info,
        });
      }
    };

    socket.on("close", cleanup);
    socket.on("error", cleanup);
  }

  handlePacket(socket, sendRaw, packet, ctx) {
    switch (packet.type) {
      case "HELLO": {
        const remoteProfile = packet.profile;
        if (!remoteProfile || !remoteProfile.peerId) return;
        const remotePeerId = remoteProfile.peerId;

        if (remotePeerId === this.profile.peerId) {
          socket.destroy();
          return;
        }

        // Deduplicate simultaneous connections
        if (this.peers.has(remotePeerId)) {
          const existing = this.peers.get(remotePeerId);
          if (existing.socket !== socket && !existing.socket.destroyed) {
            // Deterministic tie-breaker by peerId
            if (ctx.isInitiator && this.profile.peerId < remotePeerId) {
              socket.destroy();
              if (ctx.onHandshakeResolve) {
                ctx.onHandshakeResolve(this.serializePeer(existing));
              }
              return;
            } else {
              existing.socket.destroy();
            }
          }
        }

        ctx.setAssociatedPeerId(remotePeerId);
        const remoteAddr = (
          ctx.remoteHostOverride ||
          socket.remoteAddress?.replace(/^::ffff:/, "") ||
          "127.0.0.1"
        );
        const remotePort = Number(packet.tcpPort || ctx.remotePortOverride || socket.remotePort || 0);
        const fingerprint = computePairwiseFingerprint(this.profile.peerId, remotePeerId);

        const peerEntry = {
          peerId: remotePeerId,
          socket,
          sendRaw,
          info: remoteProfile,
          address: remoteAddr,
          port: remotePort,
          addresses: packet.addresses || [remoteAddr],
          connectedAt: Date.now(),
          rttMs: Math.max(1, Date.now() - (packet.timestamp || Date.now())),
          fingerprint,
          voiceChannelId: packet.voiceChannelId || null,
          voiceState: packet.voiceState || {
            muted: false,
            deafened: false,
            speaking: false,
            screenSharing: false,
            videoEnabled: false,
          },
        };

        this.peers.set(remotePeerId, peerEntry);

        if (packet.voiceChannelId) {
          if (!this.voicePresence.has(packet.voiceChannelId)) {
            this.voicePresence.set(packet.voiceChannelId, new Set());
          }
          this.voicePresence.get(packet.voiceChannelId).add(remotePeerId);
        }

        if (this.discoveredLanPeers.has(remotePeerId)) {
          this.discoveredLanPeers.get(remotePeerId).isConnected = true;
          this.emit("lan-peers-updated", this.getLanPeersList());
        }

        const serialized = this.serializePeer(peerEntry);
        this.emit("peers-updated", this.getConnectedPeersList());
        this.emit("peer-connected", serialized);

        // Exchange known mesh peer list (Gossip / Mesh Discovery)
        const knownEndpoints = [];
        for (const [id, p] of this.peers.entries()) {
          if (id !== remotePeerId && p.port > 0) {
            knownEndpoints.push({
              peerId: id,
              host: p.address,
              port: p.port,
              username: p.info?.username,
            });
          }
        }
        if (knownEndpoints.length > 0) {
          sendRaw({ type: "PEER_EXCHANGE", peers: knownEndpoints });
        }

        if (ctx.onHandshakeResolve) {
          ctx.onHandshakeResolve(serialized);
        }
        break;
      }

      case "PEER_EXCHANGE": {
        if (!Array.isArray(packet.peers)) return;
        for (const p of packet.peers) {
          if (p.peerId && p.peerId !== this.profile.peerId && !this.peers.has(p.peerId) && p.host && p.port) {
            this.connectToPeer(p.host, p.port).catch(() => {});
          }
        }
        break;
      }

      case "PING": {
        sendRaw({ type: "PONG", sentAt: packet.sentAt });
        break;
      }

      case "PONG": {
        const peerId = ctx.getAssociatedPeerId();
        if (peerId && this.peers.has(peerId)) {
          const peer = this.peers.get(peerId);
          peer.rttMs = Math.max(1, Date.now() - (packet.sentAt || Date.now()));
          this.emit("peers-updated", this.getConnectedPeersList());
        }
        break;
      }

      case "PROFILE_UPDATE": {
        const peerId = ctx.getAssociatedPeerId();
        if (peerId && this.peers.has(peerId) && packet.profile) {
          const peer = this.peers.get(peerId);
          peer.info = { ...peer.info, ...packet.profile, peerId };
          this.emit("peers-updated", this.getConnectedPeersList());
        }
        break;
      }

      case "CHAT_MESSAGE":
      case "CHAT_REACTION":
      case "TYPING_STATE":
      case "ROOM_SYNC":
      case "VOICE_STATE":
      case "VOICE_SPEAKING":
      case "WEBRTC_SIGNAL":
      case "MEDIA_FRAME":
      case "AUDIO_CHUNK": {
        const senderId = ctx.getAssociatedPeerId();
        if (!senderId) return;
        if (packet.type === "VOICE_STATE") {
          const peer = this.peers.get(senderId);
          if (peer) {
            peer.voiceChannelId = packet.channelId || null;
            peer.voiceState = packet.voiceState || {};
            this.emit("peers-updated", this.getConnectedPeersList());
          }
        } else if (packet.type === "VOICE_SPEAKING") {
          const peer = this.peers.get(senderId);
          if (peer) {
            peer.voiceState = { ...(peer.voiceState || {}), speaking: Boolean(packet.speaking) };
          }
        }
        this.emit("p2p-event", {
          ...packet,
          fromPeerId: senderId,
        });
        break;
      }
    }
  }

  pingConnectedPeers() {
    const now = Date.now();
    for (const peer of this.peers.values()) {
      peer.sendRaw({ type: "PING", sentAt: now });
    }
  }

  broadcast(packet, targetPeerId = null) {
    if (targetPeerId) {
      const peer = this.peers.get(targetPeerId);
      if (peer) {
        return peer.sendRaw(packet);
      }
      return false;
    }

    let count = 0;
    for (const peer of this.peers.values()) {
      if (peer.sendRaw(packet)) count++;
    }
    return count;
  }

  updateProfile(partial) {
    this.saveProfile(partial);
    this.broadcast({
      type: "PROFILE_UPDATE",
      profile: this.profile,
    });
    this.broadcastPresenceBeacon();
    return this.profile;
  }

  setVoiceChannelState(channelId, voiceState = {}) {
    this.currentVoiceChannelId = channelId || null;
    this.currentVoiceState = voiceState || {};
    this.broadcast({
      type: "VOICE_STATE",
      channelId: this.currentVoiceChannelId,
      voiceState: this.currentVoiceState,
    });
  }

  disconnectPeer(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.socket.destroy();
      this.peers.delete(peerId);
      this.emit("peers-updated", this.getConnectedPeersList());
      return true;
    }
    return false;
  }

  serializePeer(peer) {
    const info = peer.info || {};
    return {
      peerId: peer.peerId,
      displayName: info.displayName || info.username || "Peer",
      username: info.username || "peer",
      tag: info.tag || "0000",
      pronouns: info.pronouns || "",
      bio: info.bio || "",
      avatarColor: info.avatarColor || "#5865F2",
      avatarUrl: info.avatarUrl || null,
      bannerColor: info.bannerColor || "#5865F2",
      bannerUrl: info.bannerUrl || null,
      accentColorPrimary: info.accentColorPrimary || "#1e1f22",
      accentColorSecondary: info.accentColorSecondary || "#2b2d31",
      status: info.status || "online",
      statusEmoji: info.statusEmoji || "⚡",
      customStatus: info.customStatus || "",
      badges: Array.isArray(info.badges) ? info.badges : ["P2P Node"],
      address: peer.address,
      port: peer.port,
      addresses: peer.addresses || [peer.address],
      connectedAt: peer.connectedAt,
      rttMs: peer.rttMs || 1,
      fingerprint: peer.fingerprint,
      voiceChannelId: peer.voiceChannelId || null,
      voiceState: peer.voiceState || { muted: false, deafened: false, speaking: false, screenSharing: false, videoEnabled: false },
    };
  }

  getConnectedPeersList() {
    return Array.from(this.peers.values()).map((p) => this.serializePeer(p));
  }

  getLanPeersList() {
    return Array.from(this.discoveredLanPeers.values()).map((p) => ({
      ...p,
      isConnected: this.peers.has(p.peerId),
    }));
  }

  getNodeStatus() {
    const localInterfaces = getLocalIPv4Addresses();
    return {
      instanceId: this.instanceId,
      profile: this.profile,
      tcpPort: this.tcpPort,
      udpDiscoveryPort: this.udpBoundPort,
      localAddresses: localInterfaces,
      connectionStrings: localInterfaces.map((i) => `${i.address}:${this.tcpPort}`),
      localhostEndpoint: `127.0.0.1:${this.tcpPort}`,
      connectedPeers: this.getConnectedPeersList(),
      lanPeers: this.getLanPeersList(),
    };
  }

  stop() {
    if (this.beaconTimer) clearInterval(this.beaconTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    for (const peer of this.peers.values()) {
      try {
        peer.socket.destroy();
      } catch {}
    }
    this.peers.clear();
    if (this.udpSocket) {
      try {
        this.udpSocket.close();
      } catch {}
    }
    if (this.tcpServer) {
      try {
        this.tcpServer.close();
      } catch {}
    }
  }
}

module.exports = { P2PNode, computePairwiseFingerprint, getLocalIPv4Addresses };
