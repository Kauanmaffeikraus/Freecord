// Reconstructed from DiscordPTB modules/discord_voice-1/discord_voice/index.js
// Adapts VoiceConnection to 100% Serverless P2P WebRTC (direct peer-to-peer mesh without central SFU/server)

export class WebRTCVoiceEngine {
  constructor({ onSignalSend, onRemoteStream, onSpeakingChange, onStatsUpdate, onDataChannelMessage, onManualPeerConnected }) {
    this.onSignalSend = onSignalSend;
    this.onRemoteStream = onRemoteStream;
    this.onSpeakingChange = onSpeakingChange;
    this.onStatsUpdate = onStatsUpdate;
    this.onDataChannelMessage = onDataChannelMessage;
    this.onManualPeerConnected = onManualPeerConnected;

    // Map<peerId, { pc, dataChannel, remoteStream, audioEl, gainNode, pannerNode, volume, muted, stats }>
    this.connections = new Map();
    this.localAudioStream = null;
    this.localVideoStream = null;
    this.localScreenStream = null;

    this.selfMute = false;
    this.selfDeafen = false;
    this.localSpeaking = false;

    this.audioContext = null;
    this.vadInterval = null;
    this.statsInterval = null;
  }

  ensureAudioContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  async startLocalVoice() {
    if (this.localAudioStream) return this.localAudioStream;
    try {
      this.localAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      this.applyMuteState();
      this.startVoiceActivityDetector(this.localAudioStream);
      return this.localAudioStream;
    } catch (err) {
      console.warn("[Freecord VoiceEngine] Microphone unavailable, creating silent oscillator track:", err.message);
      const ctx = this.ensureAudioContext();
      const dest = ctx.createMediaStreamDestination();
      this.localAudioStream = dest.stream;
      return this.localAudioStream;
    }
  }

  startVoiceActivityDetector(stream) {
    try {
      const ctx = this.ensureAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      if (this.vadInterval) clearInterval(this.vadInterval);
      this.vadInterval = setInterval(() => {
        if (this.selfMute || this.selfDeafen) {
          if (this.localSpeaking) {
            this.localSpeaking = false;
            this.onSpeakingChange?.("self", false);
          }
          return;
        }
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        const speaking = avg > 14;
        if (speaking !== this.localSpeaking) {
          this.localSpeaking = speaking;
          this.onSpeakingChange?.("self", speaking);
        }
      }, 120);
    } catch {}
  }

  setSelfMute(mute) {
    this.selfMute = Boolean(mute);
    this.applyMuteState();
  }

  setSelfDeafen(deaf) {
    this.selfDeafen = Boolean(deaf);
    if (this.selfDeafen) {
      this.selfMute = true;
    }
    this.applyMuteState();
    for (const conn of this.connections.values()) {
      if (conn.audioEl) {
        conn.audioEl.muted = this.selfDeafen || conn.muted;
      }
    }
  }

  applyMuteState() {
    if (!this.localAudioStream) return;
    for (const track of this.localAudioStream.getAudioTracks()) {
      track.enabled = !this.selfMute && !this.selfDeafen;
    }
  }

  // Matches discord_voice setLocalVolume(userId, volume)
  setLocalVolume(peerId, volumePercent) {
    const conn = this.connections.get(peerId);
    if (!conn) return;
    conn.volume = Math.max(0, Math.min(200, Number(volumePercent)));
    if (conn.gainNode) {
      conn.gainNode.gain.value = conn.volume / 100;
    } else if (conn.audioEl) {
      conn.audioEl.volume = Math.min(1, conn.volume / 100);
    }
  }

  // Matches discord_voice setLocalMute(userId, mute)
  setLocalMute(peerId, mute) {
    const conn = this.connections.get(peerId);
    if (!conn) return;
    conn.muted = Boolean(mute);
    if (conn.audioEl) {
      conn.audioEl.muted = this.selfDeafen || conn.muted;
    }
  }

