// Reconstructed from DiscordPTB modules/discord_voice-1/discord_voice/index.js
// Adapts VoiceConnection to 100% Serverless P2P WebRTC (direct peer-to-peer mesh without central SFU/server)

export const SCREEN_RESOLUTIONS = {
  "720p": { label: "720p HD (1280×720)", width: 1280, height: 720 },
  "1080p": { label: "1080p Full HD (1920×1080)", width: 1920, height: 1080 },
  "1440p": { label: "1440p QHD (2560×1440)", width: 2560, height: 1440 },
  "4k": { label: "4K Ultra HD (3840×2160)", width: 3840, height: 2160 },
};

export const CAMERA_RESOLUTIONS = {
  "480p": { label: "480p SD (854×480)", width: 854, height: 480 },
  "720p": { label: "720p HD (1280×720)", width: 1280, height: 720 },
  "1080p": { label: "1080p Full HD (1920×1080)", width: 1920, height: 1080 },
};

export const SCREEN_FPS_OPTIONS = [15, 30, 60];

export class WebRTCVoiceEngine {
  constructor({
    onSignalSend,
    onRemoteStream,
    onSpeakingChange,
    onInputLevelChange,
    onStatsUpdate,
    onDataChannelMessage,
    onManualPeerConnected,
  }) {
    this.onSignalSend = onSignalSend;
    this.onRemoteStream = onRemoteStream;
    this.onSpeakingChange = onSpeakingChange;
    this.onInputLevelChange = onInputLevelChange;
    this.onStatsUpdate = onStatsUpdate;
    this.onDataChannelMessage = onDataChannelMessage;
    this.onManualPeerConnected = onManualPeerConnected;

    // Map<peerId, { pc, dataChannel, remoteStream, audioEl, gainNode, pannerNode, volume, muted, stats }>
    this.connections = new Map();
    this.localAudioStream = null;
    this.localVideoStream = null;
    this.localScreenStream = null;
    this.activeDesktopSourceId = null;

    this.selfMute = false;
    this.selfDeafen = false;
    this.localSpeaking = false;

    // Media Device & Quality Preferences
    this.audioInputDeviceId = "default";
    this.audioOutputDeviceId = "default";
    this.videoInputDeviceId = "default";
    this.cameraResolution = "720p";
    this.screenResolution = "1080p";
    this.screenFrameRate = 30;
    this.echoCancellation = true;
    this.noiseSuppression = true;
    this.autoGainControl = true;
    this.masterOutputVolume = 100;

    this.audioContext = null;
    this.vadInterval = null;
    this.statsInterval = null;
  }

