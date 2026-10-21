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

export const WEBRTC_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.services.mozilla.com" },
];

function getAudioBinContainer() {
  if (typeof document === "undefined") return null;
  let bin = document.getElementById("freecord-remote-audio-bin");
  if (!bin) {
    bin = document.createElement("div");
    bin.id = "freecord-remote-audio-bin";
    bin.style.cssText = "position:fixed;width:0;height:0;overflow:hidden;pointer-events:none;opacity:0;";
    document.body.appendChild(bin);
  }
  return bin;
}

export class WebRTCVoiceEngine {
  constructor({
    localPeerId = null,
    onSignalSend,
    onFrameSend,
    onAudioChunkSend,
    onRemoteStream,
    onSpeakingChange,
    onInputLevelChange,
    onStatsUpdate,
    onDataChannelMessage,
    onManualPeerConnected,
  }) {
    this.localPeerId = localPeerId;
    this.onSignalSend = onSignalSend;
    this.onFrameSend = onFrameSend;
    this.onAudioChunkSend = onAudioChunkSend;
    this.onRemoteStream = onRemoteStream;
    this.onSpeakingChange = onSpeakingChange;
    this.onInputLevelChange = onInputLevelChange;
    this.onStatsUpdate = onStatsUpdate;
    this.onDataChannelMessage = onDataChannelMessage;
    this.onManualPeerConnected = onManualPeerConnected;

    // Map<peerId, PeerConnectionEntry>
    this.connections = new Map();
    this.localAudioStream = null;
    this.localVideoStream = null;
    this.localScreenStream = null;
    this.activeDesktopSourceId = null;
    this.voiceInitPromise = null;

    this.selfMute = false;
    this.selfDeafen = false;
    this.localSpeaking = false;
    this.inVoiceChannel = false;

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
    this.keyFrameInterval = null;
    this.frameRelayInterval = null;
    this.relayCamVideoEl = null;
    this.relayScrVideoEl = null;
    this.relayCanvas = null;
    this.txProcessorNode = null;
    this.txZeroGainNode = null;
    this.txAnalyser = null;
    this.txSourceNode = null;
    this.txScreenAudioSourceNode = null;
    this.txMixNode = null;
    this.speakingHoldUntil = 0;
    this.screenAudioSourceNode = null;
    this.screenAudioGateNode = null;
    this.screenAudioDestStream = null;
    this.processedScreenAudioTrack = null;
    this.screenAudioDuckingHangover = 0;
    this.screenAudioHangoverTimer = null;
  }

  setLocalPeerId(peerId) {
    if (peerId) {
      this.localPeerId = String(peerId);
    }
  }

  setInVoiceChannel(active) {
    const next = Boolean(active);
    this.inVoiceChannel = next;
    if (!next) {
      this.destroyAll();
    }
  }

  isWebRTCPeerConnected(conn) {
    if (!conn || !conn.pc) return false;
    const connState = conn.pc.connectionState;
    const iceState = conn.pc.iceConnectionState;
    return (
      connState === "connected" ||
      iceState === "connected" ||
      iceState === "completed"
    );
  }

  isWebRTCAudioActive(conn) {
    if (!this.isWebRTCPeerConnected(conn)) return false;
    if (!conn.remoteAudioTracks || conn.remoteAudioTracks.size === 0) return false;
    for (const track of conn.remoteAudioTracks.values()) {
      if (track.readyState === "live") {
        return true;
      }
    }
    return false;
  }