  async setVideoBroadcast(enable) {
    if (!enable) {
      if (this.localVideoStream) {
        this.localVideoStream.getTracks().forEach((t) => t.stop());
        this.localVideoStream = null;
      }
      await this.syncTracksWithPeers();
      return null;
    }
    try {
      this.localVideoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      await this.syncTracksWithPeers();
      return this.localVideoStream;
    } catch (err) {
      console.warn("[Freecord VoiceEngine] Camera error:", err.message);
      throw err;
    }
  }

  // Matches discord_voice setDesktopSourceWithOptions / Go Live Screen Share
  async setDesktopSource(sourceId = null) {
    if (!sourceId) {
      if (this.localScreenStream) {
        this.localScreenStream.getTracks().forEach((t) => t.stop());
        this.localScreenStream = null;
      }
      await this.syncTracksWithPeers();
      return null;
    }

    try {
      if (sourceId !== "browser-display" && window.DiscordNative?.isRenderer) {
        this.localScreenStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: sourceId,
              maxWidth: 1920,
              maxHeight: 1080,
              maxFrameRate: 30,
            },
          },
        });
      } else {
        this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
          audio: true,
        });
      }

      const [videoTrack] = this.localScreenStream.getVideoTracks();
      if (videoTrack) {
        videoTrack.onended = () => {
          this.localScreenStream = null;
          this.syncTracksWithPeers();
        };
      }

      await this.syncTracksWithPeers();
      return this.localScreenStream;
    } catch (err) {
      console.warn("[Freecord VoiceEngine] Desktop source capture failed:", err.message);
      throw err;
    }
  }

  createPeerConnection(peerId, isInitiator = false) {
    if (this.connections.has(peerId)) {
      return this.connections.get(peerId);
    }

    // Host/LAN candidates work with zero STUN server; public STUN fallback included for NAT
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    const remoteStream = new MediaStream();
    const audioEl = new Audio();
    audioEl.autoplay = true;
    audioEl.srcObject = remoteStream;
    audioEl.muted = this.selfDeafen;

    const conn = {
      peerId,
      pc,
      dataChannel: null,
      remoteStream,
      audioEl,
      gainNode: null,
      volume: 100,
      muted: false,
      stats: { rttMs: 0, bytesSent: 0, bytesReceived: 0, codec: "opus / VP8" },
    };

    this.connections.set(peerId, conn);

    // Add existing local tracks
    this.attachLocalTracksToPc(pc);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.onSignalSend?.(peerId, {
          signalType: "ice-candidate",
          candidate: e.candidate,
        });
      }
    };

    pc.ontrack = (e) => {
      if (e.streams && e.streams[0]) {
        for (const track of e.streams[0].getTracks()) {
          if (!remoteStream.getTracks().some((t) => t.id === track.id)) {
            remoteStream.addTrack(track);
          }
        }
      } else if (e.track) {
        remoteStream.addTrack(e.track);
      }
      audioEl.srcObject = remoteStream;
      audioEl.play().catch(() => {});
      this.setupRemoteAudioGraph(conn);
      this.onRemoteStream?.(peerId, remoteStream);
    };

    if (isInitiator) {
      const dc = pc.createDataChannel("freecord-p2p-bus", { ordered: true });
      this.bindDataChannel(conn, dc);
    } else {
      pc.ondatachannel = (e) => {
        this.bindDataChannel(conn, e.channel);
      };
    }

    this.ensureStatsLoop();
    return conn;
  }

  bindDataChannel(conn, dc) {
    conn.dataChannel = dc;
    dc.onopen = () => {
      this.onManualPeerConnected?.(conn.peerId);
    };
    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        this.onDataChannelMessage?.(conn.peerId, msg);
      } catch {}
    };
  }

  sendViaDataChannel(packet, targetPeerId = null) {
    const raw = JSON.stringify(packet);
    let sent = 0;
    for (const [id, conn] of this.connections.entries()) {
      if (targetPeerId && id !== targetPeerId) continue;
      if (conn.dataChannel && conn.dataChannel.readyState === "open") {
        conn.dataChannel.send(raw);
        sent++;
      }
    }
    return sent;
  }

  setupRemoteAudioGraph(conn) {
    try {
      if (conn.gainNode || conn.remoteStream.getAudioTracks().length === 0) return;
      const ctx = this.ensureAudioContext();
      const source = ctx.createMediaStreamSource(conn.remoteStream);
      const gainNode = ctx.createGain();
      gainNode.gain.value = conn.volume / 100;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(gainNode);
      gainNode.connect(analyser);
      gainNode.connect(ctx.destination);
      conn.gainNode = gainNode;
      conn.analyser = analyser;
    } catch {}
  }

  attachLocalTracksToPc(pc) {
    const existingSenders = pc.getSenders();
    const addStreamTracks = (stream) => {
      if (!stream) return;
      for (const track of stream.getTracks()) {
        if (!existingSenders.some((s) => s.track && s.track.id === track.id)) {
          pc.addTrack(track, stream);
        }
      }
    };
    addStreamTracks(this.localAudioStream);
    addStreamTracks(this.localScreenStream || this.localVideoStream);
  }

  async syncTracksWithPeers() {
    for (const [peerId, conn] of this.connections.entries()) {
      const senders = conn.pc.getSenders();
      const activeVideoTrack =
        this.localScreenStream?.getVideoTracks()[0] ||
        this.localVideoStream?.getVideoTracks()[0] ||
        null;

      const videoSender = senders.find((s) => s.track?.kind === "video");
      if (videoSender) {
        await videoSender.replaceTrack(activeVideoTrack);
      } else if (activeVideoTrack) {
        conn.pc.addTrack(
          activeVideoTrack,
          this.localScreenStream || this.localVideoStream
        );
        await this.negotiateWithPeer(peerId);
      }
    }
  }

  async negotiateWithPeer(peerId) {
    await this.startLocalVoice();
    const conn = this.createPeerConnection(peerId, true);
    this.attachLocalTracksToPc(conn.pc);
    const offer = await conn.pc.createOffer();
    await conn.pc.setLocalDescription(offer);
    this.onSignalSend?.(peerId, {
      signalType: "offer",
      sdp: conn.pc.localDescription,
    });
  }

  async handleIncomingSignal(fromPeerId, signal) {
    await this.startLocalVoice();
    const conn = this.createPeerConnection(fromPeerId, false);
    this.attachLocalTracksToPc(conn.pc);

    if (signal.signalType === "offer") {
      await conn.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await conn.pc.createAnswer();
      await conn.pc.setLocalDescription(answer);
      this.onSignalSend?.(fromPeerId, {
        signalType: "answer",
        sdp: conn.pc.localDescription,
      });
    } else if (signal.signalType === "answer") {
      await conn.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    } else if (signal.signalType === "ice-candidate" && signal.candidate) {
      try {
        await conn.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } catch {}
    }
  }

  // Serverless Manual WebRTC SDP Invite Code (for Browser-to-Browser or strict NAT without port forwarding)
  async createManualInviteOffer(localProfile) {
    await this.startLocalVoice();
    const tempPeerId = `webrtc_${Math.random().toString(36).slice(2, 8)}`;
    const conn = this.createPeerConnection(tempPeerId, true);

    const offer = await conn.pc.createOffer();
    await conn.pc.setLocalDescription(offer);

    await this.waitForIceGatheringComplete(conn.pc, 2200);

    const tokenPayload = {
      v: 1,
      kind: "offer",
      peerId: localProfile.peerId,
      username: localProfile.username,
      tag: localProfile.tag,
      avatarColor: localProfile.avatarColor,
      sdp: conn.pc.localDescription,
    };

    conn.pendingManualOffer = true;
    return {
      tempPeerId,
      inviteCode: btoa(unescape(encodeURIComponent(JSON.stringify(tokenPayload)))),
    };
  }

  async acceptManualInviteCode(inviteCode, localProfile) {
    const decoded = JSON.parse(decodeURIComponent(escape(atob(inviteCode.trim()))));
    if (!decoded || !decoded.sdp) {
      throw new Error("Invalid P2P invite code.");
    }

    await this.startLocalVoice();

    if (decoded.kind === "offer") {
      const remotePeerId = decoded.peerId || `webrtc_${Math.random().toString(36).slice(2, 8)}`;
      const conn = this.createPeerConnection(remotePeerId, false);
      conn.manualProfile = {
        peerId: remotePeerId,
        username: decoded.username || "WebRTC Peer",
        tag: decoded.tag || "0000",
        avatarColor: decoded.avatarColor || "#57F287",
      };

      await conn.pc.setRemoteDescription(new RTCSessionDescription(decoded.sdp));
      const answer = await conn.pc.createAnswer();
      await conn.pc.setLocalDescription(answer);
      await this.waitForIceGatheringComplete(conn.pc, 2200);

      const answerPayload = {
        v: 1,
        kind: "answer",
        peerId: localProfile.peerId,
        username: localProfile.username,
        tag: localProfile.tag,
        avatarColor: localProfile.avatarColor,
        sdp: conn.pc.localDescription,
      };

      return {
        mode: "answer-generated",
        remoteProfile: conn.manualProfile,
        answerCode: btoa(unescape(encodeURIComponent(JSON.stringify(answerPayload)))),
      };
    } else if (decoded.kind === "answer") {
      // Find pending manual offer connection
      let targetConn = null;
      for (const conn of this.connections.values()) {
        if (conn.pendingManualOffer || conn.pc.signalingState === "have-local-offer") {
          targetConn = conn;
          break;
        }
      }
      if (!targetConn) {
        throw new Error("No pending WebRTC offer found to apply this answer.");
      }

      targetConn.pendingManualOffer = false;
      targetConn.manualProfile = {
        peerId: decoded.peerId || targetConn.peerId,
        username: decoded.username || "WebRTC Peer",
        tag: decoded.tag || "0000",
        avatarColor: decoded.avatarColor || "#5865F2",
      };
      await targetConn.pc.setRemoteDescription(new RTCSessionDescription(decoded.sdp));
      return {
        mode: "connected",
        remoteProfile: targetConn.manualProfile,
      };
    }
    throw new Error("Unknown P2P invite code type.");
  }

  waitForIceGatheringComplete(pc, timeoutMs = 2000) {
    if (pc.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }, timeoutMs);
      const check = () => {
        if (pc.iceGatheringState === "complete") {
          clearTimeout(timer);
          pc.removeEventListener("icegatheringstatechange", check);
          resolve();
        }
      };
      pc.addEventListener("icegatheringstatechange", check);
    });
  }

  ensureStatsLoop() {
    if (this.statsInterval) return;
    this.statsInterval = setInterval(async () => {
      const summary = {};
      for (const [peerId, conn] of this.connections.entries()) {
        try {
          const report = await conn.pc.getStats();
          let rttMs = conn.stats.rttMs;
          let bytesSent = 0;
          let bytesReceived = 0;
          report.forEach((stat) => {
            if (stat.type === "candidate-pair" && stat.state === "succeeded" && stat.currentRoundTripTime != null) {
              rttMs = Math.round(stat.currentRoundTripTime * 1000);
            }
            if (stat.type === "outbound-rtp") {
              bytesSent += stat.bytesSent || 0;
            }
            if (stat.type === "inbound-rtp") {
              bytesReceived += stat.bytesReceived || 0;
            }
          });
          conn.stats = { rttMs, bytesSent, bytesReceived, state: conn.pc.connectionState };
          summary[peerId] = conn.stats;
        } catch {}
      }
      this.onStatsUpdate?.(summary);
    }, 2500);
  }

  destroyPeer(peerId) {
    const conn = this.connections.get(peerId);
    if (!conn) return;
    try {
      conn.pc.close();
    } catch {}
    if (conn.audioEl) {
      conn.audioEl.srcObject = null;
    }
    this.connections.delete(peerId);
  }

  destroyAll() {
    for (const peerId of Array.from(this.connections.keys())) {
      this.destroyPeer(peerId);
    }
    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach((t) => t.stop());
      this.localAudioStream = null;
    }
    if (this.localVideoStream) {
      this.localVideoStream.getTracks().forEach((t) => t.stop());
      this.localVideoStream = null;
    }
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach((t) => t.stop());
      this.localScreenStream = null;
    }
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }
}