  static async enumerateDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return { audioInputs: [], audioOutputs: [], videoInputs: [] };
    }
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      return {
        audioInputs: list.filter((d) => d.kind === "audioinput"),
        audioOutputs: list.filter((d) => d.kind === "audiooutput"),
        videoInputs: list.filter((d) => d.kind === "videoinput"),
      };
    } catch {
      return { audioInputs: [], audioOutputs: [], videoInputs: [] };
    }
  }

  ensureAudioContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.applySinkIdToAudioContext();
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  async applySinkIdToAudioContext() {
    if (!this.audioContext || typeof this.audioContext.setSinkId !== "function") return;
    try {
      const sinkId =
        this.audioOutputDeviceId && this.audioOutputDeviceId !== "default"
          ? this.audioOutputDeviceId
          : "";
      await this.audioContext.setSinkId(sinkId);
    } catch {}
  }

  async applySinkIdToElement(audioEl) {
    if (!audioEl || typeof audioEl.setSinkId !== "function") return;
    try {
      const sinkId =
        this.audioOutputDeviceId && this.audioOutputDeviceId !== "default"
          ? this.audioOutputDeviceId
          : "";
      await audioEl.setSinkId(sinkId);
    } catch {}
  }

  buildAudioConstraints() {
    const constraints = {
      echoCancellation: this.echoCancellation,
      noiseSuppression: this.noiseSuppression,
      autoGainControl: this.autoGainControl,
    };
    if (this.audioInputDeviceId && this.audioInputDeviceId !== "default") {
      constraints.deviceId = { exact: this.audioInputDeviceId };
    }
    return constraints;
  }

  async startLocalVoice(forceRestart = false) {
    if (this.localAudioStream && !forceRestart) return this.localAudioStream;

    if (this.localAudioStream && forceRestart) {
      this.localAudioStream.getTracks().forEach((t) => t.stop());
      this.localAudioStream = null;
    }

    try {
      this.localAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: this.buildAudioConstraints(),
        video: false,
      });
      this.applyMuteState();
      this.startVoiceActivityDetector(this.localAudioStream);
      await this.syncAudioTrackWithPeers();
      return this.localAudioStream;
    } catch (err) {
      // Fallback to default audio input if specific deviceId failed
      if (this.audioInputDeviceId !== "default") {
        try {
          this.audioInputDeviceId = "default";
          this.localAudioStream = await navigator.mediaDevices.getUserMedia({
            audio: this.buildAudioConstraints(),
            video: false,
          });
          this.applyMuteState();
          this.startVoiceActivityDetector(this.localAudioStream);
          await this.syncAudioTrackWithPeers();
          return this.localAudioStream;
        } catch {}
      }
      console.warn(
        "[Freecord VoiceEngine] Microphone unavailable, creating silent oscillator track:",
        err.message
      );
      const ctx = this.ensureAudioContext();
      const dest = ctx.createMediaStreamDestination();
      this.localAudioStream = dest.stream;
      return this.localAudioStream;
    }
  }

  async setAudioInputDevice(deviceId, processingOptions = {}) {
    if (deviceId !== undefined) {
      this.audioInputDeviceId = deviceId || "default";
    }
    if (processingOptions.echoCancellation !== undefined) {
      this.echoCancellation = Boolean(processingOptions.echoCancellation);
    }
    if (processingOptions.noiseSuppression !== undefined) {
      this.noiseSuppression = Boolean(processingOptions.noiseSuppression);
    }
    if (processingOptions.autoGainControl !== undefined) {
      this.autoGainControl = Boolean(processingOptions.autoGainControl);
    }
    if (this.localAudioStream) {
      await this.startLocalVoice(true);
    }
  }

  async setAudioOutputDevice(deviceId) {
    this.audioOutputDeviceId = deviceId || "default";
    await this.applySinkIdToAudioContext();
    for (const conn of this.connections.values()) {
      if (conn.audioEl) {
        await this.applySinkIdToElement(conn.audioEl);
      }
    }
  }

  setMasterOutputVolume(volumePercent) {
    this.masterOutputVolume = Math.max(0, Math.min(200, Number(volumePercent)));
    for (const [peerId, conn] of this.connections.entries()) {
      this.setLocalVolume(peerId, conn.volume);
    }
  }

  async playTestOutputTone() {
    const ctx = this.ensureAudioContext();
    await this.applySinkIdToAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.14); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.28); // G5
    gain.gain.setValueAtTime(0.18 * (this.masterOutputVolume / 100), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.56);
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
          this.onInputLevelChange?.(0);
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
        const levelPercent = Math.min(100, Math.round((avg / 65) * 100));
        this.onInputLevelChange?.(levelPercent);
        const speaking = avg > 14;
        if (speaking !== this.localSpeaking) {
          this.localSpeaking = speaking;
          this.onSpeakingChange?.("self", speaking);
        }
      }, 100);
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
    const effectiveGain = (conn.volume / 100) * (this.masterOutputVolume / 100);
    if (conn.gainNode) {
      conn.gainNode.gain.value = effectiveGain;
    } else if (conn.audioEl) {
      conn.audioEl.volume = Math.min(1, effectiveGain);
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

  async setVideoInputDevice(deviceId, resolutionKey = this.cameraResolution) {
    if (deviceId !== undefined) {
      this.videoInputDeviceId = deviceId || "default";
    }
    if (resolutionKey && CAMERA_RESOLUTIONS[resolutionKey]) {
      this.cameraResolution = resolutionKey;
    }
    if (this.localVideoStream) {
      return await this.setVideoBroadcast(true);
    }
    return null;
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

    if (this.localVideoStream) {
      this.localVideoStream.getTracks().forEach((t) => t.stop());
      this.localVideoStream = null;
    }

    const res = CAMERA_RESOLUTIONS[this.cameraResolution] || CAMERA_RESOLUTIONS["720p"];
    const videoConstraints = {
      width: { ideal: res.width },
      height: { ideal: res.height },
      frameRate: { ideal: 30 },
    };
    if (this.videoInputDeviceId && this.videoInputDeviceId !== "default") {
      videoConstraints.deviceId = { exact: this.videoInputDeviceId };
    }

    try {
      this.localVideoStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      await this.syncTracksWithPeers();
      return this.localVideoStream;
    } catch (err) {
      console.warn("[Freecord VoiceEngine] Camera error:", err.message);
      throw err;
    }
  }

  async setScreenShareQuality(resolutionKey, frameRate) {
    if (resolutionKey && SCREEN_RESOLUTIONS[resolutionKey]) {
      this.screenResolution = resolutionKey;
    }
    if (frameRate) {
      this.screenFrameRate = Number(frameRate);
    }

    // If screen sharing is active, apply new constraints or re-open desktop source
    if (this.localScreenStream) {
      const res = SCREEN_RESOLUTIONS[this.screenResolution] || SCREEN_RESOLUTIONS["1080p"];
      const fps = this.screenFrameRate || 30;
      const [videoTrack] = this.localScreenStream.getVideoTracks();
      if (videoTrack && typeof videoTrack.applyConstraints === "function") {
        try {
          await videoTrack.applyConstraints({
            width: { ideal: res.width, max: res.width },
            height: { ideal: res.height, max: res.height },
            frameRate: { ideal: fps, max: fps },
          });
          return this.localScreenStream;
        } catch {}
      }
      if (this.activeDesktopSourceId && this.activeDesktopSourceId !== "browser-display") {
        return await this.setDesktopSource(this.activeDesktopSourceId, {
          resolution: this.screenResolution,
          frameRate: this.screenFrameRate,
        });
      }
    }
    return this.localScreenStream;
  }

  // Matches discord_voice setDesktopSourceWithOptions / Go Live Screen Share
  async setDesktopSource(sourceId = null, options = {}) {
    if (!sourceId) {
      this.activeDesktopSourceId = null;
      if (this.localScreenStream) {
        this.localScreenStream.getTracks().forEach((t) => t.stop());
        this.localScreenStream = null;
      }
      await this.syncTracksWithPeers();
      return null;
    }

    if (options.resolution && SCREEN_RESOLUTIONS[options.resolution]) {
      this.screenResolution = options.resolution;
    }
    if (options.frameRate) {
      this.screenFrameRate = Number(options.frameRate);
    }

    const res = SCREEN_RESOLUTIONS[this.screenResolution] || SCREEN_RESOLUTIONS["1080p"];
    const fps = this.screenFrameRate || 30;

    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach((t) => t.stop());
      this.localScreenStream = null;
    }

    try {
      if (sourceId !== "browser-display" && window.DiscordNative?.isRenderer) {
        this.localScreenStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: sourceId,
              maxWidth: res.width,
              maxHeight: res.height,
              maxFrameRate: fps,
            },
          },
        });
      } else {
        this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: res.width, max: res.width },
            height: { ideal: res.height, max: res.height },
            frameRate: { ideal: fps, max: fps },
          },
          audio: true,
        });
      }

      this.activeDesktopSourceId = sourceId;
      const [videoTrack] = this.localScreenStream.getVideoTracks();
      if (videoTrack) {
        videoTrack.onended = () => {
          this.localScreenStream = null;
          this.activeDesktopSourceId = null;
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
    const remoteCameraStream = new MediaStream();
    const remoteScreenStream = new MediaStream();
    const audioEl = new Audio();
    audioEl.autoplay = true;
    audioEl.srcObject = remoteStream;
    audioEl.muted = this.selfDeafen;
    this.applySinkIdToElement(audioEl);

    const conn = {
      peerId,
      pc,
      dataChannel: null,
      remoteStream,
      remoteCameraStream,
      remoteScreenStream,
      remoteVideoTracks: new Map(), // trackId -> MediaStreamTrack
      remoteStreamMeta: { cameraTrackId: null, screenTrackId: null },
      cameraSender: null,
      screenSender: null,
      audioEl,
      gainNode: null,
      volume: 100,
      muted: false,
      stats: { rttMs: 0, bytesSent: 0, bytesReceived: 0, codec: "opus / VP8" },
    };

    this.connections.set(peerId, conn);

    // Add existing local tracks
    this.attachLocalTracksToConn(conn);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.onSignalSend?.(peerId, {
          signalType: "ice-candidate",
          candidate: e.candidate,
        });
      }
    };

    pc.ontrack = (e) => {
      const incomingTracks =
        e.streams && e.streams[0] ? e.streams[0].getTracks() : e.track ? [e.track] : [];

      for (const track of incomingTracks) {
        if (track.kind === "audio") {
          if (!remoteStream.getTracks().some((t) => t.id === track.id)) {
            remoteStream.addTrack(track);
          }
        } else if (track.kind === "video") {
          conn.remoteVideoTracks.set(track.id, track);
          track.onended = () => {
            conn.remoteVideoTracks.delete(track.id);
            this.rebuildRemoteVideoStreams(conn);
          };
        }
      }

      audioEl.srcObject = remoteStream;
      this.applySinkIdToElement(audioEl);
      audioEl.play().catch(() => {});
      this.setupRemoteAudioGraph(conn);
      this.rebuildRemoteVideoStreams(conn);
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
      gainNode.gain.value = (conn.volume / 100) * (this.masterOutputVolume / 100);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(gainNode);
      gainNode.connect(analyser);
      gainNode.connect(ctx.destination);
      conn.gainNode = gainNode;
      conn.analyser = analyser;
    } catch {}
  }

  buildLocalStreamMeta() {
    return {
      cameraTrackId: this.localVideoStream?.getVideoTracks()?.[0]?.id || null,
      screenTrackId: this.localScreenStream?.getVideoTracks()?.[0]?.id || null,
    };
  }

  rebuildRemoteVideoStreams(conn) {
    const activeVideoTracks = Array.from(conn.remoteVideoTracks.values()).filter(
      (t) => t.readyState !== "ended"
    );
    const meta = conn.remoteStreamMeta || {};

    let camTrack = null;
    let scrTrack = null;

    if (meta.cameraTrackId && conn.remoteVideoTracks.has(meta.cameraTrackId)) {
      camTrack = conn.remoteVideoTracks.get(meta.cameraTrackId);
    }
    if (meta.screenTrackId && conn.remoteVideoTracks.has(meta.screenTrackId)) {
      scrTrack = conn.remoteVideoTracks.get(meta.screenTrackId);
    }

    // Fallback assignment if metadata hasn't arrived yet
    for (const track of activeVideoTracks) {
      if (track === camTrack || track === scrTrack) continue;
      if (!scrTrack && meta.screenTrackId) {
        scrTrack = track;
      } else if (!camTrack) {
        camTrack = track;
      } else if (!scrTrack) {
        scrTrack = track;
      }
    }

    conn.remoteCameraStream = camTrack ? new MediaStream([camTrack]) : null;
    conn.remoteScreenStream = scrTrack ? new MediaStream([scrTrack]) : null;

    this.onRemoteStream?.(conn.peerId, {
      audioStream: conn.remoteStream,
      cameraStream: conn.remoteCameraStream,
      screenStream: conn.remoteScreenStream,
      videoTracksCount: activeVideoTracks.length,
    });
  }

  attachLocalTracksToConn(conn) {
    const pc = conn.pc;
    const existingSenders = pc.getSenders();
    if (this.localAudioStream) {
      for (const track of this.localAudioStream.getAudioTracks()) {
        if (!existingSenders.some((s) => s.track && s.track.id === track.id)) {
          pc.addTrack(track, this.localAudioStream);
        }
      }
    }

    const camTrack = this.localVideoStream?.getVideoTracks()?.[0] || null;
    if (camTrack && !conn.cameraSender) {
      conn.cameraSender = pc.addTrack(camTrack, this.localVideoStream);
    }

    const scrTrack = this.localScreenStream?.getVideoTracks()?.[0] || null;
    if (scrTrack && !conn.screenSender) {
      conn.screenSender = pc.addTrack(scrTrack, this.localScreenStream);
    }
  }

  async syncAudioTrackWithPeers() {
    const activeAudioTrack = this.localAudioStream?.getAudioTracks()[0] || null;
    if (!activeAudioTrack) return;
    for (const [peerId, conn] of this.connections.entries()) {
      const senders = conn.pc.getSenders();
      const audioSender = senders.find((s) => s.track?.kind === "audio");
      if (audioSender) {
        await audioSender.replaceTrack(activeAudioTrack);
      } else {
        conn.pc.addTrack(activeAudioTrack, this.localAudioStream);
        await this.negotiateWithPeer(peerId);
      }
    }
  }

  async syncTracksWithPeers() {
    const camTrack = this.localVideoStream?.getVideoTracks()?.[0] || null;
    const scrTrack = this.localScreenStream?.getVideoTracks()?.[0] || null;
    const streamMeta = this.buildLocalStreamMeta();

    for (const [peerId, conn] of this.connections.entries()) {
      let needsRenegotiation = false;

      if (conn.cameraSender) {
        await conn.cameraSender.replaceTrack(camTrack);
      } else if (camTrack) {
        conn.cameraSender = conn.pc.addTrack(camTrack, this.localVideoStream);
        needsRenegotiation = true;
      }

      if (conn.screenSender) {
        await conn.screenSender.replaceTrack(scrTrack);
      } else if (scrTrack) {
        conn.screenSender = conn.pc.addTrack(scrTrack, this.localScreenStream);
        needsRenegotiation = true;
      }

      this.onSignalSend?.(peerId, {
        signalType: "stream-meta",
        streamMeta,
      });

      if (needsRenegotiation) {
        await this.negotiateWithPeer(peerId);
      }
    }
  }

  async negotiateWithPeer(peerId) {
    await this.startLocalVoice();
    const conn = this.createPeerConnection(peerId, true);
    this.attachLocalTracksToConn(conn);
    const offer = await conn.pc.createOffer();
    await conn.pc.setLocalDescription(offer);
    this.onSignalSend?.(peerId, {
      signalType: "offer",
      sdp: conn.pc.localDescription,
      streamMeta: this.buildLocalStreamMeta(),
    });
  }

  async handleIncomingSignal(fromPeerId, signal) {
    await this.startLocalVoice();
    const conn = this.createPeerConnection(fromPeerId, false);
    this.attachLocalTracksToConn(conn);

    if (signal.streamMeta) {
      conn.remoteStreamMeta = signal.streamMeta;
      this.rebuildRemoteVideoStreams(conn);
    }

    if (signal.signalType === "stream-meta") {
      return;
    }

    if (signal.signalType === "offer") {
      await conn.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await conn.pc.createAnswer();
      await conn.pc.setLocalDescription(answer);
      this.onSignalSend?.(fromPeerId, {
        signalType: "answer",
        sdp: conn.pc.localDescription,
        streamMeta: this.buildLocalStreamMeta(),
      });
      this.rebuildRemoteVideoStreams(conn);
    } else if (signal.signalType === "answer") {
      await conn.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      this.rebuildRemoteVideoStreams(conn);
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
    this.activeDesktopSourceId = null;
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