  updateFallbackProcessorState() {
    // Disconnect main-thread ScriptProcessorNode as soon as all peers are connected via native C++ WebRTC
    // so WebAudio never synchronizes with the main UI thread during high-res screen sharing!
    let needsFallbackPcm = false;
    if (this.inVoiceChannel && this.connections.size > 0) {
      for (const conn of this.connections.values()) {
        if (!this.isWebRTCPeerConnected(conn)) {
          needsFallbackPcm = true;
          break;
        }
      }
    }
    if (!this.txProcessorNode || !this.txMixNode || !this.txZeroGainNode || !this.audioContext) {
      return;
    }
    try {
      if (needsFallbackPcm && !this.txProcessorAttached) {
        this.txMixNode.connect(this.txProcessorNode);
        this.txProcessorNode.connect(this.txZeroGainNode);
        this.txZeroGainNode.connect(this.audioContext.destination);
        this.txProcessorAttached = true;
      } else if (!needsFallbackPcm && this.txProcessorAttached) {
        this.txMixNode.disconnect(this.txProcessorNode);
        this.txProcessorNode.disconnect();
        this.txZeroGainNode.disconnect();
        this.txProcessorAttached = false;
      }
    } catch {}
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
    if (!this.audioContext || this.audioContext.state === "closed") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx({ latencyHint: "interactive" });
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

  createSilentFallbackAudioStream() {
    const ctx = this.ensureAudioContext();
    const dest = ctx.createMediaStreamDestination();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.00001; // Near-zero keepalive so RTP audio packets still flow
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    return dest.stream;
  }

  async getUserMediaWithTimeout(constraints, timeoutMs = 2500) {
    return await Promise.race([
      navigator.mediaDevices.getUserMedia(constraints),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("getUserMedia timeout")), timeoutMs)
      ),
    ]);
  }

  async startLocalVoice(forceRestart = false) {
    if (this.localAudioStream && !forceRestart) {
      return this.localAudioStream;
    }
    if (this.voiceInitPromise && !forceRestart) {
      return await this.voiceInitPromise;
    }

    if (this.localAudioStream && forceRestart) {
      this.localAudioStream.getTracks().forEach((t) => t.stop());
      this.localAudioStream = null;
    }

    this.voiceInitPromise = (async () => {
      try {
        this.localAudioStream = await this.getUserMediaWithTimeout({
          audio: this.buildAudioConstraints(),
          video: false,
        });
        this.applyMuteState();
        this.startVoiceActivityDetector(this.localAudioStream);
        await this.syncAudioTrackWithPeers();
        return this.localAudioStream;
      } catch (err) {
        if (this.audioInputDeviceId !== "default") {
          try {
            this.audioInputDeviceId = "default";
            this.localAudioStream = await this.getUserMediaWithTimeout({
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
          "[Freecord VoiceEngine] Microphone unavailable or busy, using fallback stream:",
          err.message
        );
        this.localAudioStream = this.createSilentFallbackAudioStream();
        await this.syncAudioTrackWithPeers();
        return this.localAudioStream;
      } finally {
        this.voiceInitPromise = null;
      }
    })();

    return await this.voiceInitPromise;
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
      if (conn.screenAudioEl) {
        await this.applySinkIdToElement(conn.screenAudioEl);
      }
    }
  }

  setMasterOutputVolume(volumePercent) {
    this.masterOutputVolume = Math.max(0, Math.min(200, Number(volumePercent)));
    for (const [peerId, conn] of this.connections.entries()) {
      this.setLocalVolume(peerId, conn.volume);
      this.setLocalScreenVolume(peerId, conn.screenVolume ?? 100);
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

      if (this.txSourceNode) {
        try {
          this.txSourceNode.disconnect();
        } catch {}
      }
      if (this.txProcessorNode) {
        try {
          this.txProcessorNode.disconnect();
        } catch {}
        this.txProcessorAttached = false;
      }
      if (this.txZeroGainNode) {
        try {
          this.txZeroGainNode.disconnect();
        } catch {}
      }

      const [micTrack] = stream.getAudioTracks();
      if (micTrack && "contentHint" in micTrack) {
        micTrack.contentHint = "speech";
      }

      const source = ctx.createMediaStreamSource(stream);
      this.txSourceNode = source;

      const mixNode = ctx.createGain();
      mixNode.gain.value = 1;
      this.txMixNode = mixNode;
      source.connect(mixNode);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.25;
      source.connect(analyser);
      this.txAnalyser = analyser;
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const timeData = new Float32Array(analyser.fftSize);

      // Lock-free AnalyserNode VAD loop (never blocks WebAudio rendering or main UI thread during screen share)
      if (this.vadInterval) {
        clearInterval(this.vadInterval);
      }
      this.vadInterval = setInterval(() => {
        if (this.audioContext && this.audioContext.state === "suspended") {
          this.audioContext.resume().catch(() => {});
        }
        if (this.selfMute || this.selfDeafen || !this.localAudioStream) {
          this.onInputLevelChange?.(0);
          if (this.localSpeaking) {
            this.localSpeaking = false;
            this.onSpeakingChange?.("self", false);
          }
          return;
        }

        analyser.getByteFrequencyData(freqData);
        analyser.getFloatTimeDomainData(timeData);

        let freqSum = 0;
        for (let i = 0; i < freqData.length; i++) freqSum += freqData[i];
        const avgFreq = freqSum / freqData.length;

        let sumSq = 0;
        let peak = 0;
        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i];
          sumSq += v * v;
          const abs = v < 0 ? -v : v;
          if (abs > peak) peak = abs;
        }
        const rms = Math.sqrt(sumSq / timeData.length);

        const levelPercent = Math.min(
          100,
          Math.max(Math.round((avgFreq / 52) * 100), Math.round(rms * 380))
        );
        this.onInputLevelChange?.(levelPercent);

        const now = Date.now();
        const voiceDetected = avgFreq > 7 || rms > 0.006 || peak > 0.03;
        if (voiceDetected) {
          this.speakingHoldUntil = now + 380;
        }
        const speaking = voiceDetected || now < this.speakingHoldUntil;
        if (speaking !== this.localSpeaking) {
          this.localSpeaking = speaking;
          this.onSpeakingChange?.("self", speaking);
          this.applyViewerEchoGuard();
        } else if (speaking) {
          this.applyViewerEchoGuard();
        }
      }, 45);

      // Fallback PCM processor ONLY attached while a peer's WebRTC connection is still shaking hands
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      const zeroGain = ctx.createGain();
      zeroGain.gain.value = 0;
      this.txProcessorNode = processor;
      this.txZeroGainNode = zeroGain;
      this.txProcessorAttached = false;
      this.updateFallbackProcessorState();

      let hangoverBuffers = 0;
      processor.onaudioprocess = (e) => {
        if (!this.inVoiceChannel || !this.onAudioChunkSend || this.connections.size === 0) {
          return;
        }

        // Skip fallback PCM completely if all peers are already connected via native C++ WebRTC
        let anyUnconnectedPeer = false;
        for (const conn of this.connections.values()) {
          if (!this.isWebRTCPeerConnected(conn)) {
            anyUnconnectedPeer = true;
            break;
          }
        }
        if (!anyUnconnectedPeer) {
          this.updateFallbackProcessorState();
          return;
        }

        if (this.selfMute || this.selfDeafen) return;

        const input = e.inputBuffer.getChannelData(0);
        let sumSq = 0;
        for (let i = 0; i < input.length; i++) {
          const v = input[i];
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / input.length);

        if (rms > 0.003 || this.localSpeaking) {
          hangoverBuffers = 5;
        } else if (hangoverBuffers > 0) {
          hangoverBuffers--;
        } else {
          return;
        }

        const outLen = Math.floor(input.length / 2);
        const pcm16 = new Int16Array(outLen);
        for (let i = 0; i < outLen; i++) {
          const sample = (input[i * 2] + input[i * 2 + 1]) * 0.5;
          const clamped = Math.max(-1, Math.min(1, sample));
          pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
        }

        const bytes = new Uint8Array(pcm16.buffer);
        const CHUNK_STEP = 0x4000;
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i += CHUNK_STEP) {
          binary += String.fromCharCode.apply(
            null,
            bytes.subarray(i, Math.min(i + CHUNK_STEP, bytes.byteLength))
          );
        }
        const pcmBase64 = btoa(binary);
        this.onAudioChunkSend({
          pcmBase64,
          sampleRate: Math.round(ctx.sampleRate / 2),
        });
      };
    } catch {}
  }

  attachScreenAudioToMixer() {
    // Screen share audio is transmitted on its own dedicated WebRTC sender (screenAudioSender)
    // so the receiver can control Voice Volume and Stream Volume via two independent mixers!
    if (this.txScreenAudioSourceNode) {
      try {
        this.txScreenAudioSourceNode.disconnect();
      } catch {}
      this.txScreenAudioSourceNode = null;
    }
  }

  setupScreenAudioDuckingGraph() {
    this.cleanupScreenAudioGraph();
    if (!this.localScreenStream) return;
    const rawTrack = this.localScreenStream.getAudioTracks()[0];
    if (!rawTrack) return;

    try {
      const ctx = this.ensureAudioContext();
      const source = ctx.createMediaStreamSource(new MediaStream([rawTrack]));
      const gate = ctx.createGain();
      gate.gain.value = 1.0;
      const dest = ctx.createMediaStreamDestination();

      source.connect(gate);
      gate.connect(dest);

      this.screenAudioSourceNode = source;
      this.screenAudioGateNode = gate;
      this.screenAudioDestStream = dest.stream;

      const processedTrack = dest.stream.getAudioTracks()[0];
      if (processedTrack) {
        this.processedScreenAudioTrack = processedTrack;
        // Immediately attach processed track to all existing peer screen audio senders
        for (const conn of this.connections.values()) {
          if (conn.screenAudioSender) {
            conn.screenAudioSender.replaceTrack(processedTrack).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn("[Freecord VoiceEngine] Screen audio ducking graph error:", err.message);
    }
  }

  applyScreenAudioAntiEchoGate() {
    if (!this.screenAudioGateNode || !this.audioContext) return;
    let anyRemoteSpeaking = false;
    for (const conn of this.connections.values()) {
      if (conn.remoteSpeaking && !conn.muted && !this.selfDeafen) {
        anyRemoteSpeaking = true;
        break;
      }
    }
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    if (anyRemoteSpeaking) {
      if (this.screenAudioHangoverTimer) {
        clearTimeout(this.screenAudioHangoverTimer);
        this.screenAudioHangoverTimer = null;
      }
      // Immediate ramp to 0: completely isolates remote voices from leaking into the screen share loopback
      this.screenAudioGateNode.gain.cancelScheduledValues(now);
      this.screenAudioGateNode.gain.setTargetAtTime(0, now, 0.012);
      this.screenAudioDuckingHangover = Date.now() + 450;
    } else {
      const remainingHangover = (this.screenAudioDuckingHangover || 0) - Date.now();
      if (remainingHangover > 0) {
        if (!this.screenAudioHangoverTimer) {
          this.screenAudioHangoverTimer = setTimeout(() => {
            this.screenAudioHangoverTimer = null;
            this.applyScreenAudioAntiEchoGate();
          }, remainingHangover);
        }
        return;
      }
      // Smooth fade back to 1.0
      this.screenAudioGateNode.gain.cancelScheduledValues(now);
      this.screenAudioGateNode.gain.setTargetAtTime(1.0, now, 0.04);
    }
  }

  isLocalSpeakingEchoActive() {
    return Boolean(this.localSpeaking);
  }

  applyViewerEchoGuard() {
    const isSpeaking = this.isLocalSpeakingEchoActive();
    for (const conn of this.connections.values()) {
      if (conn.screenAudioEl) {
        conn.screenAudioEl.muted = this.selfDeafen || Boolean(conn.screenMuted) || isSpeaking;
      }
      if (conn.screenGainNode && this.audioContext) {
        const now = this.audioContext.currentTime;
        if (isSpeaking) {
          conn.screenGainNode.gain.cancelScheduledValues(now);
          conn.screenGainNode.gain.setValueAtTime(0, now);
        } else {
          const effectiveScrGain =
            this.selfDeafen || conn.screenMuted
              ? 0
              : ((conn.screenVolume ?? 100) / 100) * (this.masterOutputVolume / 100);
          const boostVal = effectiveScrGain > 1 ? effectiveScrGain - 1 : 0;
          conn.screenGainNode.gain.cancelScheduledValues(now);
          conn.screenGainNode.gain.setValueAtTime(boostVal, now);
        }
      }
    }
  }

  setRemotePeerSpeaking(peerId, isSpeaking) {
    if (!peerId) return;
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.remoteSpeaking = Boolean(isSpeaking);
    }
    this.applyScreenAudioAntiEchoGate();
  }

  cleanupScreenAudioGraph() {
    if (this.screenAudioHangoverTimer) {
      clearTimeout(this.screenAudioHangoverTimer);
      this.screenAudioHangoverTimer = null;
    }
    if (this.screenAudioSourceNode) {
      try {
        this.screenAudioSourceNode.disconnect();
      } catch {}
      this.screenAudioSourceNode = null;
    }
    if (this.screenAudioGateNode) {
      try {
        this.screenAudioGateNode.disconnect();
      } catch {}
      this.screenAudioGateNode = null;
    }
    if (this.processedScreenAudioTrack) {
      try {
        this.processedScreenAudioTrack.stop();
      } catch {}
      this.processedScreenAudioTrack = null;
    }
    this.screenAudioDestStream = null;
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
    this.applyViewerEchoGuard();
    this.applyScreenAudioAntiEchoGate();
    for (const [peerId, conn] of this.connections.entries()) {
      if (conn.audioEl) {
        const shouldMuteWebRTC =
          this.selfDeafen ||
          conn.muted ||
          (Boolean(conn.usingPcmAudio) && !this.isWebRTCAudioActive(conn));
        conn.audioEl.muted = shouldMuteWebRTC;
      }
      if (conn.screenAudioEl) {
        conn.screenAudioEl.muted = this.selfDeafen || Boolean(conn.screenMuted) || this.isLocalSpeakingEchoActive();
      }
      this.setLocalVolume(peerId, conn.volume);
      this.setLocalScreenVolume(peerId, conn.screenVolume ?? 100);
    }
  }

  applyMuteState() {
    if (!this.localAudioStream) return;
    for (const track of this.localAudioStream.getAudioTracks()) {
      track.enabled = !this.selfMute && !this.selfDeafen;
    }
    if (this.txSourceNode && this.txMixNode) {
      try {
        if (this.selfMute || this.selfDeafen) {
          this.txSourceNode.disconnect(this.txMixNode);
        } else {
          this.txSourceNode.connect(this.txMixNode);
        }
      } catch {}
    }
  }

  setLocalVolume(peerId, volumePercent) {
    const conn = this.connections.get(peerId);
    if (!conn) return;
    conn.volume = Math.max(0, Math.min(200, Number(volumePercent)));
    const effectiveGain =
      this.selfDeafen || conn.muted
        ? 0
        : (conn.volume / 100) * (this.masterOutputVolume / 100);
    if (conn.audioEl) {
      conn.audioEl.volume = Math.min(1, effectiveGain);
    }
    if (conn.gainNode) {
      conn.gainNode.gain.value = effectiveGain > 1 ? effectiveGain - 1 : 0;
    }
    if (conn.pcmGainNode) {
      conn.pcmGainNode.gain.value = effectiveGain;
    }
  }

  setLocalMute(peerId, mute) {
    const conn = this.connections.get(peerId);
    if (!conn) return;
    conn.muted = Boolean(mute);
    if (conn.audioEl) {
      conn.audioEl.muted = this.selfDeafen || conn.muted;
    }
    this.setLocalVolume(peerId, conn.volume);
  }

  setLocalScreenVolume(peerId, volumePercent) {
    const conn = this.connections.get(peerId);
    if (!conn) return;
    conn.screenVolume = Math.max(0, Math.min(200, Number(volumePercent)));
    const isSpeaking = this.isLocalSpeakingEchoActive();
    const effectiveGain =
      this.selfDeafen || conn.screenMuted || isSpeaking
        ? 0
        : (conn.screenVolume / 100) * (this.masterOutputVolume / 100);
    if (conn.screenAudioEl) {
      conn.screenAudioEl.volume = Math.min(1, effectiveGain);
      if (isSpeaking) {
        conn.screenAudioEl.muted = true;
      }
    }
    if (conn.screenGainNode) {
      conn.screenGainNode.gain.value = effectiveGain > 1 ? effectiveGain - 1 : 0;
    }
  }

  setLocalScreenMute(peerId, mute) {
    const conn = this.connections.get(peerId);
    if (!conn) return;
    conn.screenMuted = Boolean(mute);
    if (conn.screenAudioEl) {
      conn.screenAudioEl.muted = this.selfDeafen || conn.screenMuted || this.isLocalSpeakingEchoActive();
    }
    this.setLocalScreenVolume(peerId, conn.screenVolume ?? 100);
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
      this.updateFrameRelayLoop();
      await this.syncTracksWithPeers();
      return null;
    }

    if (this.localVideoStream) {
      this.localVideoStream.getTracks().forEach((t) => t.stop());
      this.localVideoStream = null;
    }

    const res = CAMERA_RESOLUTIONS[this.cameraResolution] || CAMERA_RESOLUTIONS["720p"];
    const videoConstraints = {
      width: { min: Math.min(640, res.width), ideal: res.width, max: res.width },
      height: { min: Math.min(360, res.height), ideal: res.height, max: res.height },
      frameRate: { ideal: 30, max: 30 },
    };
    if (this.videoInputDeviceId && this.videoInputDeviceId !== "default") {
      videoConstraints.deviceId = { exact: this.videoInputDeviceId };
    }

    try {
      this.localVideoStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      const [camTrack] = this.localVideoStream.getVideoTracks();
      if (camTrack && "contentHint" in camTrack) {
        camTrack.contentHint = "motion";
      }
      this.updateFrameRelayLoop();
      await this.syncTracksWithPeers();
      await this.configureAllPeerVideoSenders();
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

    if (this.localScreenStream) {
      const res = SCREEN_RESOLUTIONS[this.screenResolution] || SCREEN_RESOLUTIONS["1080p"];
      const fps = this.screenFrameRate || 30;
      if (this.activeDesktopSourceId && this.activeDesktopSourceId !== "browser-display") {
        return await this.setDesktopSource(this.activeDesktopSourceId, {
          resolution: this.screenResolution,
          frameRate: this.screenFrameRate,
        });
      }
      const [videoTrack] = this.localScreenStream.getVideoTracks();
      if (videoTrack && typeof videoTrack.applyConstraints === "function") {
        try {
          await videoTrack.applyConstraints({
            width: { min: res.width, ideal: res.width, max: res.width },
            height: { min: res.height, ideal: res.height, max: res.height },
            frameRate: { ideal: fps, max: fps },
          });
          await this.configureAllPeerVideoSenders();
          return this.localScreenStream;
        } catch {}
      }
    }
    return this.localScreenStream;
  }

  async setDesktopSource(sourceId = null, options = {}) {
    if (!sourceId) {
      this.activeDesktopSourceId = null;
      this.cleanupScreenAudioGraph();
      if (this.localScreenStream) {
        this.localScreenStream.getTracks().forEach((t) => t.stop());
        this.localScreenStream = null;
      }
      this.updateFrameRelayLoop();
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
    const captureAudio = options.captureAudio !== false;

    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach((t) => t.stop());
      this.localScreenStream = null;
    }

    try {
      if (sourceId !== "browser-display" && window.DiscordNative?.isRenderer) {
        const strictMandatoryVideo = {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sourceId,
          minWidth: res.width,
          maxWidth: res.width,
          minHeight: res.height,
          maxHeight: res.height,
          minFrameRate: Math.min(15, fps),
          maxFrameRate: fps,
        };
        const flexibleMandatoryVideo = {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sourceId,
          maxWidth: res.width,
          maxHeight: res.height,
          maxFrameRate: fps,
        };

        if (captureAudio) {
          // Try capturing at exact target preset with system audio first, then fallback cleanly
          try {
            this.localScreenStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                mandatory: {
                  chromeMediaSource: "desktop",
                },
              },
              video: {
                mandatory: strictMandatoryVideo,
              },
            });
          } catch {
            try {
              this.localScreenStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                  mandatory: strictMandatoryVideo,
                },
              });
            } catch {
              this.localScreenStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                  mandatory: flexibleMandatoryVideo,
                },
              });
            }
          }
        } else {
          try {
            this.localScreenStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                mandatory: strictMandatoryVideo,
              },
            });
          } catch {
            this.localScreenStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                mandatory: flexibleMandatoryVideo,
              },
            });
          }
        }
      } else {
        this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: res.width, max: res.width },
            height: { ideal: res.height, max: res.height },
            frameRate: { ideal: fps, max: fps },
          },
          audio: captureAudio,
        });
      }

      this.activeDesktopSourceId = sourceId;
      const [videoTrack] = this.localScreenStream.getVideoTracks();
      if (videoTrack) {
        if ("contentHint" in videoTrack) {
          videoTrack.contentHint = fps >= 60 ? "motion" : "detail";
        }
        videoTrack.onended = () => {
          this.cleanupScreenAudioGraph();
          this.localScreenStream = null;
          this.activeDesktopSourceId = null;
          this.updateFrameRelayLoop();
          this.syncTracksWithPeers();
        };
      }

      if (captureAudio && this.localScreenStream.getAudioTracks().length > 0) {
        this.setupScreenAudioDuckingGraph();
      } else {
        this.cleanupScreenAudioGraph();
      }

      this.updateFrameRelayLoop();
      this.attachScreenAudioToMixer();
      await this.syncTracksWithPeers();
      await this.configureAllPeerVideoSenders();
      return this.localScreenStream;
    } catch (err) {
      console.warn("[Freecord VoiceEngine] Desktop source capture failed:", err.message);
      throw err;
    }
  }

  async configureAudioSenderParameters(sender) {
    if (!sender || !sender.track || typeof sender.getParameters !== "function") return;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = 128_000;
      params.encodings[0].priority = "high";
      params.encodings[0].networkPriority = "high";
      params.encodings[0].dtx = "disabled";
      await sender.setParameters(params);
    } catch {}
  }

  async configureVideoSenderParameters(sender, kind = "screen") {
    if (!sender || !sender.track || typeof sender.getParameters !== "function") return;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].active = true;
      if (kind === "screen") {
        params.degradationPreference = "maintain-resolution";
        const bitrates = {
          "720p": 4_500_000,
          "1080p": 10_000_000,
          "1440p": 18_000_000,
          "4k": 28_000_000,
        };
        params.encodings[0].maxBitrate = bitrates[this.screenResolution] || 10_000_000;
        params.encodings[0].maxFramerate = Number(this.screenFrameRate) || 30;
        params.encodings[0].scaleResolutionDownBy = 1.0;
        params.encodings[0].priority = "medium";
        params.encodings[0].networkPriority = "medium";
      } else {
        params.degradationPreference = "balanced";
        const camBitrates = {
          "480p": 1_500_000,
          "720p": 3_500_000,
          "1080p": 7_000_000,
        };
        params.encodings[0].maxBitrate = camBitrates[this.cameraResolution] || 3_500_000;
        params.encodings[0].maxFramerate = 30;
        params.encodings[0].scaleResolutionDownBy = 1.0;
        params.encodings[0].priority = "low";
        params.encodings[0].networkPriority = "low";
      }
      await sender.setParameters(params);
    } catch {}
  }

  async configureAllPeerVideoSenders() {
    for (const conn of this.connections.values()) {
      if (conn.audioSender) {
        await this.configureAudioSenderParameters(conn.audioSender);
      }
      if (conn.screenAudioSender) {
        await this.configureAudioSenderParameters(conn.screenAudioSender);
      }
      if (conn.screenSender) {
        await this.configureVideoSenderParameters(conn.screenSender, "screen");
      }
      if (conn.cameraSender) {
        await this.configureVideoSenderParameters(conn.cameraSender, "camera");
      }
    }
  }

  async forceKeyFrame(conn, kind = null) {
    if (!conn) return;
    try {
      if ((!kind || kind === "screen") && conn.screenSender) {
        if (typeof conn.screenSender.generateKeyFrame === "function") {
          await conn.screenSender.generateKeyFrame().catch(() => {});
        } else if (conn.screenSender.track) {
          await conn.screenSender.replaceTrack(conn.screenSender.track).catch(() => {});
        }
      }
      if ((!kind || kind === "camera") && conn.cameraSender) {
        if (typeof conn.cameraSender.generateKeyFrame === "function") {
          await conn.cameraSender.generateKeyFrame().catch(() => {});
        } else if (conn.cameraSender.track) {
          await conn.cameraSender.replaceTrack(conn.cameraSender.track).catch(() => {});
        }
      }
    } catch {}
  }

  requestKeyFrame(peerId, kind = "screen") {
    if (!this.inVoiceChannel || !peerId) return;
    this.onSignalSend?.(peerId, {
      signalType: "request-keyframe",
      kind,
    });
  }

  ensureKeyFrameGenerator() {
    if (this.keyFrameInterval) return;
    this.keyFrameInterval = setInterval(() => {
      if (!this.inVoiceChannel) {
        clearInterval(this.keyFrameInterval);
        this.keyFrameInterval = null;
        return;
      }
      const hasMedia =
        Boolean(this.localScreenStream?.getVideoTracks()?.[0]?.readyState === "live") ||
        Boolean(this.localVideoStream?.getVideoTracks()?.[0]?.readyState === "live");
      if (!hasMedia) {
        clearInterval(this.keyFrameInterval);
        this.keyFrameInterval = null;
        return;
      }
      for (const conn of this.connections.values()) {
        if (this.isWebRTCPeerConnected(conn)) {
          this.forceKeyFrame(conn);
        }
      }
    }, 2500);
  }

  enhanceSdpBitrate(sdpDescription) {
    if (!sdpDescription || !sdpDescription.sdp) return sdpDescription;
    const lines = sdpDescription.sdp.split("\r\n");
    const enhanced = [];

    let opusPt = null;
    let vp8Pt = null;
    for (const line of lines) {
      const opusMatch = line.match(/^a=rtpmap:(\d+)\s+opus\/48000/i);
      if (opusMatch) opusPt = opusMatch[1];
      const vp8Match = line.match(/^a=rtpmap:(\d+)\s+VP8\/90000/i);
      if (vp8Match) vp8Pt = vp8Match[1];
    }

    let inVideoSection = false;
    let hasVideoBitrateLine = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      if (line.startsWith("m=video")) {
        inVideoSection = true;
        hasVideoBitrateLine = false;
        enhanced.push(line);
        continue;
      }
      if (line.startsWith("m=audio") || line.startsWith("m=application")) {
        inVideoSection = false;
      }

      // Safe Opus audio enhancement (FEC, stereo, constant bitrate)
      if (
        line.startsWith("a=fmtp:") &&
        (line.includes("minptime=10") || (opusPt && line.startsWith(`a=fmtp:${opusPt}`)))
      ) {
        let opusLine = line;
        if (!opusLine.includes("maxaveragebitrate")) {
          opusLine += ";maxaveragebitrate=128000;stereo=1;sprop-stereo=1;usedtx=0;cbr=1";
        }
        enhanced.push(opusLine);
        continue;
      }

      // Safe VP8 video bitrate enhancement (ONLY for VP8 payload, NEVER for RTX, H264, or other codecs)
      if (
        vp8Pt &&
        (line.startsWith(`a=fmtp:${vp8Pt} `) || line === `a=fmtp:${vp8Pt}`)
      ) {
        let vp8Line = line;
        if (!vp8Line.includes("x-google-max-bitrate")) {
          vp8Line += ";x-google-min-bitrate=300;x-google-start-bitrate=2000;x-google-max-bitrate=12000";
        }
        enhanced.push(vp8Line);
        continue;
      }

      // Standard SDP bandwidth limit b=AS:12000 in video section (12 Mbps ceiling for VP8 & H264)
      if (inVideoSection && line.startsWith("c=IN IP4")) {
        enhanced.push(line);
        if (!hasVideoBitrateLine) {
          enhanced.push("b=AS:12000");
          hasVideoBitrateLine = true;
        }
        continue;
      }

      if (inVideoSection && line.startsWith("b=AS:")) {
        hasVideoBitrateLine = true;
        enhanced.push("b=AS:12000");
        continue;
      }

      enhanced.push(line);
    }

    return {
      type: sdpDescription.type,
      sdp: enhanced.join("\r\n"),
    };
  }

  // Lightweight P2P Frame Relay fallback so receivers ALWAYS see live screen/camera even while WebRTC negotiates or across strict firewalls
  updateFrameRelayLoop() {
    const hasCamera = Boolean(this.localVideoStream?.getVideoTracks()?.[0]?.readyState === "live");
    const hasScreen = Boolean(this.localScreenStream?.getVideoTracks()?.[0]?.readyState === "live");

    if (!this.inVoiceChannel || (!hasCamera && !hasScreen)) {
      if (this.frameRelayInterval) {
        clearInterval(this.frameRelayInterval);
        this.frameRelayInterval = null;
      }
      if (this.relayCamVideoEl) {
        this.relayCamVideoEl.srcObject = null;
        this.relayCamVideoEl = null;
      }
      if (this.relayScrVideoEl) {
        this.relayScrVideoEl.srcObject = null;
        this.relayScrVideoEl = null;
      }
      return;
    }

    if (hasCamera) {
      if (!this.relayCamVideoEl) {
        this.relayCamVideoEl = document.createElement("video");
        this.relayCamVideoEl.muted = true;
        this.relayCamVideoEl.playsInline = true;
      }
      if (this.relayCamVideoEl.srcObject !== this.localVideoStream) {
        this.relayCamVideoEl.srcObject = this.localVideoStream;
        this.relayCamVideoEl.play().catch(() => {});
      }
    }

    if (hasScreen) {
      if (!this.relayScrVideoEl) {
        this.relayScrVideoEl = document.createElement("video");
        this.relayScrVideoEl.muted = true;
        this.relayScrVideoEl.playsInline = true;
      }
      if (this.relayScrVideoEl.srcObject !== this.localScreenStream) {
        this.relayScrVideoEl.srcObject = this.localScreenStream;
        this.relayScrVideoEl.play().catch(() => {});
      }
    }

    if (!this.relayCanvas) {
      this.relayCanvas = document.createElement("canvas");
    }

    if (!this.frameRelayInterval) {
      this.frameRelayInterval = setInterval(() => {
        if (!this.inVoiceChannel || !this.onFrameSend || this.connections.size === 0) return;

        // Continuous lightweight preview frame relay: guarantees immediate visual feedback on remote computers
        if (this.localScreenStream && this.relayScrVideoEl && this.relayScrVideoEl.videoWidth > 0) {
          try {
            const vw = this.relayScrVideoEl.videoWidth;
            const vh = this.relayScrVideoEl.videoHeight;
            const targetW = Math.min(854, vw);
            const targetH = Math.round((vh / vw) * targetW);
            this.relayCanvas.width = targetW;
            this.relayCanvas.height = targetH;
            const ctx = this.relayCanvas.getContext("2d");
            ctx.drawImage(this.relayScrVideoEl, 0, 0, targetW, targetH);
            const dataUrl = this.relayCanvas.toDataURL("image/jpeg", 0.65);
            this.onFrameSend({
              kind: "screen",
              dataUrl,
              timestamp: Date.now(),
            });
          } catch {}
        }

        if (this.localVideoStream && this.relayCamVideoEl && this.relayCamVideoEl.videoWidth > 0) {
          try {
            const vw = this.relayCamVideoEl.videoWidth;
            const vh = this.relayCamVideoEl.videoHeight;
            const targetW = Math.min(480, vw);
            const targetH = Math.round((vh / vw) * targetW);
            this.relayCanvas.width = targetW;
            this.relayCanvas.height = targetH;
            const ctx = this.relayCanvas.getContext("2d");
            ctx.drawImage(this.relayCamVideoEl, 0, 0, targetW, targetH);
            const dataUrl = this.relayCanvas.toDataURL("image/jpeg", 0.65);
            this.onFrameSend({
              kind: "camera",
              dataUrl,
              timestamp: Date.now(),
            });
          } catch {}
        }
      }, 260);
    }
  }

  handleIncomingMediaFrame(fromPeerId, framePacket) {
    if (!this.inVoiceChannel || !fromPeerId || !framePacket?.kind || !framePacket?.dataUrl) return;
    const conn = this.createPeerConnection(fromPeerId, false);
    if (framePacket.kind === "screen") {
      conn.remoteScreenFrameUrl = framePacket.dataUrl;
    } else if (framePacket.kind === "camera") {
      conn.remoteCameraFrameUrl = framePacket.dataUrl;
    }
    this.emitRemoteStreamState(conn);
  }

  handleIncomingAudioChunk(fromPeerId, chunkPacket) {
    if (!this.inVoiceChannel || !fromPeerId || !chunkPacket?.pcmBase64) return;
    const conn = this.createPeerConnection(fromPeerId, false);

    // Trigger remote speaking indicator with smooth decay
    if (!this.selfDeafen && !conn.muted) {
      if (!conn.remoteSpeaking) {
        conn.remoteSpeaking = true;
        this.onSpeakingChange?.(fromPeerId, true);
        this.applyScreenAudioAntiEchoGate();
      }
      if (conn.speakingDecayTimer) {
        clearTimeout(conn.speakingDecayTimer);
      }
      conn.speakingDecayTimer = setTimeout(() => {
        conn.remoteSpeaking = false;
        this.onSpeakingChange?.(fromPeerId, false);
        this.applyScreenAudioAntiEchoGate();
      }, 480);
    }

    if (this.selfDeafen || conn.muted) return;

    // CRITICAL: If native C++ WebRTC audio is already connected and live, NEVER mute conn.audioEl
    // and never play redundant main-thread PCM buffers (which stutter when unfocused during screen share).
    if (this.isWebRTCAudioActive(conn)) {
      conn.usingPcmAudio = false;
      if (conn.pcmGainNode) {
        conn.pcmGainNode.gain.value = 0;
      }
      if (conn.audioEl) {
        conn.audioEl.muted = this.selfDeafen || conn.muted;
        if (conn.audioEl.paused) {
          conn.audioEl.play().catch(() => {});
        }
      }
      return;
    }

    try {
      const ctx = this.ensureAudioContext();
      const binary = atob(chunkPacket.pcmBase64);
      const byteLen = binary.length;
      const bytes = new Uint8Array(byteLen);
      for (let i = 0; i < byteLen; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);
      const sampleRate = Number(chunkPacket.sampleRate) || 24000;
      const audioBuffer = ctx.createBuffer(1, pcm16.length, sampleRate);
      const channelData = audioBuffer.getChannelData(0);

      const now = ctx.currentTime;
      const isUnderrun =
        !conn.nextPlayTime ||
        conn.nextPlayTime < now ||
        conn.nextPlayTime > now + 0.85;

      const fadeSamples = 24;
      for (let i = 0; i < pcm16.length; i++) {
        let sample = pcm16[i] / 32768.0;
        if (isUnderrun && i < fadeSamples) {
          sample *= i / fadeSamples;
        }
        channelData[i] = sample;
      }

      if (!conn.pcmGainNode) {
        conn.pcmGainNode = ctx.createGain();
        conn.pcmGainNode.connect(ctx.destination);
      }
      const effectiveGain =
        this.selfDeafen || conn.muted
          ? 0
          : (conn.volume / 100) * (this.masterOutputVolume / 100);
      conn.pcmGainNode.gain.value = effectiveGain;

      conn.usingPcmAudio = true;
      if (conn.audioEl) {
        conn.audioEl.muted = true;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(conn.pcmGainNode);

      if (isUnderrun) {
        conn.nextPlayTime = now + 0.16; // 160ms (~2 buffers) jitter cushion for pre-WebRTC fallback
      }
      source.start(conn.nextPlayTime);
      conn.nextPlayTime += audioBuffer.duration;
    } catch {}
  }

  createPeerConnection(peerId, isInitiator = false, forceReset = false) {
    if (this.connections.has(peerId) && !forceReset) {
      const existing = this.connections.get(peerId);
      if (
        existing.pc.connectionState !== "closed" &&
        existing.pc.signalingState !== "closed"
      ) {
        return existing;
      }
    }

    const oldConn = this.connections.get(peerId);
    if (oldConn) {
      try {
        oldConn.pc.ontrack = null;
        oldConn.pc.onicecandidate = null;
        oldConn.pc.close();
      } catch {}
    }

    const pc = new RTCPeerConnection({
      iceServers: WEBRTC_ICE_SERVERS,
      iceCandidatePoolSize: 2,
    });

    const audioEl = oldConn?.audioEl || new Audio();
    audioEl.autoplay = true;
    audioEl.playsInline = true;
    audioEl.muted = this.selfDeafen || Boolean(oldConn?.muted);

    const screenAudioEl = oldConn?.screenAudioEl || new Audio();
    screenAudioEl.autoplay = true;
    screenAudioEl.playsInline = true;
    screenAudioEl.muted = this.selfDeafen || Boolean(oldConn?.screenMuted);

    const bin = getAudioBinContainer();
    if (bin && !bin.contains(audioEl)) {
      bin.appendChild(audioEl);
    }
    if (bin && !bin.contains(screenAudioEl)) {
      bin.appendChild(screenAudioEl);
    }
    this.applySinkIdToElement(audioEl);
    this.applySinkIdToElement(screenAudioEl);

    const conn = {
      peerId,
      pc,
      dataChannel: null,
      remoteStream: new MediaStream(),
      remoteScreenAudioStream: new MediaStream(),
      remoteAudioTracks: new Map(), // trackId -> MediaStreamTrack
      remoteAudioEntries: new Map(), // trackId -> { track, streamId, mid, transceiver }
      remoteCameraStream: null,
      remoteScreenStream: null,
      remoteCameraFrameUrl: oldConn?.remoteCameraFrameUrl || null,
      remoteScreenFrameUrl: oldConn?.remoteScreenFrameUrl || null,
      remoteVideoEntries: new Map(), // trackId -> { track, streamId, mid }
      remoteStreamMeta: oldConn?.remoteStreamMeta || {
        hasCamera: false,
        hasScreen: false,
        hasScreenAudio: false,
        voiceAudioTrackId: null,
        screenAudioTrackId: null,
        voiceAudioStreamId: null,
        cameraTrackId: null,
        screenTrackId: null,
        cameraStreamId: null,
        screenStreamId: null,
        voiceAudioMid: null,
        screenAudioMid: null,
        cameraMid: null,
        screenMid: null,
      },
      audioSender: null,
      screenAudioSender: null,
      cameraSender: null,
      screenSender: null,
      audioEl,
      screenAudioEl,
      gainNode: null,
      audioSourceNode: null,
      screenGainNode: null,
      screenAudioSourceNode: null,
      pcmGainNode: oldConn?.pcmGainNode || null,
      usingPcmAudio: Boolean(oldConn?.usingPcmAudio),
      nextPlayTime: 0,
      speakingDecayTimer: null,
      analyser: null,
      volume: oldConn?.volume ?? 100,
      muted: oldConn?.muted ?? false,
      screenVolume: oldConn?.screenVolume ?? 100,
      screenMuted: oldConn?.screenMuted ?? false,
      hasNegotiated: false,
      makingOffer: false,
      needsFollowUpNegotiation: false,
      pendingCandidates: [],
      signalQueue: oldConn?.signalQueue || Promise.resolve(),
      stats: { rttMs: 0, bytesSent: 0, bytesReceived: 0, codec: "opus / VP8" },
    };

    this.connections.set(peerId, conn);
    this.updateFallbackProcessorState();

    // Attach existing local tracks
    this.attachLocalTracksToConn(conn);

    const onRtcStateChange = () => {
      if (this.isWebRTCPeerConnected(conn)) {
        conn.usingPcmAudio = false;
        if (conn.pcmGainNode) {
          try {
            conn.pcmGainNode.gain.value = 0;
            conn.pcmGainNode.disconnect();
          } catch {}
          conn.pcmGainNode = null;
        }
        if (conn.audioEl && conn.remoteAudioTracks.size > 0) {
          conn.audioEl.muted = this.selfDeafen || conn.muted;
          conn.audioEl.play().catch(() => {});
        }
        if (conn.screenAudioEl && conn.remoteScreenAudioStream?.getAudioTracks().length > 0) {
          conn.screenAudioEl.muted = this.selfDeafen || conn.screenMuted;
          conn.screenAudioEl.play().catch(() => {});
        }
      }
      this.updateFallbackProcessorState();
    };
    pc.onconnectionstatechange = onRtcStateChange;
    pc.oniceconnectionstatechange = onRtcStateChange;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const plainCandidate =
          typeof e.candidate.toJSON === "function"
            ? e.candidate.toJSON()
            : {
                candidate: e.candidate.candidate,
                sdpMid: e.candidate.sdpMid,
                sdpMLineIndex: e.candidate.sdpMLineIndex,
                usernameFragment: e.candidate.usernameFragment,
              };
        this.onSignalSend?.(peerId, {
          signalType: "ice-candidate",
          candidate: plainCandidate,
        });
      }
    };

    pc.ontrack = (e) => {
      if (!this.inVoiceChannel && !conn.pendingManualOffer && !conn.manualProfile) return;
      const tracks = new Set();
      if (e.track) tracks.add(e.track);
      if (e.streams && e.streams[0]) {
        for (const t of e.streams[0].getTracks()) {
          tracks.add(t);
        }
      }

      const streamId = e.streams?.[0]?.id || null;
      const mid = e.transceiver?.mid || null;

      for (const track of tracks) {
        if (track.kind === "audio") {
          conn.remoteAudioTracks.set(track.id, track);
          conn.remoteAudioEntries.set(track.id, {
            track,
            streamId,
            mid,
            transceiver: e.transceiver || null,
          });
          track.onunmute = () => {
            this.rebuildRemoteAudioStreams(conn);
          };
          track.onended = () => {
            conn.remoteAudioTracks.delete(track.id);
            conn.remoteAudioEntries.delete(track.id);
            this.rebuildRemoteAudioStreams(conn);
          };
          this.rebuildRemoteAudioStreams(conn);
        } else if (track.kind === "video") {
          conn.remoteVideoEntries.set(track.id, {
            track,
            streamId,
            mid,
            transceiver: e.transceiver || null,
          });
          track.onunmute = () => {
            this.rebuildRemoteVideoStreams(conn);
            this.onSignalSend?.(peerId, {
              signalType: "request-keyframe",
              mid,
            });
          };
          track.onended = () => {
            conn.remoteVideoEntries.delete(track.id);
            this.rebuildRemoteVideoStreams(conn);
          };
          // Immediately request keyframe on track discovery so the video decoder receives an I-frame right away
          this.onSignalSend?.(peerId, {
            signalType: "request-keyframe",
            mid,
          });
        }
      }

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
    if (raw.length > 60000) return 0; // Avoid RTCDataChannel message size limit exceptions
    let sent = 0;
    for (const [id, conn] of this.connections.entries()) {
      if (targetPeerId && id !== targetPeerId) continue;
      if (conn.dataChannel && conn.dataChannel.readyState === "open") {
        try {
          conn.dataChannel.send(raw);
          sent++;
        } catch {}
      }
    }
    return sent;
  }

  rebuildRemoteAudioStreams(conn) {
    if (!conn || !this.connections.has(conn.peerId)) return;
    const activeEntries = Array.from(conn.remoteAudioEntries.values()).filter(
      (entry) => entry.track && entry.track.readyState !== "ended"
    );
    const meta = conn.remoteStreamMeta || {};

    let voiceTrack = null;
    let scrAudioTrack = null;

    // 1. Match Screen Share Audio track by ID, Stream ID, or Transceiver MID
    if (meta.hasScreen !== false && meta.hasScreenAudio !== false) {
      for (const entry of activeEntries) {
        const entryMid = entry.transceiver?.mid || entry.mid;
        if (
          (meta.screenAudioTrackId && entry.track.id === meta.screenAudioTrackId) ||
          (meta.screenStreamId &&
            entry.streamId &&
            entry.streamId === meta.screenStreamId &&
            entry.streamId !== meta.voiceAudioStreamId) ||
          (meta.screenAudioMid && entryMid && entryMid === meta.screenAudioMid)
        ) {
          scrAudioTrack = entry.track;
          break;
        }
      }
    }

    // 2. Match Microphone Voice track by ID, Stream ID, or Transceiver MID
    for (const entry of activeEntries) {
      if (entry.track === scrAudioTrack) continue;
      const entryMid = entry.transceiver?.mid || entry.mid;
      if (
        (meta.voiceAudioTrackId && entry.track.id === meta.voiceAudioTrackId) ||
        (meta.voiceAudioStreamId && entry.streamId && entry.streamId === meta.voiceAudioStreamId) ||
        (meta.voiceAudioMid && entryMid && entryMid === meta.voiceAudioMid)
      ) {
        voiceTrack = entry.track;
        break;
      }
    }

    // 3. Fallback matching for remaining active audio tracks
    for (const entry of activeEntries) {
      const track = entry.track;
      if (track === voiceTrack || track === scrAudioTrack) continue;
      if (!voiceTrack) {
        voiceTrack = track;
      } else if (!scrAudioTrack && meta.hasScreen !== false) {
        scrAudioTrack = track;
      }
    }

    conn.usingPcmAudio = false;
    if (conn.pcmGainNode) {
      try {
        conn.pcmGainNode.gain.value = 0;
        conn.pcmGainNode.disconnect();
      } catch {}
      conn.pcmGainNode = null;
    }

    // Route Voice track exclusively to Voice Mixer (conn.audioEl + conn.gainNode + conn.analyser)
    const prevVoiceTrackId = conn.remoteStream?.getAudioTracks()?.[0]?.id || null;
    if (voiceTrack) {
      if (prevVoiceTrackId !== voiceTrack.id) {
        conn.remoteStream = new MediaStream([voiceTrack]);
        conn.audioEl.srcObject = conn.remoteStream;
        this.applySinkIdToElement(conn.audioEl);
        this.setupRemoteAudioGraph(conn);
      }
      conn.audioEl.muted = this.selfDeafen || conn.muted;
      const effectiveVoiceGain =
        this.selfDeafen || conn.muted
          ? 0
          : (conn.volume / 100) * (this.masterOutputVolume / 100);
      conn.audioEl.volume = Math.min(1, effectiveVoiceGain);
      conn.audioEl.play().catch(() => {});
    } else {
      conn.remoteStream = new MediaStream();
      conn.audioEl.srcObject = null;
    }

    // Route Screen Share Audio track exclusively to Stream Mixer (conn.screenAudioEl + conn.screenGainNode)
    const prevScrAudioTrackId = conn.remoteScreenAudioStream?.getAudioTracks()?.[0]?.id || null;
    if (scrAudioTrack) {
      if (prevScrAudioTrackId !== scrAudioTrack.id) {
        conn.remoteScreenAudioStream = new MediaStream([scrAudioTrack]);
        conn.screenAudioEl.srcObject = conn.remoteScreenAudioStream;
        this.applySinkIdToElement(conn.screenAudioEl);
        this.setupRemoteScreenAudioGraph(conn);
      }
      conn.screenAudioEl.muted = this.selfDeafen || conn.screenMuted;
      const effectiveScrGain =
        this.selfDeafen || conn.screenMuted
          ? 0
          : ((conn.screenVolume ?? 100) / 100) * (this.masterOutputVolume / 100);
      conn.screenAudioEl.volume = Math.min(1, effectiveScrGain);
      conn.screenAudioEl.play().catch(() => {});
    } else {
      conn.remoteScreenAudioStream = new MediaStream();
      if (conn.screenAudioEl) {
        conn.screenAudioEl.srcObject = null;
      }
      if (conn.screenAudioSourceNode) {
        try {
          conn.screenAudioSourceNode.disconnect();
        } catch {}
        conn.screenAudioSourceNode = null;
      }
      if (conn.screenGainNode) {
        try {
          conn.screenGainNode.gain.value = 0;
          conn.screenGainNode.disconnect();
        } catch {}
        conn.screenGainNode = null;
      }
    }

    this.updateFallbackProcessorState();
  }

  setupRemoteAudioGraph(conn) {
    try {
      if (conn.remoteStream.getAudioTracks().length === 0) return;
      const ctx = this.ensureAudioContext();
      if (conn.audioSourceNode) {
        try {
          conn.audioSourceNode.disconnect();
        } catch {}
      }
      if (conn.gainNode) {
        try {
          conn.gainNode.disconnect();
        } catch {}
      }
      const source = ctx.createMediaStreamSource(conn.remoteStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      // Independent Voice Boost Gain (100%..200%)
      const gainNode = ctx.createGain();
      const effectiveGain =
        this.selfDeafen || conn.muted
          ? 0
          : (conn.volume / 100) * (this.masterOutputVolume / 100);
      gainNode.gain.value = effectiveGain > 1 ? effectiveGain - 1 : 0;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      conn.audioSourceNode = source;
      conn.gainNode = gainNode;
      conn.analyser = analyser;
    } catch {}
  }

  setupRemoteScreenAudioGraph(conn) {
    try {
      if (!conn.remoteScreenAudioStream || conn.remoteScreenAudioStream.getAudioTracks().length === 0) {
        return;
      }
      const ctx = this.ensureAudioContext();
      if (conn.screenAudioSourceNode) {
        try {
          conn.screenAudioSourceNode.disconnect();
        } catch {}
      }
      if (conn.screenGainNode) {
        try {
          conn.screenGainNode.disconnect();
        } catch {}
      }
      const source = ctx.createMediaStreamSource(conn.remoteScreenAudioStream);
      const screenGainNode = ctx.createGain();
      const effectiveScrGain =
        this.selfDeafen || conn.screenMuted
          ? 0
          : ((conn.screenVolume ?? 100) / 100) * (this.masterOutputVolume / 100);
      screenGainNode.gain.value = effectiveScrGain > 1 ? effectiveScrGain - 1 : 0;
      source.connect(screenGainNode);
      screenGainNode.connect(ctx.destination);

      conn.screenAudioSourceNode = source;
      conn.screenGainNode = screenGainNode;
    } catch {}
  }

  buildLocalStreamMeta(conn = null) {
    const voiceAudioTrack = this.localAudioStream?.getAudioTracks()?.[0] || null;
    const screenAudioTrack =
      this.processedScreenAudioTrack ||
      this.localScreenStream?.getAudioTracks()?.[0] ||
      null;
    const camTrack = this.localVideoStream?.getVideoTracks()?.[0] || null;
    const scrTrack = this.localScreenStream?.getVideoTracks()?.[0] || null;
    let voiceAudioMid = null;
    let screenAudioMid = null;
    let cameraMid = null;
    let screenMid = null;
    if (conn?.pc) {
      try {
        for (const tr of conn.pc.getTransceivers()) {
          if (conn.audioSender && tr.sender === conn.audioSender) {
            voiceAudioMid = tr.mid;
          }
          if (conn.screenAudioSender && tr.sender === conn.screenAudioSender) {
            screenAudioMid = tr.mid;
          }
          if (conn.cameraSender && tr.sender === conn.cameraSender) {
            cameraMid = tr.mid;
          }
          if (conn.screenSender && tr.sender === conn.screenSender) {
            screenMid = tr.mid;
          }
        }
      } catch {}
    }
    return {
      hasCamera: Boolean(camTrack && camTrack.readyState === "live"),
      hasScreen: Boolean(scrTrack && scrTrack.readyState === "live"),
      hasScreenAudio: Boolean(screenAudioTrack && screenAudioTrack.readyState === "live"),
      voiceAudioTrackId: voiceAudioTrack?.id || null,
      screenAudioTrackId: screenAudioTrack?.id || null,
      voiceAudioStreamId: this.localAudioStream?.id || null,
      cameraTrackId: camTrack?.id || null,
      screenTrackId: scrTrack?.id || null,
      cameraStreamId: this.localVideoStream?.id || null,
      screenStreamId: this.localScreenStream?.id || null,
      voiceAudioMid,
      screenAudioMid,
      cameraMid,
      screenMid,
      screenResolution: this.screenResolution,
      screenFrameRate: this.screenFrameRate,
      cameraResolution: this.cameraResolution,
    };
  }

  rebuildRemoteVideoStreams(conn) {
    const activeEntries = Array.from(conn.remoteVideoEntries.values()).filter(
      (entry) => entry.track && entry.track.readyState !== "ended"
    );
    const meta = conn.remoteStreamMeta || {};

    let camTrack = null;
    let scrTrack = null;

    // 1. Match Screen Share track by ID, Stream ID, or Transceiver MID
    if (meta.hasScreen !== false) {
      for (const entry of activeEntries) {
        const entryMid = entry.transceiver?.mid || entry.mid;
        if (
          (meta.screenTrackId && entry.track.id === meta.screenTrackId) ||
          (meta.screenStreamId && entry.streamId === meta.screenStreamId) ||
          (meta.screenMid && entryMid && entryMid === meta.screenMid)
        ) {
          scrTrack = entry.track;
          break;
        }
      }
    } else {
      conn.remoteScreenFrameUrl = null;
    }

    // 2. Match Camera track by ID, Stream ID, or Transceiver MID
    if (meta.hasCamera !== false) {
      for (const entry of activeEntries) {
        if (entry.track === scrTrack) continue;
        const entryMid = entry.transceiver?.mid || entry.mid;
        if (
          (meta.cameraTrackId && entry.track.id === meta.cameraTrackId) ||
          (meta.cameraStreamId && entry.streamId === meta.cameraStreamId) ||
          (meta.cameraMid && entryMid && entryMid === meta.cameraMid)
        ) {
          camTrack = entry.track;
          break;
        }
      }
    } else {
      conn.remoteCameraFrameUrl = null;
    }

    // 3. Fallback matching for remaining active tracks
    for (const entry of activeEntries) {
      const track = entry.track;
      if (track === camTrack || track === scrTrack) continue;
      if (meta.hasScreen && !scrTrack) {
        scrTrack = track;
      } else if (meta.hasCamera && !camTrack) {
        camTrack = track;
      } else if (!scrTrack && meta.hasScreen !== false && meta.hasCamera === false) {
        scrTrack = track;
      } else if (!camTrack && meta.hasCamera !== false && meta.hasScreen === false) {
        camTrack = track;
      }
    }

    if (meta.hasScreen === false) {
      scrTrack = null;
    }
    if (meta.hasCamera === false) {
      camTrack = null;
    }

    if (camTrack) {
      if (
        !conn.remoteCameraStream ||
        conn.remoteCameraStream.getVideoTracks()[0]?.id !== camTrack.id
      ) {
        conn.remoteCameraStream = new MediaStream([camTrack]);
      }
    } else {
      conn.remoteCameraStream = null;
    }

    if (scrTrack) {
      if (
        !conn.remoteScreenStream ||
        conn.remoteScreenStream.getVideoTracks()[0]?.id !== scrTrack.id
      ) {
        conn.remoteScreenStream = new MediaStream([scrTrack]);
      }
    } else {
      conn.remoteScreenStream = null;
    }

    this.emitRemoteStreamState(conn);
  }

  emitRemoteStreamState(conn) {
    this.onRemoteStream?.(conn.peerId, {
      audioStream: conn.remoteStream,
      cameraStream: conn.remoteCameraStream,
      screenStream: conn.remoteScreenStream,
      cameraFrameUrl: conn.remoteCameraFrameUrl || null,
      screenFrameUrl: conn.remoteScreenFrameUrl || null,
      screenResolution: conn.remoteStreamMeta?.screenResolution || "1080p",
      screenFrameRate: conn.remoteStreamMeta?.screenFrameRate || 30,
      cameraResolution: conn.remoteStreamMeta?.cameraResolution || "720p",
      updatedAt: Date.now(),
    });
  }

  attachLocalTracksToConn(conn) {
    const pc = conn.pc;
    if (pc.signalingState === "closed") return false;
    let addedNewTrack = false;

    const audioTrack = this.localAudioStream?.getAudioTracks()?.[0] || null;
    if (audioTrack) {
      if (conn.audioSender) {
        conn.audioSender.replaceTrack(audioTrack).catch(() => {});
      } else {
        conn.audioSender = pc.addTrack(audioTrack, this.localAudioStream);
        addedNewTrack = true;
      }
    }

    const screenAudioTrack =
      this.processedScreenAudioTrack ||
      this.localScreenStream?.getAudioTracks()?.[0] ||
      null;
    if (screenAudioTrack) {
      if (conn.screenAudioSender) {
        conn.screenAudioSender.replaceTrack(screenAudioTrack).catch(() => {});
      } else {
        conn.screenAudioSender = pc.addTrack(screenAudioTrack, this.localScreenStream);
        addedNewTrack = true;
      }
    } else if (conn.screenAudioSender) {
      conn.screenAudioSender.replaceTrack(null).catch(() => {});
    }

    const camTrack = this.localVideoStream?.getVideoTracks()?.[0] || null;
    if (camTrack) {
      if (conn.cameraSender) {
        const prev = conn.cameraSender.track;
        if (prev !== camTrack) {
          conn.cameraSender.replaceTrack(camTrack).catch(() => {});
          addedNewTrack = true;
        }
      } else {
        conn.cameraSender = pc.addTrack(camTrack, this.localVideoStream);
        addedNewTrack = true;
      }
    } else if (conn.cameraSender && conn.cameraSender.track) {
      conn.cameraSender.replaceTrack(null).catch(() => {});
      addedNewTrack = true;
    }

    const scrTrack = this.localScreenStream?.getVideoTracks()?.[0] || null;
    if (scrTrack) {
      if (conn.screenSender) {
        const prev = conn.screenSender.track;
        if (prev !== scrTrack) {
          conn.screenSender.replaceTrack(scrTrack).catch(() => {});
          addedNewTrack = true;
        }
      } else {
        conn.screenSender = pc.addTrack(scrTrack, this.localScreenStream);
        addedNewTrack = true;
      }
    } else if (conn.screenSender && conn.screenSender.track) {
      conn.screenSender.replaceTrack(null).catch(() => {});
      addedNewTrack = true;
    }

    return addedNewTrack;
  }

  hasUnsentLocalTracks(conn) {
    const pc = conn.pc;
    if (!pc || pc.signalingState === "closed") return false;
    const transceivers = pc.getTransceivers ? pc.getTransceivers() : [];
    const checkSender = (sender, track) => {
      if (!track || !sender) return false;
      const tr = transceivers.find((t) => t.sender === sender);
      if (!tr) return false;
      return tr.currentDirection !== "sendrecv" && tr.currentDirection !== "sendonly";
    };

    const audioTrack = this.localAudioStream?.getAudioTracks()?.[0] || null;
    const screenAudioTrack =
      this.processedScreenAudioTrack ||
      this.localScreenStream?.getAudioTracks()?.[0] ||
      null;
    const camTrack = this.localVideoStream?.getVideoTracks()?.[0] || null;
    const scrTrack = this.localScreenStream?.getVideoTracks()?.[0] || null;

    return (
      checkSender(conn.audioSender, audioTrack) ||
      checkSender(conn.screenAudioSender, screenAudioTrack) ||
      checkSender(conn.cameraSender, camTrack) ||
      checkSender(conn.screenSender, scrTrack)
    );
  }

  async flushPendingCandidates(conn) {
    if (!conn.pc.remoteDescription || !conn.pc.remoteDescription.type) return;
    while (conn.pendingCandidates.length > 0) {
      const candidate = conn.pendingCandidates.shift();
      try {
        await conn.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    }
  }

  async syncAudioTrackWithPeers() {
    const activeAudioTrack = this.localAudioStream?.getAudioTracks()?.[0] || null;
    if (!activeAudioTrack) return;
    for (const [peerId, conn] of this.connections.entries()) {
      if (conn.audioSender) {
        await conn.audioSender.replaceTrack(activeAudioTrack).catch(() => {});
      } else {
        this.attachLocalTracksToConn(conn);
        await this.negotiateWithPeer(peerId);
      }
    }
  }

  async syncTracksWithPeers() {
    for (const [peerId, conn] of this.connections.entries()) {
      const addedNewTrack = this.attachLocalTracksToConn(conn);
      const unsent = this.hasUnsentLocalTracks(conn);
      const streamMeta = this.buildLocalStreamMeta(conn);

      this.onSignalSend?.(peerId, {
        signalType: "stream-meta",
        streamMeta,
      });

      if (addedNewTrack || unsent) {
        await this.negotiateWithPeer(peerId);
      }
    }
  }

  async negotiateWithPeer(peerId) {
    if (!this.inVoiceChannel) return;
    if (!this.localAudioStream) {
      await this.startLocalVoice();
    }
    const conn = this.createPeerConnection(peerId, true);

    conn.signalQueue = conn.signalQueue
      .then(async () => {
        if (!this.inVoiceChannel || conn.pc.signalingState === "closed") return;
        this.attachLocalTracksToConn(conn);

        if (conn.pc.signalingState !== "stable") {
          conn.needsFollowUpNegotiation = true;
          return;
        }

        try {
          conn.makingOffer = true;
          conn.hasNegotiated = true;
          const offer = await conn.pc.createOffer();
          if (conn.pc.signalingState !== "stable") {
            conn.needsFollowUpNegotiation = true;
            return;
          }
          await conn.pc.setLocalDescription(offer);
          await this.configureAllPeerVideoSenders();
          this.forceKeyFrame(conn);
          this.onSignalSend?.(peerId, {
            signalType: "offer",
            sdp: this.enhanceSdpBitrate(conn.pc.localDescription),
            streamMeta: this.buildLocalStreamMeta(conn),
          });
        } catch (err) {
          console.warn("[Freecord VoiceEngine] negotiateWithPeer error:", err.message);
        } finally {
          conn.makingOffer = false;
        }
      })
      .catch(() => {});

    return await conn.signalQueue;
  }

  async handleIncomingSignal(fromPeerId, signal) {
    if (!this.inVoiceChannel || !fromPeerId || !signal) return;

    // Kick off local audio initialization without blocking urgent incoming signaling
    if (!this.localAudioStream && !this.voiceInitPromise) {
      this.startLocalVoice().catch(() => {});
    }

    let conn = this.createPeerConnection(fromPeerId, false);

    conn.signalQueue = conn.signalQueue
      .then(async () => {
        if (!this.inVoiceChannel) return;
        if (signal.streamMeta) {
          conn.remoteStreamMeta = {
            ...conn.remoteStreamMeta,
            ...signal.streamMeta,
          };
          this.rebuildRemoteAudioStreams(conn);
          this.rebuildRemoteVideoStreams(conn);
        }

        if (signal.signalType === "stream-meta") {
          return;
        }

        if (signal.signalType === "request-keyframe") {
          this.forceKeyFrame(conn, signal.kind || null);
          return;
        }

        if (signal.signalType === "ice-candidate" && signal.candidate) {
          if (!conn.pc.remoteDescription || !conn.pc.remoteDescription.type) {
            conn.pendingCandidates.push(signal.candidate);
          } else {
            try {
              await conn.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch {}
          }
          return;
        }

        if (signal.signalType === "offer" && signal.sdp) {
          conn.hasNegotiated = true;
          if (this.voiceInitPromise) {
            await Promise.race([
              this.voiceInitPromise,
              new Promise((r) => setTimeout(r, 350)),
            ]);
          }

          const isPolite =
            !this.localPeerId || String(this.localPeerId) > String(fromPeerId);
          const offerCollision =
            conn.makingOffer || conn.pc.signalingState !== "stable";

          if (offerCollision) {
            if (!isPolite) {
              // Impolite peer ignores colliding offer; polite peer will accept ours
              return;
            }
            try {
              await conn.pc.setLocalDescription({ type: "rollback" });
            } catch {}
          }

          try {
            await conn.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          } catch (err) {
            // Remote peer likely re-initialized its RTCPeerConnection (e.g. rejoined voice)
            console.warn(
              "[Freecord VoiceEngine] Resetting stale RTCPeerConnection on new offer:",
              err.message
            );
            conn = this.createPeerConnection(fromPeerId, false, true);
            if (signal.streamMeta) {
              conn.remoteStreamMeta = {
                ...conn.remoteStreamMeta,
                ...signal.streamMeta,
              };
            }
            await conn.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          }

          await this.flushPendingCandidates(conn);
          this.attachLocalTracksToConn(conn);

          const answer = await conn.pc.createAnswer();
          await conn.pc.setLocalDescription(answer);
          await this.configureAllPeerVideoSenders();
          this.forceKeyFrame(conn);

          const localMeta = this.buildLocalStreamMeta(conn);
          this.onSignalSend?.(fromPeerId, {
            signalType: "answer",
            sdp: this.enhanceSdpBitrate(conn.pc.localDescription),
            streamMeta: localMeta,
          });

          this.rebuildRemoteAudioStreams(conn);
          this.rebuildRemoteVideoStreams(conn);

          // If we have local camera/screen/audio tracks that couldn't fit in the answer SDP (because offer had no m=video), immediately send a follow-up offer!
          if (conn.needsFollowUpNegotiation || this.hasUnsentLocalTracks(conn)) {
            conn.needsFollowUpNegotiation = false;
            setTimeout(() => {
              this.negotiateWithPeer(fromPeerId);
            }, 40);
          }
        } else if (signal.signalType === "answer" && signal.sdp) {
          if (conn.pc.signalingState !== "have-local-offer") {
            return;
          }
          try {
            await conn.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            await this.flushPendingCandidates(conn);
            this.forceKeyFrame(conn);
            this.rebuildRemoteAudioStreams(conn);
            this.rebuildRemoteVideoStreams(conn);

            // Re-broadcast stream-meta now that transceiver mids are finalized
            this.onSignalSend?.(fromPeerId, {
              signalType: "stream-meta",
              streamMeta: this.buildLocalStreamMeta(conn),
            });

            if (conn.needsFollowUpNegotiation || this.hasUnsentLocalTracks(conn)) {
              conn.needsFollowUpNegotiation = false;
              setTimeout(() => {
                this.negotiateWithPeer(fromPeerId);
              }, 40);
            }
          } catch (err) {
            console.warn("[Freecord VoiceEngine] Error setting remote answer:", err.message);
          }
        }
      })
      .catch((err) => {
        console.warn("[Freecord VoiceEngine] Signal queue error:", err.message);
      });

    return await conn.signalQueue;
  }

  // Serverless Manual WebRTC SDP Invite Code (for Browser-to-Browser or strict NAT without port forwarding)
  async createManualInviteOffer(localProfile) {
    this.inVoiceChannel = true;
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

    this.inVoiceChannel = true;
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
          // Check remote speaking state from analyser
          if (conn.analyser) {
            const data = new Uint8Array(conn.analyser.frequencyBinCount);
            conn.analyser.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i];
            const avg = sum / data.length;
            const isRemoteSpeaking = avg > 10 && !conn.muted && !this.selfDeafen;
            if (conn.remoteSpeaking !== isRemoteSpeaking) {
              conn.remoteSpeaking = isRemoteSpeaking;
              this.onSpeakingChange?.(peerId, isRemoteSpeaking);
            }
          }

          const report = await conn.pc.getStats();
          let rttMs = conn.stats.rttMs;
          let bytesSent = 0;
          let bytesReceived = 0;
          report.forEach((stat) => {
            if (
              stat.type === "candidate-pair" &&
              stat.state === "succeeded" &&
              stat.currentRoundTripTime != null
            ) {
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
    }, 600);
  }

  destroyPeer(peerId) {
    const conn = this.connections.get(peerId);
    if (!conn) return;
    if (conn.speakingDecayTimer) {
      clearTimeout(conn.speakingDecayTimer);
      conn.speakingDecayTimer = null;
    }
    if (conn.pcmGainNode) {
      try {
        conn.pcmGainNode.gain.value = 0;
        conn.pcmGainNode.disconnect();
      } catch {}
      conn.pcmGainNode = null;
    }
    if (conn.gainNode) {
      try {
        conn.gainNode.gain.value = 0;
        conn.gainNode.disconnect();
      } catch {}
      conn.gainNode = null;
    }
    if (conn.audioSourceNode) {
      try {
        conn.audioSourceNode.disconnect();
      } catch {}
      conn.audioSourceNode = null;
    }
    if (conn.screenGainNode) {
      try {
        conn.screenGainNode.gain.value = 0;
        conn.screenGainNode.disconnect();
      } catch {}
      conn.screenGainNode = null;
    }
    if (conn.screenAudioSourceNode) {
      try {
        conn.screenAudioSourceNode.disconnect();
      } catch {}
      conn.screenAudioSourceNode = null;
    }
    if (conn.remoteStream) {
      try {
        conn.remoteStream.getTracks().forEach((t) => t.stop());
      } catch {}
    }
    if (conn.remoteScreenAudioStream) {
      try {
        conn.remoteScreenAudioStream.getTracks().forEach((t) => t.stop());
      } catch {}
    }
    try {
      conn.pc.ontrack = null;
      conn.pc.onicecandidate = null;
      conn.pc.onconnectionstatechange = null;
      conn.pc.oniceconnectionstatechange = null;
      conn.pc.close();
    } catch {}
    if (conn.audioEl) {
      try {
        conn.audioEl.pause();
        conn.audioEl.muted = true;
        conn.audioEl.srcObject = null;
        conn.audioEl.removeAttribute("src");
        conn.audioEl.load();
        conn.audioEl.remove();
      } catch {}
    }
    if (conn.screenAudioEl) {
      try {
        conn.screenAudioEl.pause();
        conn.screenAudioEl.muted = true;
        conn.screenAudioEl.srcObject = null;
        conn.screenAudioEl.removeAttribute("src");
        conn.screenAudioEl.load();
        conn.screenAudioEl.remove();
      } catch {}
    }
    this.connections.delete(peerId);
    this.updateFallbackProcessorState();
    this.updateFrameRelayLoop();
  }

  destroyAll() {
    this.inVoiceChannel = false;
    this.cleanupScreenAudioGraph();
    for (const peerId of Array.from(this.connections.keys())) {
      this.destroyPeer(peerId);
    }
    const bin = getAudioBinContainer();
    if (bin) {
      bin.querySelectorAll("audio").forEach((el) => {
        try {
          el.pause();
          el.muted = true;
          el.srcObject = null;
          el.removeAttribute("src");
          el.load();
          el.remove();
        } catch {}
      });
    }
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    if (this.keyFrameInterval) {
      clearInterval(this.keyFrameInterval);
      this.keyFrameInterval = null;
    }
    if (this.frameRelayInterval) {
      clearInterval(this.frameRelayInterval);
      this.frameRelayInterval = null;
    }
    if (this.txProcessorNode) {
      try {
        this.txProcessorNode.onaudioprocess = null;
        this.txProcessorNode.disconnect();
      } catch {}
      this.txProcessorNode = null;
      this.txProcessorAttached = false;
    }
    if (this.txZeroGainNode) {
      try {
        this.txZeroGainNode.disconnect();
      } catch {}
      this.txZeroGainNode = null;
    }
    if (this.txAnalyser) {
      try {
        this.txAnalyser.disconnect();
      } catch {}
      this.txAnalyser = null;
    }
    if (this.txSourceNode) {
      try {
        this.txSourceNode.disconnect();
      } catch {}
      this.txSourceNode = null;
    }
    if (this.txScreenAudioSourceNode) {
      try {
        this.txScreenAudioSourceNode.disconnect();
      } catch {}
      this.txScreenAudioSourceNode = null;
    }
    if (this.txMixNode) {
      try {
        this.txMixNode.disconnect();
      } catch {}
      this.txMixNode = null;
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
    if (this.audioContext) {
      try {
        this.audioContext.close().catch(() => {});
      } catch {}
      this.audioContext = null;
    }
    this.localSpeaking = false;
    this.activeDesktopSourceId = null;
    this.updateFrameRelayLoop();
  }
}
