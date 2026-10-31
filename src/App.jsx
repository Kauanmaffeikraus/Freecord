import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Hash,
  Volume2,
  Mic,
  MicOff,
  Headphones,
  Settings,
  Sliders,
  Plus,
  Radio,
  Monitor,
  Video,
  VideoOff,
  PhoneOff,
  Send,
  Paperclip,
  ShieldCheck,
  Copy,
  Check,
  Minus,
  Square,
  X,
  ExternalLink,
  Download,
  RefreshCw,
  Globe,
  Upload,
  Trash2,
  Sparkles,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  PictureInPicture2,
  LayoutGrid,
  PhoneCall,
  PhoneIncoming,
  UserPlus,
  LogOut,
  Bell,
  BellOff,
  ArrowLeft,
  ChevronLeft,
  ChevronDown,
  MessageSquare,
  Users,
  User,
  Lock,
  QrCode,
  Camera,
  KeyRound,
  Reply,
  Pin,
  Pencil,
  Smile,
  Gamepad2,
} from "lucide-react";
import {
  WebRTCVoiceEngine,
  SCREEN_RESOLUTIONS,
  CAMERA_RESOLUTIONS,
  SCREEN_FPS_OPTIONS,
} from "./services/webrtcVoiceEngine";
import {
  loadOrCreateCryptoIdentity,
  ensureECDHCryptoIdentity,
  encryptChatMessagePayload,
  decryptChatMessagePayload,
  buildSharedChannelIds,
  buildHistorySyncDigest,
  collectMissedMessagesForPeer,
  mergeHistoryMessages,
  buildLanQrPayload,
  sortEndpointsByLanPriority,
  parseScannedQrPayload,
  generateQrCodeDataUrl,
  decodeQrFromImageData,
  createIdentityBackupBundle,
  parseIdentityBackupBundle,
} from "./services/p2pPhase1CryptoAndQr";
import DiscordMarkdown from "./components/chat/DiscordMarkdown";
import EmojiPickerPopover from "./components/chat/EmojiPickerPopover";
import PinnedMessagesModal from "./components/chat/PinnedMessagesModal";

const AVAILABLE_BADGES = [
  "P2P Node",
  "Early Adopter",
  "Serverless Pioneer",
  "REA Verified",
  "Mesh Host",
  "Go Live Streamer",
];

const STATUS_EMOJIS = ["⚡", "🚀", "🎮", "💻", "🎧", "🔥", "🛡️", "🌙", "☕"];

const ANIMATED_AVATAR_PRESETS = [
  { name: "Hacker Cat", url: "https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif" },
  { name: "Matrix Glitch", url: "https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif" },
  { name: "Pixel Synth", url: "https://media.giphy.com/media/L1R1tvI9svkIWwpVYr/giphy.gif" },
  { name: "Anime Star", url: "https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif" },
  { name: "Glitch Skull", url: "https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif" },
  { name: "Neon Flame", url: "https://media.giphy.com/media/du3J3cXyzhj75IOgvA/giphy.gif" },
];

const ANIMATED_BANNER_PRESETS = [
  { name: "Retro Grid", url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif" },
  { name: "Cyber City", url: "https://media.giphy.com/media/U3qYN8S0j3bpK/giphy.gif" },
  { name: "Galaxy Nebula", url: "https://media.giphy.com/media/l41lFw057lAJQMwg0/giphy.gif" },
  { name: "Lo-Fi Rain", url: "https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif" },
];

function isAnimatedGifUrl(url) {
  if (!url || typeof url !== "string") return false;
  const s = url.toLowerCase();
  return (
    s.includes("image/gif") ||
    s.endsWith(".gif") ||
    s.includes(".gif?") ||
    s.includes("giphy.com") ||
    s.includes("tenor.com")
  );
}

function readImageFileToDataUrl(file, maxW = 320, maxH = 320, quality = 0.84) {
  if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) {
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("O arquivo GIF deve ter no máximo 10 MB.");
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Falha ao ler arquivo GIF"));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }
  return resizeImageToDataUrl(file, maxW, maxH, quality);
}


function resizeImageToDataUrl(file, maxW, maxH, quality = 0.84) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const I18N = {
  en: {
    nodePill: (id, port, count) => `Node #${id} • Port ${port || "WebRTC"} • ${count} Peer(s) Connected`,
    spawnPeerBtn: "Spawn 2nd Local Peer",
    spawnPeerTooltip: "Launch a second Freecord peer instance on this computer to test P2P immediately",
    p2pHubTitle: "P2P Interconnection",
    networkDashboard: "P2P Network Dashboard",
    directMessagesHeader: (count) => `Direct P2P Messages (${count})`,
    noPeersYet: "No computers connected yet. Click Connect P2P Computer or spawn a 2nd local peer!",
    textChannelsHeader: "Text Channels",
    voiceChannelsHeader: "P2P Voice & Go Live",
    youSuffix: "(You)",
    liveBadge: "LIVE",
    voiceConnected: "Voice Connected (P2P)",
    directWebrtcMesh: "Direct WebRTC Mesh",
    disconnectVoice: "Disconnect from P2P Voice",
    videoBtn: "Video",
    screenBtn: "Screen",
    stopScreenBtn: "Stop Screen",
    portLabel: "Port",
    unmuteMic: "Unmute Microphone",
    muteMic: "Mute Microphone",
    undeafenAudio: "Undeafen Audio",
    deafenAudio: "Deafen Audio",
    profileSettingsTooltip: "Customize Profile & P2P Node Settings",
    connectComputerBtn: "Connect P2P Computer",
    voiceStageTitle: "P2P Voice & Go Live Stage — Direct Serverless Mesh",
    turnOffCamera: "Turn Off Camera",
    turnOnCamera: "Turn On Camera",
    stopGoLive: "Stop Go Live",
    startGoLive: "Share Screen (Go Live)",
    localVolumeTooltip: (name, vol) => `Local Volume for ${name}: ${vol}%`,
    hubBannerTitle: "Freecord PTB — Computer ↔ Computer Interconnection Hub",
    hubBannerDesc:
      "Freecord PTB runs with zero central servers. Computers connect directly via TCP P2P Sockets, Automatic LAN/VPN Discovery (UDP Broadcast & Multicast), and WebRTC P2P (Opus Voice, Video, Go Live & DataChannel).",
    yourEndpointLabel: "YOUR P2P NETWORK ADDRESS (SHARE WITH ANOTHER PC):",
    copied: "Copied!",
    copyIpPort: "Copy IP:Port",
    discoveredLanHeader: (count) => `📡 Automatically Discovered Computers / Peers on LAN (${count})`,
    searchingLan: "Searching for other computers running Freecord on the same LAN/VPN...",
    interconnected: "✓ Interconnected",
    connectP2pBtn: "Connect P2P",
    welcomeChannelTitle: (name) => `Welcome to #${name}!`,
    welcomeChannelDefault:
      "All messages, files, voice, and screen streams in this channel travel directly between connected computers (P2P).",
    fileSharedText: (name, kb) => `📎 File shared via P2P: **${name}** (${kb} KB)`,
    directP2pTransfer: "Direct P2P Transfer",
    downloadBtn: "Download",
    isTyping: (user) => `${user} is typing via P2P...`,
    chatPlaceholder: (name) => `Message #${name} (Serverless P2P)...`,
    sendFileTooltip: "Send File or Image via Direct P2P",
    sendMessageTooltip: "Send P2P Message",
    youSidebarHeader: "You (This Computer) — 1",
    connectedComputersHeader: (count) => `Connected Computers — ${count}`,
    discoveredLanSidebar: (count) => `Discovered on LAN — ${count}`,
    connectShortBtn: "Connect",
    connectModalTitle: "🖧 Interconnect Computers (Serverless P2P)",
    connectModalSub:
      "Connect directly to another computer without a central server using Direct IP:Port, Automatic LAN/VPN Discovery, or Serverless WebRTC SDP Invite Codes.",
    tabIp: "1. Direct IP:Port (TCP+WebRTC)",
    tabLan: (count) => `2. LAN Discovery (${count})`,
    tabSdp: "3. WebRTC SDP Code",
    yourAddressLabel: "Your P2P Address (Share with the other computer):",
    copyBtn: "Copy",
    copyLocalBtn: "Copy Local",
    connectRemoteLabel: "Connect to Another Computer's IP:Port:",
    connectInputPlaceholder: "e.g. 192.168.1.25:49155 or 127.0.0.1:49156",
    lanTabDesc:
      "Computers on the same Wi-Fi, Ethernet, or VPN (Tailscale, ZeroTier, Radmin VPN, Hamachi) appear automatically below via UDP Broadcast/Multicast:",
    noLanDetected: "No other peers detected yet.",
    connectedBadge: "✓ Connected",
    connectNowBtn: "Connect Now",
    sdpTabDesc:
      "Use this mode to connect two computers over the internet via pure WebRTC (exchanging Offer/Answer codes without port forwarding):",
    step1Sdp: "Step 1 — Generate WebRTC Invite Code:",
    generateSdpOfferBtn: "Generate SDP Offer",
    copyOfferBtn: "Copy Offer Code",
    step2Sdp: "Step 2 — Paste Code Received from the Other Computer (Offer or Answer):",
    sdpPlaceholder: "Paste the SDP code generated by the other computer here...",
    processSdpBtn: "Process WebRTC Code",
    sendAnswerBackLabel: "Send this Answer Code back to Computer 1:",
    copyAnswerBtn: "Copy Answer",
    closeBtn: "Close",
    cancelBtn: "Cancel",
    screenPickerTitle: "🖥️ Share Screen (P2P Go Live)",
    screenPickerSub: "Select a screen or window to stream directly to peers in the voice channel:",
    shareSystemAudioLabel: "Share System Audio",
    shareSystemAudioDesc: "Stream desktop / game sound with anti-echo loopback isolation",
    newRoomTitle: "Create New P2P Room",
    newRoomSub: "Created rooms are automatically synchronized with all computers connected to you.",
    roomNameLabel: "P2P Room Name",
    roomNamePlaceholder: "e.g. Reverse Engineering Lab",
    createRoomBtn: "Create P2P Room",
    newChannelTitle: (type) => `Create ${type === "text" ? "Text" : "P2P Voice"} Channel`,
    newChannelSub: "Synchronized instantaneously across the P2P mesh.",
    channelNameLabel: "Channel Name",
    createChannelBtn: "Create Channel",
    profileModalTitle: "Profile Customization Studio",
    cryptoPeerIdLabel: "Cryptographic Peer ID:",
    displayNameLabel: "Display Name",
    usernameLabel: "Username & Tag",
    pronounsLabel: "Pronouns",
    pronounsPlaceholder: "e.g. he/him, she/her, they/them",
    presenceStatusLabel: "Presence Status",
    statusOnline: "Online",
    statusIdle: "Idle",
    statusDnd: "Do Not Disturb",
    statusInvisible: "Invisible",
    customStatusLabel: "Custom Status & Emoji",
    bioLabel: "About Me / Bio",
    bioPlaceholder: "Tell other P2P peers about yourself...",
    avatarImageLabel: "Avatar Image & Color",
    uploadAvatarBtn: "Upload Avatar",
    removeBtn: "Remove",
    bannerImageLabel: "Profile Banner & Theme Colors",
    uploadBannerBtn: "Upload Banner",
    primaryThemeLabel: "Primary Theme",
    accentThemeLabel: "Secondary Theme",
    badgesLabel: "Profile Badges",
    languageLabel: "Interface Language",
    livePreviewLabel: "Live Profile Card Preview",
    aboutMeSection: "ABOUT ME",
    p2pIdentitySection: "P2P CRYPTOGRAPHIC IDENTITY",
    quickMessagePlaceholder: (name) => `Message @${name} directly via P2P...`,
    editMyProfileBtn: "Edit My Profile",
    saveProfileBtn: "Save & Sync Profile",
    mediaSettingsBtn: "Voice, Video & Screen",
    mediaSettingsTitle: "Voice, Camera & Screen Share Settings",
    mediaSettingsSub: "Choose your Audio Output (Speaker/Headset), Microphone Input, Camera, and Go Live Screen Share Resolution & FPS.",
    tabProfileSettings: "Profile & Identity",
    tabMediaSettings: "Audio, Camera & Screen",
    tabUpdateSettings: "Updates",
    updateSettingsTitle: "Freecord Updates & Release Channel",
    updateSettingsSub: "Automatic P2P and GitHub Releases updater powered by electron-updater.",
    currentVersionLabel: "Current App Version:",
    releaseChannelLabel: "Release Channel:",
    updateStatusLabel: "Update Status:",
    checkForUpdatesBtn: "Check for Updates",
    restartAndInstallBtn: "Restart & Update Now",
    updateReadyNotice: "A new version of Freecord is downloaded and ready to install!",
    downloadingUpdate: "Downloading Freecord update...",
    updateUpToDate: "You are running the latest version of Freecord.",
    updateAvailableText: (v) => `New update available: v${v}`,
    viewReleasesOnGithub: "View GitHub Releases",
    avatarGifUrlPlaceholder: "Or paste an animated GIF URL (Tenor, Giphy, web)...",
    bannerGifUrlPlaceholder: "Or paste an animated GIF banner URL...",
    animatedGifBadge: "GIF",
    presetGifsLabel: "Animated GIF Presets:",
    micDeviceLabel: "Input Device (Microphone)",
    speakerDeviceLabel: "Output Device (Speaker / Headset)",
    cameraDeviceLabel: "Camera Device (Video Input)",
    defaultDeviceOption: "System Default Device",
    refreshDevicesBtn: "Refresh Devices",
    testSpeakerBtn: "Test Output Audio",
    testMicLabel: "Live Microphone Input Level",
    masterOutputVolLabel: (vol) => `Master Output Volume: ${vol}%`,
    echoCancelLabel: "Echo Cancellation",
    noiseSuppLabel: "Noise Suppression",
    autoGainLabel: "Automatic Gain Control (AGC)",
    cameraResLabel: "Camera Capture Resolution",
    testCameraBtn: "Preview Camera",
    stopTestCameraBtn: "Stop Preview",
    screenQualitySectionTitle: "Go Live Screen Share Resolution & Frame Rate",
    screenResLabel: "Screen Share Resolution",
    screenFpsLabel: "Frame Rate (FPS)",
    tileSizeLabel: "Size",
    gridModeBtn: "Grid View",
    spotlightBtn: "Focus / Enlarge",
    unspotlightBtn: "Exit Focus",
    theaterModeBtn: "Theater Mode",
    exitTheaterBtn: "Exit Theater",
    stageFullscreenBtn: "Stage Fullscreen",
    tileFullscreenBtn: "Fullscreen",
    pipBtn: "Popout PiP",
    webcamPipToggle: "Webcam PiP Overlay",
    hideWebcamBtn: "Hide Cam",
    showWebcamBtn: "Show Cam",
    hideAllWebcamsBtn: "Hide Webcams",
    showAllWebcamsBtn: "Show Webcams",
    webcamHiddenBadge: "WEBCAM HIDDEN",
    fitContainBtn: "Fit",
    fitCoverBtn: "Fill",
    cameraBadge: "WEBCAM",
    screenBadge: "GO LIVE SCREEN",
    dragResizeHint: "Drag to resize stage height",
    customizeServerBtn: "Customize Server",
    customizeServerTooltip: "Open P2P Server Customization Studio (Right-click or click header)",
    serverStudioEditTitle: "🏰 P2P Server Customization Studio",
    serverStudioCreateTitle: "🏰 Create & Customize New P2P Server",
    serverStudioSub: "Customize your server's icon, banner, colors, tag, description, and channels — synchronized directly across connected P2P peers.",
    serverNameLabel: "Server Name",
    serverShortLabel: "Short Icon / Acronym",
    serverTagLabel: "Server Tag Badge",
    serverDescLabel: "Server Description / Welcome Topic",
    serverDescPlaceholder: "Describe this P2P server community...",
    serverIconLabel: "Server Icon Image & Color",
    uploadServerIconBtn: "Upload Server Icon",
    serverBannerLabel: "Server Banner & Theme Colors",
    uploadServerBannerBtn: "Upload Server Banner",
    sidebarBgLabel: "Sidebar Background",
    manageChannelsSection: "Manage Server Channels (Text & P2P Voice)",
    addTextChannelBtn: "+ Text Channel",
    addVoiceChannelBtn: "+ Voice Channel",
    deleteServerBtn: "Delete Server",
    saveServerBtn: "Save & Sync P2P Server",
    serverLivePreviewLabel: "Live Server Sidebar & Banner Preview",
    inviteServerBtn: "Invite",
    inviteServerTitle: "📨 Invite Peers to P2P Server",
    inviteServerSub: "Send an instant P2P server invite to connected peers or share an invite code.",
    inviteConnectedPeersLabel: "Send Instant Invite to Connected Peers",
    sendInviteBtn: "Send Invite",
    inviteSentBtn: "✓ Invite Sent",
    serverInviteCodeLabel: "Shareable Server Invite Code (IP:Port + Server Snapshot)",
    copyInviteCodeBtn: "Copy Invite Code",
    joinByInviteCodeLabel: "Join a Server via Invite Code",
    joinByInvitePlaceholder: "Paste an fc-srv:// invite code here...",
    joinServerBtn: "Join Server",
    joinedServerBadge: "✓ Joined — Open Server",
    serverInviteCardHeader: "P2P SERVER INVITE",
    invitedYouToJoin: (user) => `${user} invited you to join a P2P Server`,
    leaveServerBtn: "Leave Server",
    leaveServerTooltip: "Leave this P2P Server",
    startVoiceCallBtn: "Voice Call",
    startVideoCallBtn: "Video Call",
    endDmCallBtn: "End Call",
    incomingCallTitle: "Incoming Private P2P Call",
    incomingVoiceCallSub: (user) => `${user} is calling you privately (Voice)...`,
    incomingVideoCallSub: (user) => `${user} is calling you privately (Video)...`,
    acceptVoiceBtn: "Accept Voice",
    acceptVideoBtn: "Accept Video",
    declineCallBtn: "Decline",
    outgoingCallRinging: (user) => `Calling @${user}... Waiting for answer`,
    cancelCallBtn: "Cancel Call",
    callRejectedToast: (user) => `${user} declined or ended the call.`,
    notificationsOnTooltip: "Notifications & Sounds Enabled (Click to Mute)",
    notificationsOffTooltip: "Notifications & Sounds Muted (Click to Enable)",
    newDmToastTitle: (user) => `New DM from ${user}`,
    newChannelMsgToastTitle: (user, ch) => `${user} in #${ch}`,
    newServerInviteToastTitle: (user, srv) => `${user} invited you to ${srv}`,
    mobileServersTab: "Servers",
    mobileDmsTab: "Messages",
    mobileCallTab: "Call",
    mobileYouTab: "You",
    mobileInCallBadge: (name) => `In Voice: ${name}`,
    mobileOpenCallStage: "Open Call",
    mobileMembersTitle: "Channel Members",
    mobileBackBtn: "Back",
    mobileSettingsTitle: "Settings & Profile",
    mobileAudioVideoSettings: "Voice & Video Settings",
    mobileConnectComputers: "Connect P2P Computers",
    mobileLanguage: "Switch Language",
    mobileNotifications: "Sound Notifications",
    mobileEnabled: "Enabled",
    mobileMuted: "Muted",
    mobileNoChannelsFound: "No channels found in this server",
    mobileLeaveServerConfirm: (name) => `Leave server ${name}?`,
  },
  pt: {
    nodePill: (id, port, count) => `Nó #${id} • Porta ${port || "WebRTC"} • ${count} Peer(s) Conectado(s)`,
    spawnPeerBtn: "Abrir 2º Peer Local",
    spawnPeerTooltip: "Abre uma segunda instância do Freecord neste computador para testar a conexão P2P imediatamente",
    p2pHubTitle: "Interconexão P2P",
    networkDashboard: "Painel de Rede P2P",
    directMessagesHeader: (count) => `Mensagens Diretas P2P (${count})`,
    noPeersYet: "Nenhum computador conectado ainda. Clique em Conectar Computador P2P ou abra um 2º Peer local!",
    textChannelsHeader: "Canais de Texto",
    voiceChannelsHeader: "Canais de Voz & Go Live P2P",
    youSuffix: "(Você)",
    liveBadge: "AO VIVO",
    voiceConnected: "Voz Conectada (P2P)",
    directWebrtcMesh: "Malha WebRTC Direta",
    disconnectVoice: "Desconectar da Voz P2P",
    videoBtn: "Vídeo",
    screenBtn: "Tela",
    stopScreenBtn: "Parar Tela",
    portLabel: "Porta",
    unmuteMic: "Ativar Microfone",
    muteMic: "Silenciar Microfone",
    undeafenAudio: "Ativar Áudio",
    deafenAudio: "Desativar Áudio (Ensurdecer)",
    profileSettingsTooltip: "Customizar Perfil e Nó P2P",
    connectComputerBtn: "Conectar Computador P2P",
    voiceStageTitle: "Palco de Voz & Go Live P2P — Malha Direta Sem Servidor",
    turnOffCamera: "Desligar Câmera",
    turnOnCamera: "Ligar Câmera",
    stopGoLive: "Encerrar Go Live",
    startGoLive: "Transmitir Tela (Go Live)",
    localVolumeTooltip: (name, vol) => `Volume Local de ${name}: ${vol}%`,
    hubBannerTitle: "Freecord PTB — Central de Interconexão Computador ↔ Computador",
    hubBannerDesc:
      "O Freecord PTB opera sem nenhum servidor central. Os computadores se conectam diretamente via Sockets TCP P2P, Descoberta Automática LAN/VPN (UDP Broadcast & Multicast) e WebRTC P2P (Voz Opus, Vídeo, Go Live e DataChannel).",
    yourEndpointLabel: "SEU ENDEREÇO P2P NA REDE (ENVIE PARA OUTRO PC):",
    copied: "Copiado!",
    copyIpPort: "Copiar IP:Porta",
    discoveredLanHeader: (count) => `📡 Computadores / Peers Descobertos Automaticamente na Rede (${count})`,
    searchingLan: "Procurando outros computadores com Freecord aberto na mesma rede local/VPN...",
    interconnected: "✓ Interconectado",
    connectP2pBtn: "Conectar P2P",
    welcomeChannelTitle: (name) => `Bem-vindo a #${name}!`,
    welcomeChannelDefault:
      "Todas as mensagens, arquivos, voz e tela neste canal trafegam diretamente entre os computadores conectados (P2P).",
    fileSharedText: (name, kb) => `📎 Arquivo compartilhado via P2P: **${name}** (${kb} KB)`,
    directP2pTransfer: "Transferência P2P Direta",
    downloadBtn: "Baixar",
    isTyping: (user) => `${user} está digitando via P2P...`,
    chatPlaceholder: (name) => `Conversar em #${name} (P2P Serverless)...`,
    sendFileTooltip: "Enviar Arquivo ou Imagem via P2P Direto",
    sendMessageTooltip: "Enviar Mensagem P2P",
    youSidebarHeader: "Você (Este Computador) — 1",
    connectedComputersHeader: (count) => `Computadores Conectados — ${count}`,
    discoveredLanSidebar: (count) => `Descobertos na LAN — ${count}`,
    connectShortBtn: "Ligar",
    connectModalTitle: "🖧 Interconectar Computadores (P2P Serverless)",
    connectModalSub:
      "Conecte-se diretamente a outro computador sem servidor central usando IP:Porta, Descoberta Automática LAN/VPN ou Convite WebRTC SDP.",
    tabIp: "1. IP:Porta Direto (TCP+WebRTC)",
    tabLan: (count) => `2. Descoberta LAN (${count})`,
    tabSdp: "3. Código WebRTC SDP",
    yourAddressLabel: "Seu Endereço P2P (Passe para o outro computador):",
    copyBtn: "Copiar",
    copyLocalBtn: "Copiar Local",
    connectRemoteLabel: "Conectar ao IP:Porta de Outro Computador:",
    connectInputPlaceholder: "Ex: 192.168.1.25:49155 ou 127.0.0.1:49156",
    lanTabDesc:
      "Computadores na mesma rede Wi-Fi, Ethernet ou VPN (Tailscale, ZeroTier, Radmin, Hamachi) aparecem automaticamente abaixo via UDP Broadcast/Multicast:",
    noLanDetected: "Nenhum outro peer detectado ainda.",
    connectedBadge: "✓ Conectado",
    connectNowBtn: "Conectar Agora",
    sdpTabDesc:
      "Use este modo para conectar dois computadores pela internet via WebRTC puro (trocando códigos de Oferta/Resposta sem precisar abrir portas no roteador):",
    step1Sdp: "Passo 1 — Gerar Código de Convite WebRTC:",
    generateSdpOfferBtn: "Gerar Oferta SDP",
    copyOfferBtn: "Copiar Código de Oferta",
    step2Sdp: "Passo 2 — Colar Código Recebido do Outro Computador (Oferta ou Resposta):",
    sdpPlaceholder: "Cole aqui o código SDP gerado pelo outro computador...",
    processSdpBtn: "Processar Código WebRTC",
    sendAnswerBackLabel: "Envie este Código de Resposta de volta ao Computador 1:",
    copyAnswerBtn: "Copiar Resposta",
    closeBtn: "Fechar",
    cancelBtn: "Cancelar",
    screenPickerTitle: "🖥️ Transmitir Tela (Go Live P2P)",
    screenPickerSub: "Selecione a tela ou janela para transmitir diretamente aos peers conectados no canal de voz:",
    shareSystemAudioLabel: "Compartilhar Áudio do Sistema",
    shareSystemAudioDesc: "Transmitir som do jogo / computador com isolamento anti-eco de retorno",
    newRoomTitle: "Criar Nova Sala P2P",
    newRoomSub: "Salas criadas são sincronizadas automaticamente com todos os computadores conectados a você.",
    roomNameLabel: "Nome da Sala P2P",
    roomNamePlaceholder: "Ex: Laboratório Engenharia Reversa",
    createRoomBtn: "Criar Sala P2P",
    newChannelTitle: (type) => `Criar Canal de ${type === "text" ? "Texto" : "Voz P2P"}`,
    newChannelSub: "Sincronizado instantaneamente na malha P2P.",
    channelNameLabel: "Nome do Canal",
    createChannelBtn: "Criar Canal",
    profileModalTitle: "Estúdio de Customização de Perfil",
    cryptoPeerIdLabel: "Peer ID Criptográfico:",
    displayNameLabel: "Nome de Exibição",
    usernameLabel: "Usuário & Tag",
    pronounsLabel: "Pronomes",
    pronounsPlaceholder: "ex: ele/dele, ela/dela",
    presenceStatusLabel: "Status de Presença",
    statusOnline: "Online",
    statusIdle: "Ausente",
    statusDnd: "Não Perturbe",
    statusInvisible: "Invisível",
    customStatusLabel: "Status Personalizado & Emoji",
    bioLabel: "Sobre Mim / Bio",
    bioPlaceholder: "Conte aos outros peers P2P sobre você...",
    avatarImageLabel: "Imagem e Cor do Avatar",
    uploadAvatarBtn: "Enviar Avatar",
    removeBtn: "Remover",
    bannerImageLabel: "Banner do Perfil & Cores do Tema",
    uploadBannerBtn: "Enviar Banner",
    primaryThemeLabel: "Cor Primária",
    accentThemeLabel: "Cor Secundária",
    badgesLabel: "Insígnias do Perfil (Badges)",
    languageLabel: "Idioma da Interface / Language",
    livePreviewLabel: "Pré-visualização do Cartão de Perfil",
    aboutMeSection: "SOBRE MIM",
    p2pIdentitySection: "IDENTIDADE CRIPTOGRÁFICA P2P",
    quickMessagePlaceholder: (name) => `Enviar mensagem direta P2P para @${name}...`,
    editMyProfileBtn: "Editar Meu Perfil",
    saveProfileBtn: "Salvar e Sincronizar Perfil",
    mediaSettingsBtn: "Áudio, Câmera & Tela",
    mediaSettingsTitle: "Configurações de Áudio, Câmera & Transmissão",
    mediaSettingsSub: "Escolha a Saída de Áudio (Fone/Caixa), o Microfone de Entrada, a Câmera e a Resolução + FPS da Transmissão de Tela (Go Live).",
    tabProfileSettings: "Perfil & Identidade",
    tabMediaSettings: "Áudio, Câmera & Tela",
    tabUpdateSettings: "Atualizações",
    updateSettingsTitle: "Atualizações do Freecord & Canal de Lançamento",
    updateSettingsSub: "Atualizador automático via GitHub Releases com electron-updater.",
    currentVersionLabel: "Versão Atual do App:",
    releaseChannelLabel: "Canal de Lançamento:",
    updateStatusLabel: "Status da Atualização:",
    checkForUpdatesBtn: "Verificar Atualizações",
    restartAndInstallBtn: "Reiniciar e Atualizar Agora",
    updateReadyNotice: "Uma nova versão do Freecord foi baixada e está pronta para instalar!",
    downloadingUpdate: "Baixando atualização do Freecord...",
    updateUpToDate: "Você está usando a versão mais recente do Freecord.",
    updateAvailableText: (v) => `Nova atualização disponível: v${v}`,
    viewReleasesOnGithub: "Ver Releases no GitHub",
    micDeviceLabel: "Dispositivo de Entrada (Microfone)",
    speakerDeviceLabel: "Dispositivo de Saída (Áudio / Fone / Alto-falante)",
    cameraDeviceLabel: "Dispositivo de Vídeo (Câmera)",
    defaultDeviceOption: "Padrão do Sistema",
    refreshDevicesBtn: "Atualizar Dispositivos",
    testSpeakerBtn: "Testar Saída de Áudio",
    testMicLabel: "Nível do Microfone em Tempo Real",
    masterOutputVolLabel: (vol) => `Volume Principal de Saída: ${vol}%`,
    echoCancelLabel: "Cancelamento de Eco",
    noiseSuppLabel: "Supressão de Ruído",
    autoGainLabel: "Controle Automático de Ganho (AGC)",
    cameraResLabel: "Resolução de Captura da Câmera",
    testCameraBtn: "Testar Câmera",
    stopTestCameraBtn: "Parar Teste",
    screenQualitySectionTitle: "Resolução e Taxa de Quadros da Transmissão de Tela (Go Live)",
    screenResLabel: "Resolução da Transmissão de Tela",
    screenFpsLabel: "Taxa de Quadros (FPS)",
    tileSizeLabel: "Tamanho",
    gridModeBtn: "Modo Grade",
    spotlightBtn: "Ampliar / Focar",
    unspotlightBtn: "Sair do Foco",
    theaterModeBtn: "Modo Teatro",
    exitTheaterBtn: "Sair do Teatro",
    stageFullscreenBtn: "Palco em Tela Cheia",
    tileFullscreenBtn: "Tela Cheia",
    pipBtn: "Janela PiP",
    webcamPipToggle: "Webcam PiP Flutuante",
    hideWebcamBtn: "Ocultar Câm",
    showWebcamBtn: "Ver Câm",
    hideAllWebcamsBtn: "Ocultar Webcams",
    showAllWebcamsBtn: "Mostrar Webcams",
    webcamHiddenBadge: "WEBCAM OCULTA",
    fitContainBtn: "Ajustar",
    fitCoverBtn: "Preencher",
    cameraBadge: "WEBCAM",
    screenBadge: "TELA GO LIVE",
    dragResizeHint: "Arraste para redimensionar a altura do palco",
    customizeServerBtn: "Personalizar Servidor",
    customizeServerTooltip: "Abrir Estúdio de Personalização do Servidor (Clique aqui ou botão direito no ícone)",
    serverStudioEditTitle: "🏰 Estúdio de Personalização de Servidor P2P",
    serverStudioCreateTitle: "🏰 Criar & Personalizar Novo Servidor P2P",
    serverStudioSub: "Personalize ícone, banner, cores, tag, descrição e canais do servidor — sincronizados diretamente entre os computadores P2P conectados.",
    serverNameLabel: "Nome do Servidor",
    serverShortLabel: "Sigla / Emoji do Ícone",
    serverTagLabel: "Tag / Emblema do Servidor",
    serverDescLabel: "Descrição / Boas-vindas do Servidor",
    serverDescPlaceholder: "Descreva a comunidade deste servidor P2P...",
    serverIconLabel: "Imagem e Cor do Ícone do Servidor",
    uploadServerIconBtn: "Enviar Ícone do Servidor",
    serverBannerLabel: "Banner do Servidor & Cores do Tema",
    uploadServerBannerBtn: "Enviar Banner do Servidor",
    sidebarBgLabel: "Fundo da Barra Lateral",
    manageChannelsSection: "Gerenciar Canais do Servidor (Texto & Voz P2P)",
    addTextChannelBtn: "+ Canal de Texto",
    addVoiceChannelBtn: "+ Canal de Voz",
    deleteServerBtn: "Excluir Servidor",
    saveServerBtn: "Salvar e Sincronizar Servidor P2P",
    serverLivePreviewLabel: "Pré-visualização do Servidor & Banner",
    inviteServerBtn: "Convidar",
    inviteServerTitle: "📨 Convidar para o Servidor P2P",
    inviteServerSub: "Envie um convite instantâneo no PV dos peers conectados ou compartilhe o código do servidor.",
    inviteConnectedPeersLabel: "Convidar Peers Conectados (Envio Direto no PV)",
    sendInviteBtn: "Convidar",
    inviteSentBtn: "✓ Convidado",
    serverInviteCodeLabel: "Código de Convite do Servidor (IP:Porta + Dados do Servidor)",
    copyInviteCodeBtn: "Copiar Código do Servidor",
    joinByInviteCodeLabel: "Entrar em um Servidor com Código de Convite",
    joinByInvitePlaceholder: "Cole aqui um código fc-srv:// recebido...",
    joinServerBtn: "Entrar no Servidor",
    joinedServerBadge: "✓ No Servidor — Abrir",
    serverInviteCardHeader: "CONVITE DE SERVIDOR P2P",
    invitedYouToJoin: (user) => `${user} convidou você para um Servidor P2P`,
    leaveServerBtn: "Sair do Servidor",
    leaveServerTooltip: "Sair deste Servidor P2P",
    startVoiceCallBtn: "Ligar no PV",
    startVideoCallBtn: "Vídeo no PV",
    endDmCallBtn: "Desligar",
    incomingCallTitle: "Ligação Privada P2P Recebida",
    incomingVoiceCallSub: (user) => `${user} está te ligando no PV (Voz)...`,
    incomingVideoCallSub: (user) => `${user} está te ligando no PV (Vídeo)...`,
    acceptVoiceBtn: "Atender Voz",
    acceptVideoBtn: "Atender Vídeo",
    declineCallBtn: "Recusar",
    outgoingCallRinging: (user) => `Ligando para @${user}... Aguardando atender`,
    cancelCallBtn: "Cancelar Ligação",
    callRejectedToast: (user) => `${user} recusou ou encerrou a ligação.`,
    notificationsOnTooltip: "Notificações e Sons Ativados (Clique para Silenciar)",
    notificationsOffTooltip: "Notificações e Sons Silenciados (Clique para Ativar)",
    newDmToastTitle: (user) => `Nova mensagem no PV de ${user}`,
    newChannelMsgToastTitle: (user, ch) => `${user} em #${ch}`,
    newServerInviteToastTitle: (user, srv) => `${user} convidou você para ${srv}`,
    mobileServersTab: "Servidores",
    mobileDmsTab: "Mensagens",
    mobileCallTab: "Chamada",
    mobileYouTab: "Você",
    mobileInCallBadge: (name) => `Em Voz: ${name}`,
    mobileOpenCallStage: "Abrir Chamada",
    mobileMembersTitle: "Membros do Canal",
    mobileBackBtn: "Voltar",
    mobileSettingsTitle: "Configurações e Perfil",
    mobileAudioVideoSettings: "Configurações de Áudio & Vídeo",
    mobileConnectComputers: "Conectar Computadores P2P",
    mobileLanguage: "Mudar Idioma",
    mobileNotifications: "Notificações Sonoras",
    mobileEnabled: "Ativado",
    mobileMuted: "Silenciado",
    mobileNoChannelsFound: "Nenhum canal encontrado neste servidor",
    mobileLeaveServerConfirm: (name) => `Deseja sair do servidor ${name}?`,
  },
};

const INITIAL_ROOMS = [
  {
    id: "room_freecord_main",
    name: "Freecord P2P Hub",
    shortName: "FC",
    serverTag: "P2P",
    description: "Comunidade oficial P2P Serverless — conexão direta entre computadores sem servidor central.",
    color: "#5865f2",
    iconUrl: "./logo.png",
    bannerColor: "#5865f2",
    bannerSecondaryColor: "#9b59b6",
    bannerUrl: null,
    sidebarBgColor: "#2b2d31",
    updatedAt: 1,
    textChannels: [
      { id: "ch_geral", name: "general-p2p", topic: "Direct computer-to-computer chat with zero central servers" },
      { id: "ch_arquivos", name: "files-and-media", topic: "Direct peer-to-peer image & file transfers" },
      { id: "ch_rea", name: "rea-architecture", topic: "DiscordPTB v1.0.1225 architecture reconstructed with REA" },
    ],
    voiceChannels: [
      { id: "vc_principal", name: "Main P2P Voice" },
      { id: "vc_golive", name: "Go Live / P2P Screen" },
    ],
  },
  {
    id: "room_lan_gaming",
    name: "LAN & Squad Mesh",
    shortName: "LAN",
    serverTag: "SQUAD",
    description: "Coordenação rápida em rede local, Wi-Fi ou VPN (Tailscale, ZeroTier, Radmin).",
    color: "#23a55a",
    iconUrl: null,
    bannerColor: "#23a55a",
    bannerSecondaryColor: "#00b0f4",
    bannerUrl: null,
    sidebarBgColor: "#2b2d31",
    updatedAt: 1,
    textChannels: [
      { id: "ch_squad", name: "lan-lobby", topic: "Fast coordination across local network or VPN peers" },
    ],
    voiceChannels: [
      { id: "vc_squad_1", name: "Squad Voice #1" },
    ],
  },
];

const INITIAL_REA_MESSAGES = [
  {
    id: "msg_rea_1",
    channelId: "ch_rea",
    author: {
      peerId: "rea_system",
      displayName: "REA Architecture Ledger",
      username: "rea_ledger",
      tag: "6.7.0",
      avatarColor: "#9b59b6",
      avatarUrl: "./logo.png",
    },
    timestamp: "Today",
    text:
      "✅ **DiscordPTB (`1.0.1225`) Reverse Engineering completed with REA (`rea@6.7.0`):**\n\n" +
      "• **Desktop Installation (`ev_7a7a9ae672dc6142c14f6ebdd1bfef8ad550782d66675846fb5ee8af4386f895`)**: Mapped `DiscordPTB.exe` (PE x64), `app-1.0.1225/resources/_app.asar`, and 17 native modules under `app-1.0.1225/modules/`.\n" +
      "• **Bootstrap `_app.asar` (`ev_57969648ce94fe0e6621d22b2df2655d5f44bfa85ec396651e121fef3b8efb9f`)**: Reconstructed 1,142 graph nodes and 977 Webpack modules (`bundle.js`, `splashScreenPreload.js`).\n" +
      "• **Desktop Core `core.asar` (`ev_63237e0ecd1017fdd2315f484417c1cd369dec71535fc38c4967c3899b0de011`)**: Reconstructed 619 modules including `mainScreenPreload.js` (`contextBridge` -> `window.DiscordNative`), `DiscordIPC` (`IPCEvents`), window manager (`#9698`), and state persistence (`WINDOW_BOUNDS`, `IS_MAXIMIZED`, `MIN_WIDTH`, `MIN_HEIGHT`).\n" +
      "• **Voice & Go Live Engine (`discord_voice/index.js`)**: Reconstructed `VoiceConnection`, `setSelfMute`, `setSelfDeafen`, `setLocalVolume`, `setDesktopSource`, and `getMLSPairwiseFingerprint`, replacing centralized servers with a **Direct P2P Mesh (TCP + UDP Broadcast LAN + WebRTC Mesh)**.",
    reactions: { "🔥": ["rea_system"], "🚀": ["rea_system"] },
  },
  {
    id: "msg_welcome_1",
    channelId: "ch_geral",
    author: {
      peerId: "freecord_node",
      displayName: "Freecord P2P Engine",
      username: "freecord",
      tag: "P2P",
      avatarColor: "#5865f2",
      avatarUrl: "./logo.png",
    },
    timestamp: "Now",
    text:
      "Welcome to **Freecord PTB**! 🖧\n" +
      "This application runs with **zero central servers**: every computer is a full P2P node.\n\n" +
      "👉 **How to interconnect computers or test right now:**\n" +
      "1. **Automatic LAN / VPN Discovery (Wi-Fi / Ethernet / Tailscale / ZeroTier / Radmin)**: Computers automatically discover and connect to each other via UDP Broadcast/Multicast!\n" +
      "2. **Direct IP:Port Connection**: Click **Connect P2P Computer** in the top bar and enter the other computer's `IP:Port`.\n" +
      "3. **Test on this PC**: Click **Spawn 2nd Local Peer** in the top titlebar to launch a second independent peer window and test real-time P2P chat, voice, and screen sharing!",
    reactions: { "⚡": ["freecord_node"] },
  },
];

function VideoStreamView({
  stream,
  frameUrl = null,
  muted = false,
  fitMode = "contain",
  zoom = 1,
  videoId,
  onNeedKeyframe = null,
}) {
  const videoRef = useRef(null);
  const [videoHasDecodedFrames, setVideoHasDecodedFrames] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!stream) {
      el.srcObject = null;
      setVideoHasDecodedFrames(false);
      return;
    }

    setVideoHasDecodedFrames(false);
    el.srcObject = stream;

    const tryPlay = () => {
      el.play().catch(() => {});
    };
    tryPlay();

    const checkFrames = () => {
      if (el && el.videoWidth > 0 && el.videoHeight > 0) {
        setVideoHasDecodedFrames(true);
      }
    };

    checkFrames();

    const handleEvent = () => {
      tryPlay();
      checkFrames();
    };

    el.addEventListener("loadedmetadata", handleEvent);
    el.addEventListener("loadeddata", handleEvent);
    el.addEventListener("canplay", handleEvent);
    el.addEventListener("playing", handleEvent);
    el.addEventListener("resize", handleEvent);
    el.addEventListener("timeupdate", checkFrames);

    const tracks = stream.getVideoTracks ? stream.getVideoTracks() : [];
    const handleUnmute = () => {
      tryPlay();
      checkFrames();
    };
    tracks.forEach((t) => {
      t.addEventListener?.("unmute", handleUnmute);
    });

    let attempts = 0;
    const pollInterval = setInterval(() => {
      attempts++;
      if (el && el.videoWidth > 0 && el.videoHeight > 0) {
        setVideoHasDecodedFrames(true);
        clearInterval(pollInterval);
      } else if (attempts % 3 === 0 && onNeedKeyframe) {
        onNeedKeyframe();
      }
    }, 350);

    return () => {
      clearInterval(pollInterval);
      el.removeEventListener("loadedmetadata", handleEvent);
      el.removeEventListener("loadeddata", handleEvent);
      el.removeEventListener("canplay", handleEvent);
      el.removeEventListener("playing", handleEvent);
      el.removeEventListener("resize", handleEvent);
      el.removeEventListener("timeupdate", checkFrames);
      tracks.forEach((t) => {
        t.removeEventListener?.("unmute", handleUnmute);
      });
    };
  }, [stream]);

  const zoomStyle = zoom !== 1 ? { transform: `scale(${zoom})` } : undefined;
  const showFallback = Boolean(frameUrl && (!stream || !videoHasDecodedFrames));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#08080a",
      }}
    >
      {showFallback && (
        <img
          src={frameUrl}
          alt="P2P Live Stream"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: fitMode === "cover" ? "cover" : "contain",
            zIndex: 1,
            ...zoomStyle,
          }}
        />
      )}
      {stream && (
        <video
          id={videoId}
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={fitMode === "cover" ? "fit-cover" : ""}
          style={{
            width: "100%",
            height: "100%",
            objectFit: fitMode === "cover" ? "cover" : "contain",
            opacity: videoHasDecodedFrames ? 1 : 0,
            transition: "opacity 0.2s ease-in-out",
            position: "relative",
            zIndex: videoHasDecodedFrames ? 2 : 0,
            ...zoomStyle,
          }}
        />
      )}
    </div>
  );
}

function UserAvatar({
  profile,
  size = "normal",
  speaking = false,
  showStatus = false,
  onClick,
  style = {},
}) {
  const name = profile?.displayName || profile?.username || "FC";
  const initials = name.slice(0, 2).toUpperCase();
  const status = profile?.status || "online";

  return (
    <div
      className={`avatar-circle ${size === "small" ? "small" : ""} ${
        speaking ? "speaking" : ""
      }`}
      style={{
        backgroundColor: profile?.avatarColor || "#5865f2",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
      onClick={onClick}
    >
      {profile?.avatarUrl ? (
        <img src={profile.avatarUrl} alt={name} />
      ) : (
        initials
      )}
      {showStatus && <span className={`status-dot ${status}`} />}
    </div>
  );
}

function formatGameElapsed(startTime) {
  if (!startTime) return "";
  const elapsedMinutes = Math.max(1, Math.floor((Date.now() - startTime) / 60000));
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min`;
  }
  const hours = Math.floor(elapsedMinutes / 60);
  const mins = elapsedMinutes % 60;
  return `${hours}h ${mins}m`;
}

function ProfileCard({
  profile,
  isSelf,
  t,
  onEditProfile,
  onQuickDm,
  onStartVoiceCall,
  onStartVideoCall,
}) {
  const [quickText, setQuickText] = useState("");
  const displayName = profile?.displayName || profile?.username || "Peer";
  const username = profile?.username || "peer";
  const tag = profile?.tag || "0000";
  const status = profile?.status || "online";
  const statusColors = {
    online: "#23a55a",
    idle: "#f0b232",
    dnd: "#f23f43",
    invisible: "#80848e",
  };

  const primaryBg = profile?.accentColorPrimary || "#1e1f22";
  const secondaryBg = profile?.accentColorSecondary || "#2b2d31";

  return (
    <div
      className="profile-card-preview"
      style={{
        background: `linear-gradient(165deg, ${primaryBg} 0%, ${secondaryBg} 100%)`,
      }}
    >
      {/* Banner */}
      <div
        className="profile-banner"
        style={{
          backgroundColor: profile?.bannerColor || "#5865f2",
          backgroundImage: profile?.bannerUrl ? `url(${profile.bannerUrl})` : undefined,
        }}
      />

      {/* Avatar + Badges */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="profile-avatar-holder">
          <div
            className="profile-avatar-inner"
            style={{ backgroundColor: profile?.avatarColor || "#5865f2" }}
          >
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt={displayName} />
            ) : (
              displayName.slice(0, 2).toUpperCase()
            )}
          </div>
          <span
            className="profile-status-indicator"
            style={{ backgroundColor: statusColors[status] || "#23a55a" }}
          />
        </div>

        <div className="profile-badges-bar" style={{ paddingLeft: 12 }}>
          {(profile?.badges || ["P2P Node"]).map((b) => (
            <span key={b} className="profile-badge-pill">
              ✦ {b}
            </span>
          ))}
        </div>
      </div>

      {/* Card Body */}
      <div className="profile-card-body">
        <div className="profile-display-name">{displayName}</div>
        <div className="profile-username-row">
          <span>
            @{username}#{tag}
          </span>
          {profile?.pronouns && (
            <>
              <span>•</span>
              <span>{profile.pronouns}</span>
            </>
          )}
        </div>

        {(profile?.customStatus || profile?.statusEmoji) && (
          <div className="profile-custom-status-box">
            {profile?.statusEmoji && <span>{profile.statusEmoji}</span>}
            <span>{profile?.customStatus}</span>
          </div>
        )}

        {/* Discord PTB Game / Activity Card */}
        {profile?.currentGame && (
          <div className="profile-activity-card">
            <div className="profile-activity-header">
              <Gamepad2 size={13} color="#23a55a" />
              <span>JOGANDO UM JOGO</span>
            </div>
            <div className="profile-activity-content">
              <div className="profile-activity-name">{profile.currentGame.name}</div>
              <div className="profile-activity-details">{profile.currentGame.category || "Jogo"}</div>
              {profile.currentGame.startTime && (
                <div className="profile-activity-time">
                  decorridos {formatGameElapsed(profile.currentGame.startTime)}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="profile-section-divider" />

        <div className="profile-section-label">{t.aboutMeSection}</div>
        <div className="profile-bio-text">
          {profile?.bio || "Serverless P2P Node running on Freecord PTB."}
        </div>

        <div className="profile-section-divider" />

        <div className="profile-section-label">{t.p2pIdentitySection}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "Consolas, monospace" }}>
          <div>Peer ID: {profile?.peerId}</div>
          {profile?.fingerprint && <div>MLS/SHA256: {profile.fingerprint}</div>}
          {profile?.address && (
            <div>
              Endpoint: {profile.address}:{profile.port || "WebRTC"} ({profile.rttMs || 1} ms)
            </div>
          )}
        </div>

        {isSelf && onEditProfile && (
          <button
            type="button"
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
            onClick={onEditProfile}
          >
            <Sparkles size={14} />
            <span>{t.editMyProfileBtn}</span>
          </button>
        )}

        {!isSelf && (onStartVoiceCall || onStartVideoCall) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            {onStartVoiceCall && (
              <button
                type="button"
                className="btn-success"
                style={{ justifyContent: "center" }}
                onClick={() => onStartVoiceCall(profile)}
              >
                <PhoneCall size={14} />
                <span>{t.startVoiceCallBtn}</span>
              </button>
            )}
            {onStartVideoCall && (
              <button
                type="button"
                className="btn-primary"
                style={{ justifyContent: "center" }}
                onClick={() => onStartVideoCall(profile)}
              >
                <Video size={14} />
                <span>{t.startVideoCallBtn}</span>
              </button>
            )}
          </div>
        )}

        {!isSelf && onQuickDm && (
          <form
            style={{ marginTop: 10 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!quickText.trim()) return;
              onQuickDm(profile, quickText.trim());
              setQuickText("");
            }}
          >
            <input
              className="form-input"
              placeholder={t.quickMessagePlaceholder(displayName)}
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
            />
          </form>
        )}
      </div>
    </div>
  );
}

let sharedUiAudioCtx = null;
function playSynthesizedUiSound(kind = "message") {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedUiAudioCtx || sharedUiAudioCtx.state === "closed") {
      sharedUiAudioCtx = new AudioCtx();
    }
    if (sharedUiAudioCtx.state === "suspended") {
      sharedUiAudioCtx.resume().catch(() => {});
    }
    const ctx = sharedUiAudioCtx;
    const now = ctx.currentTime;

    const playNote = (freq, startOffset, duration, vol = 0.14, type = "sine") => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(vol, now + startOffset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    if (kind === "message") {
      playNote(587.33, 0, 0.11, 0.13, "triangle");
      playNote(880.0, 0.085, 0.18, 0.15, "sine");
    } else if (kind === "invite") {
      playNote(523.25, 0, 0.11, 0.13, "triangle");
      playNote(659.25, 0.09, 0.12, 0.14, "triangle");
      playNote(783.99, 0.18, 0.22, 0.16, "sine");
    } else if (kind === "call_ring") {
      playNote(659.25, 0, 0.22, 0.16, "sine");
      playNote(880.0, 0.24, 0.28, 0.16, "sine");
      playNote(659.25, 0.6, 0.22, 0.14, "sine");
      playNote(880.0, 0.84, 0.32, 0.14, "sine");
    } else if (kind === "call_out") {
      playNote(440.0, 0, 0.35, 0.09, "sine");
      playNote(554.37, 0, 0.35, 0.07, "sine");
    } else if (kind === "call_join") {
      playNote(440.0, 0, 0.1, 0.12, "sine");
      playNote(659.25, 0.09, 0.16, 0.14, "sine");
    } else if (kind === "call_leave") {
      playNote(523.25, 0, 0.1, 0.12, "sine");
      playNote(349.23, 0.09, 0.18, 0.12, "sine");
    }
  } catch {}
}

export default function App() {
  const isElectron = Boolean(window.DiscordNative?.isRenderer);

  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem("freecord_lang");
      if (saved === "pt" || saved === "en") return saved;
    } catch {}
    return "en";
  });
  const t = I18N[lang] || I18N.en;

  // Load persisted language from Electron settings.json on mount & persist changes
  useEffect(() => {
    let mounted = true;
    if (window.DiscordNative?.settings?.get) {
      Promise.resolve(window.DiscordNative.settings.get("freecord_lang", null))
        .then((savedNativeLang) => {
          if (!mounted) return;
          if (savedNativeLang === "pt" || savedNativeLang === "en") {
            setLang(savedNativeLang);
            try {
              localStorage.setItem("freecord_lang", savedNativeLang);
            } catch {}
          }
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleLanguage = () => {
    setLang((prev) => {
      const next = prev === "en" ? "pt" : "en";
      try {
        localStorage.setItem("freecord_lang", next);
      } catch {}
      try {
        window.DiscordNative?.settings?.set?.("freecord_lang", next);
      } catch {}
      return next;
    });
  };

function getOrCreateDeviceNodeId() {
  try {
    let devId = localStorage.getItem("freecord_device_id");
    if (!devId) {
      const isMobile = Boolean(window.FreecordAndroid || /Android|iPhone|iPad/i.test(navigator.userAgent));
      const prefix = isMobile ? "mob" : "web";
      devId = `${prefix}_${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem("freecord_device_id", devId);
    }
    return devId;
  } catch {
    return `dev_${Math.random().toString(36).slice(2, 7)}`;
  }
}

function loadInitialWebNodeStatus() {
  const deviceId = getOrCreateDeviceNodeId();
  const defaultProfile = {
    peerId: `fc_${deviceId}`,
    displayName: "Freecord Peer",
    username: "freecord_peer",
    tag: String(Math.floor(1000 + Math.random() * 9000)),
    pronouns: "",
    bio: "Serverless P2P Node running on Freecord PTB.",
    avatarColor: "#5865f2",
    avatarUrl: null,
    bannerColor: "#5865f2",
    bannerUrl: null,
    accentColorPrimary: "#1e1f22",
    accentColorSecondary: "#2b2d31",
    status: "online",
    statusEmoji: "⚡",
    customStatus: "Connected via Direct P2P",
    badges: ["P2P Node", "Early Adopter"],
  };

  try {
    const saved = localStorage.getItem("freecord_web_profile");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        let resolvedPeerId = parsed.peerId || defaultProfile.peerId;
        if (!resolvedPeerId.includes(`_${deviceId}`)) {
          const base = resolvedPeerId.split("_dev_")[0];
          resolvedPeerId = `${base}_dev_${deviceId}`;
        }
        return {
          instanceId: deviceId,
          profile: {
            ...defaultProfile,
            ...parsed,
            peerId: resolvedPeerId,
          },
          tcpPort: 0,
          udpDiscoveryPort: 0,
          connectionStrings: [],
          localhostEndpoint: "",
        };
      }
    }
  } catch {}

  return {
    instanceId: deviceId,
    profile: defaultProfile,
    tcpPort: 0,
    udpDiscoveryPort: 0,
    connectionStrings: [],
    localhostEndpoint: "",
  };
}

  // Node & Profile State
  const [nodeStatus, setNodeStatus] = useState(() => loadInitialWebNodeStatus());
  const selfDisplayName = nodeStatus.profile?.displayName || nodeStatus.profile?.username || "You";

  const [connectedPeers, setConnectedPeers] = useState([]);
  const [lanPeers, setLanPeers] = useState([]);
  const mobileWsRef = useRef(null);
  const [savedLanPeers, setSavedLanPeers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("freecord_saved_lan_peers") || "[]");
    } catch {
      return [];
    }
  });

  // Rooms & Navigation State (with localStorage persistence)
  const [leftRoomIds, setLeftRoomIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("freecord_left_rooms_v1") || "[]");
      if (Array.isArray(saved)) return saved;
    } catch {}
    return [];
  });
  const [rooms, setRooms] = useState(() => {
    try {
      const savedLeft = JSON.parse(localStorage.getItem("freecord_left_rooms_v1") || "[]");
      const leftSet = new Set(Array.isArray(savedLeft) ? savedLeft : []);
      const saved = JSON.parse(localStorage.getItem("freecord_custom_rooms_v1") || "null");
      if (Array.isArray(saved)) {
        const filtered = saved.filter((r) => !leftSet.has(r.id));
        if (filtered.length > 0 || leftSet.size > 0) return filtered;
      }
      return INITIAL_ROOMS.filter((r) => !leftSet.has(r.id));
    } catch {}
    return INITIAL_ROOMS;
  });
  const [selectedRoomId, setSelectedRoomId] = useState("room_freecord_main");
  const [selectedChannelId, setSelectedChannelId] = useState("ch_geral");
  const [selectedDmPeerId, setSelectedDmPeerId] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem("freecord_custom_rooms_v1", JSON.stringify(rooms));
    } catch {}
  }, [rooms]);

  useEffect(() => {
    try {
      localStorage.setItem("freecord_left_rooms_v1", JSON.stringify(leftRoomIds));
    } catch {}
  }, [leftRoomIds]);

  // Server Invite, Private DM Call & Notification State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTargetRoom, setInviteTargetRoom] = useState(null);
  const [sentInvitePeers, setSentInvitePeers] = useState({});
  const [joinServerCodeInput, setJoinServerCodeInput] = useState("");
  const [joinServerStatusMsg, setJoinServerStatusMsg] = useState(null);

  const [incomingDmCall, setIncomingDmCall] = useState(null);
  const [outgoingDmCall, setOutgoingDmCall] = useState(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("freecord_notifications_v1");
      if (saved === "false") return false;
    } catch {}
    return true;
  });
  const [unreadCounts, setUnreadCounts] = useState({});
  const [toasts, setToasts] = useState([]);

  // Dedicated Discord Mobile Navigation State
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(
      window.FreecordAndroid ||
      window.Capacitor?.isNativePlatform?.() ||
      window.innerWidth <= 768
    );
  });
  const [mobileTab, setMobileTab] = useState("servers"); // "servers" | "dms" | "call" | "you"
  const [mobileInChat, setMobileInChat] = useState(false);
  const [showMobileMembers, setShowMobileMembers] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");

  useEffect(() => {
    const handleResize = () => {
      const mobile = Boolean(
        window.FreecordAndroid ||
        window.Capacitor?.isNativePlatform?.() ||
        window.innerWidth <= 768
      );
      setIsMobile(mobile);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Cryptographic Identity (Phase 1 E2EE)
  const [cryptoIdentity, setCryptoIdentity] = useState(() =>
    loadOrCreateCryptoIdentity()
  );
  const cryptoIdentityRef = useRef(cryptoIdentity);
  useEffect(() => {
    cryptoIdentityRef.current = cryptoIdentity;
  }, [cryptoIdentity]);

  useEffect(() => {
    // AGENTS.md § 2.2: Diffie-Hellman real (ECDH P-256) via Web Crypto
    ensureECDHCryptoIdentity(selfPeerIdRef.current).then((upgraded) => {
      if (upgraded && upgraded.publicKey !== cryptoIdentityRef.current?.publicKey) {
        setCryptoIdentity(upgraded);
      }
    });
  }, []);

  // Chat State (Persisted locally for offline History Sync)
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("freecord_chat_messages_v1") || "null");
      if (Array.isArray(saved) && saved.length > 0) {
        const merged = mergeHistoryMessages(INITIAL_REA_MESSAGES, saved);
        return merged.merged;
      }
    } catch {}
    return INITIAL_REA_MESSAGES;
  });
  const [chatInput, setChatInput] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editInput, setEditInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [pinnedMessageIds, setPinnedMessageIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("freecord_pinned_msgs_v1") || "null");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [typingPeers, setTypingPeers] = useState({});
  const messagesRef = useRef(messages);
  const seenMessageIdsRef = useRef(new Set((messages || []).map((m) => m?.id).filter(Boolean)));
  const pendingTransfersRef = useRef(new Map());

  // AGENTS.md § 2.4 & RELATORIO_BUGS_E_AUDITORIA Bug 08: Persistent disk storage in Electron via IPC
  useEffect(() => {
    if (window.DiscordNative?.storage?.loadChatHistory) {
      window.DiscordNative.storage
        .loadChatHistory()
        .then((saved) => {
          if (Array.isArray(saved) && saved.length > 0) {
            setMessages((prev) => {
              const merged = mergeHistoryMessages(prev, saved);
              for (const m of merged.merged) {
                if (m?.id) seenMessageIdsRef.current.add(m.id);
              }
              return merged.merged;
            });
          }
        })
        .catch((err) => {
          console.warn("[Freecord Storage] Error loading persistent disk history:", err);
        });
    }
  }, []);

  useEffect(() => {
    messagesRef.current = messages;

    // Persist to Electron disk JSON file (no 5MB localStorage limit)
    if (window.DiscordNative?.storage?.saveChatHistory) {
      window.DiscordNative.storage.saveChatHistory(messages.slice(-1000)).catch((err) => {
        console.warn("[Freecord Storage] Failed to save chat to disk:", err);
      });
    }

    // Fallback to localStorage (compacted to prevent QuotaExceededError)
    try {
      const compact = messages.slice(-150).map((m) => {
        if (m?.attachment?.dataUrl && m.attachment.dataUrl.length > 256 * 1024) {
          return {
            ...m,
            attachment: { ...m.attachment, dataUrl: null, omittedInStorage: true },
          };
        }
        return m;
      });
      localStorage.setItem("freecord_chat_messages_v1", JSON.stringify(compact));
    } catch (err) {
      console.warn("[Freecord Storage] localStorage write error (quota limit or restricted):", err);
    }
  }, [messages]);

  // Voice, Simultaneous Webcam + Screen Share & Resizable Stage State
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState(null);
  const [selfMute, setSelfMute] = useState(false);
  const [selfDeafen, setSelfDeafen] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [speakingMap, setSpeakingMap] = useState({});
  const [localCameraStream, setLocalCameraStream] = useState(null);
  const [localScreenStream, setLocalScreenStream] = useState(null);
  const [localScreenFrameUrl, setLocalScreenFrameUrl] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [peerVolumes, setPeerVolumes] = useState({});
  const [peerScreenVolumes, setPeerScreenVolumes] = useState({});
  const rtcStatsRef = useRef({});

  // Stage Resize, Spotlight, Theater, Fullscreen & PiP State
  const [stageHeight, setStageHeight] = useState(440);
  const [stageTheaterMode, setStageTheaterMode] = useState(false);
  const [tileMinWidth, setTileMinWidth] = useState(340);
  const [spotlightTileId, setSpotlightTileId] = useState(null);
  const [fullscreenTileId, setFullscreenTileId] = useState(null);
  const [inAppPipTileId, setInAppPipTileId] = useState(null);
  const [isAndroidSystemPip, setIsAndroidSystemPip] = useState(false);
  const [tileFitMap, setTileFitMap] = useState({});
  const [tileZoomMap, setTileZoomMap] = useState({});
  const [hiddenWebcamsMap, setHiddenWebcamsMap] = useState({});
  const [hideAllWebcams, setHideAllWebcams] = useState(false);
  const [showWebcamPipOverlay, setShowWebcamPipOverlay] = useState(true);
  const [webcamPipWidth, setWebcamPipWidth] = useState(230);
  const stageContainerRef = useRef(null);

  const togglePeerWebcamHidden = (peerId) => {
    if (!peerId) return;
    if (hideAllWebcams) {
      setHideAllWebcams(false);
      setHiddenWebcamsMap((prev) => ({ ...prev, [peerId]: false }));
    } else {
      setHiddenWebcamsMap((prev) => ({ ...prev, [peerId]: !prev[peerId] }));
    }
  };

  // Modals
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectTab, setConnectTab] = useState("ip");
  const [directIpInput, setDirectIpInput] = useState("");
  const [connectStatusMsg, setConnectStatusMsg] = useState(null);
  const [copiedText, setCopiedText] = useState(null);

  // Phase 1: QR Code Pairing & Camera Scanner State
  const [lanQrDataUrl, setLanQrDataUrl] = useState(null);
  const [selectedQrEndpoint, setSelectedQrEndpoint] = useState("");
  const [isScanningQr, setIsScanningQr] = useState(false);
  const [qrScanStatus, setQrScanStatus] = useState(null);
  const [isScanningLanHttp, setIsScanningLanHttp] = useState(false);
  const qrVideoRef = useRef(null);
  const qrCanvasRef = useRef(null);
  const qrStreamRef = useRef(null);
  const qrScanTimerRef = useRef(null);
  const qrImageInputRef = useRef(null);
  const identityImportInputRef = useRef(null);
  const [identityBackupStatus, setIdentityBackupStatus] = useState(null);

  // Manual Serverless WebRTC SDP state
  const [generatedInviteCode, setGeneratedInviteCode] = useState("");
  const [incomingInviteInput, setIncomingInviteInput] = useState("");
  const [generatedAnswerCode, setGeneratedAnswerCode] = useState("");

  // Screen Share Picker Modal
  const [showScreenPicker, setShowScreenPicker] = useState(false);
  const [desktopSources, setDesktopSources] = useState([]);

  // Server / Room Customization Studio & Channel Modals
  const [showServerStudio, setShowServerStudio] = useState(false);
  const [serverStudioMode, setServerStudioMode] = useState("edit"); // "edit" | "create"
  const [serverForm, setServerForm] = useState({
    id: "",
    name: "",
    shortName: "",
    serverTag: "P2P",
    description: "",
    color: "#5865f2",
    iconUrl: null,
    bannerColor: "#5865f2",
    bannerSecondaryColor: "#9b59b6",
    bannerUrl: null,
    sidebarBgColor: "#2b2d31",
    textChannels: [],
    voiceChannels: [],
  });
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState("text");

  // Profile Customization Studio & Media Settings Studio
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState("profile"); // "profile" | "media" | "updates"
  const showProfileModalRef = useRef(showProfileModal);
  const settingsTabRef = useRef(settingsTab);
  useEffect(() => {
    showProfileModalRef.current = showProfileModal;
  }, [showProfileModal]);
  useEffect(() => {
    settingsTabRef.current = settingsTab;
  }, [settingsTab]);
  const [inspectedProfile, setInspectedProfile] = useState(null);
  const [appVersion, setAppVersion] = useState("1.0.0");
  const [updateStatus, setUpdateStatus] = useState({ status: "idle" });
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    username: "",
    tag: "",
    pronouns: "",
    bio: "",
    status: "online",
    statusEmoji: "⚡",
    customStatus: "",
    avatarColor: "#5865f2",
    avatarUrl: null,
    bannerColor: "#5865f2",
    bannerUrl: null,
    accentColorPrimary: "#1e1f22",
    accentColorSecondary: "#2b2d31",
    badges: ["P2P Node", "Early Adopter"],
  });

  // Media Devices & Screen Share Quality State
  const [mediaDevices, setMediaDevices] = useState({
    audioInputs: [],
    audioOutputs: [],
    videoInputs: [],
  });
  const [selectedMicId, setSelectedMicId] = useState("default");
  const [selectedSpeakerId, setSelectedSpeakerId] = useState("default");
  const [selectedCameraId, setSelectedCameraId] = useState("default");
  const [cameraResolution, setCameraResolution] = useState("720p");
  const [screenResolution, setScreenResolution] = useState("1080p");
  const [screenFps, setScreenFps] = useState(30);
  const [shareScreenAudio, setShareScreenAudio] = useState(true);
  const [masterOutputVolume, setMasterOutputVolume] = useState(100);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [autoGainControl, setAutoGainControl] = useState(true);
  const [micInputLevel, setMicInputLevel] = useState(0);
  const [cameraTestStream, setCameraTestStream] = useState(null);

  // Push-to-Talk (PTT) and Voice Input Modes
  const [inputMode, setInputMode] = useState(() => {
    return localStorage.getItem("freecord_input_mode") || "voice_activity";
  });
  const [pttShortcut, setPttShortcut] = useState(() => {
    return localStorage.getItem("freecord_ptt_shortcut") || "ControlRight";
  });
  const [pttReleaseDelay, setPttReleaseDelay] = useState(() => {
    const saved = localStorage.getItem("freecord_ptt_delay");
    return saved ? Number(saved) : 200;
  });
  const [isPttPressed, setIsPttPressed] = useState(false);
  const [isRecordingPttKey, setIsRecordingPttKey] = useState(false);
  const [currentGame, setCurrentGame] = useState(null);
  const [studioDspEnabled, setStudioDspEnabled] = useState(() => {
    return localStorage.getItem("freecord_studio_dsp") !== "false";
  });
  const [noiseGateThreshold, setNoiseGateThreshold] = useState(() => {
    const saved = localStorage.getItem("freecord_gate_threshold");
    return saved ? Number(saved) : -46;
  });

  const voiceEngineRef = useRef(null);
  const selfPeerIdRef = useRef(nodeStatus.profile.peerId);
  const activeVoiceChannelIdRef = useRef(activeVoiceChannelId);
  const connectedPeersRef = useRef(connectedPeers);
  const leftRoomIdsRef = useRef(leftRoomIds);
  const outgoingDmCallRef = useRef(outgoingDmCall);
  const notificationsEnabledRef = useRef(notificationsEnabled);
  const effectiveChannelIdRef = useRef("");
  const roomsRef = useRef(rooms);
  const handleIncomingP2PEventRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const avatarUploadRef = useRef(null);
  const bannerUploadRef = useRef(null);
  const serverIconUploadRef = useRef(null);
  const serverBannerUploadRef = useRef(null);
  const lastTypingSentRef = useRef(0);

  useEffect(() => {
    selfPeerIdRef.current = nodeStatus.profile.peerId;
    voiceEngineRef.current?.setLocalPeerId(nodeStatus.profile.peerId);
    voiceEngineRef.current?.setLocalProfile({
      ...nodeStatus.profile,
      cryptoPubKey: cryptoIdentity?.publicKey,
      keyFingerprint: cryptoIdentity?.keyFingerprint,
    });
  }, [nodeStatus.profile, cryptoIdentity]);

  useEffect(() => {
    activeVoiceChannelIdRef.current = activeVoiceChannelId;
  }, [activeVoiceChannelId]);

  useEffect(() => {
    connectedPeersRef.current = connectedPeers;
  }, [connectedPeers]);

  useEffect(() => {
    leftRoomIdsRef.current = leftRoomIds;
  }, [leftRoomIds]);

  useEffect(() => {
    outgoingDmCallRef.current = outgoingDmCall;
  }, [outgoingDmCall]);

  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
    try {
      localStorage.setItem("freecord_notifications_v1", String(notificationsEnabled));
    } catch {}
  }, [notificationsEnabled]);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    try {
      localStorage.setItem("freecord_input_mode", inputMode);
    } catch {}
    voiceEngineRef.current?.setInputMode(inputMode);
    if (isElectron) {
      if (inputMode === "push_to_talk") {
        window.DiscordNative?.ptt?.setShortcut(pttShortcut, pttReleaseDelay);
      } else {
        window.DiscordNative?.ptt?.unregister();
      }
    }
  }, [inputMode, pttShortcut, pttReleaseDelay, isElectron]);

  useEffect(() => {
    if (!isElectron) return;
    const cleanup = window.DiscordNative?.ptt?.onStateChanged(({ active }) => {
      voiceEngineRef.current?.setPttState(active);
      setIsPttPressed(active);
    });
    return () => cleanup?.();
  }, [isElectron]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isRecordingPttKey) {
        e.preventDefault();
        e.stopPropagation();
        const key = e.code || e.key;
        setPttShortcut(key);
        try {
          localStorage.setItem("freecord_ptt_shortcut", key);
        } catch {}
        setIsRecordingPttKey(false);
        return;
      }
      if (inputMode !== "push_to_talk") return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === pttShortcut || e.key === pttShortcut) {
        if (!isPttPressed) {
          voiceEngineRef.current?.setPttState(true);
          setIsPttPressed(true);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (inputMode !== "push_to_talk") return;
      if (e.code === pttShortcut || e.key === pttShortcut) {
        voiceEngineRef.current?.setPttState(false);
        setIsPttPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [inputMode, pttShortcut, isPttPressed, isRecordingPttKey]);

  // Local Game Activity Scanner Listener
  useEffect(() => {
    if (!isElectron) return;
    window.DiscordNative?.games?.getCurrentGame?.().then((game) => {
      if (game) {
        setCurrentGame(game);
        window.DiscordNative?.p2p?.updateProfile?.({ currentGame: game });
      }
    });

    const cleanup = window.DiscordNative?.games?.onGameActivity?.((game) => {
      setCurrentGame(game);
      window.DiscordNative?.p2p?.updateProfile?.({ currentGame: game });
    });
    return () => cleanup?.();
  }, [isElectron]);

  useEffect(() => {
    try {
      localStorage.setItem("freecord_studio_dsp", String(studioDspEnabled));
      localStorage.setItem("freecord_gate_threshold", String(noiseGateThreshold));
    } catch {}
    voiceEngineRef.current?.setStudioDspEnabled(studioDspEnabled);
    voiceEngineRef.current?.setNoiseGateThreshold(noiseGateThreshold);
  }, [studioDspEnabled, noiseGateThreshold]);

  const [overlayActive, setOverlayActive] = useState(false);

  const toggleOverlay = async () => {
    if (!isElectron) return;
    const res = await window.DiscordNative?.overlay?.toggle();
    setOverlayActive(Boolean(res));
  };

  useEffect(() => {
    if (!isElectron) return;
    if (!activeVoiceChannelId) {
      window.DiscordNative?.overlay?.setVoicePeers?.([]);
      return;
    }

    const selfPeer = {
      peerId: nodeStatus.profile.peerId,
      displayName: selfDisplayName,
      username: nodeStatus.profile.username,
      avatarUrl: nodeStatus.profile.avatarUrl,
      avatarColor: nodeStatus.profile.avatarColor,
      speaking: Boolean(speakingMap[nodeStatus.profile.peerId]),
    };

    const channelPeers = connectedPeers
      .filter((p) => p.voiceChannelId === activeVoiceChannelId)
      .map((p) => ({
        peerId: p.peerId,
        displayName: p.displayName || p.username,
        username: p.username,
        avatarUrl: p.avatarUrl,
        avatarColor: p.avatarColor,
        speaking: Boolean(speakingMap[p.peerId]),
      }));

    window.DiscordNative?.overlay?.setVoicePeers?.([selfPeer, ...channelPeers]);
  }, [isElectron, activeVoiceChannelId, speakingMap, connectedPeers, nodeStatus.profile, selfDisplayName]);

  const pushToast = (toastObj) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toastObj, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 6000);
  };

  // Ringtone / Ringback Tone Loop for Incoming & Outgoing Private DM Calls
  useEffect(() => {
    if (!incomingDmCall && !outgoingDmCall) return;
    if (notificationsEnabledRef.current) {
      playSynthesizedUiSound(incomingDmCall ? "call_ring" : "call_out");
    }
    const interval = setInterval(() => {
      if (notificationsEnabledRef.current) {
        playSynthesizedUiSound(incomingDmCall ? "call_ring" : "call_out");
      }
    }, 2400);

    const timeout = setTimeout(() => {
      if (incomingDmCall) setIncomingDmCall(null);
      if (outgoingDmCall) setOutgoingDmCall(null);
    }, 35000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [incomingDmCall, outgoingDmCall]);

  const refreshMediaDevices = async () => {
    const enumerated = await WebRTCVoiceEngine.enumerateDevices();
    setMediaDevices(enumerated);
  };

  const openProfileStudio = (initialTab = "profile") => {
    const p = nodeStatus.profile;
    setProfileForm({
      displayName: p.displayName || p.username || "Peer",
      username: p.username || "peer",
      tag: p.tag || "0000",
      pronouns: p.pronouns || "",
      bio: p.bio || "",
      status: p.status || "online",
      statusEmoji: p.statusEmoji || "⚡",
      customStatus: p.customStatus || "",
      avatarColor: p.avatarColor || "#5865f2",
      avatarUrl: p.avatarUrl || null,
      bannerColor: p.bannerColor || "#5865f2",
      bannerUrl: p.bannerUrl || null,
      accentColorPrimary: p.accentColorPrimary || "#1e1f22",
      accentColorSecondary: p.accentColorSecondary || "#2b2d31",
      badges: Array.isArray(p.badges) ? p.badges : ["P2P Node", "Early Adopter"],
    });
    setSettingsTab(typeof initialTab === "string" ? initialTab : "profile");
    setInspectedProfile(null);
    refreshMediaDevices();
    setShowProfileModal(true);
  };

  // Stop camera preview stream when closing modal
  useEffect(() => {
    if (!showProfileModal && cameraTestStream) {
      cameraTestStream.getTracks().forEach((t) => t.stop());
      setCameraTestStream(null);
    }
  }, [showProfileModal, cameraTestStream]);

  // Initialize WebRTC Voice Engine & Load Media Preferences
  useEffect(() => {
    const engine = new WebRTCVoiceEngine({
      localPeerId: selfPeerIdRef.current,
      onSignalSend: (targetPeerId, signal) => {
        if (!activeVoiceChannelIdRef.current) return;
        sendP2PPacket(
          {
            type: "WEBRTC_SIGNAL",
            fromPeerId: selfPeerIdRef.current,
            voiceChannelId: activeVoiceChannelIdRef.current,
            signal,
          },
          targetPeerId
        );
      },
      onFrameSend: (framePacket) => {
        const activeCh = activeVoiceChannelIdRef.current;
        if (!activeCh) return;
        const dmTargetPeerId = outgoingDmCallRef.current?.peer?.peerId || null;
        for (const p of connectedPeersRef.current) {
          if (p.voiceChannelId === activeCh || (dmTargetPeerId && p.peerId === dmTargetPeerId)) {
            sendP2PPacket(
              {
                type: "MEDIA_FRAME",
                fromPeerId: selfPeerIdRef.current,
                voiceChannelId: activeCh,
                ...framePacket,
              },
              p.peerId
            );
          }
        }
      },
      onAudioChunkSend: (chunkPacket) => {
        const activeCh = activeVoiceChannelIdRef.current;
        if (!activeCh) return;
        const dmTargetPeerId = outgoingDmCallRef.current?.peer?.peerId || null;
        for (const p of connectedPeersRef.current) {
          if (p.voiceChannelId === activeCh || (dmTargetPeerId && p.peerId === dmTargetPeerId)) {
            sendP2PPacket(
              {
                type: "AUDIO_CHUNK",
                fromPeerId: selfPeerIdRef.current,
                voiceChannelId: activeCh,
                ...chunkPacket,
              },
              p.peerId
            );
          }
        }
      },
      onRemoteStream: (peerId, stream) => {
        if (!activeVoiceChannelIdRef.current && !String(peerId).startsWith("webrtc_")) return;
        setRemoteStreams((prev) => ({ ...prev, [peerId]: { ...stream } }));
      },
      onSpeakingChange: (who, isSpeaking) => {
        const key = who === "self" ? selfPeerIdRef.current : who;
        if (!activeVoiceChannelIdRef.current && who !== "self") return;
        const spk = Boolean(isSpeaking);
        setSpeakingMap((prev) => {
          if (prev[key] === spk) return prev;
          return { ...prev, [key]: spk };
        });
        if (who === "self" && activeVoiceChannelIdRef.current) {
          sendP2PPacket({
            type: "VOICE_SPEAKING",
            fromPeerId: selfPeerIdRef.current,
            voiceChannelId: activeVoiceChannelIdRef.current,
            speaking: spk,
          });
        }
      },
      onInputLevelChange: (level) => {
        if (!showProfileModalRef.current || settingsTabRef.current !== "media") return;
        setMicInputLevel((prev) => (Math.abs(prev - level) >= 3 ? level : prev));
      },
      onStatsUpdate: (stats) => {
        rtcStatsRef.current = stats;
      },
      onLocalScreenFrame: (dataUrl) => {
        setLocalScreenFrameUrl(dataUrl || null);
      },
      onDataChannelMessage: (fromPeerId, packet) => {
        if ((packet.type === "HELLO" || packet.type === "HELLO_ACK") && packet.profile) {
          const p = packet.profile;
          setConnectedPeers((prev) => {
            const existing = prev.find((item) => item.peerId === p.peerId);
            const clean = prev.filter((item) => item.peerId !== p.peerId && !item.peerId.startsWith("manual_offer_"));
            return [
              ...clean,
              {
                ...(existing || {}),
                ...p,
                address: existing?.address || "WebRTC DataChannel",
                port: existing?.port || 0,
                rttMs: existing?.rttMs || 5,
                fingerprint: p.keyFingerprint || existing?.fingerprint || "WEBRTC-DIRECT-SDP",
                voiceChannelId: packet.voiceChannelId ?? existing?.voiceChannelId ?? null,
                voiceState: packet.voiceState || existing?.voiceState || {},
              },
            ];
          });
          if (packet.type === "HELLO") {
            try {
              voiceEngineRef.current?.sendViaDataChannel(
                {
                  type: "HELLO_ACK",
                  profile: {
                    ...nodeStatus.profile,
                    cryptoPubKey: cryptoIdentity?.publicKey,
                    keyFingerprint: cryptoIdentity?.keyFingerprint,
                  },
                  voiceChannelId: activeVoiceChannelIdRef.current || null,
                  voiceState: {
                    muted: selfMute,
                    deafened: selfDeafen,
                    videoEnabled,
                    screenSharing,
                  },
                  timestamp: Date.now(),
                },
                p.peerId
              );
            } catch {}
          }
          setTimeout(() => {
            sendP2PPacket({ type: "ROOM_SYNC", rooms: roomsRef.current }, p.peerId);
            requestHistorySyncFromPeer(p.peerId);
            if (activeVoiceChannelIdRef.current) {
              syncVoiceStateP2P(activeVoiceChannelIdRef.current, {
                muted: selfMute,
                deafened: selfDeafen,
                videoEnabled,
                screenSharing,
              });
            }
          }, 150);
        }
        handleIncomingP2PEventRef.current?.({ ...packet, fromPeerId: packet.fromPeerId || fromPeerId });
      },
      onManualPeerConnected: (peerId, profileOverride = null) => {
        const conn = engine.connections.get(peerId);
        const manualProf = profileOverride || conn?.manualProfile || {
          peerId,
          displayName: "WebRTC Peer",
          username: "webrtc_peer",
          tag: "SDP",
          avatarColor: "#57F287",
        };
        setConnectedPeers((prev) => {
          const existing = prev.find((p) => p.peerId === manualProf.peerId);
          const clean = prev.filter((p) => p.peerId !== manualProf.peerId && !p.peerId.startsWith("manual_offer_"));
          return [
            ...clean,
            {
              ...(existing || {}),
              ...manualProf,
              address: existing?.address || "WebRTC DataChannel",
              port: existing?.port || 0,
              rttMs: existing?.rttMs || 5,
              fingerprint: existing?.fingerprint || "WEBRTC-DIRECT-SDP",
              voiceChannelId: existing?.voiceChannelId || null,
              voiceState: existing?.voiceState || {},
            },
          ];
        });
        setTimeout(() => {
          sendP2PPacket({ type: "ROOM_SYNC", rooms: roomsRef.current }, manualProf.peerId);
          requestHistorySyncFromPeer(manualProf.peerId);
          if (activeVoiceChannelIdRef.current) {
            syncVoiceStateP2P(activeVoiceChannelIdRef.current, {
              muted: selfMute,
              deafened: selfDeafen,
              videoEnabled,
              screenSharing,
            });
          }
        }, 200);
      },
    });

    try {
      const savedPrefs = JSON.parse(localStorage.getItem("freecord_media_prefs") || "{}");
      if (savedPrefs.micId) {
        setSelectedMicId(savedPrefs.micId);
        engine.audioInputDeviceId = savedPrefs.micId;
      }
      if (savedPrefs.speakerId) {
        setSelectedSpeakerId(savedPrefs.speakerId);
        engine.audioOutputDeviceId = savedPrefs.speakerId;
      }
      if (savedPrefs.cameraId) {
        setSelectedCameraId(savedPrefs.cameraId);
        engine.videoInputDeviceId = savedPrefs.cameraId;
      }
      if (savedPrefs.cameraResolution) {
        setCameraResolution(savedPrefs.cameraResolution);
        engine.cameraResolution = savedPrefs.cameraResolution;
      }
      if (savedPrefs.screenResolution) {
        setScreenResolution(savedPrefs.screenResolution);
        engine.screenResolution = savedPrefs.screenResolution;
      }
      if (savedPrefs.screenFps) {
        setScreenFps(Number(savedPrefs.screenFps));
        engine.screenFrameRate = Number(savedPrefs.screenFps);
      }
      if (savedPrefs.shareScreenAudio !== undefined) {
        setShareScreenAudio(Boolean(savedPrefs.shareScreenAudio));
      }
    } catch {}

    voiceEngineRef.current = engine;
    refreshMediaDevices();

    const handleDeviceChange = () => refreshMediaDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", handleDeviceChange);

    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", handleDeviceChange);
      engine.destroyAll();
    };
  }, []);

  const compareSemver = (a, b) => {
    const pa = String(a || "0.0.0")
      .replace(/^v/i, "")
      .split("-")[0]
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
    const pb = String(b || "0.0.0")
      .replace(/^v/i, "")
      .split("-")[0]
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) return 1;
      if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    }
    return 0;
  };

  const checkGitHubReleaseForDevice = async (currentVer = appVersion, silent = false) => {
    try {
      const headers = { Accept: "application/vnd.github+json" };
      let res = await fetch(
        "https://api.github.com/repos/Kauanmaffeikraus/Freecord/releases/latest",
        { headers }
      );
      let release = null;
      if (res.ok) {
        release = await res.json();
      } else {
        const listRes = await fetch(
          "https://api.github.com/repos/Kauanmaffeikraus/Freecord/releases?per_page=5",
          { headers }
        );
        if (listRes.ok) {
          const list = await listRes.json();
          if (Array.isArray(list) && list.length > 0) {
            release = list.find((r) => !r.draft) || list[0];
          }
        }
      }

      if (!release || !release.tag_name) {
        if (!silent) {
          setUpdateStatus({ status: "not-available", version: currentVer });
        }
        return;
      }

      const latestVer = String(release.tag_name).replace(/^v/i, "");
      const assets = Array.isArray(release.assets) ? release.assets : [];
      const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
      const isAndroidDevice = Boolean(
        window.FreecordAndroid ||
          window.Capacitor?.isNativePlatform?.() ||
          /Android/i.test(ua)
      );
      const isLinuxDevice = !isAndroidDevice && /Linux/i.test(ua);

      let matchedAsset = null;
      if (isAndroidDevice) {
        matchedAsset =
          assets.find((a) => /Freecord-Android-v.*\.apk$/i.test(a.name)) ||
          assets.find((a) => /\.apk$/i.test(a.name));
      } else if (isLinuxDevice) {
        matchedAsset =
          assets.find((a) => /\.AppImage$/i.test(a.name)) ||
          assets.find((a) => /\.deb$/i.test(a.name));
      } else {
        matchedAsset = assets.find((a) => /\.exe$/i.test(a.name));
      }

      if (compareSemver(latestVer, currentVer) > 0) {
        setUpdateStatus({
          status: "available",
          version: latestVer,
          downloadUrl: matchedAsset?.browser_download_url || release.html_url,
          assetName: matchedAsset?.name || null,
        });
      } else if (!silent) {
        setUpdateStatus({
          status: "not-available",
          version: currentVer,
        });
      }
    } catch (err) {
      if (!silent) {
        setUpdateStatus({ status: "error", message: err.message });
      }
    }
  };

  // Listen for Auto-Updater status from Electron Main Process & Android Native Version
  useEffect(() => {
    let detectedVer = "1.0.0";
    try {
      const androidVer = window.FreecordAndroid?.getAppVersion?.();
      if (androidVer) {
        detectedVer = String(androidVer);
        setAppVersion(detectedVer);
      }
    } catch {}

    window.DiscordNative?.app?.getVersion?.().then?.((v) => {
      if (v) {
        detectedVer = String(v);
        setAppVersion(detectedVer);
      }
    });

    window.__onAndroidUpdateProgress = (statusObj) => {
      if (statusObj) {
        setUpdateStatus((prev) => ({ ...prev, ...statusObj }));
        if (statusObj.status !== "checking") {
          setIsCheckingUpdate(false);
        }
      }
    };

    const unsub = window.DiscordNative?.updater?.onUpdateStatus?.((statusObj) => {
      if (statusObj) {
        setUpdateStatus(statusObj);
        if (statusObj.status !== "checking") {
          setIsCheckingUpdate(false);
        }
        // Discord-style automatic silent restart on Desktop when not in a voice call
        if (
          statusObj.status === "downloaded" &&
          window.DiscordNative?.updater?.quitAndInstall &&
          !activeVoiceChannelIdRef.current
        ) {
          setTimeout(() => {
            if (!activeVoiceChannelIdRef.current) {
              window.DiscordNative.updater.quitAndInstall();
            }
          }, 3000);
        }
      }
    });

    // Automatically check for updates on startup for Android / Web clients as well
    const timer = setTimeout(() => {
      if (!window.DiscordNative?.updater) {
        checkGitHubReleaseForDevice(detectedVer, true);
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      delete window.__onAndroidUpdateProgress;
      unsub?.();
    };
  }, []);

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus({ status: "checking" });
    try {
      if (window.DiscordNative?.updater?.checkForUpdates) {
        const res = await window.DiscordNative.updater.checkForUpdates();
        if (res?.dev || (!res?.ok && res?.error)) {
          await checkGitHubReleaseForDevice(appVersion, false);
        } else if (res?.status === "available" || res?.status === "not-available") {
          setUpdateStatus(res);
        }
      } else {
        await checkGitHubReleaseForDevice(appVersion, false);
      }
    } catch {
      await checkGitHubReleaseForDevice(appVersion, false);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Connect to Electron P2P Bridge if running inside Electron
  useEffect(() => {
    if (!window.DiscordNative?.p2p) return;

    const p2p = window.DiscordNative.p2p;
    const mergeTcpAndManualSdpPeers = (tcpList, prevList) => {
      const tcpPeers = Array.isArray(tcpList) ? tcpList : [];
      const tcpIds = new Set(tcpPeers.map((p) => p.peerId));
      const manualSdpPeers = (prevList || []).filter(
        (p) =>
          p?.peerId &&
          !tcpIds.has(p.peerId) &&
          (p.address === "WebRTC DataChannel" || p.fingerprint === "WEBRTC-DIRECT-SDP") &&
          voiceEngineRef.current?.connections?.get(p.peerId)?.pc?.connectionState !== "closed"
      );
      return [...tcpPeers, ...manualSdpPeers];
    };

    p2p.getStatus().then((status) => {
      if (status) {
        setNodeStatus(status);
        setConnectedPeers((prev) => mergeTcpAndManualSdpPeers(status.connectedPeers, prev));
        setLanPeers(status.lanPeers || []);
      }
    });

    const unsubPeers = p2p.onPeersUpdated((peers) => {
      setConnectedPeers((prev) => mergeTcpAndManualSdpPeers(peers, prev));
      if (Array.isArray(peers)) {
        const activeCh = activeVoiceChannelIdRef.current;
        setSpeakingMap((prev) => {
          if (!activeCh) return {};
          const next = { ...prev };
          for (const p of peers) {
            if (p.voiceChannelId !== activeCh) {
              next[p.peerId] = false;
            } else if (p.voiceState && typeof p.voiceState.speaking === "boolean") {
              next[p.peerId] = p.voiceState.speaking;
            }
          }
          return next;
        });
      }
    });

    const unsubLan = p2p.onLanPeersUpdated((lan) => {
      setLanPeers(lan || []);
    });

    const unsubConnected = p2p.onPeerConnected((peer) => {
      p2p.send(
        {
          type: "ROOM_SYNC",
          rooms,
        },
        peer.peerId
      );
      setTimeout(() => {
        requestHistorySyncFromPeer(peer.peerId);
      }, 250);
      if (activeVoiceChannelId) {
        p2p.setVoiceState(activeVoiceChannelId, {
          muted: selfMute,
          deafened: selfDeafen,
          videoEnabled,
          screenSharing,
        });
      }
    });

    const unsubDisconnected = p2p.onPeerDisconnected(({ peerId }) => {
      voiceEngineRef.current?.destroyPeer(peerId);
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    });

    const unsubEvent = p2p.onP2PEvent((event) => {
      handleIncomingP2PEventRef.current?.(event);
    });

    return () => {
      unsubPeers?.();
      unsubLan?.();
      unsubConnected?.();
      unsubDisconnected?.();
      unsubEvent?.();
    };
  }, [rooms, activeVoiceChannelId, selfMute, selfDeafen, videoEnabled, screenSharing]);

  const sendP2PPacket = (packet, targetPeerId = null) => {
    const enrichedPacket = {
      fromPeerId: selfPeerIdRef.current,
      ...(targetPeerId ? { targetPeerId } : {}),
      ...packet,
    };
    let hasTcpRoute = false;
    // 1. Send via Electron Native P2P if available
    if (window.DiscordNative?.p2p) {
      try {
        window.DiscordNative.p2p.send(enrichedPacket, targetPeerId);
        if (targetPeerId) {
          const peer = connectedPeersRef.current?.find((p) => p.peerId === targetPeerId);
          if (peer && Number(peer.port || 0) > 0) {
            hasTcpRoute = true;
          }
        }
      } catch {}
    }
    // 2. Send via Mobile WebSocket if connected to a desktop node
    if (mobileWsRef.current && mobileWsRef.current.readyState === 1) {
      try {
        mobileWsRef.current.send(JSON.stringify(enrichedPacket));
      } catch {}
    }
    // 3. Deliver via WebRTC DataChannels:
    // Only send via WebRTC DataChannel if no direct native TCP socket exists for this target,
    // or if this is a broadcast packet that must reach WebRTC-only peers (e.g. mobile/VPN)
    if (!hasTcpRoute || !targetPeerId) {
      voiceEngineRef.current?.sendViaDataChannel(enrichedPacket, targetPeerId);
    }
  };

  const syncVoiceStateP2P = (channelId, voiceState = {}) => {
    if (window.DiscordNative?.p2p) {
      try {
        window.DiscordNative.p2p.setVoiceState(channelId, voiceState);
      } catch {}
    }
    const packet = {
      type: "VOICE_STATE",
      fromPeerId: selfPeerIdRef.current,
      channelId: channelId || null,
      voiceState: voiceState || {},
    };
    if (mobileWsRef.current && mobileWsRef.current.readyState === 1) {
      try {
        mobileWsRef.current.send(JSON.stringify(packet));
      } catch {}
    }
    voiceEngineRef.current?.sendViaDataChannel(packet, null);
  };

  const requestHistorySyncFromPeer = (targetPeerId = null) => {
    const myId = selfPeerIdRef.current;
    // AGENTS.md § 2.3: Proibição de Vazamento de DMs.
    // Sincroniza apenas os canais autorizados mútuos (servidores em comum e a DM direta com targetPeerId)
    const sharedChs = buildSharedChannelIds(roomsRef.current, myId, targetPeerId || "");
    const digest = buildHistorySyncDigest(messagesRef.current, sharedChs);
    sendP2PPacket(
      {
        type: "HISTORY_SYNC_REQUEST",
        fromPeerId: myId,
        channelIds: sharedChs,
        digest,
      },
      targetPeerId
    );
  };

  const normalizeIncomingMessage = async (rawMsg) => {
    if (!rawMsg || !rawMsg.id) return null;
    if (rawMsg.e2ee && rawMsg.e2ee.ciphertext) {
      const dec = await decryptChatMessagePayload(
        rawMsg.e2ee,
        rawMsg.channelId,
        "🔒 [Mensagem Criptografada]",
        cryptoIdentityRef.current?.privateKey || ""
      );
      return {
        ...rawMsg,
        text: dec.text,
        e2eeVerified: dec.verified,
      };
    }
    return rawMsg;
  };

  const handleIncomingP2PEvent = async (event) => {
    switch (event.type) {
      case "CHAT_MESSAGE": {
        if (!event.message || !event.message.id) return;
        const msgId = event.message.id;

        // Sincronamente descarta mensagens já processadas sem disparar notificações repetidas
        if (seenMessageIdsRef.current.has(msgId)) {
          break;
        }
        seenMessageIdsRef.current.add(msgId);
        if (seenMessageIdsRef.current.size > 3000) {
          const first = seenMessageIdsRef.current.values().next().value;
          seenMessageIdsRef.current.delete(first);
        }

        const msg = await normalizeIncomingMessage(event.message);
        if (!msg) return;

        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) {
            return prev;
          }
          return [...prev, msg];
        });

        const fromId = msg.author?.peerId || event.fromPeerId;
        if (fromId && fromId !== selfPeerIdRef.current) {
          const isDm = String(msg.channelId || "").startsWith("dm_");
          let targetRoom = null;
          let targetCh = null;
          if (!isDm) {
            for (const r of roomsRef.current || []) {
              const found = (r.textChannels || []).find((c) => c.id === msg.channelId);
              if (found) {
                targetRoom = r;
                targetCh = found;
                break;
              }
            }
            // Do not notify for servers the user has left or hasn't joined
            if (!targetRoom) break;
          }

          const isViewingChannel =
            effectiveChannelIdRef.current === msg.channelId && document.hasFocus();

          if (effectiveChannelIdRef.current !== msg.channelId) {
            setUnreadCounts((prev) => ({
              ...prev,
              [msg.channelId]: (prev[msg.channelId] || 0) + 1,
            }));
          }

          if (!isViewingChannel && notificationsEnabledRef.current) {
            playSynthesizedUiSound(msg.serverInvite ? "invite" : "message");
            window.DiscordNative?.window?.flashFrame?.(true);

            const senderName = msg.author?.displayName || msg.author?.username || "Peer";
            const toastTitle = msg.serverInvite
              ? t.newServerInviteToastTitle(senderName, msg.serverInvite.room?.name || "Server")
              : isDm
              ? t.newDmToastTitle(senderName)
              : t.newChannelMsgToastTitle(senderName, targetCh?.name || "chat");

            const navigateToMsg = () => {
              window.DiscordNative?.window?.focus?.();
              if (isDm) {
                setSelectedRoomId("dm_hub");
                setSelectedDmPeerId(fromId);
              } else if (targetRoom) {
                setSelectedRoomId(targetRoom.id);
                setSelectedChannelId(msg.channelId);
              }
            };

            pushToast({
              title: toastTitle,
              body: (msg.text || "").slice(0, 95),
              author: msg.author,
              isInvite: Boolean(msg.serverInvite),
              onClick: navigateToMsg,
            });

            if (!document.hasFocus() && typeof Notification !== "undefined") {
              try {
                if (Notification.permission === "granted") {
                  const n = new Notification(toastTitle, {
                    body: (msg.text || "").slice(0, 120),
                    silent: true,
                  });
                  n.onclick = () => navigateToMsg();
                } else if (Notification.permission !== "denied") {
                  Notification.requestPermission().catch(() => {});
                }
              } catch {}
            }
          }
        }
        break;
      }

      // AGENTS.md § 2.5 & RELATORIO_BUGS_E_AUDITORIA Bug 09: Fragmentação de Arquivos WebRTC
      case "FILE_TRANSFER_START": {
        if (!event.transferId || !event.totalChunks) break;
        pendingTransfersRef.current.set(event.transferId, {
          meta: event,
          chunks: new Map(),
          receivedChunks: 0,
          totalChunks: event.totalChunks,
        });
        break;
      }

      case "FILE_TRANSFER_CHUNK": {
        const transfer = pendingTransfersRef.current.get(event.transferId);
        if (!transfer) break;
        if (!transfer.chunks.has(event.chunkIndex)) {
          transfer.chunks.set(event.chunkIndex, event.data);
          transfer.receivedChunks++;
        }
        break;
      }

      case "FILE_TRANSFER_COMPLETE": {
        const transfer = pendingTransfersRef.current.get(event.transferId);
        if (!transfer) break;
        pendingTransfersRef.current.delete(event.transferId);

        const meta = transfer.meta;
        if (!meta) break;

        const chunkList = [];
        for (let i = 0; i < meta.totalChunks; i++) {
          const chunkData = transfer.chunks.get(i);
          if (!chunkData) {
            console.warn(`[Freecord P2P] Missing chunk ${i} for file ${meta.fileName}`);
            return;
          }
          const byteChars = atob(chunkData);
          const byteNumbers = new Uint8Array(byteChars.length);
          for (let j = 0; j < byteChars.length; j++) {
            byteNumbers[j] = byteChars.charCodeAt(j);
          }
          chunkList.push(byteNumbers);
        }
        const fullBlob = new Blob(chunkList, {
          type: meta.mimeType || "application/octet-stream",
        });
        const objectUrl = URL.createObjectURL(fullBlob);

        const assembledMsg = {
          id: meta.messageId,
          channelId: meta.channelId,
          author: meta.author,
          timestamp:
            meta.timestamp ||
            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: t.fileSharedText(meta.fileName, (meta.fileSize / 1024).toFixed(1)),
          attachment: {
            name: meta.fileName,
            size: meta.fileSize,
            mimeType: meta.mimeType,
            isImage: meta.isImage,
            dataUrl: objectUrl,
          },
          reactions: {},
        };

        if (!seenMessageIdsRef.current.has(assembledMsg.id)) {
          seenMessageIdsRef.current.add(assembledMsg.id);
          setMessages((prev) => [...prev, assembledMsg]);
          if (notificationsEnabledRef.current) {
            playSynthesizedUiSound("message");
          }
        }
        break;
      }

      case "CHAT_REACTION": {
        const { messageId, emoji, peerId } = event;
        if (!messageId || !emoji || !peerId) return;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            const currentReactions = { ...(m.reactions || {}) };
            const list = new Set(currentReactions[emoji] || []);
            if (list.has(peerId)) {
              list.delete(peerId);
            } else {
              list.add(peerId);
            }
            if (list.size === 0) {
              delete currentReactions[emoji];
            } else {
              currentReactions[emoji] = Array.from(list);
            }
            return { ...m, reactions: currentReactions };
          })
        );
        break;
      }

      case "CHAT_EDIT": {
        if (!event.messageId || !event.newText || !event.authorPeerId) break;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== event.messageId) return m;
            // Validação de autor: apenas o autor original pode editar sua mensagem
            if (m.author?.peerId !== event.authorPeerId) return m;
            return {
              ...m,
              text: event.newText,
              editedAt: event.editedAt || Date.now(),
            };
          })
        );
        break;
      }

      case "CHAT_DELETE": {
        if (!event.messageId || !event.authorPeerId) break;
        setMessages((prev) =>
          prev.filter((m) => {
            if (m.id !== event.messageId) return true;
            // Validação de autor: apenas o autor pode deletar sua mensagem
            return m.author?.peerId !== event.authorPeerId;
          })
        );
        break;
      }

      case "PIN_TOGGLE": {
        if (!event.messageId) break;
        setPinnedMessageIds((prev) => {
          const next = prev.includes(event.messageId)
            ? prev.filter((id) => id !== event.messageId)
            : [...prev, event.messageId];
          try {
            localStorage.setItem("freecord_pinned_msgs_v1", JSON.stringify(next));
          } catch {}
          return next;
        });
        break;
      }

      case "TYPING_STATE": {
        const { channelId, username, fromPeerId } = event;
        if (!channelId || !fromPeerId) return;
        setTypingPeers((prev) => ({
          ...prev,
          [channelId]: { username: username || "Peer", expiresAt: Date.now() + 3000 },
        }));
        break;
      }

      case "ROOM_SYNC": {
        if (!Array.isArray(event.rooms)) return;
        const leftSet = new Set(leftRoomIdsRef.current || []);
        setRooms((prev) => {
          const map = new Map(prev.map((r) => [r.id, r]));
          for (const incomingRoom of event.rooms) {
            if (!incomingRoom?.id || leftSet.has(incomingRoom.id)) continue;
            // Only auto-sync rooms the user is already a member of; new rooms require an invite!
            if (map.has(incomingRoom.id)) {
              const existing = map.get(incomingRoom.id);
              const incomingIsNewer =
                (incomingRoom.updatedAt || 0) >= (existing.updatedAt || 0);

              // RELATORIO_BUGS_E_AUDITORIA Bug 12: Preservação aditiva e não-destrutiva de canais.
              // Garante que pacotes incompletos ou maliciosos não apaguem canais existentes.
              const textMap = new Map(
                (existing.textChannels || []).map((c) => [c.id, c])
              );
              for (const ch of incomingRoom.textChannels || []) {
                if (ch && ch.id) {
                  textMap.set(ch.id, { ...(textMap.get(ch.id) || {}), ...ch });
                }
              }

              const voiceMap = new Map(
                (existing.voiceChannels || []).map((c) => [c.id, c])
              );
              for (const vc of incomingRoom.voiceChannels || []) {
                if (vc && vc.id) {
                  voiceMap.set(vc.id, { ...(voiceMap.get(vc.id) || {}), ...vc });
                }
              }

              map.set(incomingRoom.id, {
                ...existing,
                ...(incomingIsNewer ? incomingRoom : {}),
                textChannels: Array.from(textMap.values()),
                voiceChannels: Array.from(voiceMap.values()),
              });
            }
          }
          return Array.from(map.values());
        });
        if (event.fromPeerId) {
          setTimeout(() => requestHistorySyncFromPeer(event.fromPeerId), 200);
        }
        break;
      }

      case "HISTORY_SYNC_REQUEST": {
        const requesterId = event.fromPeerId;
        const myId = selfPeerIdRef.current;
        // AGENTS.md § 2.3: Proibição de Vazamento de DMs:
        // Apenas canais de servidores compartilhados e a DM exclusiva entre o usuário local e o peer solicitante podem ser sincronizados.
        const allowedChannels = buildSharedChannelIds(
          roomsRef.current,
          myId,
          requesterId || ""
        );
        const missed = collectMissedMessagesForPeer(
          messagesRef.current,
          event.digest || {},
          allowedChannels
        );
        if (missed.length > 0) {
          sendP2PPacket(
            {
              type: "HISTORY_SYNC_RESPONSE",
              fromPeerId: myId,
              messages: missed,
            },
            requesterId || null
          );
        }
        break;
      }

      case "HISTORY_SYNC_RESPONSE": {
        if (!Array.isArray(event.messages) || event.messages.length === 0) break;
        const normalizedList = (
          await Promise.all(event.messages.map((m) => normalizeIncomingMessage(m)))
        ).filter(Boolean);
        if (normalizedList.length === 0) break;
        for (const m of normalizedList) {
          if (m?.id) seenMessageIdsRef.current.add(m.id);
        }
        setMessages((prev) => {
          const { merged } = mergeHistoryMessages(prev, normalizedList);
          // AGENTS.md § 2.3: Silenciamento em Sync: Sincronizações de histórico jamais disparam sons
          return merged;
        });
        break;
      }

      case "VOICE_STATE": {
        if (!event.fromPeerId) break;
        const nextChannelId = event.channelId || null;
        const nextVoiceState = event.voiceState || {};
        setConnectedPeers((prev) => {
          const exists = prev.some((p) => p.peerId === event.fromPeerId);
          if (exists) {
            return prev.map((p) =>
              p.peerId === event.fromPeerId
                ? {
                    ...p,
                    voiceChannelId: nextChannelId,
                    voiceState: { ...(p.voiceState || {}), ...nextVoiceState },
                  }
                : p
            );
          }
          return [
            ...prev,
            {
              peerId: event.fromPeerId,
              name: event.fromPeerId.slice(0, 8),
              voiceChannelId: nextChannelId,
              voiceState: nextVoiceState,
            },
          ];
        });
        const activeCh = activeVoiceChannelIdRef.current;
        if (!activeCh || nextChannelId !== activeCh) {
          setSpeakingMap((prev) => {
            if (!prev[event.fromPeerId]) return prev;
            return { ...prev, [event.fromPeerId]: false };
          });
        } else if (typeof nextVoiceState.speaking === "boolean") {
          setSpeakingMap((prev) => ({
            ...prev,
            [event.fromPeerId]: nextVoiceState.speaking,
          }));
        }
        if (activeCh && nextChannelId === activeCh) {
          voiceEngineRef.current?.negotiateWithPeer(event.fromPeerId);
        }
        if (nextChannelId) {
          setOutgoingDmCall((prev) => {
            if (prev && prev.channelId === nextChannelId) {
              if (notificationsEnabledRef.current) {
                playSynthesizedUiSound("call_join");
              }
              return null;
            }
            return prev;
          });
        }
        break;
      }

      case "DM_CALL_RING": {
        if (!event.fromPeerId || !event.channelId) break;
        // If we are already in this call (or simultaneously calling the same peer), pair immediately!
        if (
          activeVoiceChannelIdRef.current === event.channelId ||
          outgoingDmCallRef.current?.channelId === event.channelId
        ) {
          setOutgoingDmCall(null);
          setIncomingDmCall(null);
          setConnectedPeers((prev) => {
            const exists = prev.some((p) => p.peerId === event.fromPeerId);
            if (exists) {
              return prev.map((p) =>
                p.peerId === event.fromPeerId
                  ? { ...p, voiceChannelId: event.channelId }
                  : p
              );
            }
            return [...prev, { peerId: event.fromPeerId, voiceChannelId: event.channelId }];
          });
          sendP2PPacket(
            { type: "DM_CALL_ACCEPT", channelId: event.channelId },
            event.fromPeerId
          );
          voiceEngineRef.current?.negotiateWithPeer(event.fromPeerId);
          syncVoiceStateP2P(event.channelId, {
            muted: selfMute,
            deafened: selfDeafen,
            videoEnabled,
            screenSharing,
          });
          break;
        }
        const caller =
          event.caller ||
          connectedPeersRef.current.find((p) => p.peerId === event.fromPeerId) || {
            peerId: event.fromPeerId,
            displayName: "Peer",
            username: "peer",
          };
        setConnectedPeers((prev) => {
          const exists = prev.some((p) => p.peerId === event.fromPeerId);
          if (exists) {
            return prev.map((p) =>
              p.peerId === event.fromPeerId
                ? { ...p, voiceChannelId: event.channelId, ...caller }
                : p
            );
          }
          return [...prev, { ...caller, peerId: event.fromPeerId, voiceChannelId: event.channelId }];
        });
        setIncomingDmCall({
          fromPeerId: event.fromPeerId,
          caller,
          channelId: event.channelId,
          withVideo: Boolean(event.withVideo),
        });
        window.DiscordNative?.window?.flashFrame?.(true);
        if (!document.hasFocus() && typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            const callerName = caller.displayName || caller.username || "Peer";
            const n = new Notification(t.incomingCallTitle, {
              body: event.withVideo
                ? t.incomingVideoCallSub(callerName)
                : t.incomingVoiceCallSub(callerName),
              silent: true,
            });
            n.onclick = () => window.DiscordNative?.window?.focus?.();
          } catch {}
        }
        break;
      }

      case "DM_CALL_ACCEPT": {
        if (!event.channelId) break;
        setOutgoingDmCall((prev) => (prev && prev.channelId === event.channelId ? null : prev));
        setIncomingDmCall((prev) => (prev && prev.channelId === event.channelId ? null : prev));
        if (event.fromPeerId) {
          setConnectedPeers((prev) => {
            const exists = prev.some((p) => p.peerId === event.fromPeerId);
            if (exists) {
              return prev.map((p) =>
                p.peerId === event.fromPeerId
                  ? { ...p, voiceChannelId: event.channelId }
                  : p
              );
            }
            return [
              ...prev,
              {
                peerId: event.fromPeerId,
                voiceChannelId: event.channelId,
                name: event.fromPeerId.slice(0, 8),
              },
            ];
          });
          // If we initiated the call, negotiate media tracks now that callee has accepted
          if (activeVoiceChannelIdRef.current === event.channelId) {
            voiceEngineRef.current?.negotiateWithPeer(event.fromPeerId);
          }
        }
        if (notificationsEnabledRef.current) {
          playSynthesizedUiSound("call_join");
        }
        break;
      }

      case "DM_CALL_REJECT":
      case "DM_CALL_END": {
        if (!event.channelId) break;
        setIncomingDmCall((prev) => (prev && prev.channelId === event.channelId ? null : prev));
        setOutgoingDmCall((prev) => {
          if (prev && prev.channelId === event.channelId) {
            const peerName = prev.peer?.displayName || prev.peer?.username || "Peer";
            pushToast({
              title: t.endDmCallBtn,
              body: t.callRejectedToast(peerName),
              author: prev.peer,
            });
            return null;
          }
          return prev;
        });
        if (event.fromPeerId) {
          setConnectedPeers((prev) =>
            prev.map((p) =>
              p.peerId === event.fromPeerId && p.voiceChannelId === event.channelId
                ? { ...p, voiceChannelId: null }
                : p
            )
          );
        }
        if (notificationsEnabledRef.current) {
          playSynthesizedUiSound("call_leave");
        }
        if (
          (event.type === "DM_CALL_END" || event.type === "DM_CALL_REJECT") &&
          activeVoiceChannelIdRef.current === event.channelId
        ) {
          handleLeaveVoiceChannel();
        }
        break;
      }

      case "WEBRTC_SIGNAL": {
        const activeCh = activeVoiceChannelIdRef.current;
        if (!activeCh || !event.fromPeerId || !event.signal) break;
        if (event.voiceChannelId && event.voiceChannelId !== activeCh) break;

        const isSdpHandshake =
          event.signal.type === "offer" ||
          event.signal.type === "answer" ||
          Boolean(event.signal.sdp);

        // Apenas ofertas/respostas SDP atualizam o estado React e retomam o AudioContext.
        // Candidatos ICE (20-50 pacotes/seg) são encaminhados direto ao motor sem re-renderizar a árvore.
        if (isSdpHandshake) {
          setConnectedPeers((prev) => {
            const exists = prev.some((p) => p.peerId === event.fromPeerId);
            if (exists) {
              return prev.map((p) =>
                p.peerId === event.fromPeerId && p.voiceChannelId !== activeCh
                  ? { ...p, voiceChannelId: activeCh }
                  : p
              );
            }
            return [
              ...prev,
              {
                peerId: event.fromPeerId,
                voiceChannelId: activeCh,
                name: event.fromPeerId.slice(0, 8),
              },
            ];
          });
          voiceEngineRef.current?.resumeAllAudio();
        }

        voiceEngineRef.current?.handleIncomingSignal(event.fromPeerId, event.signal);
        break;
      }

      case "VOICE_SPEAKING": {
        const activeCh = activeVoiceChannelIdRef.current;
        if (!activeCh || !event.fromPeerId) break;
        if (event.voiceChannelId && event.voiceChannelId !== activeCh) break;
        const senderPeer = connectedPeersRef.current.find((p) => p.peerId === event.fromPeerId);
        if (!senderPeer || senderPeer.voiceChannelId !== activeCh) break;
        const spk = Boolean(event.speaking);
        setSpeakingMap((prev) => {
          if (prev[event.fromPeerId] === spk) return prev;
          return {
            ...prev,
            [event.fromPeerId]: spk,
          };
        });
        voiceEngineRef.current?.setRemotePeerSpeaking(event.fromPeerId, spk);
        break;
      }

      case "MEDIA_FRAME": {
        const activeCh = activeVoiceChannelIdRef.current;
        if (!activeCh || !event.fromPeerId || !event.kind || !event.dataUrl) break;
        if (event.voiceChannelId && event.voiceChannelId !== activeCh) break;
        voiceEngineRef.current?.handleIncomingMediaFrame(event.fromPeerId, event);
        break;
      }

      case "AUDIO_CHUNK": {
        const activeCh = activeVoiceChannelIdRef.current;
        if (!activeCh || !event.fromPeerId || !event.pcmBase64) break;
        if (event.voiceChannelId && event.voiceChannelId !== activeCh) break;
        voiceEngineRef.current?.handleIncomingAudioChunk(event.fromPeerId, event);
        break;
      }
    }
  };
  handleIncomingP2PEventRef.current = handleIncomingP2PEvent;

  // Automatically negotiate WebRTC with any peer in the same active voice channel
  // AND immediately destroy peer connections for peers who left the voice channel!
  useEffect(() => {
    const engine = voiceEngineRef.current;
    if (!engine) return;
    if (!activeVoiceChannelId) {
      engine.setInVoiceChannel(false);
      return;
    }
    engine.setInVoiceChannel(true);

    // Tear down any peer who is no longer in our activeVoiceChannelId
    for (const existingPeerId of Array.from(engine.connections.keys())) {
      if (String(existingPeerId).startsWith("webrtc_")) continue;
      const peerObj = connectedPeers.find((p) => p.peerId === existingPeerId);
      if (!peerObj || peerObj.voiceChannelId !== activeVoiceChannelId) {
        engine.destroyPeer(existingPeerId);
        setRemoteStreams((prev) => {
          if (!(existingPeerId in prev)) return prev;
          const next = { ...prev };
          delete next[existingPeerId];
          return next;
        });
        setSpeakingMap((prev) => {
          if (!prev[existingPeerId]) return prev;
          return { ...prev, [existingPeerId]: false };
        });
      }
    }

    for (const peer of connectedPeers) {
      if (peer.voiceChannelId === activeVoiceChannelId) {
        setOutgoingDmCall((prev) =>
          prev && prev.channelId === activeVoiceChannelId ? null : prev
        );
        setIncomingDmCall((prev) =>
          prev && prev.channelId === activeVoiceChannelId ? null : prev
        );
        const existing = engine.connections.get(peer.peerId);
        if (
          !existing ||
          !existing.hasNegotiated ||
          existing.pc.connectionState === "failed" ||
          existing.pc.connectionState === "closed"
        ) {
          engine.negotiateWithPeer(peer.peerId);
        }
      }
    }
  }, [activeVoiceChannelId, connectedPeers]);

  // Clear expired typing indicators
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setTypingPeers((prev) => {
        let changed = false;
        const next = {};
        for (const [chId, info] of Object.entries(prev)) {
          if (info.expiresAt > now) {
            next[chId] = info;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Scroll chat to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedChannelId, selectedDmPeerId]);

  const currentRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || rooms[0],
    [rooms, selectedRoomId]
  );

  const effectiveChannelId = useMemo(() => {
    if (selectedRoomId === "dm_hub" && selectedDmPeerId) {
      const sorted = [nodeStatus.profile.peerId, selectedDmPeerId].sort().join("__");
      return `dm_${sorted}`;
    }
    return selectedChannelId;
  }, [selectedRoomId, selectedDmPeerId, selectedChannelId, nodeStatus.profile.peerId]);

  useEffect(() => {
    effectiveChannelIdRef.current = effectiveChannelId;
    if (effectiveChannelId) {
      setUnreadCounts((prev) => {
        if (!prev[effectiveChannelId]) return prev;
        const next = { ...prev };
        delete next[effectiveChannelId];
        return next;
      });
    }
  }, [effectiveChannelId]);

  const getDmCallChannelId = (peerId) => {
    const sorted = [nodeStatus.profile.peerId, peerId].sort().join("__");
    return `dm_call_${sorted}`;
  };

  const currentChannelObj = useMemo(() => {
    if (selectedRoomId === "dm_hub") {
      const peer = connectedPeers.find((p) => p.peerId === selectedDmPeerId);
      return {
        id: effectiveChannelId,
        name: peer ? `@${peer.displayName || peer.username}` : t.p2pHubTitle,
        topic: peer
          ? `Direct Encrypted P2P Message • Fingerprint: ${peer.fingerprint || "P2P"}`
          : t.connectModalSub,
      };
    }
    const allCh = [
      ...(currentRoom?.textChannels || []),
      ...(currentRoom?.voiceChannels || []),
    ];
    return allCh.find((c) => c.id === selectedChannelId) || currentRoom?.textChannels?.[0];
  }, [selectedRoomId, selectedDmPeerId, connectedPeers, currentRoom, selectedChannelId, effectiveChannelId, lang]);

  const filteredMessages = useMemo(
    () => messages.filter((m) => m.channelId === effectiveChannelId),
    [messages, effectiveChannelId]
  );

  const buildAuthorSnapshot = () => ({
    peerId: nodeStatus.profile.peerId,
    displayName: nodeStatus.profile.displayName || nodeStatus.profile.username,
    username: nodeStatus.profile.username,
    tag: nodeStatus.profile.tag,
    pronouns: nodeStatus.profile.pronouns,
    bio: nodeStatus.profile.bio,
    avatarColor: nodeStatus.profile.avatarColor,
    avatarUrl: nodeStatus.profile.avatarUrl,
    bannerColor: nodeStatus.profile.bannerColor,
    bannerUrl: nodeStatus.profile.bannerUrl,
    accentColorPrimary: nodeStatus.profile.accentColorPrimary,
    accentColorSecondary: nodeStatus.profile.accentColorSecondary,
    status: nodeStatus.profile.status,
    statusEmoji: nodeStatus.profile.statusEmoji,
    customStatus: nodeStatus.profile.customStatus,
    badges: nodeStatus.profile.badges,
    cryptoPubKey: cryptoIdentity.publicKey,
    keyFingerprint: cryptoIdentity.keyFingerprint,
  });

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const targetPeer = selectedRoomId === "dm_hub" ? selectedDmPeerId : null;
    const remotePeerObj = targetPeer
      ? connectedPeers.find((p) => p.peerId === targetPeer)
      : null;
    const e2eeEnvelope = await encryptChatMessagePayload(
      trimmed,
      effectiveChannelId,
      cryptoIdentity.publicKey,
      remotePeerObj?.cryptoPubKey || "",
      cryptoIdentity.privateKey || ""
    );

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const replySnapshot = replyingTo
      ? {
          messageId: replyingTo.messageId,
          authorName: replyingTo.authorName,
          textSnippet: replyingTo.textSnippet,
        }
      : null;

    const newMsg = {
      id: msgId,
      createdAt: Date.now(),
      channelId: effectiveChannelId,
      author: buildAuthorSnapshot(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: trimmed,
      replyTo: replySnapshot,
      e2ee: e2eeEnvelope,
      e2eeVerified: true,
      reactions: {},
    };

    seenMessageIdsRef.current.add(msgId);
    setMessages((prev) => [...prev, newMsg]);
    setChatInput("");
    setReplyingTo(null);

    // AGENTS.md § 2.2: Mascaramento de Rede: pacote na rede nunca expõe o texto original em claro
    const wireMsg = {
      ...newMsg,
      text: e2eeEnvelope ? "🔒 [Mensagem Criptografada]" : trimmed,
    };
    sendP2PPacket({ type: "CHAT_MESSAGE", message: wireMsg }, targetPeer);
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg_${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight-flash");
      setTimeout(() => el.classList.remove("highlight-flash"), 1600);
    }
  };

  const handleStartReply = (msg) => {
    setReplyingTo({
      messageId: msg.id,
      authorName: msg.author?.displayName || msg.author?.username || "Peer",
      textSnippet: (msg.text || "").slice(0, 80),
    });
  };

  const handleStartEdit = (msg) => {
    setEditingMessageId(msg.id);
    setEditInput(msg.text || "");
  };

  const handleSaveEdit = (messageId) => {
    const trimmed = editInput.trim();
    if (!trimmed) return;
    const editedAt = Date.now();
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, text: trimmed, editedAt } : m))
    );
    setEditingMessageId(null);
    const targetPeer = selectedRoomId === "dm_hub" ? selectedDmPeerId : null;
    sendP2PPacket(
      {
        type: "CHAT_EDIT",
        dedupId: `edit_${messageId}_${editedAt}`,
        messageId,
        channelId: effectiveChannelId,
        newText: trimmed,
        editedAt,
        authorPeerId: selfPeerIdRef.current,
      },
      targetPeer
    );
  };

  const handleDeleteMessage = (messageId) => {
    if (!confirm("Tem certeza que deseja excluir esta mensagem?")) return;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    const targetPeer = selectedRoomId === "dm_hub" ? selectedDmPeerId : null;
    sendP2PPacket(
      {
        type: "CHAT_DELETE",
        dedupId: `del_${messageId}_${Date.now()}`,
        messageId,
        channelId: effectiveChannelId,
        authorPeerId: selfPeerIdRef.current,
      },
      targetPeer
    );
  };

  const handleTogglePin = (messageId) => {
    setPinnedMessageIds((prev) => {
      const next = prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId];
      try {
        localStorage.setItem("freecord_pinned_msgs_v1", JSON.stringify(next));
      } catch {}
      return next;
    });
    const targetPeer = selectedRoomId === "dm_hub" ? selectedDmPeerId : null;
    sendP2PPacket(
      {
        type: "PIN_TOGGLE",
        dedupId: `pin_${messageId}_${Date.now()}`,
        messageId,
        channelId: effectiveChannelId,
      },
      targetPeer
    );
  };

  const pinnedSet = useMemo(() => new Set(pinnedMessageIds), [pinnedMessageIds]);

  const currentChannelPinnedMessages = useMemo(() => {
    return messages.filter((m) => m.channelId === effectiveChannelId && pinnedSet.has(m.id));
  }, [messages, effectiveChannelId, pinnedSet]);

  const handleSendQuickDm = async (peerProfile, text) => {
    const sorted = [nodeStatus.profile.peerId, peerProfile.peerId].sort().join("__");
    const dmChId = `dm_${sorted}`;
    const e2eeEnvelope = await encryptChatMessagePayload(
      text,
      dmChId,
      cryptoIdentity.publicKey,
      peerProfile?.cryptoPubKey || "",
      cryptoIdentity.privateKey || ""
    );
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newMsg = {
      id: msgId,
      createdAt: Date.now(),
      channelId: dmChId,
      author: buildAuthorSnapshot(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text,
      e2ee: e2eeEnvelope,
      e2eeVerified: true,
      reactions: {},
    };
    seenMessageIdsRef.current.add(msgId);
    setMessages((prev) => [...prev, newMsg]);

    // AGENTS.md § 2.2: Mascaramento de Rede
    const wireMsg = {
      ...newMsg,
      text: e2eeEnvelope ? "🔒 [Mensagem Criptografada]" : text,
    };
    sendP2PPacket({ type: "CHAT_MESSAGE", message: wireMsg }, peerProfile.peerId);
    setInspectedProfile(null);
    setSelectedRoomId("dm_hub");
    setSelectedDmPeerId(peerProfile.peerId);
  };

  const handleFileAttachment = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert("15 MB maximum file size for inline P2P transfer.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const isImage = file.type.startsWith("image/");
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const targetPeer = selectedRoomId === "dm_hub" ? selectedDmPeerId : null;

      const newMsg = {
        id: msgId,
        channelId: effectiveChannelId,
        author: buildAuthorSnapshot(),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: t.fileSharedText(file.name, (file.size / 1024).toFixed(1)),
        attachment: {
          name: file.name,
          size: file.size,
          mimeType: file.type || "application/octet-stream",
          isImage,
          dataUrl: reader.result,
        },
        reactions: {},
      };

      seenMessageIdsRef.current.add(msgId);
      setMessages((prev) => [...prev, newMsg]);

      // AGENTS.md § 2.5: Se o arquivo for maior que 32 KB, fragmentar em chunks binários
      const CHUNK_SIZE = 32 * 1024;
      if (file.size > CHUNK_SIZE) {
        const transferId = `ft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        sendP2PPacket(
          {
            type: "FILE_TRANSFER_START",
            dedupId: `ft_start_${transferId}`,
            transferId,
            messageId: msgId,
            channelId: effectiveChannelId,
            author: buildAuthorSnapshot(),
            timestamp: newMsg.timestamp,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || "application/octet-stream",
            isImage,
            totalChunks,
          },
          targetPeer
        );

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(file.size, start + CHUNK_SIZE);
          const sliceBlob = file.slice(start, end);
          const arrayBuf = await sliceBlob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuf);
          let binary = "";
          for (let b = 0; b < bytes.length; b += 8192) {
            binary += String.fromCharCode.apply(
              null,
              bytes.subarray(b, Math.min(b + 8192, bytes.length))
            );
          }
          const chunkBase64 = btoa(binary);

          sendP2PPacket(
            {
              type: "FILE_TRANSFER_CHUNK",
              dedupId: `ft_chunk_${transferId}_${i}`,
              transferId,
              chunkIndex: i,
              data: chunkBase64,
            },
            targetPeer
          );

          if (i % 4 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 8));
          }
        }

        sendP2PPacket(
          {
            type: "FILE_TRANSFER_COMPLETE",
            dedupId: `ft_end_${transferId}`,
            transferId,
          },
          targetPeer
        );
      } else {
        sendP2PPacket({ type: "CHAT_MESSAGE", message: newMsg }, targetPeer);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleToggleReaction = (messageId, emoji) => {
    const myPeerId = nodeStatus.profile.peerId;
    handleIncomingP2PEvent({
      type: "CHAT_REACTION",
      messageId,
      emoji,
      peerId: myPeerId,
    });
    sendP2PPacket({
      type: "CHAT_REACTION",
      messageId,
      emoji,
      peerId: myPeerId,
    });
  };

  const handleJoinVoiceChannel = async (voiceChannel) => {
    if (activeVoiceChannelId === voiceChannel.id) return;

    const engine = voiceEngineRef.current;
    if (!engine) return;

    if (activeVoiceChannelId && activeVoiceChannelId !== voiceChannel.id) {
      for (const peerId of Array.from(engine.connections.keys())) {
        if (!String(peerId).startsWith("webrtc_")) {
          engine.destroyPeer(peerId);
        }
      }
      setRemoteStreams({});
    }

    activeVoiceChannelIdRef.current = voiceChannel.id;
    engine.setInVoiceChannel(true);
    setActiveVoiceChannelId(voiceChannel.id);
    try {
      window.FreecordAndroid?.startVoiceCallService?.(voiceChannel.name || "Chamada P2P");
    } catch {}
    await engine.startLocalVoice();
    await engine.resumeAllAudio();

    const vState = {
      muted: selfMute,
      deafened: selfDeafen,
      videoEnabled,
      screenSharing,
    };
    syncVoiceStateP2P(voiceChannel.id, vState);

    for (const peer of connectedPeersRef.current) {
      if (peer.voiceChannelId === voiceChannel.id) {
        await engine.negotiateWithPeer(peer.peerId);
      }
    }
  };

  const handleLeaveVoiceChannel = () => {
    const prevCh = activeVoiceChannelIdRef.current;
    if (prevCh && String(prevCh).startsWith("dm_call_")) {
      sendP2PPacket({ type: "DM_CALL_END", channelId: prevCh });
    }
    setOutgoingDmCall(null);
    activeVoiceChannelIdRef.current = null;
    try {
      window.FreecordAndroid?.stopVoiceCallService?.();
    } catch {}
    const engine = voiceEngineRef.current;
    engine?.setInVoiceChannel(false);
    engine?.destroyAll();
    setActiveVoiceChannelId(null);
    setVideoEnabled(false);
    setScreenSharing(false);
    setLocalCameraStream(null);
    setLocalScreenStream(null);
    setLocalScreenFrameUrl(null);
    setSpotlightTileId(null);
    setFullscreenTileId(null);
    setInAppPipTileId(null);
    try {
      window.FreecordAndroid?.setImmersiveFullscreen?.(false);
    } catch {}
    setRemoteStreams({});
    setSpeakingMap({});
    setMicInputLevel(0);
    sendP2PPacket({ type: "VOICE_SPEAKING", speaking: false });
    syncVoiceStateP2P(null, { speaking: false });
  };

  const handleStartDmCall = async (peer, withVideo = false) => {
    if (!peer?.peerId) return;
    setInspectedProfile(null);
    setSelectedRoomId("dm_hub");
    setSelectedDmPeerId(peer.peerId);

    const dmCallId = getDmCallChannelId(peer.peerId);
    const peerLabel = peer.displayName || peer.username || "Peer";

    // If the target peer is already ringing us on this exact DM call channel, accept it directly!
    if (incomingDmCall && incomingDmCall.channelId === dmCallId) {
      await handleAcceptDmCall(withVideo);
      return;
    }

    await handleJoinVoiceChannel({
      id: dmCallId,
      name: `PV @${peerLabel}`,
    });

    if (withVideo && !videoEnabled) {
      setTimeout(() => {
        toggleCamera().catch(() => {});
      }, 200);
    }

    const peerAlreadyInCall = connectedPeersRef.current.some(
      (p) => p.peerId === peer.peerId && p.voiceChannelId === dmCallId
    );
    if (peerAlreadyInCall) {
      setOutgoingDmCall(null);
      sendP2PPacket(
        { type: "DM_CALL_ACCEPT", channelId: dmCallId },
        peer.peerId
      );
    } else {
      setOutgoingDmCall({
        peer,
        channelId: dmCallId,
        withVideo,
        startedAt: Date.now(),
      });
      sendP2PPacket(
        {
          type: "DM_CALL_RING",
          channelId: dmCallId,
          withVideo,
          caller: buildAuthorSnapshot(),
        },
        peer.peerId
      );
    }
  };

  const handleAcceptDmCall = async (withVideo = false) => {
    if (!incomingDmCall) return;
    const { fromPeerId, caller, channelId } = incomingDmCall;
    setIncomingDmCall(null);
    setOutgoingDmCall(null);
    setSelectedRoomId("dm_hub");
    setSelectedDmPeerId(fromPeerId);

    setConnectedPeers((prev) => {
      const exists = prev.some((p) => p.peerId === fromPeerId);
      if (exists) {
        return prev.map((p) =>
          p.peerId === fromPeerId ? { ...p, voiceChannelId: channelId, ...(caller || {}) } : p
        );
      }
      return [...prev, { ...(caller || {}), peerId: fromPeerId, voiceChannelId: channelId }];
    });

    const callerLabel = caller?.displayName || caller?.username || "Peer";
    await handleJoinVoiceChannel({
      id: channelId,
      name: `PV @${callerLabel}`,
    });

    if (withVideo && !videoEnabled) {
      setTimeout(() => {
        toggleCamera().catch(() => {});
      }, 200);
    }

    sendP2PPacket({ type: "DM_CALL_ACCEPT", channelId }, fromPeerId);
    voiceEngineRef.current?.negotiateWithPeer(fromPeerId);
    if (notificationsEnabledRef.current) {
      playSynthesizedUiSound("call_join");
    }
  };

  const handleDeclineDmCall = () => {
    if (!incomingDmCall) return;
    sendP2PPacket(
      { type: "DM_CALL_REJECT", channelId: incomingDmCall.channelId },
      incomingDmCall.fromPeerId
    );
    setIncomingDmCall(null);
  };

  const handleCancelOutgoingDmCall = () => {
    if (outgoingDmCall) {
      sendP2PPacket(
        { type: "DM_CALL_END", channelId: outgoingDmCall.channelId },
        outgoingDmCall.peer?.peerId
      );
      setOutgoingDmCall(null);
    }
    handleLeaveVoiceChannel();
  };

  const toggleSelfMute = () => {
    const next = !selfMute;
    setSelfMute(next);
    voiceEngineRef.current?.setSelfMute(next);
    if (next) {
      setSpeakingMap((prev) => ({ ...prev, [selfPeerIdRef.current]: false }));
      sendP2PPacket({ type: "VOICE_SPEAKING", speaking: false });
    }
    if (activeVoiceChannelId) {
      syncVoiceStateP2P(activeVoiceChannelId, {
        muted: next,
        deafened: selfDeafen,
        videoEnabled,
        screenSharing,
        speaking: false,
      });
    }
  };

  const toggleSelfDeafen = () => {
    const next = !selfDeafen;
    setSelfDeafen(next);
    if (next) {
      setSelfMute(true);
      setSpeakingMap((prev) => ({ ...prev, [selfPeerIdRef.current]: false }));
      sendP2PPacket({ type: "VOICE_SPEAKING", speaking: false });
    }
    voiceEngineRef.current?.setSelfDeafen(next);
    if (activeVoiceChannelId) {
      syncVoiceStateP2P(activeVoiceChannelId, {
        muted: next ? true : selfMute,
        deafened: next,
        videoEnabled,
        screenSharing,
        speaking: false,
      });
    }
  };

  const toggleCamera = async () => {
    const engine = voiceEngineRef.current;
    if (!engine) return;
    try {
      if (videoEnabled) {
        await engine.setVideoBroadcast(false);
        setVideoEnabled(false);
        setLocalCameraStream(null);
        if (spotlightTileId === "self_camera") {
          setSpotlightTileId(screenSharing ? "self_screen" : null);
        }
      } else {
        for (const peer of connectedPeers) {
          if (!engine.connections.has(peer.peerId)) {
            engine.createPeerConnection(peer.peerId, true);
          }
        }
        const camStream = await engine.setVideoBroadcast(true);
        setVideoEnabled(true);
        setLocalCameraStream(camStream);
      }
      if (activeVoiceChannelId) {
        syncVoiceStateP2P(activeVoiceChannelId, {
          muted: selfMute,
          deafened: selfDeafen,
          videoEnabled: !videoEnabled,
          screenSharing,
        });
      }
    } catch (err) {
      alert(`Camera error: ${err.message}`);
    }
  };

  const openGoLivePicker = async () => {
    if (screenSharing) {
      await voiceEngineRef.current?.setDesktopSource(null);
      setScreenSharing(false);
      setLocalScreenStream(null);
      setLocalScreenFrameUrl(null);
      if (spotlightTileId === "self_screen") {
        setSpotlightTileId(null);
      }
      if (activeVoiceChannelId) {
        syncVoiceStateP2P(activeVoiceChannelId, {
          muted: selfMute,
          deafened: selfDeafen,
          videoEnabled,
          screenSharing: false,
        });
      }
      return;
    }

    if (window.DiscordNative?.desktopCapture) {
      const sources = await window.DiscordNative.desktopCapture.getDesktopSources();
      if (sources.length > 0) {
        setDesktopSources(sources);
        setShowScreenPicker(true);
        return;
      }
    }

    await startScreenShareWithSource("browser-display");
  };

  const persistMediaPrefs = (patch) => {
    try {
      const prev = JSON.parse(localStorage.getItem("freecord_media_prefs") || "{}");
      localStorage.setItem("freecord_media_prefs", JSON.stringify({ ...prev, ...patch }));
    } catch {}
  };

  const handleSelectMicDevice = async (deviceId) => {
    setSelectedMicId(deviceId);
    persistMediaPrefs({ micId: deviceId });
    await voiceEngineRef.current?.setAudioInputDevice(deviceId);
    refreshMediaDevices();
  };

  const handleSelectSpeakerDevice = async (deviceId) => {
    setSelectedSpeakerId(deviceId);
    persistMediaPrefs({ speakerId: deviceId });
    await voiceEngineRef.current?.setAudioOutputDevice(deviceId);
  };

  const handleSelectCameraDevice = async (deviceId) => {
    setSelectedCameraId(deviceId);
    persistMediaPrefs({ cameraId: deviceId });
    const updatedStream = await voiceEngineRef.current?.setVideoInputDevice(deviceId, cameraResolution);
    if (updatedStream && videoEnabled) {
      setLocalCameraStream(updatedStream);
    }
    if (cameraTestStream) {
      await toggleCameraPreview(true, deviceId, cameraResolution);
    }
    refreshMediaDevices();
  };

  const handleSelectCameraResolution = async (resKey) => {
    setCameraResolution(resKey);
    persistMediaPrefs({ cameraResolution: resKey });
    const updatedStream = await voiceEngineRef.current?.setVideoInputDevice(selectedCameraId, resKey);
    if (updatedStream && videoEnabled) {
      setLocalCameraStream(updatedStream);
    }
    if (cameraTestStream) {
      await toggleCameraPreview(true, selectedCameraId, resKey);
    }
  };

  const handleSelectScreenQuality = async (resKey, fpsVal) => {
    const nextRes = resKey || screenResolution;
    const nextFps = Number(fpsVal || screenFps);
    setScreenResolution(nextRes);
    setScreenFps(nextFps);
    persistMediaPrefs({ screenResolution: nextRes, screenFps: nextFps });
    const updatedStream = await voiceEngineRef.current?.setScreenShareQuality(nextRes, nextFps);
    if (updatedStream && screenSharing) {
      setLocalScreenStream(updatedStream);
    }
  };

  const toggleCameraPreview = async (
    forceEnable = null,
    camId = selectedCameraId,
    camRes = cameraResolution
  ) => {
    const shouldEnable = forceEnable !== null ? forceEnable : !cameraTestStream;
    if (cameraTestStream) {
      cameraTestStream.getTracks().forEach((t) => t.stop());
      setCameraTestStream(null);
    }
    if (!shouldEnable) return;
    try {
      const resObj = CAMERA_RESOLUTIONS[camRes] || CAMERA_RESOLUTIONS["720p"];
      const constraints = {
        width: { ideal: resObj.width },
        height: { ideal: resObj.height },
      };
      if (camId && camId !== "default") {
        constraints.deviceId = { exact: camId };
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: constraints,
        audio: false,
      });
      setCameraTestStream(stream);
      refreshMediaDevices();
    } catch (err) {
      alert(`Camera preview error: ${err.message}`);
    }
  };

  const startScreenShareWithSource = async (sourceId) => {
    try {
      const engine = voiceEngineRef.current;
      if (engine) {
        for (const peer of connectedPeers) {
          if (!engine.connections.has(peer.peerId)) {
            engine.createPeerConnection(peer.peerId, true);
          }
        }
      }
      const stream = await engine?.setDesktopSource(sourceId, {
        resolution: screenResolution,
        frameRate: screenFps,
        captureAudio: shareScreenAudio,
      });
      if (stream) {
        setScreenSharing(true);
        setLocalScreenStream(stream);
        setSpotlightTileId("self_screen");
        setShowScreenPicker(false);
        if (activeVoiceChannelId) {
          syncVoiceStateP2P(activeVoiceChannelId, {
            muted: selfMute,
            deafened: selfDeafen,
            videoEnabled,
            screenSharing: true,
          });
        }
      }
    } catch (err) {
      setShowScreenPicker(false);
      const msg = String(err?.message || "");
      if (msg && !msg.toLowerCase().includes("cancel") && !msg.toLowerCase().includes("permission denied")) {
        pushToast({
          authorName: "Compartilhamento de Tela",
          avatarColor: "#f23f43",
          channelName: "Sistema",
          text: msg,
        });
      }
    }
  };

  const startStageHeightDrag = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = stageHeight;
    const onMove = (moveEvent) => {
      const delta = moveEvent.clientY - startY;
      setStageHeight(Math.max(220, Math.min(860, startH + delta)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    window.__onAndroidPipChanged = (inPip) => {
      setIsAndroidSystemPip(Boolean(inPip));
    };
    return () => {
      window.__onAndroidPipChanged = null;
    };
  }, []);

  const toggleElementFullscreen = (el) => {
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  };

  const handleToggleTileFullscreen = (tile) => {
    if (!tile) return;
    const isLeaving = fullscreenTileId === tile.id;
    const nextId = isLeaving ? null : tile.id;
    setFullscreenTileId(nextId);
    if (!isLeaving) {
      setSpotlightTileId(tile.id);
    }
    try {
      window.FreecordAndroid?.setImmersiveFullscreen?.(!isLeaving);
    } catch {}
    try {
      if (isLeaving) {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        }
      } else if (!window.FreecordAndroid) {
        const el = document.getElementById(`tile_box_${tile.id}`) || document.documentElement;
        el?.requestFullscreen?.().catch(() => {});
      }
    } catch {}
  };

  const handleToggleTilePiP = async (tile, videoId) => {
    if (!tile) return;
    setSpotlightTileId(tile.id);
    setInAppPipTileId((prev) => (prev === tile.id ? null : tile.id));

    // 1. On Android Native App: enter native Android Picture-in-Picture floating window
    if (window.FreecordAndroid?.enterPipMode) {
      setFullscreenTileId(tile.id);
      setInAppPipTileId(tile.id);
      try {
        window.FreecordAndroid.enterPipMode();
        return;
      } catch {}
    }

    // 2. Try standard HTML5 Video PiP on Desktop / Browser if supported
    try {
      const videoEl = document.getElementById(videoId);
      if (videoEl && typeof videoEl.requestPictureInPicture === "function") {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
          return;
        } else if (videoEl.readyState >= 1) {
          await videoEl.requestPictureInPicture();
          return;
        }
      }
    } catch {}

    // 3. Fallback: minimize mobile call stage into the floating In-App Video PiP player
    if (isMobile && mobileTab === "call") {
      setInAppPipTileId(tile.id);
      setMobileTab("servers");
    }
  };

  const connectViaWebSocket = (host, port) => {
    return new Promise((resolve, reject) => {
      try {
        if (mobileWsRef.current) {
          try { mobileWsRef.current.close(); } catch {}
          mobileWsRef.current = null;
        }

        const wsUrl = `ws://${host}:${port}/p2p`;
        const ws = new WebSocket(wsUrl);
        mobileWsRef.current = ws;

        let resolved = false;
        let remoteWsPeerId = null;
        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            try { ws.close(); } catch {}
            reject(new Error(lang === "en" ? `Connection timeout to ${host}:${port}` : `Tempo limite ao conectar em ${host}:${port}. Verifique o IP e se o Freecord está aberto no PC.`));
          }
        }, 7000);

        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: "HELLO",
            profile: {
              ...nodeStatus.profile,
              cryptoPubKey: cryptoIdentity.publicKey,
              keyFingerprint: cryptoIdentity.keyFingerprint,
            },
            voiceChannelId: activeVoiceChannelIdRef.current || null,
            voiceState: {
              muted: selfMute,
              deafened: selfDeafen,
              videoEnabled,
              screenSharing,
            },
            timestamp: Date.now(),
          }));
        };

        ws.onmessage = (e) => {
          try {
            const packet = JSON.parse(e.data);
            if (packet.type === "PING") {
              try {
                ws.send(JSON.stringify({ type: "PONG", sentAt: packet.sentAt }));
              } catch {}
              return;
            }
            if (packet.type === "PROFILE_UPDATE" && packet.profile?.peerId) {
              setConnectedPeers((prev) =>
                prev.map((p) =>
                  p.peerId === packet.profile.peerId
                    ? { ...p, ...packet.profile }
                    : p
                )
              );
              return;
            }
            if (packet.type === "HELLO" || packet.type === "HELLO_ACK") {
              const remoteProf = packet.profile;
              if (remoteProf && remoteProf.peerId) {
                remoteWsPeerId = remoteProf.peerId;
                const peerEntry = {
                  ...remoteProf,
                  address: host,
                  port: Number(port),
                  addresses: Array.isArray(packet.addresses) ? packet.addresses : [host],
                  rttMs: 2,
                  fingerprint: remoteProf.keyFingerprint || "P2P-LAN-DIRECT",
                  voiceChannelId: packet.voiceChannelId || null,
                  voiceState: packet.voiceState || {},
                };

                setConnectedPeers((prev) => {
                  const clean = prev.filter((p) => p.peerId !== remoteProf.peerId);
                  return [...clean, peerEntry];
                });

                setLanPeers((prev) => {
                  const filtered = prev.filter((p) => p.peerId !== remoteProf.peerId);
                  return [
                    {
                      ...remoteProf,
                      host,
                      tcpPort: Number(packet.tcpPort || port),
                      addresses: Array.isArray(packet.addresses) ? packet.addresses : [host],
                      lastSeen: Date.now(),
                      isConnected: true,
                    },
                    ...filtered,
                  ];
                });

                // Save to remembered LAN peers (persisting all candidate LAN IPs for fast auto-reconnect)
                try {
                  const saved = JSON.parse(localStorage.getItem("freecord_saved_lan_peers") || "[]");
                  const existingEntry = saved.find((s) => s.peerId === remoteProf.peerId || (s.host === host && s.port === Number(port)));
                  const mergedAddresses = Array.from(
                    new Set([
                      host,
                      ...(Array.isArray(packet.addresses) ? packet.addresses : []),
                      ...(Array.isArray(existingEntry?.addresses) ? existingEntry.addresses : []),
                    ].filter(Boolean))
                  );
                  const updated = [
                    {
                      host,
                      port: Number(packet.tcpPort || port),
                      addresses: mergedAddresses,
                      name: remoteProf.displayName || remoteProf.username,
                      peerId: remoteProf.peerId,
                      tag: remoteProf.tag,
                      avatarColor: remoteProf.avatarColor,
                      avatarUrl: remoteProf.avatarUrl || null,
                      timestamp: Date.now(),
                    },
                    ...saved.filter(
                      (s) => s.peerId !== remoteProf.peerId && (s.host !== host || s.port !== Number(port))
                    ),
                  ].slice(0, 12);
                  localStorage.setItem("freecord_saved_lan_peers", JSON.stringify(updated));
                  setSavedLanPeers(updated);
                } catch {}

                if (!resolved) {
                  resolved = true;
                  clearTimeout(timer);
                  resolve(peerEntry);
                }

                if (packet.type === "HELLO") {
                  ws.send(JSON.stringify({
                    type: "HELLO_ACK",
                    profile: {
                      ...nodeStatus.profile,
                      cryptoPubKey: cryptoIdentity.publicKey,
                      keyFingerprint: cryptoIdentity.keyFingerprint,
                    },
                    voiceChannelId: activeVoiceChannelIdRef.current || null,
                    voiceState: {
                      muted: selfMute,
                      deafened: selfDeafen,
                      videoEnabled,
                      screenSharing,
                    },
                    timestamp: Date.now(),
                  }));
                }

                setTimeout(() => {
                  try {
                    if (ws.readyState === 1) {
                      ws.send(
                        JSON.stringify({
                          type: "ROOM_SYNC",
                          fromPeerId: selfPeerIdRef.current,
                          rooms: roomsRef.current,
                        })
                      );
                    }
                  } catch {}
                  requestHistorySyncFromPeer(remoteProf.peerId);
                }, 250);
              }
              return;
            }

            const enrichedPacket = {
              ...packet,
              fromPeerId: packet.fromPeerId || remoteWsPeerId || host,
            };

            // Route WebRTC signaling and media frames
            if (enrichedPacket.type === "VOICE_SIGNAL" || enrichedPacket.type === "WEBRTC_SIGNAL") {
              voiceEngineRef.current?.handleIncomingSignal(enrichedPacket.fromPeerId, enrichedPacket.signal);
            } else if (enrichedPacket.type === "VOICE_MEDIA_FRAME" || enrichedPacket.type === "MEDIA_FRAME") {
              voiceEngineRef.current?.handleIncomingMediaFrame(enrichedPacket.fromPeerId, enrichedPacket);
            } else if (enrichedPacket.type === "VOICE_AUDIO_CHUNK" || enrichedPacket.type === "AUDIO_CHUNK") {
              voiceEngineRef.current?.handleIncomingAudioChunk(enrichedPacket.fromPeerId, enrichedPacket);
            } else {
              handleIncomingP2PEventRef.current?.(enrichedPacket);
            }
          } catch (err) {
            console.warn("[Freecord WS] Error processing packet:", err);
          }
        };

        ws.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            reject(new Error(lang === "en" ? `Could not connect to ${host}:${port}. Check that Freecord is open on the PC and connected to the same Wi-Fi.` : `Não foi possível conectar em ${host}:${port}. Verifique se o Freecord está aberto no PC e se ambos estão na mesma rede Wi-Fi.`));
          }
        };

        ws.onclose = () => {
          if (mobileWsRef.current === ws) {
            mobileWsRef.current = null;
          }
          // When user is in an active voice/video call or switching apps on Android,
          // do NOT immediately tear down the call or remove the peer! Reconnect fast instead.
          if (activeVoiceChannelIdRef.current) {
            setTimeout(() => {
              if (!mobileWsRef.current || mobileWsRef.current.readyState > 1) {
                connectViaWebSocket(host, port).catch(() => {});
              }
            }, 600);
            setTimeout(() => {
              if (!mobileWsRef.current || mobileWsRef.current.readyState !== 1) {
                setConnectedPeers((prev) =>
                  prev.filter((p) => p.address !== host || p.port !== Number(port))
                );
              }
            }, 15000);
          } else {
            setConnectedPeers((prev) =>
              prev.filter((p) => p.address !== host || p.port !== Number(port))
            );
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  };

  const handleConnectByHostPort = async (host, port) => {
    try {
      setConnectStatusMsg({
        type: "info",
        text: lang === "en" ? `Connecting to ${host}:${port}...` : `Conectando a ${host}:${port}...`,
      });

      let peer;
      if (window.DiscordNative?.p2p) {
        peer = await window.DiscordNative.p2p.connect(host, port);
      } else {
        peer = await connectViaWebSocket(host, port);
      }

      setConnectStatusMsg({
        type: "success",
        text:
          lang === "en"
            ? `Connected to ${peer?.displayName || peer?.username || host}#${peer?.tag || "P2P"} (${host}:${port})!`
            : `Conectado com sucesso a ${peer?.displayName || peer?.username || host}#${peer?.tag || "P2P"} (${host}:${port})!`,
      });
      return peer;
    } catch (err) {
      setConnectStatusMsg({ type: "error", text: err.message });
      throw err;
    }
  };

  const handleConnectByIp = async (e) => {
    e?.preventDefault();
    const raw = directIpInput.trim();
    if (!raw) return;

    const parts = raw.split(":");
    const host = parts[0]?.trim() || "127.0.0.1";
    const port = Number(parts[1]);
    if (!port) {
      setConnectStatusMsg({
        type: "error",
        text: lang === "en" ? "Enter in IP:Port format (e.g. 192.168.1.15:49160)" : "Informe no formato IP:Porta (ex: 192.168.1.15:49160)",
      });
      return;
    }

    try {
      await handleConnectByHostPort(host, port);
      setDirectIpInput("");
    } catch {}
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  };

  const handleSpawnSecondPeer = async () => {
    if (window.DiscordNative?.app?.spawnPeerInstance) {
      const nextId = Number(nodeStatus.instanceId || 1) + 1;
      await window.DiscordNative.app.spawnPeerInstance(nextId);
    }
  };

  // Automatic HTTP Wi-Fi Subnet Scanner for Android / Browser clients
  const scanLanForDesktopNodes = async () => {
    if (window.DiscordNative?.p2p) {
      window.DiscordNative.p2p.beaconNow();
      return;
    }
    if (isScanningLanHttp) return;
    setIsScanningLanHttp(true);

    try {
      const targetSubnets = new Set();
      // 1. Subnets from previously saved peers
      for (const sp of savedLanPeers || []) {
        const parts = String(sp?.host || "").split(".");
        if (parts.length === 4) {
          targetSubnets.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
        }
      }
      // 2. Common home Wi-Fi subnets (including 192.168.2.x, 192.168.1.x, 192.168.0.x, 192.168.15.x)
      ["192.168.2", "192.168.1", "192.168.0", "192.168.15", "192.168.3", "10.0.0"].forEach((s) =>
        targetSubnets.add(s)
      );

      const probeHost = async (ip, port = 49155) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 550);
        try {
          const res = await fetch(`http://${ip}:${port}/api/discover`, {
            method: "GET",
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (!res.ok) return null;
          const data = await res.json();
          if (data?.profile?.peerId && data.profile.peerId !== selfPeerIdRef.current) {
            const peerPort = Number(data.tcpPort || port);
            const peerObj = {
              ...data.profile,
              host: ip,
              tcpPort: peerPort,
              lastSeen: Date.now(),
              isConnected: connectedPeersRef.current.some(
                (cp) => cp.peerId === data.profile.peerId || cp.address === ip
              ),
            };
            setLanPeers((prev) => {
              const filtered = prev.filter((p) => p.peerId !== peerObj.peerId);
              return [peerObj, ...filtered];
            });

            // Auto-reconnect if this peer was previously paired & saved by the user!
            const savedList = (() => {
              try {
                return JSON.parse(localStorage.getItem("freecord_saved_lan_peers") || "[]");
              } catch {
                return [];
              }
            })();
            const isRemembered = savedList.some(
              (s) => s.peerId === peerObj.peerId || s.host === ip
            );
            if (
              isRemembered &&
              (!mobileWsRef.current || mobileWsRef.current.readyState !== 1)
            ) {
              connectViaWebSocket(ip, peerPort).catch(() => {});
            }
            return peerObj;
          }
        } catch {
          clearTimeout(timer);
        }
        return null;
      };

      // Probe saved hosts first on port 49155 and their remembered port
      const priorityTargets = [];
      for (const sp of savedLanPeers || []) {
        const candidateHosts = Array.from(
          new Set([sp?.host, ...(Array.isArray(sp?.addresses) ? sp.addresses : [])].filter(Boolean))
        );
        for (const h of candidateHosts) {
          priorityTargets.push([h, 49155]);
          if (sp.port && sp.port !== 49155) priorityTargets.push([h, sp.port]);
        }
      }
      await Promise.all(priorityTargets.map(([h, p]) => probeHost(h, p)));

      // Probe primary subnet IPs in fast batches of 36
      const primarySubnets = Array.from(targetSubnets).slice(0, 3);
      for (const subnet of primarySubnets) {
        const ips = [];
        for (let i = 1; i <= 254; i++) {
          ips.push(`${subnet}.${i}`);
        }
        const batchSize = 36;
        for (let idx = 0; idx < ips.length; idx += batchSize) {
          const batch = ips.slice(idx, idx + batchSize);
          await Promise.all(batch.map((ip) => probeHost(ip, 49155)));
        }
      }
    } finally {
      setIsScanningLanHttp(false);
    }
  };

  // Automatic Background Reconnection to Remembered Peers on Startup & Network Changes (Android / Browser)
  useEffect(() => {
    if (window.DiscordNative?.p2p) return;
    let cancelled = false;
    let isAttempting = false;

    const tryAutoReconnectSavedPeers = async (withFullSubnetScan = false) => {
      if (cancelled || isAttempting) return;
      if (mobileWsRef.current && mobileWsRef.current.readyState === 1) return;

      isAttempting = true;
      try {
        const saved = JSON.parse(localStorage.getItem("freecord_saved_lan_peers") || "[]");
        if (Array.isArray(saved) && saved.length > 0) {
          for (const sp of saved) {
            if (cancelled) break;
            if (mobileWsRef.current && mobileWsRef.current.readyState === 1) break;
            const rawHosts = Array.from(
              new Set([sp.host, ...(Array.isArray(sp.addresses) ? sp.addresses : [])].filter(Boolean))
            );
            const sortedEndpoints = sortEndpointsByLanPriority(
              rawHosts.map((h) => `${h}:${sp.port || 49155}`)
            );
            for (const ep of sortedEndpoints.slice(0, 4)) {
              const [cHost, cPortStr] = ep.split(":");
              const cPort = Number(cPortStr || sp.port || 49155);
              if (!cHost || !cPort) continue;
              try {
                await connectViaWebSocket(cHost, cPort);
                return;
              } catch {}
            }
          }
        }
        if (withFullSubnetScan && (!mobileWsRef.current || mobileWsRef.current.readyState !== 1)) {
          await scanLanForDesktopNodes();
        }
      } catch {
      } finally {
        isAttempting = false;
      }
    };

    const initialTimer = setTimeout(() => {
      tryAutoReconnectSavedPeers(true);
    }, 450);

    const intervalId = setInterval(() => {
      tryAutoReconnectSavedPeers(false);
    }, 6500);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, []);

  // Phase 1: Generate LAN Pairing QR Code when Connect Modal opens
  useEffect(() => {
    if (!showConnectModal) {
      stopQrCameraScanner();
      return;
    }
    if (!window.DiscordNative?.p2p) {
      scanLanForDesktopNodes();
    }
    const sortedConnStrings = sortEndpointsByLanPriority(nodeStatus.connectionStrings || []);
    const primaryEp =
      (selectedQrEndpoint && sortedConnStrings.includes(selectedQrEndpoint)
        ? selectedQrEndpoint
        : sortedConnStrings[0]) ||
      nodeStatus.localhostEndpoint ||
      (generatedInviteCode ? generatedInviteCode : "");

    if (sortedConnStrings[0] && !selectedQrEndpoint) {
      setSelectedQrEndpoint(sortedConnStrings[0]);
    }

    if (!primaryEp) {
      setLanQrDataUrl(null);
      return;
    }
    const qrPayload = primaryEp.startsWith("fc-sdp://")
      ? primaryEp
      : buildLanQrPayload(
          primaryEp,
          {
            ...nodeStatus.profile,
            cryptoPubKey: cryptoIdentity.publicKey,
          },
          sortedConnStrings
        );
    generateQrCodeDataUrl(qrPayload, 210).then((url) => {
      setLanQrDataUrl(url);
    });
  }, [
    showConnectModal,
    selectedQrEndpoint,
    nodeStatus.connectionStrings,
    nodeStatus.localhostEndpoint,
    nodeStatus.profile,
    generatedInviteCode,
    cryptoIdentity.publicKey,
  ]);

  const stopQrCameraScanner = () => {
    if (qrScanTimerRef.current) {
      clearInterval(qrScanTimerRef.current);
      qrScanTimerRef.current = null;
    }
    if (qrStreamRef.current) {
      qrStreamRef.current.getTracks().forEach((tr) => tr.stop());
      qrStreamRef.current = null;
    }
    setIsScanningQr(false);
  };

  const handleDecodedQrString = async (rawCode) => {
    stopQrCameraScanner();
    try {
      const parsed = parseScannedQrPayload(rawCode);
      if (parsed.kind === "lan") {
        const candidates =
          Array.isArray(parsed.candidates) && parsed.candidates.length > 0
            ? parsed.candidates
            : [`${parsed.host}:${parsed.port}`];

        let lastErr = null;
        let connected = false;
        for (const candidate of candidates) {
          const [cHost, cPortStr] = String(candidate).split(":");
          const cPort = Number(cPortStr || parsed.port || 49155);
          if (!cHost || !cPort) continue;
          setQrScanStatus({
            type: "info",
            text:
              lang === "en"
                ? `QR Scanned! Connecting to ${cHost}:${cPort}...`
                : `QR Lido! Conectando a ${cHost}:${cPort}...`,
          });
          try {
            await handleConnectByHostPort(cHost, cPort);
            setQrScanStatus({
              type: "success",
              text:
                lang === "en"
                  ? `Connected via QR Code to ${cHost}:${cPort}!`
                  : `Conectado via QR Code a ${cHost}:${cPort}!`,
            });
            connected = true;
            break;
          } catch (err) {
            lastErr = err;
          }
        }
        if (!connected && lastErr) {
          throw lastErr;
        }
      } else if (parsed.kind === "server-invite") {
        const clean = parsed.code.replace(/^fc-srv:\/\//i, "").trim();
        const decoded = JSON.parse(decodeURIComponent(escape(atob(clean))));
        if (decoded?.room?.id) {
          await handleJoinServerRoom(decoded.room, decoded.endpoint);
          setShowConnectModal(false);
        }
      } else if (parsed.kind === "webrtc-sdp") {
        setConnectTab("sdp");
        setIncomingInviteInput(parsed.code);
        setQrScanStatus({
          type: "success",
          text:
            lang === "en"
              ? "WebRTC SDP QR Code loaded! Click Process WebRTC Code."
              : "QR Code WebRTC SDP carregado! Clique em Processar Código WebRTC.",
        });
      }
      if (notificationsEnabledRef.current) {
        playSynthesizedUiSound("invite");
      }
    } catch (err) {
      setQrScanStatus({
        type: "error",
        text: err.message || (lang === "en" ? "Invalid QR Code" : "QR Code inválido"),
      });
    }
  };

  const startQrCameraScanner = async () => {
    setQrScanStatus(null);
    if (isScanningQr) {
      stopQrCameraScanner();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      qrStreamRef.current = stream;
      setIsScanningQr(true);

      setTimeout(() => {
        if (qrVideoRef.current) {
          qrVideoRef.current.srcObject = stream;
          qrVideoRef.current.play().catch(() => {});
        }
      }, 80);

      qrScanTimerRef.current = setInterval(() => {
        const video = qrVideoRef.current;
        const canvas = qrCanvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;
        const w = video.videoWidth || 320;
        const h = video.videoHeight || 240;
        if (!w || !h) return;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const decoded = decodeQrFromImageData(imageData);
        if (decoded) {
          handleDecodedQrString(decoded);
        }
      }, 150);
    } catch (err) {
      setQrScanStatus({
        type: "error",
        text:
          lang === "en"
            ? `Camera access error: ${err.message}`
            : `Erro ao acessar câmera: ${err.message}`,
      });
    }
  };

  const handleScanQrImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const decoded = decodeQrFromImageData(imgData);
        if (decoded) {
          handleDecodedQrString(decoded);
        } else {
          setQrScanStatus({
            type: "error",
            text:
              lang === "en"
                ? "No QR Code found in this image."
                : "Nenhum QR Code encontrado nesta imagem.",
          });
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleExportIdentityBackup = () => {
    try {
      const bundleStr = createIdentityBackupBundle({
        profile: nodeStatus.profile,
        cryptoIdentity,
        rooms,
        leftRoomIds,
        savedLanPeers,
      });
      const filename = `${nodeStatus.profile.username || "freecord"}-${nodeStatus.profile.tag || "id"}.freecord-id.json`;
      if (window.FreecordAndroid?.saveTextFile) {
        const savedOk = window.FreecordAndroid.saveTextFile(
          filename,
          bundleStr,
          "application/json"
        );
        if (savedOk) {
          setIdentityBackupStatus({
            type: "success",
            text:
              lang === "en"
                ? `Identity backup saved to Downloads/${filename}!`
                : `Backup salvo na pasta Downloads (${filename})!`,
          });
          return;
        }
      }
      const blob = new Blob([bundleStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIdentityBackupStatus({
        type: "success",
        text:
          lang === "en"
            ? "Identity backup (.freecord-id.json) exported successfully!"
            : "Backup de identidade (.freecord-id.json) exportado com sucesso!",
      });
    } catch (err) {
      setIdentityBackupStatus({ type: "error", text: err.message });
    }
  };

  const handleImportIdentityBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const restored = parseIdentityBackupBundle(reader.result);
        if (restored.cryptoIdentity) {
          setCryptoIdentity(restored.cryptoIdentity);
        }
        if (restored.profile) {
          setProfileForm((prev) => ({ ...prev, ...restored.profile }));
          if (window.DiscordNative?.p2p) {
            const updated = await window.DiscordNative.p2p.updateProfile(restored.profile);
            if (updated) setNodeStatus((prev) => ({ ...prev, profile: updated }));
          } else {
            const deviceId = getOrCreateDeviceNodeId();
            let uniquePeerId = restored.profile.peerId || `fc_${deviceId}`;
            if (!uniquePeerId.includes(`_${deviceId}`)) {
              const base = uniquePeerId.split("_dev_")[0];
              uniquePeerId = `${base}_dev_${deviceId}`;
            }
            const mergedProfile = {
              ...nodeStatus.profile,
              ...restored.profile,
              peerId: uniquePeerId,
            };
            setNodeStatus((prev) => ({
              ...prev,
              profile: mergedProfile,
            }));
            try {
              localStorage.setItem("freecord_web_profile", JSON.stringify(mergedProfile));
            } catch {}
            sendP2PPacket({
              type: "PROFILE_UPDATE",
              profile: mergedProfile,
            });
          }
        }
        if (Array.isArray(restored.rooms) && restored.rooms.length > 0) {
          setRooms(restored.rooms);
        }
        if (Array.isArray(restored.savedLanPeers)) {
          setSavedLanPeers(restored.savedLanPeers);
          localStorage.setItem(
            "freecord_saved_lan_peers",
            JSON.stringify(restored.savedLanPeers)
          );
        }
        setIdentityBackupStatus({
          type: "success",
          text:
            lang === "en"
              ? "Identity, E2EE keys, and servers restored!"
              : "Identidade, chaves E2EE e servidores restaurados com sucesso!",
        });
      } catch (err) {
        setIdentityBackupStatus({
          type: "error",
          text:
            lang === "en"
              ? `Failed to restore backup: ${err.message}`
              : `Falha ao restaurar backup: ${err.message}`,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const openServerStudio = (mode = "edit", targetRoom = currentRoom) => {
    setServerStudioMode(mode);
    if (mode === "create" || !targetRoom) {
      const now = Date.now();
      setServerForm({
        id: `room_${now}`,
        name: "New P2P Server",
        shortName: "P2P",
        serverTag: "MESH",
        description: "Direct peer-to-peer serverless community.",
        color: "#5865f2",
        iconUrl: null,
        bannerColor: "#5865f2",
        bannerSecondaryColor: "#9b59b6",
        bannerUrl: null,
        sidebarBgColor: "#2b2d31",
        textChannels: [
          { id: `ch_${now}_general`, name: "general", topic: "Main P2P text channel" },
        ],
        voiceChannels: [
          { id: `vc_${now}_voice`, name: "Main P2P Voice" },
        ],
      });
    } else {
      setServerForm({
        id: targetRoom.id,
        name: targetRoom.name || "P2P Server",
        shortName: targetRoom.shortName || "FC",
        serverTag: targetRoom.serverTag || "P2P",
        description: targetRoom.description || "",
        color: targetRoom.color || "#5865f2",
        iconUrl: targetRoom.iconUrl || null,
        bannerColor: targetRoom.bannerColor || targetRoom.color || "#5865f2",
        bannerSecondaryColor: targetRoom.bannerSecondaryColor || "#9b59b6",
        bannerUrl: targetRoom.bannerUrl || null,
        sidebarBgColor: targetRoom.sidebarBgColor || "#2b2d31",
        textChannels: Array.isArray(targetRoom.textChannels)
          ? targetRoom.textChannels.map((c) => ({ ...c }))
          : [],
        voiceChannels: Array.isArray(targetRoom.voiceChannels)
          ? targetRoom.voiceChannels.map((c) => ({ ...c }))
          : [],
      });
    }
    setShowServerStudio(true);
  };

  const handleSaveServerStudio = (e) => {
    e?.preventDefault();
    const cleanName = serverForm.name.trim() || "P2P Server";
    const words = cleanName.split(/\s+/);
    const fallbackShort =
      words.length > 1
        ? (words[0][0] + words[1][0]).toUpperCase()
        : cleanName.slice(0, 2).toUpperCase();

    const sanitizedRoom = {
      ...serverForm,
      name: cleanName,
      shortName: (serverForm.shortName.trim() || fallbackShort).slice(0, 4),
      serverTag: (serverForm.serverTag.trim() || "P2P").slice(0, 8).toUpperCase(),
      description: serverForm.description.trim(),
      textChannels:
        serverForm.textChannels.length > 0
          ? serverForm.textChannels
          : [{ id: `ch_${Date.now()}_gen`, name: "general", topic: "Main P2P channel" }],
      voiceChannels:
        serverForm.voiceChannels.length > 0
          ? serverForm.voiceChannels
          : [{ id: `vc_${Date.now()}_voice`, name: "P2P Voice" }],
      updatedAt: Date.now(),
    };

    let updatedRooms;
    if (serverStudioMode === "create" || !rooms.some((r) => r.id === sanitizedRoom.id)) {
      updatedRooms = [...rooms, sanitizedRoom];
    } else {
      updatedRooms = rooms.map((r) => (r.id === sanitizedRoom.id ? sanitizedRoom : r));
    }

    setRooms(updatedRooms);
    setSelectedRoomId(sanitizedRoom.id);
    if (
      !sanitizedRoom.textChannels.some((c) => c.id === selectedChannelId) &&
      sanitizedRoom.textChannels[0]
    ) {
      setSelectedChannelId(sanitizedRoom.textChannels[0].id);
    }
    setShowServerStudio(false);
    sendP2PPacket({ type: "ROOM_SYNC", rooms: updatedRooms });
  };

  const handleDeleteServer = (roomId) => {
    handleLeaveServer(roomId);
  };

  const handleLeaveServer = (roomId) => {
    if (!roomId) return;
    const target = rooms.find((r) => r.id === roomId);
    if (
      target &&
      activeVoiceChannelId &&
      (target.voiceChannels || []).some((vc) => vc.id === activeVoiceChannelId)
    ) {
      handleLeaveVoiceChannel();
    }

    setLeftRoomIds((prev) => (prev.includes(roomId) ? prev : [...prev, roomId]));
    const remaining = rooms.filter((r) => r.id !== roomId);
    setRooms(remaining);

    if (selectedRoomId === roomId) {
      if (remaining[0]) {
        setSelectedRoomId(remaining[0].id);
        if (remaining[0].textChannels?.[0]) {
          setSelectedChannelId(remaining[0].textChannels[0].id);
        }
      } else {
        setSelectedRoomId("dm_hub");
        setSelectedDmPeerId(null);
      }
    }
    setShowServerStudio(false);
  };

  const openInviteServerModal = (targetRoom = currentRoom) => {
    if (!targetRoom) return;
    setInviteTargetRoom(targetRoom);
    setSentInvitePeers({});
    setJoinServerStatusMsg(null);
    setShowInviteModal(true);
  };

  const buildServerInviteCode = (roomObj) => {
    if (!roomObj) return "";
    const endpoint =
      nodeStatus.connectionStrings?.[0] || nodeStatus.localhostEndpoint || "";
    const compactRoom = {
      id: roomObj.id,
      name: roomObj.name,
      shortName: roomObj.shortName,
      serverTag: roomObj.serverTag,
      description: roomObj.description,
      color: roomObj.color,
      iconUrl:
        roomObj.iconUrl && roomObj.iconUrl.length < 40000 ? roomObj.iconUrl : null,
      bannerColor: roomObj.bannerColor,
      bannerSecondaryColor: roomObj.bannerSecondaryColor,
      sidebarBgColor: roomObj.sidebarBgColor,
      textChannels: roomObj.textChannels || [],
      voiceChannels: roomObj.voiceChannels || [],
      updatedAt: roomObj.updatedAt || Date.now(),
    };
    try {
      const payload = JSON.stringify({ endpoint, room: compactRoom });
      return `fc-srv://${btoa(unescape(encodeURIComponent(payload)))}`;
    } catch {
      return "";
    }
  };

  const handleSendServerInviteToPeer = (peer, roomObj = inviteTargetRoom || currentRoom) => {
    if (!peer?.peerId || !roomObj) return;
    const sorted = [nodeStatus.profile.peerId, peer.peerId].sort().join("__");
    const dmChId = `dm_${sorted}`;
    const hostEndpoint =
      nodeStatus.connectionStrings?.[0] || nodeStatus.localhostEndpoint || "";

    const inviteMsg = {
      id: `msg_inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      channelId: dmChId,
      author: buildAuthorSnapshot(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: `🏰 **${roomObj.name}** — ${
        lang === "pt"
          ? `Convite para entrar no servidor P2P!`
          : `You've been invited to join this P2P server!`
      }`,
      serverInvite: {
        room: roomObj,
        hostEndpoint,
        inviter: buildAuthorSnapshot(),
      },
      reactions: {},
    };

    setMessages((prev) => [...prev, inviteMsg]);
    sendP2PPacket({ type: "CHAT_MESSAGE", message: inviteMsg }, peer.peerId);
    setSentInvitePeers((prev) => ({ ...prev, [peer.peerId]: true }));
  };

  const handleJoinServerRoom = async (roomSnapshot, hostEndpoint = null) => {
    if (!roomSnapshot?.id) return;

    if (hostEndpoint && window.DiscordNative?.p2p) {
      const parts = String(hostEndpoint).split(":");
      const host = parts[0]?.trim();
      const port = Number(parts[1]);
      if (host && port && port !== Number(nodeStatus.tcpPort)) {
        try {
          await window.DiscordNative.p2p.connect(host, port);
        } catch {}
      }
    }

    setLeftRoomIds((prev) => prev.filter((id) => id !== roomSnapshot.id));
    setRooms((prev) => {
      const exists = prev.some((r) => r.id === roomSnapshot.id);
      const next = exists
        ? prev.map((r) => (r.id === roomSnapshot.id ? { ...r, ...roomSnapshot } : r))
        : [...prev, roomSnapshot];
      sendP2PPacket({ type: "ROOM_SYNC", rooms: next });
      return next;
    });

    setSelectedRoomId(roomSnapshot.id);
    if (roomSnapshot.textChannels?.[0]?.id) {
      setSelectedChannelId(roomSnapshot.textChannels[0].id);
    }
    setShowInviteModal(false);
    if (notificationsEnabledRef.current) {
      playSynthesizedUiSound("invite");
    }
  };

  const handleRedeemServerInviteCode = async (e) => {
    e?.preventDefault();
    const raw = joinServerCodeInput.trim();
    if (!raw) return;
    try {
      const clean = raw.replace(/^fc-srv:\/\//i, "").trim();
      const decoded = JSON.parse(decodeURIComponent(escape(atob(clean))));
      if (!decoded?.room?.id) {
        throw new Error(lang === "pt" ? "Código de convite inválido." : "Invalid server invite code.");
      }
      await handleJoinServerRoom(decoded.room, decoded.endpoint);
      setJoinServerCodeInput("");
      setJoinServerStatusMsg({
        type: "success",
        text:
          lang === "pt"
            ? `Você entrou no servidor ${decoded.room.name}!`
            : `Joined server ${decoded.room.name}!`,
      });
    } catch (err) {
      setJoinServerStatusMsg({
        type: "error",
        text: err.message || (lang === "pt" ? "Código inválido" : "Invalid invite code"),
      });
    }
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    const name = newRoomName.trim();
    if (!name) return;
    const words = name.split(/\s+/);
    const shortName =
      words.length > 1
        ? (words[0][0] + words[1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
    const newRoom = {
      id: `room_${Date.now()}`,
      name,
      shortName,
      serverTag: "P2P",
      description: `Comunidade P2P ${name}`,
      color: "#5865f2",
      iconUrl: null,
      bannerColor: "#5865f2",
      bannerSecondaryColor: "#9b59b6",
      bannerUrl: null,
      sidebarBgColor: "#2b2d31",
      updatedAt: Date.now(),
      textChannels: [
        { id: `ch_${Date.now()}_general`, name: "general", topic: `Main P2P channel for ${name}` },
      ],
      voiceChannels: [
        { id: `vc_${Date.now()}_voice`, name: "P2P Voice" },
      ],
    };
    const updated = [...rooms, newRoom];
    setRooms(updated);
    setSelectedRoomId(newRoom.id);
    setSelectedChannelId(newRoom.textChannels[0].id);
    setShowNewRoomModal(false);
    setNewRoomName("");
    sendP2PPacket({ type: "ROOM_SYNC", rooms: updated });
  };

  const handleCreateChannel = (e) => {
    e.preventDefault();
    const rawName = newChannelName.trim();
    if (!rawName || !currentRoom) return;
    const cleanName = newChannelType === "text" ? rawName.toLowerCase().replace(/\s+/g, "-") : rawName;
    const newCh = {
      id: `${newChannelType === "text" ? "ch" : "vc"}_${Date.now()}`,
      name: cleanName,
      topic: "Synchronized P2P channel",
    };

    const updated = rooms.map((r) => {
      if (r.id !== currentRoom.id) return r;
      return newChannelType === "text"
        ? { ...r, updatedAt: Date.now(), textChannels: [...r.textChannels, newCh] }
        : { ...r, updatedAt: Date.now(), voiceChannels: [...r.voiceChannels, newCh] };
    });

    setRooms(updated);
    if (newChannelType === "text") {
      setSelectedChannelId(newCh.id);
    }
    setShowNewChannelModal(false);
    setNewChannelName("");
    sendP2PPacket({ type: "ROOM_SYNC", rooms: updated });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const sanitized = {
      ...profileForm,
      displayName: profileForm.displayName.trim() || profileForm.username.trim() || "Peer",
      username: (profileForm.username.trim() || "peer").toLowerCase().replace(/\s+/g, "_"),
      tag: (profileForm.tag.trim() || "0001").slice(0, 6),
    };

    if (window.DiscordNative?.p2p) {
      const updated = await window.DiscordNative.p2p.updateProfile(sanitized);
      if (updated) {
        setNodeStatus((prev) => ({ ...prev, profile: updated }));
      }
    } else {
      const mergedProfile = { ...nodeStatus.profile, ...sanitized };
      setNodeStatus((prev) => ({
        ...prev,
        profile: mergedProfile,
      }));
      try {
        localStorage.setItem("freecord_web_profile", JSON.stringify(mergedProfile));
      } catch {}
      sendP2PPacket({
        type: "PROFILE_UPDATE",
        profile: mergedProfile,
      });
    }
    setShowProfileModal(false);
  };

  const peersInVoiceChannel = (vcId) => {
    const list = [];
    if (activeVoiceChannelId === vcId) {
      list.push({
        ...nodeStatus.profile,
        displayName: `${nodeStatus.profile.displayName || nodeStatus.profile.username} ${t.youSuffix}`,
        isSelf: true,
        speaking: Boolean(speakingMap[nodeStatus.profile.peerId]),
        screenSharing,
        videoEnabled,
        muted: selfMute,
        deafened: selfDeafen,
      });
    }
    for (const p of connectedPeers) {
      if (p.voiceChannelId === vcId) {
        list.push({
          ...p,
          displayName: p.displayName || p.username,
          isSelf: false,
          speaking: Boolean(activeVoiceChannelId === vcId && speakingMap[p.peerId]),
          screenSharing: Boolean(p.voiceState?.screenSharing),
          videoEnabled: Boolean(p.voiceState?.videoEnabled),
          muted: Boolean(p.voiceState?.muted),
          deafened: Boolean(p.voiceState?.deafened),
        });
      }
    }
    return list;
  };

  const activeTyping = typingPeers[effectiveChannelId];

  // Build simultaneous stage tiles: separate tiles for Screen Share and Webcam so both can be viewed at once
  const stageTiles = useMemo(() => {
    const tiles = [];

    // 1. Local Go Live Screen Share Tile (if active)
    if (screenSharing && (localScreenStream || localScreenFrameUrl)) {
      tiles.push({
        id: "self_screen",
        peerId: nodeStatus.profile.peerId,
        isSelf: true,
        kind: "screen",
        stream: localScreenStream,
        frameUrl: localScreenFrameUrl,
        profile: nodeStatus.profile,
        label: `${selfDisplayName} ${t.youSuffix}`,
        badge: `${t.screenBadge} • ${screenResolution.toUpperCase()} ${screenFps}FPS`,
        speaking: false,
      });
    }

    // 2. Local Webcam / Avatar Tile (always separate from Screen Share so both show simultaneously)
    const hasSelfCam = Boolean(videoEnabled && localCameraStream);
    const isSelfCamHidden = Boolean(
      hasSelfCam && (hideAllWebcams || hiddenWebcamsMap[nodeStatus.profile.peerId])
    );
    tiles.push({
      id: "self_camera",
      peerId: nodeStatus.profile.peerId,
      isSelf: true,
      kind: "camera",
      hasCameraFeed: hasSelfCam,
      webcamHidden: isSelfCamHidden,
      stream: hasSelfCam && !isSelfCamHidden ? localCameraStream : null,
      profile: nodeStatus.profile,
      label: `${selfDisplayName} ${t.youSuffix}`,
      badge: hasSelfCam ? (isSelfCamHidden ? t.webcamHiddenBadge : t.cameraBadge) : null,
      speaking: Boolean(speakingMap[nodeStatus.profile.peerId]),
    });

    // 3. Remote Connected Peers (separate Screen Share tile + Webcam/Avatar tile per peer)
    const activePeersOnStage = connectedPeers.filter(
      (p) =>
        p.voiceChannelId === activeVoiceChannelId ||
        (outgoingDmCall && outgoingDmCall.peer?.peerId === p.peerId)
    );
    for (const peer of activePeersOnStage) {
      const isCallPending =
        outgoingDmCall &&
        outgoingDmCall.peer?.peerId === peer.peerId &&
        peer.voiceChannelId !== activeVoiceChannelId;

      const peerMedia = remoteStreams[peer.peerId];
      const isMediaBundle =
        peerMedia &&
        typeof peerMedia === "object" &&
        !(peerMedia instanceof MediaStream);

      const peerScreenStream = isMediaBundle
        ? peerMedia.screenStream
        : peer.voiceState?.screenSharing && peerMedia instanceof MediaStream
        ? peerMedia
        : null;

      const peerCameraStream = isMediaBundle
        ? peerMedia.cameraStream
        : !peer.voiceState?.screenSharing &&
          peerMedia instanceof MediaStream &&
          peerMedia.getVideoTracks().length > 0
        ? peerMedia
        : null;

      const peerScreenFrameUrl =
        isMediaBundle && peer.voiceState?.screenSharing !== false
          ? peerMedia.screenFrameUrl
          : null;

      const peerCameraFrameUrl =
        isMediaBundle && peer.voiceState?.videoEnabled !== false
          ? peerMedia.cameraFrameUrl
          : null;

      const hasRemoteScreen =
        (peerScreenStream && peerScreenStream.getVideoTracks().length > 0) ||
        Boolean(peerScreenFrameUrl);

      const hasRemoteCamera =
        (peerCameraStream && peerCameraStream.getVideoTracks().length > 0) ||
        Boolean(peerCameraFrameUrl);

      const isPeerCamHidden = Boolean(
        hasRemoteCamera && (hideAllWebcams || hiddenWebcamsMap[peer.peerId])
      );

      const peerName = peer.displayName || peer.username;

      if (hasRemoteScreen) {
        const remoteRes = (isMediaBundle && peerMedia.screenResolution) || "1080p";
        const remoteFps = (isMediaBundle && peerMedia.screenFrameRate) || 30;
        tiles.push({
          id: `${peer.peerId}_screen`,
          peerId: peer.peerId,
          isSelf: false,
          kind: "screen",
          stream:
            peerScreenStream && peerScreenStream.getVideoTracks().length > 0
              ? peerScreenStream
              : null,
          frameUrl: peerScreenFrameUrl,
          profile: peer,
          label: peerName,
          badge: `${t.screenBadge} • ${String(remoteRes).toUpperCase()} ${remoteFps}FPS`,
          speaking: false,
        });
      }

      tiles.push({
        id: `${peer.peerId}_camera`,
        peerId: peer.peerId,
        isSelf: false,
        kind: "camera",
        hasCameraFeed: hasRemoteCamera,
        webcamHidden: isPeerCamHidden,
        stream:
          !isPeerCamHidden &&
          peerCameraStream &&
          peerCameraStream.getVideoTracks().length > 0
            ? peerCameraStream
            : null,
        frameUrl: !isPeerCamHidden ? peerCameraFrameUrl : null,
        profile: peer,
        label: peerName,
        badge: isCallPending
          ? "📞 Chamando..."
          : hasRemoteCamera
          ? isPeerCamHidden
            ? t.webcamHiddenBadge
            : t.cameraBadge
          : peer.voiceState?.screenSharing && !hasRemoteScreen
          ? t.liveBadge
          : null,
        speaking: Boolean(!isCallPending && speakingMap[peer.peerId]),
      });
    }

    return tiles;
  }, [
    activeVoiceChannelId,
    outgoingDmCall,
    screenSharing,
    localScreenStream,
    localScreenFrameUrl,
    videoEnabled,
    localCameraStream,
    nodeStatus.profile,
    selfDisplayName,
    screenResolution,
    screenFps,
    speakingMap,
    connectedPeers,
    remoteStreams,
    hideAllWebcams,
    hiddenWebcamsMap,
    lang,
  ]);

  const hasAnyActiveWebcam = useMemo(
    () => stageTiles.some((tItem) => tItem.kind === "camera" && tItem.hasCameraFeed),
    [stageTiles]
  );

  // Automatically spotlight a remote screen share when it starts if nothing is currently spotlighted
  useEffect(() => {
    const remoteScreenTile = stageTiles.find(
      (tItem) => !tItem.isSelf && tItem.kind === "screen" && (tItem.stream || tItem.frameUrl)
    );
    if (remoteScreenTile && !spotlightTileId) {
      setSpotlightTileId(remoteScreenTile.id);
    } else if (
      spotlightTileId &&
      !stageTiles.some((tItem) => tItem.id === spotlightTileId)
    ) {
      setSpotlightTileId(null);
    }
  }, [stageTiles, spotlightTileId]);

  const activeSpotlightTile = useMemo(
    () => stageTiles.find((tile) => tile.id === spotlightTileId) || null,
    [stageTiles, spotlightTileId]
  );

  const activeFullscreenTile = useMemo(
    () => stageTiles.find((tile) => tile.id === fullscreenTileId) || null,
    [stageTiles, fullscreenTileId]
  );

  const activeInAppPipTile = useMemo(() => {
    if (inAppPipTileId) {
      const found = stageTiles.find((tile) => tile.id === inAppPipTileId);
      if (found && (found.stream || found.frameUrl)) return found;
    }
    return (
      stageTiles.find((tile) => tile.kind === "screen" && (tile.stream || tile.frameUrl)) ||
      stageTiles.find((tile) => tile.kind === "camera" && (tile.stream || tile.frameUrl)) ||
      null
    );
  }, [stageTiles, inAppPipTileId]);

  // Find an active webcam stream to display in the floating PiP overlay when a Screen Share is spotlighted
  const activeWebcamTileForPip = useMemo(() => {
    if (!activeSpotlightTile || activeSpotlightTile.kind !== "screen") return null;
    // Prefer the webcam of the same user who is sharing their screen, or any active webcam
    const samePeerCam = stageTiles.find(
      (tItem) =>
        tItem.kind === "camera" &&
        tItem.peerId === activeSpotlightTile.peerId &&
        (tItem.stream || tItem.frameUrl)
    );
    if (samePeerCam) return samePeerCam;
    return (
      stageTiles.find(
        (tItem) => tItem.kind === "camera" && (tItem.stream || tItem.frameUrl)
      ) || null
    );
  }, [activeSpotlightTile, stageTiles]);

  const renderStageTile = (tile, isSpotlight = false) => {
    const fitMode = tileFitMap[tile.id] || "contain";
    const zoom = tileZoomMap[tile.id] || 1;
    const videoDomId = `freecord_video_${tile.id}`;
    const isScreenTile = tile.kind === "screen";
    const voiceVol = peerVolumes[tile.peerId] ?? 100;
    const screenVol = peerScreenVolumes[tile.peerId] ?? 100;
    const hasVisualMedia = Boolean(tile.stream || tile.frameUrl);

    return (
      <div
        key={tile.id}
        id={`tile_box_${tile.id}`}
        className={`video-tile ${tile.speaking ? "speaking" : ""} ${
          isSpotlight ? "spotlight-tile" : ""
        }`}
        onClick={() =>
          setSpotlightTileId((prev) => (prev === tile.id ? null : tile.id))
        }
        onDoubleClick={() =>
          setSpotlightTileId((prev) => (prev === tile.id ? null : tile.id))
        }
      >
        {hasVisualMedia ? (
          <VideoStreamView
            videoId={videoDomId}
            stream={tile.stream}
            frameUrl={tile.frameUrl}
            muted={true}
            fitMode={fitMode}
            zoom={zoom}
            onNeedKeyframe={
              !tile.isSelf
                ? () => voiceEngineRef.current?.requestKeyFrame(tile.peerId, tile.kind)
                : undefined
            }
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <UserAvatar
              profile={tile.profile}
              speaking={tile.speaking}
              onClick={() => setInspectedProfile(tile.profile)}
              style={{
                width: isSpotlight ? 96 : 68,
                height: isSpotlight ? 96 : 68,
                fontSize: isSpotlight ? 32 : 24,
              }}
            />
            {tile.webcamHidden && (
              <button
                type="button"
                className="tile-ctrl-btn active"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePeerWebcamHidden(tile.peerId);
                }}
                title={t.showWebcamBtn}
              >
                <Video size={12} />
                <span>{t.showWebcamBtn}</span>
              </button>
            )}
          </div>
        )}

        {/* Top-Right Hover Controls: Spotlight/Focus, Hide/Show Webcam, Fit/Fill, Zoom, PiP, Fullscreen */}
        <div className="video-tile-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`tile-ctrl-btn ${spotlightTileId === tile.id ? "active" : ""}`}
            onClick={() =>
              setSpotlightTileId((prev) => (prev === tile.id ? null : tile.id))
            }
            title={spotlightTileId === tile.id ? t.unspotlightBtn : t.spotlightBtn}
          >
            {spotlightTileId === tile.id ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span>{spotlightTileId === tile.id ? t.unspotlightBtn : t.spotlightBtn}</span>
          </button>

          {tile.kind === "camera" && tile.hasCameraFeed && (
            <button
              type="button"
              className={`tile-ctrl-btn ${tile.webcamHidden ? "active" : ""}`}
              onClick={() => togglePeerWebcamHidden(tile.peerId)}
              title={tile.webcamHidden ? t.showWebcamBtn : t.hideWebcamBtn}
            >
              {tile.webcamHidden ? <Video size={12} /> : <VideoOff size={12} />}
              <span>{tile.webcamHidden ? t.showWebcamBtn : t.hideWebcamBtn}</span>
            </button>
          )}

          {hasVisualMedia && (
            <>
              <button
                type="button"
                className={`tile-ctrl-btn ${fitMode === "cover" ? "active" : ""}`}
                onClick={() =>
                  setTileFitMap((prev) => ({
                    ...prev,
                    [tile.id]: fitMode === "contain" ? "cover" : "contain",
                  }))
                }
                title={`${t.fitContainBtn} / ${t.fitCoverBtn}`}
              >
                <span>{fitMode === "contain" ? t.fitCoverBtn : t.fitContainBtn}</span>
              </button>

              <button
                type="button"
                className={`tile-ctrl-btn ${zoom > 1 ? "active" : ""}`}
                onClick={() => {
                  const steps = [1, 1.25, 1.5, 2];
                  const nextZoom = steps[(steps.indexOf(zoom) + 1) % steps.length] || 1;
                  setTileZoomMap((prev) => ({ ...prev, [tile.id]: nextZoom }));
                }}
                title="Zoom"
              >
                <ZoomIn size={12} />
                <span>{Math.round(zoom * 100)}%</span>
              </button>

              <button
                type="button"
                className={`tile-ctrl-btn ${inAppPipTileId === tile.id ? "active" : ""}`}
                onClick={() => handleToggleTilePiP(tile, videoDomId)}
                title={t.pipBtn}
              >
                <PictureInPicture2 size={12} />
                <span>PiP</span>
              </button>

              {isScreenTile && activeWebcamTileForPip && (
                <button
                  type="button"
                  className={`tile-ctrl-btn ${showWebcamPipOverlay ? "active" : ""}`}
                  onClick={() => setShowWebcamPipOverlay((prev) => !prev)}
                  title={
                    showWebcamPipOverlay
                      ? lang === "pt"
                        ? "Ocultar Câmera Sobreposta"
                        : "Hide Overlay Webcam"
                      : lang === "pt"
                      ? "Mostrar Câmera Sobreposta"
                      : "Show Overlay Webcam"
                  }
                >
                  <PictureInPicture2 size={12} />
                  <span>
                    {showWebcamPipOverlay
                      ? lang === "pt"
                        ? "Ocultar Câmera"
                        : "Hide Cam"
                      : lang === "pt"
                      ? "Mostrar Câmera"
                      : "Show Cam"}
                  </span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            className={`tile-ctrl-btn ${fullscreenTileId === tile.id ? "active" : ""}`}
            onClick={() => handleToggleTileFullscreen(tile)}
            title={t.tileFullscreenBtn}
          >
            {fullscreenTileId === tile.id ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span>{lang === "en" ? "Full" : "Tela Cheia"}</span>
          </button>
        </div>

        {/* Floating Webcam Picture-in-Picture Overlay when viewing a Screen Share in Spotlight/Fullscreen */}
        {isSpotlight &&
          showWebcamPipOverlay &&
          activeWebcamTileForPip &&
          (activeWebcamTileForPip.stream || activeWebcamTileForPip.frameUrl) && (
            <div
              className="floating-webcam-pip"
              style={{ width: webcamPipWidth }}
              onClick={(e) => e.stopPropagation()}
            >
              <VideoStreamView
                stream={activeWebcamTileForPip.stream}
                frameUrl={activeWebcamTileForPip.frameUrl}
                muted={true}
                fitMode="cover"
                onNeedKeyframe={
                  !activeWebcamTileForPip.isSelf
                    ? () =>
                        voiceEngineRef.current?.requestKeyFrame(
                          activeWebcamTileForPip.peerId,
                          activeWebcamTileForPip.kind
                        )
                    : undefined
                }
              />
              <div className="floating-webcam-pip-label">
                📷 {activeWebcamTileForPip.label}
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  display: "flex",
                  gap: 3,
                }}
              >
                {[180, 240, 320].map((w, idx) => (
                  <button
                    key={w}
                    type="button"
                    className={`tile-ctrl-btn ${webcamPipWidth === w ? "active" : ""}`}
                    style={{ padding: "2px 5px", fontSize: 9 }}
                    onClick={() => setWebcamPipWidth(w)}
                  >
                    {["P", "M", "G"][idx]}
                  </button>
                ))}
                <button
                  type="button"
                  className="tile-ctrl-btn"
                  style={{ padding: "2px 5px", fontSize: 9 }}
                  onClick={() => togglePeerWebcamHidden(activeWebcamTileForPip.peerId)}
                  title={t.hideWebcamBtn}
                >
                  <VideoOff size={10} />
                </button>
                <button
                  type="button"
                  className="tile-ctrl-btn"
                  style={{ padding: "2px 5px", fontSize: 9 }}
                  onClick={() => setShowWebcamPipOverlay(false)}
                  title={
                    lang === "pt"
                      ? "Remover câmera sobreposta da transmissão"
                      : "Remove overlay webcam from stream"
                  }
                >
                  <X size={10} />
                </button>
              </div>
            </div>
          )}

        {/* Bottom Overlay: Name, Badge & Independent Voice / Stream Audio Mixers */}
        <div className="video-tile-overlay" style={{ pointerEvents: "auto" }}>
          <span className="video-tile-name">
            {tile.label}
            {tile.badge && <span className="live-badge">{tile.badge}</span>}
          </span>

          {!tile.isSelf && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isScreenTile ? (
                <>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: "#e2e8f0",
                      background: "rgba(0,0,0,0.45)",
                      padding: "2px 6px",
                      borderRadius: 6,
                    }}
                    title={
                      lang === "pt"
                        ? `Volume da Transmissão (${tile.label}): ${screenVol}%`
                        : `Stream Volume (${tile.label}): ${screenVol}%`
                    }
                  >
                    <span>🖥️</span>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={screenVol}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setPeerScreenVolumes((prev) => ({ ...prev, [tile.peerId]: v }));
                        voiceEngineRef.current?.setLocalScreenVolume(tile.peerId, v);
                      }}
                      style={{ width: 72, cursor: "pointer" }}
                    />
                    <span style={{ minWidth: 30, textAlign: "right", fontSize: 10 }}>
                      {screenVol}%
                    </span>
                  </label>

                  {isSpotlight && (
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        color: "#e2e8f0",
                        background: "rgba(0,0,0,0.45)",
                        padding: "2px 6px",
                        borderRadius: 6,
                      }}
                      title={
                        lang === "pt"
                          ? `Volume da Voz (${tile.label}): ${voiceVol}%`
                          : `Voice Volume (${tile.label}): ${voiceVol}%`
                      }
                    >
                      <Volume2 size={12} color="#94a3b8" />
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={voiceVol}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setPeerVolumes((prev) => ({ ...prev, [tile.peerId]: v }));
                          voiceEngineRef.current?.setLocalVolume(tile.peerId, v);
                        }}
                        style={{ width: 72, cursor: "pointer" }}
                      />
                      <span style={{ minWidth: 30, textAlign: "right", fontSize: 10 }}>
                        {voiceVol}%
                      </span>
                    </label>
                  )}
                </>
              ) : (
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    color: "#e2e8f0",
                    background: "rgba(0,0,0,0.45)",
                    padding: "2px 6px",
                    borderRadius: 6,
                  }}
                  title={
                    lang === "pt"
                      ? `Volume da Voz (${tile.label}): ${voiceVol}%`
                      : `Voice Volume (${tile.label}): ${voiceVol}%`
                  }
                >
                  <Volume2 size={12} color="#94a3b8" />
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={voiceVol}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setPeerVolumes((prev) => ({ ...prev, [tile.peerId]: v }));
                      voiceEngineRef.current?.setLocalVolume(tile.peerId, v);
                    }}
                    style={{ width: 72, cursor: "pointer" }}
                  />
                  <span style={{ minWidth: 30, textAlign: "right", fontSize: 10 }}>
                    {voiceVol}%
                  </span>
                </label>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const totalDmUnread = useMemo(() => {
    let sum = 0;
    for (const [k, v] of Object.entries(unreadCounts)) {
      if (k.startsWith("dm_")) sum += v;
    }
    return sum;
  }, [unreadCounts]);

  const totalServerUnread = useMemo(() => {
    let sum = 0;
    for (const [k, v] of Object.entries(unreadCounts)) {
      if (!k.startsWith("dm_")) sum += v;
    }
    return sum;
  }, [unreadCounts]);

  const activeVoiceChannelObj = useMemo(() => {
    if (!activeVoiceChannelId) return null;
    for (const room of rooms) {
      const found = room.voiceChannels?.find((v) => v.id === activeVoiceChannelId);
      if (found) return found;
    }
    if (activeVoiceChannelId.startsWith("dm_call_")) {
      const parts = activeVoiceChannelId.replace("dm_call_", "").split("__");
      const otherPeerId = parts.find((p) => p !== nodeStatus.profile.peerId);
      const otherPeer = connectedPeers.find((p) => p.peerId === otherPeerId);
      return {
        id: activeVoiceChannelId,
        name: otherPeer ? (otherPeer.displayName || otherPeer.username) : "P2P Call",
      };
    }
    return null;
  }, [activeVoiceChannelId, rooms, nodeStatus.profile.peerId, connectedPeers]);

  const selectedDmPeer = useMemo(() => {
    if (!selectedDmPeerId) return null;
    return connectedPeers.find((p) => p.peerId === selectedDmPeerId) || null;
  }, [selectedDmPeerId, connectedPeers]);

    const renderChatColumnContent = () => (
    <div className="chat-column" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Pinned Messages Popover Modal */}
      {showPinnedModal && (
        <PinnedMessagesModal
          pinnedMessages={currentChannelPinnedMessages}
          onJumpToMessage={(msgId) => scrollToMessage(msgId)}
          onUnpinMessage={(msgId) => handleTogglePin(msgId)}
          onClose={() => setShowPinnedModal(false)}
        />
      )}

      {/* Outgoing Private Call Ringing Banner */}
              {outgoingDmCall && (
                <div className="outgoing-call-banner">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <UserAvatar profile={outgoingDmCall.peer} size="small" />
                    <span>
                      {t.outgoingCallRinging(
                        outgoingDmCall.peer?.displayName ||
                          outgoingDmCall.peer?.username ||
                          "Peer"
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ backgroundColor: "rgba(242, 63, 67, 0.25)", color: "#fca5a5" }}
                    onClick={handleCancelOutgoingDmCall}
                  >
                    <PhoneOff size={13} />
                    <span>{t.cancelCallBtn}</span>
                  </button>
                </div>
              )}
              {/* Voice / Simultaneous Webcam + Go Live Screen Stage */}
              {activeVoiceChannelId && (
                <div
                  ref={stageContainerRef}
                  className={`voice-stage-container ${stageTheaterMode ? "theater-mode" : ""}`}
                  style={!stageTheaterMode ? { height: stageHeight } : undefined}
                >
                  <div className="stage-toolbar">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Volume2 size={16} color="#23a55a" />
                      <strong style={{ color: "#fff", fontSize: 13 }}>
                        {t.voiceStageTitle}
                      </strong>
                    </div>

                    <div className="stage-toolbar-controls">
                      {/* Tile Size Slider for Grid Mode */}
                      {!activeSpotlightTile && (
                        <div className="stage-size-pill">
                          <span>{t.tileSizeLabel}:</span>
                          <input
                            type="range"
                            min="180"
                            max="640"
                            step="20"
                            value={tileMinWidth}
                            onChange={(e) => setTileMinWidth(Number(e.target.value))}
                            style={{ width: 78, cursor: "pointer" }}
                          />
                        </div>
                      )}

                      {/* Grid vs Spotlight Toggle */}
                      {activeSpotlightTile && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setSpotlightTileId(null)}
                        >
                          <LayoutGrid size={14} />
                          <span>{t.gridModeBtn}</span>
                        </button>
                      )}

                      {/* Floating Webcam PiP Toggle when Screen Share is Spotlighted */}
                      {activeSpotlightTile && activeWebcamTileForPip && (
                        <button
                          type="button"
                          className={showWebcamPipOverlay ? "btn-primary" : "btn-secondary"}
                          onClick={() => setShowWebcamPipOverlay((v) => !v)}
                        >
                          <PictureInPicture2 size={14} />
                          <span>{t.webcamPipToggle}</span>
                        </button>
                      )}

                      {/* Hide / Show All Webcams Toggle */}
                      {hasAnyActiveWebcam && (
                        <button
                          type="button"
                          className={hideAllWebcams ? "btn-primary" : "btn-secondary"}
                          onClick={() => setHideAllWebcams((v) => !v)}
                          title={hideAllWebcams ? t.showAllWebcamsBtn : t.hideAllWebcamsBtn}
                        >
                          {hideAllWebcams ? <Video size={14} /> : <VideoOff size={14} />}
                          <span>{hideAllWebcams ? t.showAllWebcamsBtn : t.hideAllWebcamsBtn}</span>
                        </button>
                      )}

                      {/* Theater Mode Toggle */}
                      <button
                        type="button"
                        className={stageTheaterMode ? "btn-primary" : "btn-secondary"}
                        onClick={() => setStageTheaterMode((v) => !v)}
                      >
                        {stageTheaterMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        <span>{stageTheaterMode ? t.exitTheaterBtn : t.theaterModeBtn}</span>
                      </button>

                      {/* Fullscreen Entire Stage */}
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => toggleElementFullscreen(stageContainerRef.current)}
                        title={t.stageFullscreenBtn}
                      >
                        <Maximize2 size={14} />
                        <span>{t.stageFullscreenBtn}</span>
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => openProfileStudio("media")}
                      >
                        <Sliders size={14} />
                        <span>{t.mediaSettingsBtn}</span>
                      </button>

                      <button
                        type="button"
                        className={videoEnabled ? "btn-primary" : "btn-secondary"}
                        onClick={toggleCamera}
                      >
                        {videoEnabled ? <Video size={14} /> : <VideoOff size={14} />}
                        <span>{videoEnabled ? t.turnOffCamera : t.turnOnCamera}</span>
                      </button>

                      <button type="button" className="btn-primary" onClick={openGoLivePicker}>
                        <Monitor size={14} />
                        <span>
                          {screenSharing
                            ? `${t.stopGoLive} (${screenResolution.toUpperCase()} ${screenFps}FPS)`
                            : `${t.startGoLive} (${screenResolution.toUpperCase()} ${screenFps}FPS)`}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Stage Body: Spotlight Mode (Main Large Tile + Dock Strip) vs Resizable Grid Mode */}
                  {activeSpotlightTile ? (
                    <div className="voice-spotlight-layout">
                      <div className="voice-spotlight-main">
                        {renderStageTile(activeSpotlightTile, true)}
                      </div>

                      {stageTiles.length > 1 && (
                        <div className="voice-spotlight-dock">
                          {stageTiles
                            .filter((tile) => tile.id !== activeSpotlightTile.id)
                            .map((tile) => renderStageTile(tile, false))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="voice-video-grid"
                      style={{
                        gridTemplateColumns: `repeat(auto-fit, minmax(${tileMinWidth}px, 1fr))`,
                      }}
                    >
                      {stageTiles.map((tile) => renderStageTile(tile, false))}
                    </div>
                  )}

                  {/* Bottom Drag Handle to Resize Stage Height */}
                  {!stageTheaterMode && (
                    <div
                      className="stage-resize-handle"
                      onMouseDown={startStageHeightDrag}
                      title={t.dragResizeHint}
                    >
                      <div className="stage-resize-handle-bar" />
                    </div>
                  )}
                </div>
              )}

              {/* Direct P2P Network Hub View */}
              {selectedRoomId === "dm_hub" && !selectedDmPeerId ? (
                <div className="messages-scroller" style={{ padding: "22px 26px" }}>
                  <div
                    style={{
                      background: "linear-gradient(135deg, rgba(88,101,242,0.18), rgba(155,89,182,0.14))",
                      border: "1px solid rgba(88,101,242,0.35)",
                      borderRadius: 10,
                      padding: 20,
                      marginBottom: 20,
                      display: "flex",
                      gap: 18,
                      alignItems: "center",
                    }}
                  >
                    <img
                      src="./logo.png"
                      alt="Freecord Logo"
                      style={{
                        width: 76,
                        height: 76,
                        borderRadius: 16,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <h2 style={{ color: "#fff", fontSize: 20, marginBottom: 6 }}>
                        {t.hubBannerTitle}
                      </h2>
                      <p style={{ color: "var(--text-normal)", fontSize: 13, lineHeight: 1.5 }}>
                        {t.hubBannerDesc}
                      </p>

                      <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {(nodeStatus.connectionStrings || []).map((ep) => (
                          <div key={ep} className="endpoint-copy-card" style={{ marginBottom: 0, gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>
                                {t.yourEndpointLabel}
                              </div>
                              <div className="endpoint-code">{ep}</div>
                            </div>
                            <button className="btn-primary" onClick={() => handleCopy(ep)}>
                              {copiedText === ep ? <Check size={14} /> : <Copy size={14} />}
                              <span>{copiedText === ep ? t.copied : t.copyIpPort}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Discovered LAN / Local Peers */}
                  <h3 style={{ color: "var(--text-header)", fontSize: 14, marginBottom: 10 }}>
                    {t.discoveredLanHeader(lanPeers.length)}
                  </h3>
                  {lanPeers.length === 0 ? (
                    <div
                      style={{
                        background: "#2b2d31",
                        padding: 16,
                        borderRadius: 8,
                        color: "var(--text-muted)",
                        marginBottom: 20,
                      }}
                    >
                      {t.searchingLan}{" "}
                      {isElectron && (
                        <button
                          className="btn-primary"
                          style={{ marginLeft: 10 }}
                          onClick={handleSpawnSecondPeer}
                        >
                          <ExternalLink size={14} />
                          <span>{t.spawnPeerBtn}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 8, marginBottom: 22 }}>
                      {lanPeers.map((lp) => (
                        <div
                          key={lp.peerId}
                          style={{
                            background: "#2b2d31",
                            padding: "12px 16px",
                            borderRadius: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <UserAvatar profile={lp} showStatus={true} />
                            <div>
                              <div style={{ fontWeight: 700, color: "#fff" }}>
                                {lp.displayName || lp.username}#{lp.tag}{" "}
                                <span className="message-peer-badge">{lp.peerId}</span>
                              </div>
                              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                Endpoint: {lp.host}:{lp.tcpPort} • {lp.customStatus}
                              </div>
                            </div>
                          </div>
                          {lp.isConnected ? (
                            <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 12 }}>
                              {t.interconnected}
                            </span>
                          ) : (
                            <button
                              className="btn-success"
                              onClick={() =>
                                window.DiscordNative?.p2p?.connect(lp.host, lp.tcpPort)
                              }
                            >
                              {t.connectP2pBtn}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Messages Feed */
                <>
                  <div className="messages-scroller">
                    <div className="channel-welcome">
                      <h2>{t.welcomeChannelTitle(currentChannelObj?.name)}</h2>
                      <p>
                        {currentChannelObj?.topic || t.welcomeChannelDefault}
                      </p>
                    </div>

                    {filteredMessages.map((msg) => (
                      <div
                        key={msg.id}
                        id={`msg_${msg.id}`}
                        className={`message-item ${pinnedSet.has(msg.id) ? "is-pinned" : ""}`}
                      >
                        {/* Discord Reply Quote Spine preview */}
                        {msg.replyTo && (
                          <div
                            className="message-reply-preview"
                            onClick={() => scrollToMessage(msg.replyTo.messageId)}
                            title="Ir para a mensagem original"
                          >
                            <span className="reply-spine" />
                            <span className="reply-author">
                              @{msg.replyTo.authorName}
                            </span>
                            <span className="reply-text">
                              {msg.replyTo.textSnippet}
                            </span>
                          </div>
                        )}

                        <UserAvatar
                          profile={msg.author}
                          onClick={() => setInspectedProfile(msg.author)}
                        />

                        <div className="message-content">
                          <div className="message-header">
                            <span
                              className="message-author"
                              style={{ cursor: "pointer" }}
                              onClick={() => setInspectedProfile(msg.author)}
                            >
                              {msg.author?.displayName || msg.author?.username}
                            </span>
                            <span className="message-peer-badge">
                              #{msg.author?.tag || "P2P"}
                            </span>
                            {msg.e2eeVerified && (
                              <span
                                className="message-peer-badge"
                                style={{
                                  backgroundColor: "rgba(35, 165, 90, 0.2)",
                                  color: "#57f287",
                                  border: "1px solid rgba(35, 165, 90, 0.35)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                }}
                                title={`End-to-End Encrypted • Key: ${
                                  msg.author?.keyFingerprint || "SHA256-CTR-HMAC"
                                }`}
                              >
                                <Lock size={10} />
                                <span>E2EE</span>
                              </span>
                            )}
                            <span className="message-timestamp">{msg.timestamp}</span>
                            {msg.editedAt && (
                              <span
                                className="message-edited-badge"
                                title={new Date(msg.editedAt).toLocaleTimeString()}
                              >
                                (editado)
                              </span>
                            )}
                          </div>

                          <div className="message-text">
                            {editingMessageId === msg.id ? (
                              <div className="message-edit-container">
                                <input
                                  type="text"
                                  className="message-edit-input"
                                  value={editInput}
                                  onChange={(e) => setEditInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleSaveEdit(msg.id);
                                    } else if (e.key === "Escape") {
                                      e.preventDefault();
                                      setEditingMessageId(null);
                                    }
                                  }}
                                  autoFocus
                                />
                                <div className="message-edit-help">
                                  <span>pressione Esc para </span>
                                  <button type="button" onClick={() => setEditingMessageId(null)}>
                                    cancelar
                                  </button>
                                  <span> • Enter para </span>
                                  <button type="button" onClick={() => handleSaveEdit(msg.id)}>
                                    salvar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <DiscordMarkdown content={msg.text} />
                            )}
                          </div>

                          {/* Interactive P2P Server Invite Card Embed */}
                          {msg.serverInvite?.room && (() => {
                            const invRoom = msg.serverInvite.room;
                            const isAlreadyMember = rooms.some((r) => r.id === invRoom.id);
                            return (
                              <div className="server-invite-card">
                                <div
                                  className="server-invite-banner"
                                  style={{
                                    background: invRoom.bannerUrl
                                      ? `url(${invRoom.bannerUrl}) center/cover no-repeat`
                                      : `linear-gradient(135deg, ${
                                          invRoom.bannerColor || invRoom.color || "#5865f2"
                                        } 0%, ${invRoom.bannerSecondaryColor || "#9b59b6"} 100%)`,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 800,
                                      color: "rgba(255,255,255,0.85)",
                                      letterSpacing: 0.5,
                                      zIndex: 2,
                                    }}
                                  >
                                    {t.serverInviteCardHeader}
                                  </span>
                                </div>
                                <div className="server-invite-body">
                                  <div className="server-invite-info">
                                    <div
                                      className="server-invite-icon"
                                      style={{ backgroundColor: invRoom.color || "#5865f2" }}
                                    >
                                      {invRoom.iconUrl ? (
                                        <img src={invRoom.iconUrl} alt={invRoom.name} />
                                      ) : (
                                        invRoom.shortName || "FC"
                                      )}
                                    </div>
                                    <div className="server-invite-meta">
                                      <div className="server-invite-name">
                                        <span>{invRoom.name}</span>
                                        {invRoom.serverTag && (
                                          <span className="server-tag-badge">
                                            ✦ {invRoom.serverTag}
                                          </span>
                                        )}
                                      </div>
                                      <div className="server-invite-desc">
                                        {invRoom.description ||
                                          t.invitedYouToJoin(
                                            msg.author?.displayName ||
                                              msg.author?.username ||
                                              "Peer"
                                          )}
                                      </div>
                                    </div>
                                  </div>

                                  {isAlreadyMember ? (
                                    <button
                                      type="button"
                                      className="btn-secondary"
                                      onClick={() => {
                                        setSelectedRoomId(invRoom.id);
                                        if (invRoom.textChannels?.[0]?.id) {
                                          setSelectedChannelId(invRoom.textChannels[0].id);
                                        }
                                      }}
                                    >
                                      <span>{t.joinedServerBadge}</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn-success"
                                      onClick={() =>
                                        handleJoinServerRoom(invRoom, msg.serverInvite.hostEndpoint)
                                      }
                                    >
                                      <UserPlus size={14} />
                                      <span>{t.joinServerBtn}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {msg.attachment && (
                            <div className="message-attachment">
                              {msg.attachment.isImage ? (
                                <img src={msg.attachment.dataUrl} alt={msg.attachment.name} />
                              ) : null}
                              <div className="file-attachment-card">
                                <div>
                                  <div style={{ fontWeight: 600, color: "#fff", fontSize: 13 }}>
                                    {msg.attachment.name}
                                  </div>
                                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                    {(msg.attachment.size / 1024).toFixed(1)} KB • {t.directP2pTransfer}
                                  </div>
                                </div>
                                <a
                                  href={msg.attachment.dataUrl}
                                  download={msg.attachment.name}
                                  className="btn-primary"
                                  style={{ textDecoration: "none" }}
                                >
                                  <Download size={14} />
                                  <span>{t.downloadBtn}</span>
                                </a>
                              </div>
                            </div>
                          )}

                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="reactions-row">
                              {Object.entries(msg.reactions).map(([emoji, peerList]) => {
                                const active = peerList.includes(nodeStatus.profile.peerId);
                                return (
                                  <div
                                    key={emoji}
                                    className={`reaction-pill ${active ? "active" : ""}`}
                                    onClick={() => handleToggleReaction(msg.id, emoji)}
                                  >
                                    <span>{emoji}</span>
                                    <span>{peerList.length}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Discord PTB Quick Action Bar */}
                        <div className="quick-action-bar">
                          {["👍", "❤️", "🔥", "🚀", "⚡"].map((emoji) => (
                            <button
                              key={emoji}
                              className="quick-action-btn"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              title={`Reagir com ${emoji}`}
                            >
                              <span>{emoji}</span>
                            </button>
                          ))}
                          <button
                            type="button"
                            className="quick-action-btn"
                            onClick={() => handleStartReply(msg)}
                            title="Responder"
                          >
                            <Reply size={15} />
                          </button>
                          <button
                            type="button"
                            className="quick-action-btn"
                            onClick={() => handleTogglePin(msg.id)}
                            title={pinnedSet.has(msg.id) ? "Desafixar mensagem" : "Fixar mensagem"}
                            style={pinnedSet.has(msg.id) ? { color: "#e9a820" } : undefined}
                          >
                            <Pin size={15} />
                          </button>
                          {msg.author?.peerId === nodeStatus.profile.peerId && (
                            <>
                              <button
                                type="button"
                                className="quick-action-btn"
                                onClick={() => handleStartEdit(msg)}
                                title="Editar mensagem"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                className="quick-action-btn delete"
                                onClick={() => handleDeleteMessage(msg.id)}
                                title="Excluir mensagem"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="chat-input-wrapper">
                    {/* Direct Reply Banner */}
                    {replyingTo && (
                      <div className="chat-reply-banner">
                        <div className="chat-reply-banner-left">
                          <Reply size={14} color="#5865f2" />
                          <span>Respondendo a <strong>@{replyingTo.authorName}</strong></span>
                          <span className="chat-reply-banner-snippet">{replyingTo.textSnippet}</span>
                        </div>
                        <button
                          type="button"
                          className="chat-reply-cancel-btn"
                          onClick={() => setReplyingTo(null)}
                          title="Cancelar resposta"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {activeTyping && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginBottom: 4,
                          paddingLeft: 4,
                        }}
                      >
                        <b>{t.isTyping(activeTyping.username)}</b>
                      </div>
                    )}
                    <form className="chat-input-bar" onSubmit={handleSendMessage} style={{ position: "relative" }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        style={{ display: "none" }}
                        onChange={handleFileAttachment}
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title={t.sendFileTooltip}
                      >
                        <Paperclip size={18} />
                      </button>
                      <input
                        type="text"
                        placeholder={t.chatPlaceholder(currentChannelObj?.name)}
                        value={chatInput}
                        onChange={(e) => {
                          setChatInput(e.target.value);
                          const now = Date.now();
                          if (now - lastTypingSentRef.current > 2000) {
                            lastTypingSentRef.current = now;
                            sendP2PPacket({
                              type: "TYPING_STATE",
                              channelId: effectiveChannelId,
                              username: selfDisplayName,
                            });
                          }
                        }}
                      />
                      <button
                        type="button"
                        className={`icon-btn ${showEmojiPicker ? "active" : ""}`}
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                        title="Emojis"
                      >
                        <Smile size={18} color={showEmojiPicker ? "#5865f2" : undefined} />
                      </button>

                      {showEmojiPicker && (
                        <>
                          <div
                            className="emoji-picker-backdrop"
                            onClick={() => setShowEmojiPicker(false)}
                          />
                          <EmojiPickerPopover
                            onSelectEmoji={(emoji) => {
                              setChatInput((prev) => prev + emoji);
                              setShowEmojiPicker(false);
                            }}
                            onClose={() => setShowEmojiPicker(false)}
                          />
                        </>
                      )}

                      <button type="submit" className="icon-btn" title={t.sendMessageTooltip}>
                        <Send size={18} color="var(--brand-blurple)" />
                      </button>
                    </form>
                  </div>
                </>
              )}
    </div>
  );

  const renderPeerSidebarContent = (isDrawer = false) => (
    <div className={`peer-sidebar ${isDrawer ? "mobile-drawer-inner" : ""}`}>
      <div className="channel-section-title" style={{ paddingTop: 0 }}>
        <span>{t.youSidebarHeader}</span>
      </div>
      <div
        className="peer-card"
        onClick={() => setInspectedProfile(nodeStatus.profile)}
      >
        <div className="peer-card-left">
          <UserAvatar profile={nodeStatus.profile} showStatus={true} />
          <div className="peer-card-meta">
            <span className="peer-card-name">
              {selfDisplayName}#{nodeStatus.profile.tag}
            </span>
            {currentGame ? (
              <span className="peer-card-game">
                <Gamepad2 size={11} color="#23a55a" />
                <span>Jogando {currentGame.name}</span>
              </span>
            ) : (
              <span className="peer-card-sub">
                {nodeStatus.profile.statusEmoji || ""}{" "}
                {nodeStatus.profile.customStatus || `TCP: ${nodeStatus.tcpPort || "Web"}`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="channel-section-title">
        <span>{t.connectedComputersHeader(connectedPeers.length)}</span>
      </div>
      {connectedPeers.map((peer) => (
        <div
          key={peer.peerId}
          className="peer-card"
          onClick={() => setInspectedProfile(peer)}
          title={`Click to view ${peer.displayName || peer.username}'s Profile Card`}
        >
          <div className="peer-card-left">
            <UserAvatar
              profile={peer}
              speaking={Boolean(speakingMap[peer.peerId])}
              showStatus={true}
            />
            <div className="peer-card-meta">
              <span className="peer-card-name">
                {peer.displayName || peer.username}#{peer.tag}
              </span>
              {peer.currentGame ? (
                <span className="peer-card-game">
                  <Gamepad2 size={11} color="#23a55a" />
                  <span>Jogando {peer.currentGame.name}</span>
                </span>
              ) : (
                <span className="peer-card-sub">
                  {peer.statusEmoji || ""} {peer.customStatus || `${peer.address}:${peer.port} • ${peer.rttMs}ms`}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="channel-section-title">
        <span>{t.discoveredLanSidebar(lanPeers.filter((l) => !l.isConnected).length)}</span>
        <RefreshCw
          size={12}
          style={{ cursor: "pointer" }}
          onClick={() => window.DiscordNative?.p2p?.beaconNow()}
          title="Broadcast UDP Discovery Beacon Now"
        />
      </div>
      {lanPeers
        .filter((l) => !l.isConnected)
        .map((lp) => (
          <div key={lp.peerId} className="peer-card">
            <div className="peer-card-left">
              <UserAvatar profile={lp} showStatus={true} />
              <div className="peer-card-meta">
                <span className="peer-card-name">{lp.displayName || lp.username}</span>
                <span className="peer-card-sub">
                  {lp.host}:{lp.tcpPort}
                </span>
              </div>
            </div>
            <button
              className="btn-success"
              onClick={() =>
                window.DiscordNative?.p2p?.connect(lp.host, lp.tcpPort)
              }
            >
              {t.connectShortBtn}
            </button>
          </div>
        ))}
    </div>
  );

return (
    <>
      {/* DiscordPTB Frameless Titlebar with Official Freecord Logo (Desktop only) */}
      {!isMobile && (
        <div className="titlebar">
        <div className="titlebar-left">
          <img src="./logo.png" alt="Freecord" className="titlebar-logo" />
          <span>FREECORD</span>
          <span className="ptb-badge">PTB {appVersion} P2P</span>
          {updateStatus?.status === "downloaded" && (
            <button
              className="p2p-pill"
              style={{
                background: "rgba(35, 165, 90, 0.25)",
                borderColor: "#23a55a",
                color: "#57f287",
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={() => window.DiscordNative?.updater?.quitAndInstall?.()}
              title={t.restartAndInstallBtn}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <RefreshCw size={12} />
                <span>{t.restartAndInstallBtn} (v{updateStatus.version})</span>
              </span>
            </button>
          )}
          <div
            className="p2p-pill"
            onClick={() => setShowConnectModal(true)}
            title={t.connectComputerBtn}
          >
            <Radio size={11} />
            <span>
              {t.nodePill(nodeStatus.instanceId, nodeStatus.tcpPort, connectedPeers.length)}
            </span>
          </div>
          {isElectron && (
            <button
              className="p2p-pill"
              style={{
                background: "rgba(88, 101, 242, 0.2)",
                borderColor: "rgba(88, 101, 242, 0.45)",
                color: "#c7d2fe",
              }}
              onClick={handleSpawnSecondPeer}
              title={t.spawnPeerTooltip}
            >
              <ExternalLink size={10} />
              <span>{t.spawnPeerBtn}</span>
            </button>
          )}
          <button
            className="p2p-pill"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              borderColor: "rgba(255, 255, 255, 0.2)",
              color: "#f2f3f5",
            }}
            onClick={handleToggleLanguage}
            title="Switch Language (EN / PT-BR)"
          >
            <Globe size={10} />
            <span>{lang === "en" ? "EN" : "PT-BR"}</span>
          </button>
          <button
            className="p2p-pill"
            style={{
              background: notificationsEnabled
                ? "rgba(35, 165, 90, 0.22)"
                : "rgba(242, 63, 67, 0.22)",
              borderColor: notificationsEnabled
                ? "rgba(35, 165, 90, 0.45)"
                : "rgba(242, 63, 67, 0.45)",
              color: notificationsEnabled ? "#86efac" : "#fca5a5",
            }}
            onClick={() => setNotificationsEnabled((v) => !v)}
            title={
              notificationsEnabled ? t.notificationsOnTooltip : t.notificationsOffTooltip
            }
          >
            {notificationsEnabled ? <Bell size={11} /> : <BellOff size={11} />}
          </button>
        </div>

        <div className="titlebar-controls">
          <button
            className="titlebar-btn"
            onClick={() => window.DiscordNative?.window?.minimize()}
            title="Minimize"
          >
            <Minus size={14} />
          </button>
          <button
            className="titlebar-btn"
            onClick={() => window.DiscordNative?.window?.maximize()}
            title="Maximize"
          >
            <Square size={12} />
          </button>
          <button
            className="titlebar-btn close"
            onClick={() => window.DiscordNative?.window?.close()}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      )}

      {/* Auto-Updater Banner Notification (Desktop & Android In-App) */}
      {updateStatus?.status === "available" &&
        window.FreecordAndroid?.downloadAndInstallApk &&
        updateStatus?.downloadUrl && (
          <div
            style={{
              backgroundColor: "#5865f2",
              color: "#ffffff",
              padding: "8px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              fontSize: 12,
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              zIndex: 1200,
            }}
          >
            <span>📦 {t.updateAvailableText(updateStatus.version)}</span>
            <button
              className="btn-primary"
              style={{
                backgroundColor: "#23a55a",
                color: "#fff",
                padding: "4px 10px",
                fontSize: 11,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
              }}
              onClick={() =>
                window.FreecordAndroid.downloadAndInstallApk(
                  updateStatus.downloadUrl,
                  String(updateStatus.version || "")
                )
              }
            >
              {lang === "en" ? "Update in App" : "Atualizar pelo App"}
            </button>
          </div>
        )}
      {updateStatus?.status === "downloaded" && (
        <div
          style={{
            backgroundColor: "#23a55a",
            color: "#ffffff",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            zIndex: 1200,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Download size={15} color="#fff" />
            <span>{t.updateReadyNotice} (v{updateStatus.version || "1.3.0"})</span>
          </span>
          <button
            className="btn-primary"
            style={{
              backgroundColor: "#1e1f22",
              color: "#fff",
              padding: "4px 12px",
              fontSize: 12,
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.2)",
              cursor: "pointer",
            }}
            onClick={() => {
              if (window.FreecordAndroid?.installDownloadedApk) {
                window.FreecordAndroid.installDownloadedApk();
              } else {
                window.DiscordNative?.updater?.quitAndInstall?.();
              }
            }}
          >
            {window.FreecordAndroid?.installDownloadedApk
              ? lang === "en"
                ? "Install APK Now"
                : "Instalar Agora"
              : t.restartAndInstallBtn}
          </button>
        </div>
      )}
      {updateStatus?.status === "downloading" && (
        <div
          style={{
            backgroundColor: "#5865f2",
            color: "#ffffff",
            padding: "6px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 12,
            fontWeight: 500,
            zIndex: 1200,
          }}
        >
          <span>⬇️ {t.downloadingUpdate} {updateStatus.percent || 0}%</span>
        </div>
      )}

      {/* Main Workspace (Desktop vs Dedicated Discord Mobile UI) */}
      {!isMobile ? (
        <div className="app-shell">
        {/* Left Server / P2P Spaces Rail */}
        <div className="server-rail">
          <div
            className={`server-icon home-logo ${selectedRoomId === "dm_hub" ? "active" : ""}`}
            style={{ position: "relative" }}
            onClick={() => {
              setSelectedRoomId("dm_hub");
              setSelectedDmPeerId(null);
            }}
            title={t.p2pHubTitle}
          >
            <img src="./logo.png" alt="Freecord Hub" />
            {totalDmUnread > 0 ? (
              <span className="unread-badge rail-badge">
                {totalDmUnread > 99 ? "99+" : totalDmUnread}
              </span>
            ) : connectedPeers.length > 0 ? (
              <span className="server-badge">{connectedPeers.length}</span>
            ) : null}
          </div>

          <div className="rail-divider" />

          {rooms.map((room) => {
            const serverUnread = (room.textChannels || []).reduce(
              (acc, ch) => acc + (unreadCounts[ch.id] || 0),
              0
            );
            return (
              <div
                key={room.id}
                className={`server-icon ${selectedRoomId === room.id ? "active" : ""}`}
                style={{
                  position: "relative",
                  backgroundColor:
                    selectedRoomId === room.id
                      ? room.color || "#5865f2"
                      : room.iconUrl
                      ? "#111214"
                      : undefined,
                  padding: room.iconUrl ? 0 : undefined,
                  overflow: "visible",
                }}
                onClick={() => {
                  setSelectedRoomId(room.id);
                  if (room.textChannels?.[0]) {
                    setSelectedChannelId(room.textChannels[0].id);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openServerStudio("edit", room);
                }}
                title={`${room.name} (${t.customizeServerTooltip})`}
              >
                {serverUnread > 0 && (
                  <span className="unread-badge rail-badge">
                    {serverUnread > 99 ? "99+" : serverUnread}
                  </span>
                )}
                <div style={{ width: "100%", height: "100%", borderRadius: "inherit", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {room.iconUrl ? (
                    <img
                      src={room.iconUrl}
                      alt={room.name}
                      className="custom-server-icon"
                    />
                  ) : (
                    room.shortName
                  )}
                </div>
              </div>
            );
          })}

          <div
            className="server-icon action"
            onClick={() => openServerStudio("create")}
            title={t.serverStudioCreateTitle}
          >
            <Plus size={22} />
          </div>

          <div
            className="server-icon action"
            onClick={() => setShowConnectModal(true)}
            title={t.connectComputerBtn}
          >
            <Radio size={20} />
          </div>
        </div>

        {/* Channel Sidebar */}
        <div
          className="channel-sidebar"
          style={
            selectedRoomId !== "dm_hub" && currentRoom?.sidebarBgColor
              ? { backgroundColor: currentRoom.sidebarBgColor }
              : undefined
          }
        >
          {selectedRoomId === "dm_hub" ? (
            <div
              className="sidebar-header"
              onClick={() => setShowConnectModal(true)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src="./logo.png" alt="" style={{ width: 20, height: 20, borderRadius: 5 }} />
                {t.p2pHubTitle}
              </span>
              <ShieldCheck size={16} color="#23a55a" title="Serverless Direct P2P" />
            </div>
          ) : (
            <>
              <div
                className="sidebar-banner-hero"
                style={{
                  background: currentRoom?.bannerUrl
                    ? `url(${currentRoom.bannerUrl}) center/cover no-repeat`
                    : `linear-gradient(135deg, ${
                        currentRoom?.bannerColor || currentRoom?.color || "#5865f2"
                      } 0%, ${currentRoom?.bannerSecondaryColor || "#9b59b6"} 100%)`,
                }}
                onClick={() => openServerStudio("edit", currentRoom)}
                title={t.customizeServerTooltip}
              >
                <div className="sidebar-banner-top">
                  {currentRoom?.serverTag ? (
                    <span className="server-tag-badge">✦ {currentRoom.serverTag}</span>
                  ) : (
                    <span />
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button
                      type="button"
                      className="tile-ctrl-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openInviteServerModal(currentRoom);
                      }}
                      title={t.inviteServerBtn}
                    >
                      <UserPlus size={12} />
                      <span>{t.inviteServerBtn}</span>
                    </button>
                    <button
                      type="button"
                      className="tile-ctrl-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openServerStudio("edit", currentRoom);
                      }}
                      title={t.customizeServerBtn}
                    >
                      <Settings size={12} />
                    </button>
                    <button
                      type="button"
                      className="tile-ctrl-btn"
                      style={{ color: "#fca5a5" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            lang === "pt"
                              ? `Deseja sair do servidor ${currentRoom?.name}?`
                              : `Leave server ${currentRoom?.name}?`
                          )
                        ) {
                          handleLeaveServer(currentRoom?.id);
                        }
                      }}
                      title={t.leaveServerBtn}
                    >
                      <LogOut size={12} />
                    </button>
                  </div>
                </div>

                <div className="sidebar-banner-bottom">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    {currentRoom?.iconUrl ? (
                      <img
                        src={currentRoom.iconUrl}
                        alt=""
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 7,
                          objectFit: "cover",
                          border: "2px solid rgba(255,255,255,0.4)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 7,
                          backgroundColor: currentRoom?.color || "#5865f2",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 800,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {currentRoom?.shortName}
                      </div>
                    )}
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 15,
                        color: "#fff",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textShadow: "0 2px 6px rgba(0,0,0,0.65)",
                      }}
                    >
                      {currentRoom?.name}
                    </span>
                  </div>
                  <ShieldCheck size={15} color="#4ade80" title="Serverless Direct P2P" />
                </div>
              </div>

              {currentRoom?.description && (
                <div className="sidebar-description-bar">
                  {currentRoom.description}
                </div>
              )}
            </>
          )}

          <div className="channel-list">
            {selectedRoomId === "dm_hub" ? (
              <>
                <div
                  className={`channel-item ${!selectedDmPeerId ? "active" : ""}`}
                  onClick={() => setSelectedDmPeerId(null)}
                >
                  <div className="channel-item-left">
                    <Radio size={18} />
                    <span>{t.networkDashboard}</span>
                  </div>
                </div>

                <div className="channel-section-title">
                  <span>{t.directMessagesHeader(connectedPeers.length)}</span>
                  <Plus
                    size={14}
                    style={{ cursor: "pointer" }}
                    onClick={() => setShowConnectModal(true)}
                  />
                </div>

                {connectedPeers.length === 0 ? (
                  <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--text-muted)" }}>
                    {t.noPeersYet}
                  </div>
                ) : (
                  connectedPeers.map((peer) => {
                    const sorted = [nodeStatus.profile.peerId, peer.peerId].sort().join("__");
                    const dmChId = `dm_${sorted}`;
                    const dmUnread = unreadCounts[dmChId] || 0;
                    const inDmCallWithPeer =
                      activeVoiceChannelId &&
                      activeVoiceChannelId === getDmCallChannelId(peer.peerId);

                    return (
                      <div
                        key={peer.peerId}
                        className={`channel-item ${selectedDmPeerId === peer.peerId ? "active" : ""}`}
                        onClick={() => setSelectedDmPeerId(peer.peerId)}
                      >
                        <div className="channel-item-left">
                          <UserAvatar profile={peer} size="small" showStatus={true} />
                          <span style={{ fontWeight: dmUnread > 0 ? 800 : undefined, color: dmUnread > 0 ? "#fff" : undefined }}>
                            {peer.displayName || peer.username}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          {dmUnread > 0 && (
                            <span className="unread-badge">{dmUnread}</span>
                          )}
                          <button
                            type="button"
                            className="icon-btn"
                            style={{
                              width: 24,
                              height: 24,
                              color: inDmCallWithPeer ? "#23a55a" : "var(--text-muted)",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartDmCall(peer, false);
                            }}
                            title={t.startVoiceCallBtn}
                          >
                            <PhoneCall size={13} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{
                              width: 24,
                              height: 24,
                              color: inDmCallWithPeer && videoEnabled ? "#5865f2" : "var(--text-muted)",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartDmCall(peer, true);
                            }}
                            title={t.startVideoCallBtn}
                          >
                            <Video size={13} />
                          </button>
                          <span style={{ fontSize: 10, color: "#4ade80" }}>{peer.rttMs}ms</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            ) : (
              <>
                {/* Text Channels */}
                <div className="channel-section-title">
                  <span>{t.textChannelsHeader}</span>
                  <Plus
                    size={14}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setNewChannelType("text");
                      setShowNewChannelModal(true);
                    }}
                  />
                </div>
                {currentRoom?.textChannels?.map((ch) => {
                  const chUnread = unreadCounts[ch.id] || 0;
                  return (
                    <div
                      key={ch.id}
                      className={`channel-item ${selectedChannelId === ch.id ? "active" : ""} ${chUnread > 0 ? "has-unread" : ""}`}
                      onClick={() => setSelectedChannelId(ch.id)}
                    >
                      <div className="channel-item-left">
                        <Hash size={18} />
                        <span style={{ fontWeight: chUnread > 0 ? 800 : undefined, color: chUnread > 0 ? "#fff" : undefined }}>
                          {ch.name}
                        </span>
                      </div>
                      {chUnread > 0 && <span className="unread-badge">{chUnread}</span>}
                    </div>
                  );
                })}

                {/* Voice Channels */}
                <div className="channel-section-title">
                  <span>{t.voiceChannelsHeader}</span>
                  <Plus
                    size={14}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setNewChannelType("voice");
                      setShowNewChannelModal(true);
                    }}
                  />
                </div>
                {currentRoom?.voiceChannels?.map((vc) => {
                  const members = peersInVoiceChannel(vc.id);
                  return (
                    <div key={vc.id}>
                      <div
                        className={`channel-item ${activeVoiceChannelId === vc.id ? "active" : ""}`}
                        onClick={() => handleJoinVoiceChannel(vc)}
                      >
                        <div className="channel-item-left">
                          <Volume2 size={18} color={activeVoiceChannelId === vc.id ? "#23a55a" : undefined} />
                          <span>{vc.name}</span>
                        </div>
                        {members.length > 0 && (
                          <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>
                            {members.length}
                          </span>
                        )}
                      </div>

                      {members.length > 0 && (
                        <div className="voice-channel-users">
                          {members.map((m) => (
                            <div
                              key={m.peerId}
                              className="voice-user-row"
                              onClick={() => setInspectedProfile(m)}
                            >
                              <div className="voice-user-left">
                                <UserAvatar
                                  profile={m}
                                  size="small"
                                  speaking={m.speaking}
                                />
                                <span style={{ fontSize: 12 }}>{m.displayName}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                {m.screenSharing && <span className="live-badge">{t.liveBadge}</span>}
                                {m.muted && <MicOff size={12} color="#f23f43" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Voice Connected Dock */}
          {activeVoiceChannelId && (
            <div className="voice-connected-panel">
              <div className="voice-status-top">
                <div className="voice-status-text">
                  <div className="voice-status-title">
                    <Radio size={14} />
                    <span>{t.voiceConnected}</span>
                  </div>
                  <span className="voice-status-sub">
                    {t.directWebrtcMesh} •{" "}
                    {connectedPeers[0]?.rttMs ? `${connectedPeers[0].rttMs} ms` : "1 ms"}
                  </span>
                </div>
                <button
                  className="icon-btn danger"
                  onClick={handleLeaveVoiceChannel}
                  title={t.disconnectVoice}
                >
                  <PhoneOff size={16} />
                </button>
              </div>

              <div className="voice-action-grid" style={{ gridTemplateColumns: isElectron ? "1fr 1fr 1fr" : "1fr 1fr" }}>
                <button
                  className={`voice-action-btn ${videoEnabled ? "active" : ""}`}
                  onClick={toggleCamera}
                >
                  {videoEnabled ? <Video size={14} /> : <VideoOff size={14} />}
                  <span>{t.videoBtn}</span>
                </button>
                <button
                  className={`voice-action-btn ${screenSharing ? "active" : ""}`}
                  onClick={openGoLivePicker}
                >
                  <Monitor size={14} />
                  <span>{screenSharing ? t.stopScreenBtn : t.screenBtn}</span>
                </button>
                {isElectron && (
                  <button
                    className={`voice-action-btn ${overlayActive ? "active" : ""}`}
                    onClick={toggleOverlay}
                    title="Sobreposição transparente de voz enquanto joga"
                  >
                    <PictureInPicture2 size={14} />
                    <span>Overlay</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bottom User Panel */}
          <div className="user-panel">
            <div
              className="user-panel-info"
              onClick={() => openProfileStudio("profile")}
              title={t.profileSettingsTooltip}
            >
              <UserAvatar
                profile={nodeStatus.profile}
                speaking={Boolean(speakingMap[nodeStatus.profile.peerId])}
                showStatus={true}
              />
              <div style={{ minWidth: 0 }}>
                <div className="user-panel-name">{selfDisplayName}</div>
                {currentGame ? (
                  <div className="user-panel-game" title={currentGame.name}>
                    <Gamepad2 size={11} color="#23a55a" />
                    <span>Jogando {currentGame.name}</span>
                  </div>
                ) : (
                  <div className="user-panel-sub">
                    {nodeStatus.profile.statusEmoji || ""}{" "}
                    {nodeStatus.profile.customStatus || `#${nodeStatus.profile.tag}`}
                  </div>
                )}
              </div>
            </div>

            <div className="user-panel-actions">
              {inputMode === "push_to_talk" && (
                <span
                  className={`ptt-status-pill ${isPttPressed ? "active" : ""}`}
                  title={`Atalho PTT: ${pttShortcut} • ${isPttPressed ? "Transmitindo" : "Aguardando tecla"}`}
                >
                  PTT: {pttShortcut}
                </span>
              )}
              <button
                className={`icon-btn ${selfMute ? "danger" : ""}`}
                onClick={toggleSelfMute}
                title={selfMute ? t.unmuteMic : t.muteMic}
              >
                {selfMute ? <MicOff size={17} /> : <Mic size={17} />}
              </button>
              <button
                className={`icon-btn ${selfDeafen ? "danger" : ""}`}
                onClick={toggleSelfDeafen}
                title={selfDeafen ? t.undeafenAudio : t.deafenAudio}
              >
                <Headphones size={17} />
              </button>
              <button
                className="icon-btn"
                onClick={() => openProfileStudio("media")}
                title={t.mediaSettingsTitle}
              >
                <Sliders size={17} />
              </button>
              <button
                className="icon-btn"
                onClick={() => openProfileStudio("profile")}
                title={t.profileSettingsTooltip}
              >
                <Settings size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Stage */}
        <div className="main-stage">
          {/* Top Header */}
          <div className="stage-header">
            <div className="stage-header-left">
              <Hash size={20} color="var(--text-muted)" />
              <span className="stage-header-title">{currentChannelObj?.name}</span>
              {currentChannelObj?.topic && (
                <span className="stage-header-topic">{currentChannelObj.topic}</span>
              )}
            </div>

            <div className="stage-header-right">
              {selectedRoomId === "dm_hub" && selectedDmPeerId && (() => {
                const dmCallId = getDmCallChannelId(selectedDmPeerId);
                const isInThisDmCall = activeVoiceChannelId === dmCallId;
                const currentDmPeer = connectedPeers.find((p) => p.peerId === selectedDmPeerId);
                if (isInThisDmCall) {
                  return (
                    <button
                      className="btn-secondary"
                      style={{ backgroundColor: "rgba(242, 63, 67, 0.2)", color: "#fca5a5" }}
                      onClick={handleLeaveVoiceChannel}
                    >
                      <PhoneOff size={14} />
                      <span>{t.endDmCallBtn}</span>
                    </button>
                  );
                }
                return (
                  <>
                    <button
                      className="btn-success"
                      onClick={() => currentDmPeer && handleStartDmCall(currentDmPeer, false)}
                    >
                      <PhoneCall size={14} />
                      <span>{t.startVoiceCallBtn}</span>
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => currentDmPeer && handleStartDmCall(currentDmPeer, true)}
                    >
                      <Video size={14} />
                      <span>{t.startVideoCallBtn}</span>
                    </button>
                  </>
                );
              })()}

              {selectedRoomId !== "dm_hub" && currentRoom && (
                <>
                  <button
                    className="btn-secondary"
                    onClick={() => openInviteServerModal(currentRoom)}
                  >
                    <UserPlus size={14} />
                    <span>{t.inviteServerBtn}</span>
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => openServerStudio("edit", currentRoom)}
                  >
                    <Settings size={14} />
                    <span>{t.customizeServerBtn}</span>
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ color: "#fca5a5" }}
                    onClick={() => {
                      if (
                        window.confirm(
                          lang === "pt"
                            ? `Deseja sair do servidor ${currentRoom.name}?`
                            : `Leave server ${currentRoom.name}?`
                        )
                      ) {
                        handleLeaveServer(currentRoom.id);
                      }
                    }}
                    title={t.leaveServerBtn}
                  >
                    <LogOut size={14} />
                    <span>{t.leaveServerBtn}</span>
                  </button>
                </>
              )}
              {!(selectedRoomId === "dm_hub" && !selectedDmPeerId) && (
                <button
                  type="button"
                  className={`btn-secondary ${showPinnedModal ? "active" : ""}`}
                  style={{ position: "relative" }}
                  onClick={() => setShowPinnedModal((prev) => !prev)}
                  title="Mensagens Fixadas"
                >
                  <Pin size={14} />
                  <span>Fixadas</span>
                  {currentChannelPinnedMessages.length > 0 && (
                    <span className="discord-header-badge">{currentChannelPinnedMessages.length}</span>
                  )}
                </button>
              )}
              <button className="btn-secondary" onClick={() => openProfileStudio("media")}>
                <Sliders size={14} />
                <span>{t.mediaSettingsBtn}</span>
              </button>
              <button className="btn-secondary" onClick={() => openProfileStudio("profile")}>
                <Sparkles size={14} />
                <span>{t.editMyProfileBtn}</span>
              </button>
              <button className="btn-primary" onClick={() => setShowConnectModal(true)}>
                <Radio size={15} />
                <span>{t.connectComputerBtn}</span>
              </button>
            </div>
          </div>

          <div className="stage-body">
            {renderChatColumnContent()}
            {renderPeerSidebarContent()}
          </div>
        </div>
      </div>
      ) : (
        <div className="app-shell mobile-shell">
          <div className={`mobile-body ${mobileInChat ? "in-chat" : ""}`}>
            {/* TAB: SERVERS */}
            {mobileTab === "servers" && (
              !mobileInChat ? (
                <div className="mobile-servers-split">
                  {/* Left Server Rail */}
                  <div className="server-rail mobile-rail">
                    <div
                      className={`server-icon home-logo ${selectedRoomId === "dm_hub" ? "active" : ""}`}
                      style={{ position: "relative" }}
                      onClick={() => {
                        setSelectedRoomId("dm_hub");
                        setSelectedDmPeerId(null);
                        setMobileTab("dms");
                        setMobileInChat(false);
                      }}
                      title={t.p2pHubTitle}
                    >
                      <img src="./logo.png" alt="Freecord Hub" />
                      {totalDmUnread > 0 ? (
                        <span className="unread-badge rail-badge">
                          {totalDmUnread > 99 ? "99+" : totalDmUnread}
                        </span>
                      ) : connectedPeers.length > 0 ? (
                        <span className="server-badge">{connectedPeers.length}</span>
                      ) : null}
                    </div>

                    <div className="rail-divider" />

                    {rooms.map((room) => {
                      const serverUnread = (room.textChannels || []).reduce(
                        (acc, ch) => acc + (unreadCounts[ch.id] || 0),
                        0
                      );
                      return (
                        <div
                          key={room.id}
                          className={`server-icon ${selectedRoomId === room.id ? "active" : ""}`}
                          style={{
                            position: "relative",
                            backgroundColor:
                              selectedRoomId === room.id
                                ? room.color || "#5865f2"
                                : room.iconUrl
                                ? "#111214"
                                : undefined,
                            padding: room.iconUrl ? 0 : undefined,
                            overflow: "visible",
                          }}
                          onClick={() => {
                            setSelectedRoomId(room.id);
                            if (room.textChannels?.[0]) {
                              setSelectedChannelId(room.textChannels[0].id);
                            }
                          }}
                        >
                          {room.iconUrl ? (
                            <img
                              src={room.iconUrl}
                              alt=""
                              style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }}
                            />
                          ) : (
                            room.shortName
                          )}
                          {serverUnread > 0 && (
                            <span className="unread-badge rail-badge">{serverUnread}</span>
                          )}
                        </div>
                      );
                    })}

                    <div
                      className="server-icon add-server-btn"
                      onClick={() => setShowNewRoomModal(true)}
                      title={t.createRoomBtn}
                    >
                      <Plus size={20} />
                    </div>

                    <div
                      className="server-icon connect-btn"
                      onClick={() => setShowConnectModal(true)}
                      title={t.connectComputerBtn}
                    >
                      <Radio size={20} />
                    </div>
                  </div>

                  {/* Right Channel Sidebar */}
                  <div
                    className="channel-sidebar mobile-sidebar"
                    style={
                      selectedRoomId !== "dm_hub" && currentRoom?.sidebarBgColor
                        ? { backgroundColor: currentRoom.sidebarBgColor }
                        : undefined
                    }
                  >
                    {currentRoom && (
                      <div
                        className="sidebar-banner-hero"
                        style={{
                          background: currentRoom?.bannerUrl
                            ? `url(${currentRoom.bannerUrl}) center/cover no-repeat`
                            : `linear-gradient(135deg, ${
                                currentRoom?.bannerColor || currentRoom?.color || "#5865f2"
                              } 0%, ${currentRoom?.bannerSecondaryColor || "#9b59b6"} 100%)`,
                        }}
                        onClick={() => openServerStudio("edit", currentRoom)}
                      >
                        <div className="sidebar-banner-top">
                          {currentRoom?.serverTag ? (
                            <span className="server-tag-badge">✦ {currentRoom.serverTag}</span>
                          ) : (
                            <span />
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <button
                              type="button"
                              className="tile-ctrl-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                openInviteServerModal(currentRoom);
                              }}
                              title={t.inviteServerBtn}
                            >
                              <UserPlus size={12} />
                            </button>
                            <button
                              type="button"
                              className="tile-ctrl-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                openServerStudio("edit", currentRoom);
                              }}
                              title={t.customizeServerBtn}
                            >
                              <Settings size={12} />
                            </button>
                            <button
                              type="button"
                              className="tile-ctrl-btn"
                              style={{ color: "#fca5a5" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(t.mobileLeaveServerConfirm(currentRoom?.name))) {
                                  handleLeaveServer(currentRoom?.id);
                                }
                              }}
                              title={t.leaveServerBtn}
                            >
                              <LogOut size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="sidebar-banner-bottom">
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                            {currentRoom?.iconUrl ? (
                              <img
                                src={currentRoom.iconUrl}
                                alt=""
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 7,
                                  objectFit: "cover",
                                  border: "2px solid rgba(255,255,255,0.4)",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 7,
                                  backgroundColor: currentRoom?.color || "#5865f2",
                                  color: "#fff",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {currentRoom?.shortName}
                              </div>
                            )}
                            <span
                              style={{
                                fontWeight: 800,
                                fontSize: 15,
                                color: "#fff",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                textShadow: "0 2px 6px rgba(0,0,0,0.65)",
                              }}
                            >
                              {currentRoom?.name}
                            </span>
                          </div>
                          <ShieldCheck size={15} color="#4ade80" />
                        </div>
                      </div>
                    )}

                    {currentRoom?.description && (
                      <div className="sidebar-description-bar">{currentRoom.description}</div>
                    )}

                    <div className="channel-list" style={{ flex: 1, overflowY: "auto" }}>
                      <div className="channel-section-title">
                        <span>{t.textChannelsHeader}</span>
                        <Plus
                          size={14}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setNewChannelType("text");
                            setShowNewChannelModal(true);
                          }}
                        />
                      </div>
                      {currentRoom?.textChannels?.map((ch) => {
                        const chUnread = unreadCounts[ch.id] || 0;
                        return (
                          <div
                            key={ch.id}
                            className={`channel-item ${selectedChannelId === ch.id ? "active" : ""} ${chUnread > 0 ? "has-unread" : ""}`}
                            onClick={() => {
                              setSelectedChannelId(ch.id);
                              setMobileInChat(true);
                            }}
                          >
                            <div className="channel-item-left">
                              <Hash size={18} />
                              <span style={{ fontWeight: chUnread > 0 ? 800 : undefined, color: chUnread > 0 ? "#fff" : undefined }}>
                                {ch.name}
                              </span>
                            </div>
                            {chUnread > 0 && <span className="unread-badge">{chUnread}</span>}
                          </div>
                        );
                      })}

                      <div className="channel-section-title">
                        <span>{t.voiceChannelsHeader}</span>
                        <Plus
                          size={14}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setNewChannelType("voice");
                            setShowNewChannelModal(true);
                          }}
                        />
                      </div>
                      {currentRoom?.voiceChannels?.map((vc) => {
                        const members = peersInVoiceChannel(vc.id);
                        return (
                          <div key={vc.id}>
                            <div
                              className={`channel-item ${activeVoiceChannelId === vc.id ? "active" : ""}`}
                              onClick={() => {
                                handleJoinVoiceChannel(vc);
                                setMobileTab("call");
                              }}
                            >
                              <div className="channel-item-left">
                                <Volume2 size={18} color={activeVoiceChannelId === vc.id ? "#23a55a" : undefined} />
                                <span>{vc.name}</span>
                              </div>
                              {members.length > 0 && (
                                <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>
                                  {members.length}
                                </span>
                              )}
                            </div>

                            {members.length > 0 && (
                              <div className="voice-channel-users">
                                {members.map((m) => (
                                  <div
                                    key={m.peerId}
                                    className="voice-user-row"
                                    onClick={() => setInspectedProfile(m)}
                                  >
                                    <div className="voice-user-left">
                                      <UserAvatar profile={m} size="small" speaking={m.speaking} />
                                      <span style={{ fontSize: 12 }}>{m.displayName}</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                      {m.screenSharing && <span className="live-badge">{t.liveBadge}</span>}
                                      {m.muted && <MicOff size={12} color="#f23f43" />}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="user-panel" style={{ marginTop: "auto" }}>
                      <div
                        className="user-panel-info"
                        onClick={() => setMobileTab("you")}
                      >
                        <UserAvatar
                          profile={nodeStatus.profile}
                          speaking={Boolean(speakingMap[nodeStatus.profile.peerId])}
                          showStatus={true}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div className="user-panel-name">{selfDisplayName}</div>
                          <div className="user-panel-sub">
                            {nodeStatus.profile.statusEmoji || ""}{" "}
                            {nodeStatus.profile.customStatus || `#${nodeStatus.profile.tag}`}
                          </div>
                        </div>
                      </div>

                      <div className="user-panel-actions">
                        <button
                          className={`icon-btn ${selfMute ? "danger" : ""}`}
                          onClick={toggleSelfMute}
                          title={selfMute ? t.unmuteMic : t.muteMic}
                        >
                          {selfMute ? <MicOff size={17} /> : <Mic size={17} />}
                        </button>
                        <button
                          className={`icon-btn ${selfDeafen ? "danger" : ""}`}
                          onClick={toggleSelfDeafen}
                          title={selfDeafen ? t.undeafenAudio : t.deafenAudio}
                        >
                          <Headphones size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mobile-chat-screen">
                  <div className="mobile-chat-header">
                    <button
                      type="button"
                      className="icon-btn mobile-header-btn"
                      onClick={() => setMobileInChat(false)}
                      title={t.mobileBackBtn}
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div className="mobile-header-title-wrap">
                      <div className="mobile-header-title">
                        <Hash size={18} color="var(--text-muted)" />
                        <span>{currentChannelObj?.name}</span>
                      </div>
                      {currentChannelObj?.topic && (
                        <div className="mobile-header-sub">{currentChannelObj.topic}</div>
                      )}
                    </div>
                    <div className="mobile-header-actions">
                      <button
                        type="button"
                        className={`icon-btn mobile-header-btn ${showPinnedModal ? "active" : ""}`}
                        style={{ position: "relative" }}
                        onClick={() => setShowPinnedModal((prev) => !prev)}
                        title="Mensagens Fixadas"
                      >
                        <Pin size={18} />
                        {currentChannelPinnedMessages.length > 0 && (
                          <span className="discord-header-badge">{currentChannelPinnedMessages.length}</span>
                        )}
                      </button>
                      <button
                        type="button"
                        className="icon-btn mobile-header-btn"
                        onClick={() => openInviteServerModal(currentRoom)}
                        title={t.inviteServerBtn}
                      >
                        <UserPlus size={18} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn mobile-header-btn"
                        onClick={() => setShowMobileMembers(true)}
                        title={t.mobileMembersTitle}
                      >
                        <Users size={18} />
                      </button>
                    </div>
                  </div>

                  {renderChatColumnContent()}
                </div>
              )
            )}

            {/* TAB: DMS */}
            {mobileTab === "dms" && (
              !mobileInChat ? (
                <div className="mobile-dms-screen">
                  <div className="mobile-dms-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <img src="./logo.png" alt="" style={{ width: 28, height: 28, borderRadius: 7 }} />
                      <span style={{ fontWeight: 800, fontSize: 17, color: "#fff" }}>
                        {t.mobileDmsTab}
                      </span>
                    </div>
                    <button
                      className="btn-primary"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                      onClick={() => setShowConnectModal(true)}
                    >
                      <Radio size={13} />
                      <span>{t.connectComputerBtn}</span>
                    </button>
                  </div>

                  <div className="mobile-search-bar">
                    <Hash size={14} color="#80848e" />
                    <input
                      type="text"
                      className="mobile-search-input"
                      placeholder={lang === "pt" ? "Buscar conversas ou peers..." : "Search friends or chats..."}
                      value={mobileSearchQuery}
                      onChange={(e) => setMobileSearchQuery(e.target.value)}
                    />
                    {mobileSearchQuery && (
                      <X size={14} color="#80848e" style={{ cursor: "pointer" }} onClick={() => setMobileSearchQuery("")} />
                    )}
                  </div>

                  <div className="mobile-endpoint-card">
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                      {t.yourEndpointLabel}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div className="endpoint-code" style={{ fontSize: 11, padding: "4px 8px" }}>
                        {nodeStatus.connectionStrings?.[0] || nodeStatus.localhostEndpoint || "P2P WebRTC Direct"}
                      </div>
                      <button
                        className="btn-secondary"
                        style={{ padding: "5px 10px", fontSize: 11 }}
                        onClick={() => handleCopy(nodeStatus.connectionStrings?.[0] || nodeStatus.localhostEndpoint || "")}
                      >
                        {copiedText ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedText ? t.copied : t.copyBtn}</span>
                      </button>
                    </div>
                  </div>

                  <div className="channel-section-title" style={{ padding: "12px 16px 4px 16px" }}>
                    <span>{t.directMessagesHeader(connectedPeers.length)}</span>
                  </div>

                  {connectedPeers.length === 0 ? (
                    <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                      <p>{t.noPeersYet}</p>
                      <button
                        className="btn-primary"
                        style={{ margin: "14px auto 0 auto" }}
                        onClick={() => setShowConnectModal(true)}
                      >
                        <Radio size={14} />
                        <span>{t.connectComputerBtn}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mobile-dms-list">
                      {connectedPeers
                        .filter((p) => {
                          if (!mobileSearchQuery.trim()) return true;
                          const q = mobileSearchQuery.toLowerCase();
                          return (
                            (p.displayName || "").toLowerCase().includes(q) ||
                            (p.username || "").toLowerCase().includes(q) ||
                            (p.tag || "").toLowerCase().includes(q)
                          );
                        })
                        .map((peer) => {
                        const sorted = [nodeStatus.profile.peerId, peer.peerId].sort().join("__");
                        const dmChId = `dm_${sorted}`;
                        const dmUnread = unreadCounts[dmChId] || 0;

                        return (
                          <div
                            key={peer.peerId}
                            className="mobile-dm-item"
                            onClick={() => {
                              setSelectedDmPeerId(peer.peerId);
                              setSelectedRoomId("dm_hub");
                              setMobileInChat(true);
                            }}
                          >
                            <UserAvatar profile={peer} size="medium" showStatus={true} />
                            <div className="mobile-dm-item-info">
                              <div className="mobile-dm-item-name">
                                {peer.displayName || peer.username}#{peer.tag}
                              </div>
                              <div className="mobile-dm-item-status">
                                {peer.statusEmoji || ""} {peer.customStatus || `${peer.address}:${peer.port}`}
                              </div>
                            </div>

                            <div className="mobile-dm-item-actions" onClick={(e) => e.stopPropagation()}>
                              {dmUnread > 0 && <span className="unread-badge">{dmUnread}</span>}
                              <button
                                className="icon-btn-round voice"
                                onClick={() => handleStartDmCall(peer, false)}
                                title={t.startVoiceCallBtn}
                              >
                                <PhoneCall size={15} />
                              </button>
                              <button
                                className="icon-btn-round video"
                                onClick={() => handleStartDmCall(peer, true)}
                                title={t.startVideoCallBtn}
                              >
                                <Video size={15} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {lanPeers.filter((l) => !l.isConnected && Number(l.tcpPort || 0) > 0).length > 0 && (
                    <>
                      <div className="channel-section-title" style={{ padding: "16px 16px 4px 16px" }}>
                        <span>{t.discoveredLanSidebar(lanPeers.filter((l) => !l.isConnected && Number(l.tcpPort || 0) > 0).length)}</span>
                      </div>
                      <div className="mobile-dms-list">
                        {lanPeers
                          .filter((l) => !l.isConnected && Number(l.tcpPort || 0) > 0)
                          .map((lp) => (
                            <div key={lp.peerId} className="mobile-dm-item">
                              <UserAvatar profile={lp} size="medium" showStatus={true} />
                              <div className="mobile-dm-item-info">
                                <div className="mobile-dm-item-name">{lp.displayName || lp.username}</div>
                                <div className="mobile-dm-item-status">{lp.host}:{lp.tcpPort}</div>
                              </div>
                              <button
                                className="btn-success"
                                style={{ padding: "6px 12px", fontSize: 12 }}
                                onClick={() => window.DiscordNative?.p2p?.connect(lp.host, lp.tcpPort)}
                              >
                                {t.connectShortBtn}
                              </button>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="mobile-chat-screen">
                  <div className="mobile-chat-header">
                    <button
                      type="button"
                      className="icon-btn mobile-header-btn"
                      onClick={() => setMobileInChat(false)}
                      title={t.mobileBackBtn}
                    >
                      <ArrowLeft size={20} />
                    </button>

                    {selectedDmPeer && (
                      <div
                        className="mobile-header-title-wrap"
                        onClick={() => setInspectedProfile(selectedDmPeer)}
                        style={{ cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <UserAvatar profile={selectedDmPeer} size="small" showStatus={true} />
                          <div className="mobile-header-title">
                            <span>{selectedDmPeer.displayName || selectedDmPeer.username}</span>
                          </div>
                        </div>
                        <div className="mobile-header-sub">
                          {selectedDmPeer.customStatus || `#${selectedDmPeer.tag}`}
                        </div>
                      </div>
                    )}

                    <div className="mobile-header-actions">
                      <button
                        type="button"
                        className={`icon-btn mobile-header-btn ${showPinnedModal ? "active" : ""}`}
                        style={{ position: "relative" }}
                        onClick={() => setShowPinnedModal((prev) => !prev)}
                        title="Mensagens Fixadas"
                      >
                        <Pin size={18} />
                        {currentChannelPinnedMessages.length > 0 && (
                          <span className="discord-header-badge">{currentChannelPinnedMessages.length}</span>
                        )}
                      </button>
                      {selectedDmPeer && (
                        <>
                          <button
                            type="button"
                            className="icon-btn mobile-header-btn"
                            onClick={() => handleStartDmCall(selectedDmPeer, false)}
                            title={t.startVoiceCallBtn}
                          >
                            <PhoneCall size={18} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn mobile-header-btn"
                            onClick={() => handleStartDmCall(selectedDmPeer, true)}
                            title={t.startVideoCallBtn}
                          >
                            <Video size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {renderChatColumnContent()}
                </div>
              )
            )}

            {/* TAB: CALL */}
            {mobileTab === "call" && (
              <div className="mobile-call-stage">
                <div className="mobile-call-header">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setMobileTab("servers")}
                    title="Minimizar Chamada"
                  >
                    <ChevronDown size={22} />
                  </button>

                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>
                      {activeVoiceChannelObj?.name || "Direct P2P Call"}
                    </div>
                    <div style={{ fontSize: 11, color: "#4ade80", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <span className="pulse-dot-inline" />
                      <span>{t.voiceConnected}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => openProfileStudio("media")}
                    title={t.mediaSettingsBtn}
                  >
                    <Sliders size={18} />
                  </button>
                </div>

                {/* Quick Foreground Focus Bar on Mobile: switch between Grid and any Camera/Screen Share */}
                {stageTiles.length > 0 && (
                  <div className="mobile-call-focus-bar">
                    <button
                      type="button"
                      className={`mobile-focus-pill ${!activeSpotlightTile ? "active" : ""}`}
                      onClick={() => setSpotlightTileId(null)}
                    >
                      <LayoutGrid size={13} />
                      <span>{lang === "en" ? "Grid" : "Grade"}</span>
                    </button>
                    {stageTiles.map((tile) => (
                      <button
                        key={`focus_pill_${tile.id}`}
                        type="button"
                        className={`mobile-focus-pill ${spotlightTileId === tile.id ? "active" : ""}`}
                        onClick={() =>
                          setSpotlightTileId((prev) => (prev === tile.id ? null : tile.id))
                        }
                      >
                        {tile.kind === "screen" ? <Monitor size={13} /> : <Video size={13} />}
                        <span>
                          {tile.kind === "screen"
                            ? `${lang === "en" ? "Screen" : "Tela"}: ${tile.label}`
                            : `${lang === "en" ? "Cam" : "Câmera"}: ${tile.label}`}
                        </span>
                      </button>
                    ))}
                    {hasAnyActiveWebcam && (
                      <button
                        type="button"
                        className={`mobile-focus-pill ${hideAllWebcams ? "active" : ""}`}
                        onClick={() => setHideAllWebcams((v) => !v)}
                      >
                        {hideAllWebcams ? <Video size={13} /> : <VideoOff size={13} />}
                        <span>{hideAllWebcams ? t.showAllWebcamsBtn : t.hideAllWebcamsBtn}</span>
                      </button>
                    )}
                  </div>
                )}

                {activeSpotlightTile ? (
                  <div className="mobile-call-spotlight-layout">
                    <div className="mobile-call-spotlight-main">
                      {renderStageTile(activeSpotlightTile, true)}
                    </div>
                  </div>
                ) : (
                  <div className="mobile-call-grid">
                    {stageTiles.map((tile) => (
                      <div key={tile.id} className="mobile-call-tile">
                        {renderStageTile(tile, false)}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mobile-call-controls">
                  <button
                    type="button"
                    className={`mobile-call-btn ${selfMute ? "danger" : ""}`}
                    onClick={toggleSelfMute}
                    title={selfMute ? t.unmuteMic : t.muteMic}
                  >
                    {selfMute ? <MicOff size={22} /> : <Mic size={22} />}
                  </button>

                  <button
                    type="button"
                    className={`mobile-call-btn ${selfDeafen ? "danger" : ""}`}
                    onClick={toggleSelfDeafen}
                    title={selfDeafen ? t.undeafenAudio : t.deafenAudio}
                  >
                    <Headphones size={22} />
                  </button>

                  <button
                    type="button"
                    className={`mobile-call-btn ${videoEnabled ? "active" : ""}`}
                    onClick={toggleCamera}
                    title={videoEnabled ? t.turnOffCamera : t.turnOnCamera}
                  >
                    {videoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
                  </button>

                  <button
                    type="button"
                    className={`mobile-call-btn ${screenSharing ? "active" : ""}`}
                    onClick={openGoLivePicker}
                    title={screenSharing ? t.stopScreenBtn : t.screenBtn}
                  >
                    <Monitor size={22} />
                  </button>

                  <button
                    type="button"
                    className="mobile-call-btn end-call"
                    onClick={() => {
                      handleLeaveVoiceChannel();
                      setMobileTab("servers");
                    }}
                    title={t.disconnectVoice}
                  >
                    <PhoneOff size={22} />
                  </button>
                </div>

                {inputMode === "push_to_talk" && (
                  <button
                    type="button"
                    className={`mobile-ptt-floating-btn ${isPttPressed ? "active" : ""}`}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      voiceEngineRef.current?.setPttState(true);
                      setIsPttPressed(true);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      voiceEngineRef.current?.setPttState(false);
                      setIsPttPressed(false);
                    }}
                    onTouchCancel={(e) => {
                      e.preventDefault();
                      voiceEngineRef.current?.setPttState(false);
                      setIsPttPressed(false);
                    }}
                    onMouseDown={() => {
                      voiceEngineRef.current?.setPttState(true);
                      setIsPttPressed(true);
                    }}
                    onMouseUp={() => {
                      voiceEngineRef.current?.setPttState(false);
                      setIsPttPressed(false);
                    }}
                  >
                    <Mic size={20} />
                    <span>{isPttPressed ? "FALANDO..." : "PRESSIONE PARA FALAR"}</span>
                  </button>
                )}
              </div>
            )}

            {/* TAB: YOU */}
            {mobileTab === "you" && (
              <div className="mobile-you-screen">
                <div className="mobile-you-header">
                  <div
                    className="mobile-you-banner"
                    style={{
                      background: nodeStatus.profile.bannerUrl
                        ? `url(${nodeStatus.profile.bannerUrl}) center/cover no-repeat`
                        : `linear-gradient(135deg, ${nodeStatus.profile.bannerColor || "#5865f2"} 0%, ${nodeStatus.profile.accentColorSecondary || "#2b2d31"} 100%)`,
                    }}
                  />
                  <div className="mobile-you-avatar-wrap">
                    <UserAvatar
                      profile={nodeStatus.profile}
                      style={{ width: 84, height: 84, fontSize: 32 }}
                      showStatus={true}
                    />
                  </div>
                </div>

                <div className="mobile-you-info">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>
                      {selfDisplayName}
                    </h2>
                    <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
                      #{nodeStatus.profile.tag}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, color: "#fff", marginBottom: 12 }}>
                    {nodeStatus.profile.statusEmoji || "⚡"}{" "}
                    <span style={{ color: "var(--text-muted)" }}>
                      {nodeStatus.profile.customStatus || "Serverless P2P Direct"}
                    </span>
                  </div>

                  {nodeStatus.profile.bio && (
                    <p style={{ fontSize: 13, color: "var(--text-normal)", lineHeight: 1.4, margin: "0 0 14px 0" }}>
                      {nodeStatus.profile.bio}
                    </p>
                  )}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    {(nodeStatus.profile.badges || []).map((b) => (
                      <span key={b} className="badge-pill">
                        ✦ {b}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mobile-menu-card">
                  <div className="mobile-menu-item" onClick={() => openProfileStudio("profile")}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Sparkles size={18} color="var(--brand-blurple)" />
                      <span>{t.editMyProfileBtn}</span>
                    </div>
                    <ChevronLeft size={16} style={{ transform: "rotate(180deg)", color: "var(--text-muted)" }} />
                  </div>

                  <div className="mobile-menu-item" onClick={() => openProfileStudio("media")}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Sliders size={18} color="#23a55a" />
                      <span>{t.mediaSettingsTitle}</span>
                    </div>
                    <ChevronLeft size={16} style={{ transform: "rotate(180deg)", color: "var(--text-muted)" }} />
                  </div>

                  <div className="mobile-menu-item" onClick={() => setShowConnectModal(true)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Radio size={18} color="#5865f2" />
                      <span>{t.connectComputerBtn}</span>
                    </div>
                    <ChevronLeft size={16} style={{ transform: "rotate(180deg)", color: "var(--text-muted)" }} />
                  </div>

                  <div className="mobile-menu-item" onClick={() => openProfileStudio("updates")}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Download size={18} color="#38bdf8" />
                      <span>
                        {t.tabUpdateSettings} (v{appVersion})
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {(updateStatus?.status === "available" || updateStatus?.status === "downloaded") && (
                        <span
                          style={{
                            background: "#23a55a",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: 999,
                          }}
                        >
                          v{updateStatus.version}
                        </span>
                      )}
                      <ChevronLeft size={16} style={{ transform: "rotate(180deg)", color: "var(--text-muted)" }} />
                    </div>
                  </div>

                  <div className="mobile-menu-item" onClick={handleToggleLanguage}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Globe size={18} color="#f59e0b" />
                      <span>{t.mobileLanguage}: <b>{lang === "en" ? "English" : "Português"}</b></span>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--brand-blurple)", fontWeight: 700 }}>
                      {lang === "en" ? "Mudar" : "Switch"}
                    </span>
                  </div>

                  <div className="mobile-menu-item" onClick={() => setNotificationsEnabled((v) => !v)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {notificationsEnabled ? (
                        <Bell size={18} color="#23a55a" />
                      ) : (
                        <BellOff size={18} color="#f23f43" />
                      )}
                      <span>{t.mobileNotifications}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: notificationsEnabled ? "#4ade80" : "#fca5a5" }}>
                      {notificationsEnabled ? t.mobileEnabled : t.mobileMuted}
                    </span>
                  </div>
                </div>

                <div style={{ padding: "16px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
                  Freecord PTB {appVersion} • Serverless P2P
                </div>
              </div>
            )}
          </div>

          {/* Floating In-App Video/Screen PiP Mini-Player when outside Call Tab */}
          {activeVoiceChannelId && mobileTab !== "call" && activeInAppPipTile && (
            <div
              className="in-app-floating-pip-player"
              onClick={() => {
                setSpotlightTileId(activeInAppPipTile.id);
                setMobileTab("call");
              }}
            >
              <VideoStreamView
                videoId={`in_app_pip_${activeInAppPipTile.id}`}
                stream={activeInAppPipTile.stream}
                frameUrl={activeInAppPipTile.frameUrl}
                muted={true}
                fitMode="contain"
              />
              <div className="in-app-floating-pip-bar" onClick={(e) => e.stopPropagation()}>
                <span className="in-app-floating-pip-title">
                  {activeInAppPipTile.kind === "screen" ? "🖥️" : "📷"} {activeInAppPipTile.label}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  {window.FreecordAndroid?.enterPipMode && (
                    <button
                      type="button"
                      className="tile-ctrl-btn"
                      onClick={() => handleToggleTilePiP(activeInAppPipTile, `in_app_pip_${activeInAppPipTile.id}`)}
                      title="PiP"
                    >
                      <PictureInPicture2 size={11} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="tile-ctrl-btn"
                    onClick={() => {
                      setSpotlightTileId(activeInAppPipTile.id);
                      setMobileTab("call");
                    }}
                    title="Expandir"
                  >
                    <Maximize2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Mini-Call Bar */}
          {activeVoiceChannelId && mobileTab !== "call" && (
            <div className="mobile-mini-call-bar" onClick={() => setMobileTab("call")}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <span className="pulse-dot-inline" />
                <Volume2 size={16} color="#23a55a" />
                <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <strong style={{ color: "#fff", fontSize: 13 }}>
                    {activeVoiceChannelObj?.name || "P2P Voice"}
                  </strong>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className={`icon-btn ${selfMute ? "danger" : ""}`}
                  style={{ width: 30, height: 30 }}
                  onClick={toggleSelfMute}
                >
                  {selfMute ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  style={{ width: 30, height: 30 }}
                  onClick={handleLeaveVoiceChannel}
                >
                  <PhoneOff size={14} />
                </button>
                <button
                  type="button"
                  className="btn-success"
                  style={{ padding: "4px 8px", fontSize: 11 }}
                  onClick={() => setMobileTab("call")}
                >
                  {t.mobileOpenCallStage}
                </button>
              </div>
            </div>
          )}

          {/* Discord Mobile Bottom Navigation Bar */}
          {!mobileInChat && mobileTab !== "call" && (
            <nav className="mobile-bottom-nav">
              <button
                type="button"
                className={`mobile-nav-item ${mobileTab === "servers" ? "active" : ""}`}
                onClick={() => {
                  setMobileTab("servers");
                }}
              >
                <div className="mobile-nav-icon-wrap" style={{ position: "relative" }}>
                  <Hash size={22} />
                  {totalServerUnread > 0 && (
                    <span className="mobile-nav-badge">{totalServerUnread}</span>
                  )}
                </div>
                <span>{t.mobileServersTab}</span>
              </button>

              <button
                type="button"
                className={`mobile-nav-item ${mobileTab === "dms" ? "active" : ""}`}
                onClick={() => {
                  setMobileTab("dms");
                }}
              >
                <div className="mobile-nav-icon-wrap" style={{ position: "relative" }}>
                  <MessageSquare size={22} />
                  {totalDmUnread > 0 && (
                    <span className="mobile-nav-badge">{totalDmUnread}</span>
                  )}
                </div>
                <span>{t.mobileDmsTab}</span>
              </button>

              {activeVoiceChannelId && (
                <button
                  type="button"
                  className={`mobile-nav-item ${mobileTab === "call" ? "active" : ""}`}
                  onClick={() => {
                    setMobileTab("call");
                  }}
                >
                  <div className="mobile-nav-icon-wrap" style={{ position: "relative" }}>
                    <PhoneCall size={22} color="#23a55a" />
                    <span className="mobile-nav-pulse-dot" />
                  </div>
                  <span style={{ color: "#23a55a" }}>{t.mobileCallTab}</span>
                </button>
              )}

              <button
                type="button"
                className={`mobile-nav-item ${mobileTab === "you" ? "active" : ""}`}
                onClick={() => {
                  setMobileTab("you");
                }}
              >
                <div className="mobile-nav-icon-wrap">
                  <UserAvatar
                    profile={nodeStatus.profile}
                    size="small"
                    showStatus={true}
                    style={{ width: 26, height: 26 }}
                  />
                </div>
                <span>{t.mobileYouTab}</span>
              </button>
            </nav>
          )}

          {/* Slide-over Members Drawer on Mobile */}
          {showMobileMembers && (
            <div className="mobile-drawer-backdrop" onClick={() => setShowMobileMembers(false)}>
              <div className="mobile-drawer-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="mobile-drawer-header">
                  <span style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>
                    {t.mobileMembersTitle}
                  </span>
                  <button className="icon-btn" onClick={() => setShowMobileMembers(false)}>
                    <X size={18} />
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {renderPeerSidebarContent(true)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* True Edge-to-Edge Fullscreen Video/Screen Overlay (and Android System PiP view) */}
      {(activeFullscreenTile || (isAndroidSystemPip && (activeSpotlightTile || activeInAppPipTile))) && (() => {
        const fsTile = activeFullscreenTile || activeSpotlightTile || activeInAppPipTile;
        if (!fsTile) return null;
        return (
          <div className={`true-fullscreen-stage-overlay ${isAndroidSystemPip ? "android-pip-mode" : ""}`}>
            {renderStageTile(fsTile, true)}
            {!isAndroidSystemPip && (
              <button
                type="button"
                className="true-fullscreen-exit-btn"
                onClick={() => handleToggleTileFullscreen(fsTile)}
              >
                <Minimize2 size={16} />
                <span>{lang === "en" ? "Exit Fullscreen" : "Sair da Tela Cheia"}</span>
              </button>
            )}
          </div>
        );
      })()}

      {/* Modal: Inspected User Profile Card Popout */}
      {inspectedProfile && (
        <div className="modal-backdrop" onClick={() => setInspectedProfile(null)}>
          <div
            style={{ width: 380, maxWidth: "94vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <ProfileCard
              profile={
                inspectedProfile.peerId === nodeStatus.profile.peerId
                  ? nodeStatus.profile
                  : connectedPeers.find((p) => p.peerId === inspectedProfile.peerId) ||
                    inspectedProfile
              }
              isSelf={inspectedProfile.peerId === nodeStatus.profile.peerId}
              t={t}
              onEditProfile={openProfileStudio}
              onQuickDm={handleSendQuickDm}
              onStartVoiceCall={(p) => handleStartDmCall(p, false)}
              onStartVideoCall={(p) => handleStartDmCall(p, true)}
            />
          </div>
        </div>
      )}

      {/* Modal: Full Profile Customization & Voice/Video/Screen Settings Studio */}
      {showProfileModal && (
        <div className="modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="profile-studio-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-drag-handle" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                  {settingsTab === "media" ? (
                    <>
                      <Sliders size={18} color="#23a55a" />
                      <span>{t.mediaSettingsTitle}</span>
                    </>
                  ) : settingsTab === "updates" ? (
                    <>
                      <Download size={18} color="#38bdf8" />
                      <span>{t.updateSettingsTitle}</span>
                    </>
                  ) : settingsTab === "security" ? (
                    <>
                      <ShieldCheck size={18} color="#10b981" />
                      <span>E2EE & Backup</span>
                    </>
                  ) : (
                    <>
                      <User size={18} color="var(--brand-blurple)" />
                      <span>{t.profileModalTitle}</span>
                    </>
                  )}
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {settingsTab === "media" ? (
                    t.mediaSettingsSub
                  ) : settingsTab === "updates" ? (
                    t.updateSettingsSub
                  ) : (
                    <>
                      {t.cryptoPeerIdLabel} <b>{nodeStatus.profile.peerId}</b>
                    </>
                  )}
                </p>
              </div>
              <button className="icon-btn" onClick={() => setShowProfileModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Studio Top Tabs: Profile vs Audio/Camera/Screen vs Updates */}
            <div className="studio-tab-bar">
              <button
                type="button"
                className={`studio-tab-btn ${settingsTab === "profile" ? "active" : ""}`}
                onClick={() => setSettingsTab("profile")}
              >
                <User size={14} />
                <span>{t.tabProfileSettings}</span>
              </button>
              <button
                type="button"
                className={`studio-tab-btn ${settingsTab === "media" ? "active" : ""}`}
                onClick={() => {
                  setSettingsTab("media");
                  refreshMediaDevices();
                }}
              >
                <Sliders size={14} />
                <span>{t.tabMediaSettings}</span>
              </button>
              <button
                type="button"
                className={`studio-tab-btn ${settingsTab === "updates" ? "active" : ""}`}
                onClick={() => setSettingsTab("updates")}
              >
                <Download size={14} />
                <span>{t.tabUpdateSettings}</span>
              </button>
              <button
                type="button"
                className={`studio-tab-btn ${settingsTab === "security" ? "active" : ""}`}
                onClick={() => {
                  setSettingsTab("security");
                  setIdentityBackupStatus(null);
                }}
              >
                <ShieldCheck size={14} />
                <span>E2EE & Backup</span>
              </button>
            </div>

            {settingsTab === "media" ? (
              <div>
                <div className="profile-studio-grid">
                  {/* Left Column: Audio Output & Microphone Input */}
                  <div>
                    {/* Audio Output (Speaker / Headset) */}
                    <div className="media-section-card">
                      <div className="media-section-header">
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Headphones size={16} color="#5865f2" />
                          {t.speakerDeviceLabel}
                        </span>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: "4px 9px", fontSize: 11 }}
                          onClick={refreshMediaDevices}
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>

                      <div className="form-group">
                        <select
                          className="form-select"
                          value={selectedSpeakerId}
                          onChange={(e) => handleSelectSpeakerDevice(e.target.value)}
                        >
                          <option value="default">{t.defaultDeviceOption}</option>
                          {mediaDevices.audioOutputs.map((dev, idx) => (
                            <option key={dev.deviceId || idx} value={dev.deviceId}>
                              {dev.label || `Audio Output #${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label>{t.masterOutputVolLabel(masterOutputVolume)}</label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={masterOutputVolume}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setMasterOutputVolume(val);
                            voiceEngineRef.current?.setMasterOutputVolume(val);
                          }}
                          style={{ width: "100%", cursor: "pointer" }}
                        />
                      </div>

                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => voiceEngineRef.current?.playTestOutputTone()}
                      >
                        <Volume2 size={14} />
                        <span>{t.testSpeakerBtn}</span>
                      </button>
                    </div>

                    {/* Microphone Input */}
                    <div className="media-section-card">
                      <div className="media-section-header">
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Mic size={16} color="#23a55a" />
                          {t.micDeviceLabel}
                        </span>
                      </div>

                      <div className="form-group">
                        <select
                          className="form-select"
                          value={selectedMicId}
                          onChange={(e) => handleSelectMicDevice(e.target.value)}
                        >
                          <option value="default">{t.defaultDeviceOption}</option>
                          {mediaDevices.audioInputs.map((dev, idx) => (
                            <option key={dev.deviceId || idx} value={dev.deviceId}>
                              {dev.label || `Microphone #${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <label style={{ marginBottom: 0 }}>{t.testMicLabel}</label>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: "3px 8px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 5 }}
                            onClick={() => voiceEngineRef.current?.startLocalVoice(true)}
                          >
                            <Mic size={12} />
                            <span>Test</span>
                          </button>
                        </div>
                        <div className="mic-meter-track">
                          <div
                            className="mic-meter-fill"
                            style={{ width: `${micInputLevel}%` }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                        {[
                          {
                            key: "echoCancellation",
                            val: echoCancellation,
                            setter: setEchoCancellation,
                            label: t.echoCancelLabel,
                          },
                          {
                            key: "noiseSuppression",
                            val: noiseSuppression,
                            setter: setNoiseSuppression,
                            label: t.noiseSuppLabel,
                          },
                          {
                            key: "autoGainControl",
                            val: autoGainControl,
                            setter: setAutoGainControl,
                            label: t.autoGainLabel,
                          },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            className={`status-choice-btn ${opt.val ? "active" : ""}`}
                            onClick={async () => {
                              const next = !opt.val;
                              opt.setter(next);
                              await voiceEngineRef.current?.setAudioInputDevice(selectedMicId, {
                                [opt.key]: next,
                              });
                            }}
                          >
                            {opt.val ? "✓ " : ""}
                            {opt.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          className={`status-choice-btn ${studioDspEnabled ? "active" : ""}`}
                          onClick={() => setStudioDspEnabled(!studioDspEnabled)}
                          title="Filtro de voz passa-alta 85Hz + passa-baixa 7800Hz e Noise Gate dinâmico"
                        >
                          {studioDspEnabled ? "✓ " : ""}
                          Studio DSP & Noise Gate
                        </button>
                      </div>

                      {studioDspEnabled && (
                        <div style={{ marginTop: 12, background: "#1e1f22", padding: 10, borderRadius: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#dbdee1", marginBottom: 4 }}>
                            <span>Limiar do Noise Gate (Supressão de Ruído de Fundo)</span>
                            <span style={{ color: "#23a55a", fontWeight: 700 }}>{noiseGateThreshold} dB</span>
                          </div>
                          <input
                            type="range"
                            min="-65"
                            max="-15"
                            step="1"
                            value={noiseGateThreshold}
                            onChange={(e) => setNoiseGateThreshold(Number(e.target.value))}
                            style={{ width: "100%", accentColor: "#23a55a" }}
                          />
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                            Corta ruídos de ventilador, cliques mecânicos e estalos abaixo de {noiseGateThreshold} dB.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Input Mode: VAD vs Push-to-Talk */}
                    <div className="media-section-card" style={{ marginTop: 14 }}>
                      <div className="media-section-header">
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Radio size={16} color="#5865f2" />
                          <span>Modo de Entrada de Voz</span>
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                        <div
                          className={`input-mode-card ${inputMode === "voice_activity" ? "active" : ""}`}
                          onClick={() => setInputMode("voice_activity")}
                        >
                          <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                            Detecção de Voz (VAD)
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            O microfone ativa automaticamente quando você fala.
                          </div>
                        </div>

                        <div
                          className={`input-mode-card ${inputMode === "push_to_talk" ? "active" : ""}`}
                          onClick={() => setInputMode("push_to_talk")}
                        >
                          <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                            Pressionar para Falar (PTT)
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            O microfone transmite apenas enquanto a tecla estiver pressionada.
                          </div>
                        </div>
                      </div>

                      {inputMode === "push_to_talk" && (
                        <div style={{ marginTop: 14, background: "#1e1f22", padding: 12, borderRadius: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: "#dbdee1", margin: 0 }}>
                              Atalho do Push-to-Talk {isElectron ? "(Global / Em segundo plano)" : ""}
                            </label>
                            <button
                              type="button"
                              className={`btn-secondary ${isRecordingPttKey ? "active" : ""}`}
                              style={{ padding: "4px 10px", fontSize: 12 }}
                              onClick={() => setIsRecordingPttKey((prev) => !prev)}
                            >
                              {isRecordingPttKey ? "Pressione qualquer tecla..." : "Gravar Atalho"}
                            </button>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <kbd className="ptt-key-badge">{pttShortcut}</kbd>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              {isElectron ? "Funciona em segundo plano durante jogos em tela cheia." : "Atalho ativo enquanto a janela estiver em uso."}
                            </span>
                          </div>

                          {/* Quick Preset Shortcuts */}
                          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                            {["ControlRight", "CapsLock", "PageDown", "F13", "Space", "AltRight"].map((key) => (
                              <button
                                key={key}
                                type="button"
                                className={`preset-key-btn ${pttShortcut === key ? "active" : ""}`}
                                onClick={() => {
                                  setPttShortcut(key);
                                  try { localStorage.setItem("freecord_ptt_shortcut", key); } catch {}
                                }}
                              >
                                {key}
                              </button>
                            ))}
                          </div>

                          {/* Release Delay Slider */}
                          <div style={{ marginTop: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#dbdee1", marginBottom: 4 }}>
                              <span>Atraso para Soltar PTT (Release Delay)</span>
                              <span style={{ color: "#5865f2", fontWeight: 700 }}>{pttReleaseDelay} ms</span>
                            </div>
                            <input
                              type="range"
                              min="20"
                              max="1000"
                              step="20"
                              value={pttReleaseDelay}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setPttReleaseDelay(val);
                                try { localStorage.setItem("freecord_ptt_delay", String(val)); } catch {}
                              }}
                              style={{ width: "100%", accentColor: "#5865f2" }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Camera & Screen Share Resolution / FPS */}
                  <div>
                    {/* Video Camera Selection & Resolution */}
                    <div className="media-section-card">
                      <div className="media-section-header">
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Video size={16} color="#eb459e" />
                          {t.cameraDeviceLabel}
                        </span>
                        <button
                          type="button"
                          className={cameraTestStream ? "btn-secondary" : "btn-primary"}
                          style={{ padding: "4px 10px", fontSize: 11 }}
                          onClick={() => toggleCameraPreview()}
                        >
                          {cameraTestStream ? t.stopTestCameraBtn : t.testCameraBtn}
                        </button>
                      </div>

                      <div className="form-group">
                        <select
                          className="form-select"
                          value={selectedCameraId}
                          onChange={(e) => handleSelectCameraDevice(e.target.value)}
                        >
                          <option value="default">{t.defaultDeviceOption}</option>
                          {mediaDevices.videoInputs.map((dev, idx) => (
                            <option key={dev.deviceId || idx} value={dev.deviceId}>
                              {dev.label || `Camera #${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>{t.cameraResLabel}</label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                          {Object.entries(CAMERA_RESOLUTIONS).map(([key, info]) => (
                            <button
                              key={key}
                              type="button"
                              className={`status-choice-btn ${
                                cameraResolution === key ? "active" : ""
                              }`}
                              onClick={() => handleSelectCameraResolution(key)}
                            >
                              {info.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {cameraTestStream && (
                        <div
                          className="camera-preview-box"
                          style={{
                            position: "relative",
                            width: "100%",
                            maxWidth: 480,
                            height: 200,
                            minHeight: 180,
                            maxHeight: 220,
                            overflow: "hidden",
                            borderRadius: 8,
                            background: "#08080a",
                            margin: "10px auto 0 auto",
                          }}
                        >
                          <VideoStreamView stream={cameraTestStream} muted={true} fitMode="cover" />
                        </div>
                      )}
                    </div>

                    {/* Screen Share Resolution & FPS */}
                    <div className="media-section-card">
                      <div className="media-section-header">
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Monitor size={16} color="#f0b232" />
                          {t.screenQualitySectionTitle}
                        </span>
                      </div>

                      <div className="form-group">
                        <label>{t.screenResLabel}</label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                          {Object.entries(SCREEN_RESOLUTIONS).map(([key, info]) => (
                            <button
                              key={key}
                              type="button"
                              className={`status-choice-btn ${
                                screenResolution === key ? "active" : ""
                              }`}
                              onClick={() => handleSelectScreenQuality(key, screenFps)}
                            >
                              {info.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>{t.screenFpsLabel}</label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                          {SCREEN_FPS_OPTIONS.map((fps) => (
                            <button
                              key={fps}
                              type="button"
                              className={`status-choice-btn ${
                                Number(screenFps) === fps ? "active" : ""
                              }`}
                              onClick={() => handleSelectScreenQuality(screenResolution, fps)}
                            >
                              {fps} FPS
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setShowProfileModal(false)}
                  >
                    <Check size={14} />
                    <span>{t.closeBtn}</span>
                  </button>
                </div>
              </div>
            ) : settingsTab === "updates" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="media-section-card">
                  <div className="media-section-header">
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Radio size={16} color="#5865f2" />
                      {t.updateSettingsTitle}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
                    {t.updateSettingsSub}
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        {t.currentVersionLabel}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 4 }}>
                        v{appVersion}
                      </div>
                    </div>

                    <div style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        {t.releaseChannelLabel}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#57f287", marginTop: 4 }}>
                        PTB (Public Test Build)
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "var(--bg-secondary)", padding: 14, borderRadius: 8, marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                      {t.updateStatusLabel}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
                      {updateStatus?.status === "downloaded" && (
                        <span style={{ color: "#57f287", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Check size={16} />
                          <span>{t.updateReadyNotice} (v{updateStatus.version})</span>
                        </span>
                      )}
                      {updateStatus?.status === "downloading" && (
                        <div>
                          <span style={{ color: "#5865f2", display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <Download size={16} />
                            <span>{t.downloadingUpdate} {updateStatus.percent || 0}%</span>
                          </span>
                          <div
                            style={{
                              width: "100%",
                              height: 8,
                              background: "rgba(255,255,255,0.08)",
                              borderRadius: 999,
                              overflow: "hidden",
                              marginTop: 8,
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(2, updateStatus.percent || 0))}%`,
                                height: "100%",
                                background: "linear-gradient(90deg, #5865f2, #23a55a)",
                                transition: "width 0.2s ease",
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {updateStatus?.status === "available" && (
                        <span style={{ color: "#fee75c" }}>
                          📦 {t.updateAvailableText(updateStatus.version)}
                        </span>
                      )}
                      {updateStatus?.status === "not-available" && (
                        <span style={{ color: "#57f287" }}>
                          ✅ {t.updateUpToDate}
                        </span>
                      )}
                      {updateStatus?.status === "checking" && (
                        <span style={{ color: "var(--text-muted)" }}>
                          ⏳ {t.checkForUpdatesBtn}...
                        </span>
                      )}
                      {updateStatus?.status === "dev" && (
                        <span style={{ color: "var(--text-muted)" }}>
                          🛠️ {updateStatus.message || "Modo de desenvolvimento. O atualizador automático opera nos instaladores compilados."}
                        </span>
                      )}
                      {updateStatus?.status === "error" && (
                        <span style={{ color: "#ed4245" }}>
                          ⚠️ {updateStatus.message || "Erro ao verificar atualizações."}
                        </span>
                      )}
                      {(!updateStatus?.status || updateStatus?.status === "idle") && (
                        <span style={{ color: "var(--text-muted)" }}>
                          {t.updateUpToDate}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={isCheckingUpdate || updateStatus?.status === "checking"}
                      onClick={handleCheckForUpdates}
                    >
                      {isCheckingUpdate ? "..." : t.checkForUpdatesBtn}
                    </button>

                    {updateStatus?.status === "downloaded" && (
                      <button
                        type="button"
                        className="btn-success"
                        onClick={() => {
                          if (window.FreecordAndroid?.installDownloadedApk) {
                            window.FreecordAndroid.installDownloadedApk();
                          } else {
                            window.DiscordNative?.updater?.quitAndInstall?.();
                          }
                        }}
                      >
                        <Download size={14} />
                        <span>
                          {window.FreecordAndroid?.installDownloadedApk
                            ? lang === "en"
                              ? `Install Downloaded APK (v${updateStatus.version})`
                              : `Instalar Novo APK Agora (v${updateStatus.version})`
                            : t.restartAndInstallBtn}
                        </span>
                      </button>
                    )}

                    {updateStatus?.status === "available" && updateStatus?.downloadUrl && (
                      <button
                        type="button"
                        className="btn-success"
                        onClick={() => {
                          if (window.FreecordAndroid?.downloadAndInstallApk) {
                            window.FreecordAndroid.downloadAndInstallApk(
                              updateStatus.downloadUrl,
                              String(updateStatus.version || "")
                            );
                          } else if (window.FreecordAndroid?.openExternalUrl) {
                            window.FreecordAndroid.openExternalUrl(updateStatus.downloadUrl);
                          } else {
                            window.open(updateStatus.downloadUrl, "_blank", "noopener,noreferrer");
                          }
                        }}
                      >
                        <Download size={14} />
                        <span>
                          {window.FreecordAndroid?.downloadAndInstallApk
                            ? lang === "en"
                              ? `Download & Install in Freecord (v${updateStatus.version})`
                              : `Baixar e Instalar pelo Freecord (v${updateStatus.version})`
                            : lang === "en"
                            ? `Download Update (v${updateStatus.version})`
                            : `Baixar e Instalar Atualização (v${updateStatus.version})`}
                        </span>
                      </button>
                    )}

                    <a
                      href="https://github.com/Kauanmaffeikraus/Freecord/releases"
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary"
                      style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <ExternalLink size={14} />
                      <span>{t.viewReleasesOnGithub}</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : settingsTab === "security" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="media-section-card">
                  <div className="media-section-header">
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Lock size={16} color="#23a55a" />
                      {lang === "en"
                        ? "End-to-End Encryption (E2EE) & Cryptographic Keys"
                        : "Criptografia Ponta-a-Ponta (E2EE) & Chaves Criptográficas"}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
                    {lang === "en"
                      ? "Your messages are encrypted and authenticated with your local SHA-256-CTR-HMAC cryptographic identity. Export your identity backup (.freecord-id.json) to clone or restore your account, keys, and servers on another PC or Android phone."
                      : "Suas mensagens são criptografadas e autenticadas com sua identidade criptográfica local SHA-256-CTR-HMAC. Exporte seu backup de identidade (.freecord-id.json) para clonar ou restaurar sua conta, chaves e servidores em outro PC ou celular Android."}
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                    <div style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        {lang === "en" ? "E2EE Key Fingerprint" : "Impressão Digital E2EE"}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#57f287", marginTop: 4, fontFamily: "monospace" }}>
                        🔒 {cryptoIdentity.keyFingerprint}
                      </div>
                    </div>

                    <div style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        {lang === "en" ? "Cipher Suite" : "Algoritmo de Cifragem"}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginTop: 4 }}>
                        SHA256-CTR + HMAC-SHA256
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>{lang === "en" ? "Public Key (Hex)" : "Chave Pública (Hex)"}</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="form-input"
                        readOnly
                        value={cryptoIdentity.publicKey}
                        style={{ fontFamily: "monospace", fontSize: 12 }}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleCopy(cryptoIdentity.publicKey)}
                      >
                        {copiedText === cryptoIdentity.publicKey ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedText === cryptoIdentity.publicKey ? t.copied : t.copyBtn}</span>
                      </button>
                    </div>
                  </div>

                  <input
                    ref={identityImportInputRef}
                    type="file"
                    accept=".json,.freecord-id,application/json,text/plain"
                    style={{ display: "none" }}
                    onChange={handleImportIdentityBackup}
                  />

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleExportIdentityBackup}
                    >
                      <Download size={14} />
                      <span>
                        {lang === "en"
                          ? "Export Identity Backup (.freecord-id)"
                          : "Exportar Backup de Identidade (.freecord-id)"}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => identityImportInputRef.current?.click()}
                    >
                      <Upload size={14} />
                      <span>
                        {lang === "en"
                          ? "Import / Restore Backup"
                          : "Importar / Restaurar Backup"}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        requestHistorySyncFromPeer();
                        setIdentityBackupStatus({
                          type: "success",
                          text:
                            lang === "en"
                              ? "Requested offline message history sync from connected peers!"
                              : "Sincronização de histórico offline solicitada aos peers conectados!",
                        });
                      }}
                    >
                      <RefreshCw size={14} />
                      <span>
                        {lang === "en"
                          ? "Sync Offline Messages Now"
                          : "Sincronizar Mensagens Offline Agora"}
                      </span>
                    </button>
                  </div>

                  {identityBackupStatus && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 10,
                        borderRadius: 6,
                        fontSize: 12,
                        background:
                          identityBackupStatus.type === "error"
                            ? "rgba(242,63,67,0.2)"
                            : "rgba(35,165,90,0.2)",
                        color:
                          identityBackupStatus.type === "error" ? "#fca5a5" : "#86efac",
                      }}
                    >
                      {identityBackupStatus.text}
                    </div>
                  )}
                </div>
              </div>
            ) : (
            <form onSubmit={handleSaveProfile}>
              <div className="profile-studio-grid">
                {/* Left Column: Customization Controls */}
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.7fr", gap: 8 }}>
                    <div className="form-group">
                      <label>{t.displayNameLabel}</label>
                      <input
                        className="form-input"
                        value={profileForm.displayName}
                        onChange={(e) =>
                          setProfileForm((p) => ({ ...p, displayName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>{t.usernameLabel}</label>
                      <input
                        className="form-input"
                        value={profileForm.username}
                        onChange={(e) =>
                          setProfileForm((p) => ({ ...p, username: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>#Tag</label>
                      <input
                        className="form-input"
                        maxLength={6}
                        value={profileForm.tag}
                        onChange={(e) =>
                          setProfileForm((p) => ({ ...p, tag: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>{t.pronounsLabel}</label>
                    <input
                      className="form-input"
                      placeholder={t.pronounsPlaceholder}
                      value={profileForm.pronouns}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, pronouns: e.target.value }))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>{t.presenceStatusLabel}</label>
                    <div className="status-selector-row">
                      {[
                        { id: "online", label: t.statusOnline, color: "#23a55a" },
                        { id: "idle", label: t.statusIdle, color: "#f0b232" },
                        { id: "dnd", label: t.statusDnd, color: "#f23f43" },
                        { id: "invisible", label: t.statusInvisible, color: "#80848e" },
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          className={`status-choice-btn ${
                            profileForm.status === st.id ? "active" : ""
                          }`}
                          onClick={() =>
                            setProfileForm((p) => ({ ...p, status: st.id }))
                          }
                        >
                          <span
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: "50%",
                              backgroundColor: st.color,
                            }}
                          />
                          <span>{st.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>{t.customStatusLabel}</label>
                    <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                      {STATUS_EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          className="quick-react-btn"
                          style={{
                            background:
                              profileForm.statusEmoji === em
                                ? "rgba(88, 101, 242, 0.35)"
                                : "var(--bg-tertiary)",
                            border:
                              profileForm.statusEmoji === em
                                ? "1px solid var(--brand-blurple)"
                                : "1px solid transparent",
                          }}
                          onClick={() =>
                            setProfileForm((p) => ({ ...p, statusEmoji: em }))
                          }
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                    <input
                      className="form-input"
                      value={profileForm.customStatus}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, customStatus: e.target.value }))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>{t.bioLabel}</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder={t.bioPlaceholder}
                      value={profileForm.bio}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, bio: e.target.value }))
                      }
                    />
                  </div>

                  {/* Avatar Upload & Color */}
                  <div className="form-group">
                    <label>{t.avatarImageLabel}</label>
                    <input
                      ref={avatarUploadRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const dataUrl = await readImageFileToDataUrl(file, 240, 240, 0.86);
                          setProfileForm((p) => ({ ...p, avatarUrl: dataUrl }));
                        } catch (err) {
                          pushToast({ title: "Avatar", body: err?.message || "Erro ao carregar imagem" });
                        }
                        e.target.value = "";
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => avatarUploadRef.current?.click()}
                      >
                        <Upload size={14} />
                        <span>{t.uploadAvatarBtn}</span>
                      </button>
                      {profileForm.avatarUrl && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setProfileForm((p) => ({ ...p, avatarUrl: null }))}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {["#5865f2", "#23a55a", "#f0b232", "#eb459e", "#f23f43", "#00b0f4", "#9b59b6"].map(
                        (c) => (
                          <div
                            key={c}
                            onClick={() => setProfileForm((p) => ({ ...p, avatarColor: c }))}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              backgroundColor: c,
                              cursor: "pointer",
                              border:
                                profileForm.avatarColor === c
                                  ? "2px solid #fff"
                                  : "2px solid transparent",
                            }}
                          />
                        )
                      )}
                    </div>
                  </div>

                  {/* Banner Upload & Theme Colors */}
                  <div className="form-group">
                    <label>{t.bannerImageLabel}</label>
                    <input
                      ref={bannerUploadRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const dataUrl = await readImageFileToDataUrl(file, 640, 240, 0.84);
                          setProfileForm((p) => ({ ...p, bannerUrl: dataUrl }));
                        } catch (err) {
                          pushToast({ title: "Banner", body: err?.message || "Erro ao carregar imagem" });
                        }
                        e.target.value = "";
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => bannerUploadRef.current?.click()}
                      >
                        <Upload size={14} />
                        <span>{t.uploadBannerBtn}</span>
                      </button>
                      {profileForm.bannerUrl && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setProfileForm((p) => ({ ...p, bannerUrl: null }))}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 4, margin: 0 }}>
                        <span>Banner:</span>
                        <input
                          type="color"
                          value={profileForm.bannerColor}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, bannerColor: e.target.value }))
                          }
                        />
                      </label>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 4, margin: 0 }}>
                        <span>{t.primaryThemeLabel}:</span>
                        <input
                          type="color"
                          value={profileForm.accentColorPrimary}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, accentColorPrimary: e.target.value }))
                          }
                        />
                      </label>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 4, margin: 0 }}>
                        <span>{t.accentThemeLabel}:</span>
                        <input
                          type="color"
                          value={profileForm.accentColorSecondary}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, accentColorSecondary: e.target.value }))
                          }
                        />
                      </label>
                    </div>
                  </div>

                  {/* Badges Selector */}
                  <div className="form-group">
                    <label>{t.badgesLabel}</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {AVAILABLE_BADGES.map((badge) => {
                        const selected = (profileForm.badges || []).includes(badge);
                        return (
                          <button
                            key={badge}
                            type="button"
                            className={`status-choice-btn ${selected ? "active" : ""}`}
                            onClick={() => {
                              setProfileForm((p) => {
                                const current = new Set(p.badges || []);
                                if (current.has(badge)) {
                                  current.delete(badge);
                                } else {
                                  current.add(badge);
                                }
                                return { ...p, badges: Array.from(current) };
                              });
                            }}
                          >
                            ✦ {badge}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>{t.languageLabel}</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className={lang === "en" ? "btn-primary" : "btn-secondary"}
                        onClick={() => setLang("en")}
                      >
                        English (EN)
                      </button>
                      <button
                        type="button"
                        className={lang === "pt" ? "btn-primary" : "btn-secondary"}
                        onClick={() => setLang("pt")}
                      >
                        Português (PT-BR)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Interactive Profile Card Preview */}
                <div>
                  <div className="profile-section-label" style={{ marginBottom: 8 }}>
                    {t.livePreviewLabel}
                  </div>
                  <ProfileCard
                    profile={{
                      ...profileForm,
                      peerId: nodeStatus.profile.peerId,
                    }}
                    isSelf={true}
                    t={t}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowProfileModal(false)}
                >
                  {t.cancelBtn}
                </button>
                <button type="submit" className="btn-primary">
                  <Sparkles size={14} />
                  <span>{t.saveProfileBtn}</span>
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: P2P Direct Connection Hub */}
      {showConnectModal && (
        <div className="modal-backdrop" onClick={() => setShowConnectModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{t.connectModalTitle}</h3>
            <p className="sub">{t.connectModalSub}</p>

            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <button
                className={connectTab === "ip" ? "btn-primary" : "btn-secondary"}
                onClick={() => {
                  stopQrCameraScanner();
                  setConnectTab("ip");
                }}
              >
                {t.tabIp}
              </button>
              <button
                className={connectTab === "qr" ? "btn-primary" : "btn-secondary"}
                onClick={() => setConnectTab("qr")}
              >
                <QrCode size={14} />
                <span>{lang === "en" ? "QR Code (PC ↔ Mobile)" : "QR Code (PC ↔ Celular)"}</span>
              </button>
              <button
                className={connectTab === "lan" ? "btn-primary" : "btn-secondary"}
                onClick={() => {
                  stopQrCameraScanner();
                  setConnectTab("lan");
                }}
              >
                {t.tabLan(lanPeers.length)}
              </button>
              <button
                className={connectTab === "sdp" ? "btn-primary" : "btn-secondary"}
                onClick={() => {
                  stopQrCameraScanner();
                  setConnectTab("sdp");
                }}
              >
                {t.tabSdp}
              </button>
            </div>

            {connectTab === "ip" && (
              <div>
                <div className="form-group">
                  <label>{t.yourAddressLabel}</label>
                  {(nodeStatus.connectionStrings || []).map((ep) => (
                    <div key={ep} className="endpoint-copy-card">
                      <span className="endpoint-code">{ep}</span>
                      <button className="btn-primary" onClick={() => handleCopy(ep)}>
                        {copiedText === ep ? t.copied : t.copyBtn}
                      </button>
                    </div>
                  ))}
                  {nodeStatus.localhostEndpoint && (
                    <div className="endpoint-copy-card">
                      <span className="endpoint-code">
                        {nodeStatus.localhostEndpoint} (Localhost)
                      </span>
                      <button
                        className="btn-secondary"
                        onClick={() => handleCopy(nodeStatus.localhostEndpoint)}
                      >
                        {t.copyLocalBtn}
                      </button>
                    </div>
                  )}
                </div>

                <form onSubmit={handleConnectByIp}>
                  <div className="form-group">
                    <label>{t.connectRemoteLabel}</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="form-input"
                        placeholder={t.connectInputPlaceholder}
                        value={directIpInput}
                        onChange={(e) => setDirectIpInput(e.target.value)}
                      />
                      <button type="submit" className="btn-primary">
                        {t.connectShortBtn}
                      </button>
                    </div>
                  </div>
                </form>

                {connectStatusMsg && (
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 6,
                      fontSize: 12,
                      marginBottom: 12,
                      background:
                        connectStatusMsg.type === "error"
                          ? "rgba(242,63,67,0.2)"
                          : "rgba(35,165,90,0.2)",
                      color:
                        connectStatusMsg.type === "error" ? "#fca5a5" : "#86efac",
                    }}
                  >
                    {connectStatusMsg.text}
                  </div>
                )}
              </div>
            )}

            {connectTab === "qr" && (
              <div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                  {lang === "en"
                    ? "Scan the QR Code on your PC screen using the Freecord Android app to connect in 1 second with zero typing."
                    : "Aponte a câmera do Freecord no celular Android para o QR Code da tela do PC para conectar em 1 segundo sem digitar nada."}
                </p>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  {/* Card 1: Display this device's QR Code */}
                  <div
                    style={{
                      background: "#2b2d31",
                      padding: 14,
                      borderRadius: 8,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                      {lang === "en" ? "1. Your Quick-Connect QR Code" : "1. Seu QR Code de Conexão Rápida"}
                    </div>
                    {lanQrDataUrl ? (
                      <img
                        src={lanQrDataUrl}
                        alt="Freecord P2P QR Code"
                        style={{
                          width: 185,
                          height: 185,
                          borderRadius: 10,
                          border: "3px solid #5865f2",
                          backgroundColor: "#fff",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 185,
                          height: 185,
                          borderRadius: 10,
                          background: "#1e1f22",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 12,
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {lang === "en"
                          ? "On mobile/web: generate an SDP Offer in the WebRTC tab to display a QR Code, or use the Scanner to scan your PC's QR Code!"
                          : "No celular: use o Leitor ao lado para ler o QR Code exibido na tela do seu computador!"}
                      </div>
                    )}
                    {nodeStatus.connectionStrings?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 8 }}>
                        {sortEndpointsByLanPriority(nodeStatus.connectionStrings).map((ep) => {
                          const isPrimary = (selectedQrEndpoint || sortEndpointsByLanPriority(nodeStatus.connectionStrings)[0]) === ep;
                          const isVpn = ep.startsWith("26.") || ep.startsWith("100.") || ep.startsWith("172.");
                          return (
                            <button
                              key={ep}
                              type="button"
                              onClick={() => setSelectedQrEndpoint(ep)}
                              style={{
                                fontSize: 10,
                                fontFamily: "monospace",
                                padding: "3px 7px",
                                borderRadius: 6,
                                cursor: "pointer",
                                border: isPrimary ? "1px solid #4ade80" : "1px solid rgba(255,255,255,0.14)",
                                background: isPrimary ? "rgba(35,165,90,0.22)" : "#1e1f22",
                                color: isPrimary ? "#86efac" : "var(--text-muted)",
                              }}
                            >
                              {ep} {isVpn ? "(VPN)" : "(LAN/Wi-Fi)"}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Card 2: Scan QR Code via Camera or Image */}
                  <div
                    style={{
                      background: "#2b2d31",
                      padding: 14,
                      borderRadius: 8,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                      {lang === "en" ? "2. Scan Friend / PC QR Code" : "2. Ler QR Code do PC / Amigo"}
                    </div>

                    <canvas ref={qrCanvasRef} style={{ display: "none" }} />
                    <input
                      ref={qrImageInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleScanQrImageFile}
                    />

                    {isScanningQr ? (
                      <div style={{ width: "100%", marginBottom: 10 }}>
                        <video
                          ref={qrVideoRef}
                          muted
                          playsInline
                          style={{
                            width: "100%",
                            maxHeight: 180,
                            borderRadius: 8,
                            background: "#000",
                            objectFit: "cover",
                            border: "2px solid #23a55a",
                          }}
                        />
                        <div style={{ fontSize: 11, color: "#4ade80", marginTop: 4 }}>
                          {lang === "en"
                            ? "Point camera at the Freecord QR Code..."
                            : "Aponte a câmera para o QR Code do Freecord..."}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 120,
                          height: 120,
                          borderRadius: 12,
                          background: "rgba(88,101,242,0.12)",
                          border: "1px dashed rgba(88,101,242,0.45)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: 12,
                        }}
                      >
                        <QrCode size={52} color="#5865f2" />
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                      <button
                        type="button"
                        className={isScanningQr ? "btn-secondary" : "btn-success"}
                        onClick={startQrCameraScanner}
                      >
                        <Camera size={14} />
                        <span>
                          {isScanningQr
                            ? lang === "en"
                              ? "Stop Camera"
                              : "Parar Câmera"
                            : lang === "en"
                            ? "Scan with Camera"
                            : "Ler com a Câmera"}
                        </span>
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => qrImageInputRef.current?.click()}
                      >
                        <Upload size={14} />
                        <span>
                          {lang === "en" ? "Scan Image" : "Ler de Print/Foto"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {(qrScanStatus || connectStatusMsg) && (
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 6,
                      fontSize: 12,
                      marginBottom: 12,
                      background:
                        (qrScanStatus || connectStatusMsg).type === "error"
                          ? "rgba(242,63,67,0.2)"
                          : "rgba(35,165,90,0.2)",
                      color:
                        (qrScanStatus || connectStatusMsg).type === "error"
                          ? "#fca5a5"
                          : "#86efac",
                    }}
                  >
                    {(qrScanStatus || connectStatusMsg).text}
                  </div>
                )}
              </div>
            )}

            {connectTab === "lan" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                    {t.lanTabDesc}
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={isScanningLanHttp}
                    onClick={scanLanForDesktopNodes}
                    style={{ flexShrink: 0 }}
                  >
                    <RefreshCw size={13} className={isScanningLanHttp ? "spin" : ""} />
                    <span>
                      {isScanningLanHttp
                        ? lang === "en"
                          ? "Scanning Wi-Fi..."
                          : "Buscando no Wi-Fi..."
                        : lang === "en"
                        ? "Scan Wi-Fi LAN"
                        : "Buscar no Wi-Fi"}
                    </span>
                  </button>
                </div>

                {/* Remembered / Saved LAN Peers (for Android & Desktop) */}
                {savedLanPeers.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                      {lang === "en" ? "Recent Computers on LAN:" : "Computadores Recentes na LAN:"}
                    </div>
                    {savedLanPeers.map((sp) => {
                      const isConnected = connectedPeers.some((cp) => cp.address === sp.host && cp.port === sp.port);
                      return (
                        <div key={`${sp.host}:${sp.port}`} className="endpoint-copy-card" style={{ marginBottom: 6 }}>
                          <div>
                            <strong style={{ color: "#fff" }}>{sp.name}#{sp.tag || "P2P"}</strong>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sp.host}:{sp.port}</div>
                          </div>
                          {isConnected ? (
                            <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 12 }}>{t.connectedBadge}</span>
                          ) : (
                            <button
                              className="btn-success"
                              onClick={() => handleConnectByHostPort(sp.host, sp.port)}
                            >
                              {t.connectNowBtn}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {lanPeers.filter((lp) => Number(lp?.tcpPort || 0) > 0 || lp.isConnected).length === 0 && savedLanPeers.filter((sp) => Number(sp?.port || 0) > 0).length === 0 ? (
                  <div style={{ padding: 14, background: "#2b2d31", borderRadius: 6, marginBottom: 12 }}>
                    {t.noLanDetected}
                  </div>
                ) : (
                  lanPeers
                    .filter((lp) => Number(lp?.tcpPort || 0) > 0 || lp.isConnected)
                    .map((lp) => (
                    <div key={lp.peerId} className="endpoint-copy-card">
                      <div>
                        <strong style={{ color: "#fff" }}>
                          {lp.displayName || lp.username}#{lp.tag}
                        </strong>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {lp.host}:{lp.tcpPort}
                        </div>
                      </div>
                      {lp.isConnected ? (
                        <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 12 }}>
                          {t.connectedBadge}
                        </span>
                      ) : (
                        <button
                          className="btn-success"
                          onClick={() => handleConnectByHostPort(lp.host, lp.tcpPort)}
                        >
                          {t.connectNowBtn}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {connectTab === "sdp" && (
              <div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
                  {t.sdpTabDesc}
                </p>
                <div className="form-group">
                  <label>{t.step1Sdp}</label>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <button
                      className="btn-primary"
                      onClick={async () => {
                        const myEndpoints = sortEndpointsByLanPriority(
                          nodeStatus.connectionStrings || []
                        );
                        const res = await voiceEngineRef.current?.createManualInviteOffer(
                          {
                            ...nodeStatus.profile,
                            cryptoPubKey: cryptoIdentity.publicKey,
                            keyFingerprint: cryptoIdentity.keyFingerprint,
                          },
                          myEndpoints
                        );
                        if (res) setGeneratedInviteCode(res.inviteCode);
                      }}
                    >
                      {t.generateSdpOfferBtn}
                    </button>
                    {generatedInviteCode && (
                      <button
                        className="btn-secondary"
                        onClick={() => handleCopy(generatedInviteCode)}
                      >
                        {t.copyOfferBtn}
                      </button>
                    )}
                  </div>
                  {generatedInviteCode && (
                    <textarea
                      className="form-textarea"
                      rows={2}
                      readOnly
                      value={generatedInviteCode}
                    />
                  )}
                </div>

                <div className="form-group">
                  <label>{t.step2Sdp}</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder={t.sdpPlaceholder}
                    value={incomingInviteInput}
                    onChange={(e) => setIncomingInviteInput(e.target.value)}
                  />
                  <button
                    className="btn-success"
                    style={{ marginTop: 8 }}
                    onClick={async () => {
                      try {
                        const myEndpoints = sortEndpointsByLanPriority(
                          nodeStatus.connectionStrings || []
                        );
                        const res = await voiceEngineRef.current?.acceptManualInviteCode(
                          incomingInviteInput,
                          {
                            ...nodeStatus.profile,
                            cryptoPubKey: cryptoIdentity.publicKey,
                            keyFingerprint: cryptoIdentity.keyFingerprint,
                          },
                          myEndpoints
                        );
                        const remoteEndpoints = sortEndpointsByLanPriority(
                          res?.remoteProfile?.endpoints || []
                        );
                        if (res?.remoteProfile && remoteEndpoints.length > 0) {
                          const [primaryHost, primaryPortStr] = remoteEndpoints[0].split(":");
                          const primaryPort = Number(primaryPortStr || 49155);
                          if (primaryHost && primaryPort) {
                            try {
                              const saved = JSON.parse(
                                localStorage.getItem("freecord_saved_lan_peers") || "[]"
                              );
                              const allAddrs = remoteEndpoints
                                .map((ep) => ep.split(":")[0])
                                .filter(Boolean);
                              const updated = [
                                {
                                  host: primaryHost,
                                  port: primaryPort,
                                  addresses: allAddrs,
                                  name:
                                    res.remoteProfile.displayName ||
                                    res.remoteProfile.username ||
                                    "Peer",
                                  peerId: res.remoteProfile.peerId,
                                  tag: res.remoteProfile.tag || "0000",
                                  timestamp: Date.now(),
                                },
                                ...saved.filter(
                                  (s) =>
                                    s.peerId !== res.remoteProfile.peerId &&
                                    (s.host !== primaryHost || s.port !== primaryPort)
                                ),
                              ].slice(0, 12);
                              localStorage.setItem(
                                "freecord_saved_lan_peers",
                                JSON.stringify(updated)
                              );
                              setSavedLanPeers(updated);
                            } catch {}
                            // Background LAN upgrade if reachable on local Wi-Fi
                            for (const ep of remoteEndpoints.slice(0, 3)) {
                              const [cHost, cPortStr] = ep.split(":");
                              const cPort = Number(cPortStr || 49155);
                              if (cHost && cPort) {
                                handleConnectByHostPort(cHost, cPort)
                                  .then(() => {})
                                  .catch(() => {});
                                break;
                              }
                            }
                          }
                        }
                        if (res.mode === "answer-generated") {
                          setGeneratedAnswerCode(res.answerCode);
                          setConnectStatusMsg({
                            type: "success",
                            text:
                              lang === "en"
                                ? "Answer Code generated! Copy it below and send it back to Computer 1."
                                : "Código de Resposta gerado! Copie abaixo e envie de volta ao Computador 1.",
                          });
                          if (res.remoteProfile) {
                            setConnectedPeers((prev) => {
                              const existing = prev.find(
                                (p) => p.peerId === res.remoteProfile.peerId
                              );
                              const clean = prev.filter(
                                (p) => p.peerId !== res.remoteProfile.peerId
                              );
                              return [
                                ...clean,
                                {
                                  ...(existing || {}),
                                  ...res.remoteProfile,
                                  voiceChannelId: existing?.voiceChannelId || null,
                                  voiceState: existing?.voiceState || {},
                                },
                              ];
                            });
                          }
                        } else {
                          setConnectStatusMsg({
                            type: "success",
                            text:
                              lang === "en"
                                ? `WebRTC P2P tunnel connected with ${res.remoteProfile.displayName || res.remoteProfile.username}!`
                                : `Túnel WebRTC P2P conectado com ${res.remoteProfile.displayName || res.remoteProfile.username}!`,
                          });
                          if (res.remoteProfile) {
                            setConnectedPeers((prev) => {
                              const existing = prev.find(
                                (p) => p.peerId === res.remoteProfile.peerId
                              );
                              const clean = prev.filter(
                                (p) => p.peerId !== res.remoteProfile.peerId
                              );
                              return [
                                ...clean,
                                {
                                  ...(existing || {}),
                                  ...res.remoteProfile,
                                  voiceChannelId: existing?.voiceChannelId || null,
                                  voiceState: existing?.voiceState || {},
                                },
                              ];
                            });
                          }
                          setIncomingInviteInput("");
                        }
                      } catch (err) {
                        setConnectStatusMsg({ type: "error", text: err.message });
                      }
                    }}
                  >
                    {t.processSdpBtn}
                  </button>
                </div>

                {generatedAnswerCode && (
                  <div className="form-group">
                    <label>{t.sendAnswerBackLabel}</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input className="form-input" readOnly value={generatedAnswerCode} />
                      <button
                        className="btn-primary"
                        onClick={() => handleCopy(generatedAnswerCode)}
                      >
                        {t.copyAnswerBtn}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button className="btn-secondary" onClick={() => setShowConnectModal(false)}>
                {t.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Go Live Screen Share Picker */}
      {showScreenPicker && (
        <div className="modal-backdrop" onClick={() => setShowScreenPicker(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{t.screenPickerTitle}</h3>
            <p className="sub">{t.screenPickerSub}</p>

            {/* Resolution & Frame Rate Selector Bar inside Go Live Picker */}
            <div className="media-section-card" style={{ marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label>{t.screenResLabel}</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                  {Object.entries(SCREEN_RESOLUTIONS).map(([key, info]) => (
                    <button
                      key={key}
                      type="button"
                      className={`status-choice-btn ${
                        screenResolution === key ? "active" : ""
                      }`}
                      onClick={() => handleSelectScreenQuality(key, screenFps)}
                    >
                      {info.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>{t.screenFpsLabel}</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {SCREEN_FPS_OPTIONS.map((fps) => (
                    <button
                      key={fps}
                      type="button"
                      className={`status-choice-btn ${
                        Number(screenFps) === fps ? "active" : ""
                      }`}
                      onClick={() => handleSelectScreenQuality(screenResolution, fps)}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: "1px solid var(--border)",
                  cursor: "pointer",
                }}
                onClick={() => {
                  const nextVal = !shareScreenAudio;
                  setShareScreenAudio(nextVal);
                  persistMediaPrefs({ shareScreenAudio: nextVal });
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-normal)" }}>
                    {t.shareSystemAudioLabel || "Share System Audio"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {t.shareSystemAudioDesc || "Stream desktop / game sound with anti-echo loopback isolation"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--brand)" }}
                  checked={shareScreenAudio}
                  onChange={(e) => {
                    const nextVal = e.target.checked;
                    setShareScreenAudio(nextVal);
                    persistMediaPrefs({ shareScreenAudio: nextVal });
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="source-picker-grid">
              {desktopSources.map((src) => (
                <div
                  key={src.id}
                  className="source-picker-card"
                  onClick={() => startScreenShareWithSource(src.id)}
                >
                  {src.thumbnailDataUrl && <img src={src.thumbnailDataUrl} alt={src.name} />}
                  <span>{src.name}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn-secondary" onClick={() => setShowScreenPicker(false)}>
                {t.cancelBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Full P2P Server / Room Customization Studio */}
      {showServerStudio && (
        <div className="modal-backdrop" onClick={() => setShowServerStudio(false)}>
          <div className="profile-studio-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
                  {serverStudioMode === "create"
                    ? t.serverStudioCreateTitle
                    : t.serverStudioEditTitle}
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {t.serverStudioSub}
                </p>
              </div>
              <button className="icon-btn" onClick={() => setShowServerStudio(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveServerStudio}>
              <div className="profile-studio-grid">
                {/* Left Column: Server Identity, Icon, Banner, Theme Colors & Channels */}
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.7fr 0.8fr", gap: 8 }}>
                    <div className="form-group">
                      <label>{t.serverNameLabel}</label>
                      <input
                        className="form-input"
                        value={serverForm.name}
                        onChange={(e) =>
                          setServerForm((s) => ({ ...s, name: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>{t.serverShortLabel}</label>
                      <input
                        className="form-input"
                        maxLength={4}
                        value={serverForm.shortName}
                        onChange={(e) =>
                          setServerForm((s) => ({ ...s, shortName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>{t.serverTagLabel}</label>
                      <input
                        className="form-input"
                        maxLength={8}
                        value={serverForm.serverTag}
                        onChange={(e) =>
                          setServerForm((s) => ({ ...s, serverTag: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>{t.serverDescLabel}</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      placeholder={t.serverDescPlaceholder}
                      value={serverForm.description}
                      onChange={(e) =>
                        setServerForm((s) => ({ ...s, description: e.target.value }))
                      }
                    />
                  </div>

                  {/* Server Icon Image Upload & Accent Color */}
                  <div className="form-group">
                    <label>{t.serverIconLabel}</label>
                    <input
                      ref={serverIconUploadRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const dataUrl = await readImageFileToDataUrl(file, 240, 240, 0.86);
                          setServerForm((s) => ({ ...s, iconUrl: dataUrl }));
                        } catch (err) {
                          pushToast({ title: "Servidor", body: err?.message || "Erro ao carregar ícone" });
                        }
                        e.target.value = "";
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => serverIconUploadRef.current?.click()}
                      >
                        <Upload size={14} />
                        <span>{t.uploadServerIconBtn}</span>
                      </button>
                      {serverForm.iconUrl && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setServerForm((s) => ({ ...s, iconUrl: null }))}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {["#5865f2", "#23a55a", "#f0b232", "#eb459e", "#f23f43", "#00b0f4", "#9b59b6"].map(
                        (c) => (
                          <div
                            key={c}
                            onClick={() => setServerForm((s) => ({ ...s, color: c }))}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              backgroundColor: c,
                              cursor: "pointer",
                              border:
                                serverForm.color === c
                                  ? "2px solid #fff"
                                  : "2px solid transparent",
                            }}
                          />
                        )
                      )}
                      <input
                        type="color"
                        value={serverForm.color}
                        onChange={(e) =>
                          setServerForm((s) => ({ ...s, color: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  {/* Server Banner Image & Gradient / Sidebar Theme Colors */}
                  <div className="form-group">
                    <label>{t.serverBannerLabel}</label>
                    <input
                      ref={serverBannerUploadRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const dataUrl = await readImageFileToDataUrl(file, 640, 260, 0.85);
                          setServerForm((s) => ({ ...s, bannerUrl: dataUrl }));
                        } catch (err) {
                          pushToast({ title: "Servidor", body: err?.message || "Erro ao carregar banner" });
                        }
                        e.target.value = "";
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => serverBannerUploadRef.current?.click()}
                      >
                        <Upload size={14} />
                        <span>{t.uploadServerBannerBtn}</span>
                      </button>
                      {serverForm.bannerUrl && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setServerForm((s) => ({ ...s, bannerUrl: null }))}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 4, margin: 0 }}>
                        <span>{t.primaryThemeLabel}:</span>
                        <input
                          type="color"
                          value={serverForm.bannerColor}
                          onChange={(e) =>
                            setServerForm((s) => ({ ...s, bannerColor: e.target.value }))
                          }
                        />
                      </label>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 4, margin: 0 }}>
                        <span>{t.accentThemeLabel}:</span>
                        <input
                          type="color"
                          value={serverForm.bannerSecondaryColor}
                          onChange={(e) =>
                            setServerForm((s) => ({
                              ...s,
                              bannerSecondaryColor: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 4, margin: 0 }}>
                        <span>{t.sidebarBgLabel}:</span>
                        <input
                          type="color"
                          value={serverForm.sidebarBgColor}
                          onChange={(e) =>
                            setServerForm((s) => ({ ...s, sidebarBgColor: e.target.value }))
                          }
                        />
                      </label>
                    </div>
                  </div>

                  {/* Manage Server Channels */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <label style={{ marginBottom: 0 }}>{t.manageChannelsSection}</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          onClick={() =>
                            setServerForm((s) => ({
                              ...s,
                              textChannels: [
                                ...s.textChannels,
                                {
                                  id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                                  name: `channel-${s.textChannels.length + 1}`,
                                  topic: "P2P Text Channel",
                                },
                              ],
                            }))
                          }
                        >
                          {t.addTextChannelBtn}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          onClick={() =>
                            setServerForm((s) => ({
                              ...s,
                              voiceChannels: [
                                ...s.voiceChannels,
                                {
                                  id: `vc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                                  name: `P2P Voice #${s.voiceChannels.length + 1}`,
                                },
                              ],
                            }))
                          }
                        >
                          {t.addVoiceChannelBtn}
                        </button>
                      </div>
                    </div>

                    <div style={{ maxHeight: 170, overflowY: "auto", paddingRight: 4 }}>
                      {serverForm.textChannels.map((ch, idx) => (
                        <div key={ch.id} className="channel-manage-row">
                          <Hash size={15} color="var(--text-muted)" />
                          <input
                            className="form-input"
                            style={{ padding: "5px 8px", fontSize: 12 }}
                            value={ch.name}
                            onChange={(e) => {
                              const val = e.target.value.toLowerCase().replace(/\s+/g, "-");
                              setServerForm((s) => {
                                const list = [...s.textChannels];
                                list[idx] = { ...list[idx], name: val };
                                return { ...s, textChannels: list };
                              });
                            }}
                          />
                          <input
                            className="form-input"
                            style={{ padding: "5px 8px", fontSize: 12 }}
                            placeholder="Topic..."
                            value={ch.topic || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setServerForm((s) => {
                                const list = [...s.textChannels];
                                list[idx] = { ...list[idx], topic: val };
                                return { ...s, textChannels: list };
                              });
                            }}
                          />
                          {serverForm.textChannels.length > 1 && (
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() =>
                                setServerForm((s) => ({
                                  ...s,
                                  textChannels: s.textChannels.filter((item) => item.id !== ch.id),
                                }))
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}

                      {serverForm.voiceChannels.map((vc, idx) => (
                        <div key={vc.id} className="channel-manage-row">
                          <Volume2 size={15} color="#23a55a" />
                          <input
                            className="form-input"
                            style={{ padding: "5px 8px", fontSize: 12 }}
                            value={vc.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setServerForm((s) => {
                                const list = [...s.voiceChannels];
                                list[idx] = { ...list[idx], name: val };
                                return { ...s, voiceChannels: list };
                              });
                            }}
                          />
                          {serverForm.voiceChannels.length > 1 && (
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() =>
                                setServerForm((s) => ({
                                  ...s,
                                  voiceChannels: s.voiceChannels.filter((item) => item.id !== vc.id),
                                }))
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Interactive Server Banner & Sidebar Preview */}
                <div>
                  <div className="profile-section-label" style={{ marginBottom: 8 }}>
                    {t.serverLivePreviewLabel}
                  </div>

                  <div
                    className="server-preview-card"
                    style={{ backgroundColor: serverForm.sidebarBgColor || "#2b2d31" }}
                  >
                    {/* Preview Banner Hero */}
                    <div
                      className="sidebar-banner-hero"
                      style={{
                        cursor: "default",
                        background: serverForm.bannerUrl
                          ? `url(${serverForm.bannerUrl}) center/cover no-repeat`
                          : `linear-gradient(135deg, ${
                              serverForm.bannerColor || serverForm.color || "#5865f2"
                            } 0%, ${serverForm.bannerSecondaryColor || "#9b59b6"} 100%)`,
                      }}
                    >
                      <div className="sidebar-banner-top">
                        {serverForm.serverTag ? (
                          <span className="server-tag-badge">✦ {serverForm.serverTag}</span>
                        ) : (
                          <span />
                        )}
                      </div>
                      <div className="sidebar-banner-bottom">
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {serverForm.iconUrl ? (
                            <img
                              src={serverForm.iconUrl}
                              alt=""
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                objectFit: "cover",
                                border: "2px solid rgba(255,255,255,0.45)",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                backgroundColor: serverForm.color || "#5865f2",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 800,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {serverForm.shortName || "FC"}
                            </div>
                          )}
                          <span style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>
                            {serverForm.name || "P2P Server"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {serverForm.description && (
                      <div className="sidebar-description-bar">
                        {serverForm.description}
                      </div>
                    )}

                    <div style={{ padding: 12 }}>
                      <div className="channel-section-title" style={{ paddingTop: 0 }}>
                        <span>{t.textChannelsHeader}</span>
                      </div>
                      {serverForm.textChannels.map((ch, idx) => (
                        <div
                          key={ch.id}
                          className={`channel-item ${idx === 0 ? "active" : ""}`}
                          style={{ cursor: "default" }}
                        >
                          <div className="channel-item-left">
                            <Hash size={16} />
                            <span>{ch.name}</span>
                          </div>
                        </div>
                      ))}

                      <div className="channel-section-title">
                        <span>{t.voiceChannelsHeader}</span>
                      </div>
                      {serverForm.voiceChannels.map((vc) => (
                        <div key={vc.id} className="channel-item" style={{ cursor: "default" }}>
                          <div className="channel-item-left">
                            <Volume2 size={16} color="#23a55a" />
                            <span>{vc.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
                <div>
                  {serverStudioMode === "edit" && rooms.length > 1 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ backgroundColor: "rgba(242, 63, 67, 0.2)", color: "#fca5a5" }}
                      onClick={() => handleDeleteServer(serverForm.id)}
                    >
                      <Trash2 size={14} />
                      <span>{t.deleteServerBtn}</span>
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowServerStudio(false)}
                  >
                    {t.cancelBtn}
                  </button>
                  <button type="submit" className="btn-primary">
                    <Sparkles size={14} />
                    <span>{t.saveServerBtn}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create New P2P Room */}
      {showNewRoomModal && (
        <div className="modal-backdrop" onClick={() => setShowNewRoomModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{t.newRoomTitle}</h3>
            <p className="sub">{t.newRoomSub}</p>
            <form onSubmit={handleCreateRoom}>
              <div className="form-group">
                <label>{t.roomNameLabel}</label>
                <input
                  className="form-input"
                  placeholder={t.roomNamePlaceholder}
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowNewRoomModal(false)}
                >
                  {t.cancelBtn}
                </button>
                <button type="submit" className="btn-primary">
                  {t.createRoomBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create New Channel */}
      {showNewChannelModal && (
        <div className="modal-backdrop" onClick={() => setShowNewChannelModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{t.newChannelTitle(newChannelType)}</h3>
            <p className="sub">{t.newChannelSub}</p>
            <form onSubmit={handleCreateChannel}>
              <div className="form-group">
                <label>{t.channelNameLabel}</label>
                <input
                  className="form-input"
                  placeholder={newChannelType === "text" ? "e.g. general-2" : "e.g. P2P Voice #2"}
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowNewChannelModal(false)}
                >
                  {t.cancelBtn}
                </button>
                <button type="submit" className="btn-primary">
                  {t.createChannelBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Invite to Server & Join via Invite Code */}
      {showInviteModal && (
        <div className="modal-backdrop" onClick={() => setShowInviteModal(false)}>
          <div className="modal-box" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, color: "#fff" }}>{t.inviteServerTitle}</h3>
                <p className="sub" style={{ marginBottom: 0 }}>
                  {t.inviteServerSub}
                </p>
              </div>
              <button className="icon-btn" onClick={() => setShowInviteModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Target Server Card Preview */}
            {inviteTargetRoom && (
              <div
                style={{
                  background: "#2b2d31",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    backgroundColor: inviteTargetRoom.color || "#5865f2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    color: "#fff",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {inviteTargetRoom.iconUrl ? (
                    <img
                      src={inviteTargetRoom.iconUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    inviteTargetRoom.shortName || "FC"
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 800, color: "#fff", fontSize: 14 }}>
                    {inviteTargetRoom.name}{" "}
                    {inviteTargetRoom.serverTag && (
                      <span className="server-tag-badge">✦ {inviteTargetRoom.serverTag}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {inviteTargetRoom.textChannels?.length || 1} text •{" "}
                    {inviteTargetRoom.voiceChannels?.length || 1} voice channels
                  </div>
                </div>
              </div>
            )}

            {/* Section 1: 1-Click Invite to Connected Peers */}
            <div className="form-group">
              <label>{t.inviteConnectedPeersLabel}</label>
              {connectedPeers.length === 0 ? (
                <div style={{ padding: 12, background: "#2b2d31", borderRadius: 6, fontSize: 12, color: "var(--text-muted)" }}>
                  {t.noPeersYet}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 6, maxHeight: 150, overflowY: "auto", paddingRight: 4 }}>
                  {connectedPeers.map((peer) => {
                    const isSent = Boolean(sentInvitePeers[peer.peerId]);
                    return (
                      <div
                        key={peer.peerId}
                        style={{
                          background: "#2b2d31",
                          padding: "8px 12px",
                          borderRadius: 6,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <UserAvatar profile={peer} size="small" showStatus={true} />
                          <div>
                            <div style={{ fontWeight: 600, color: "#fff", fontSize: 13 }}>
                              {peer.displayName || peer.username}#{peer.tag}
                            </div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                              {peer.address}:{peer.port}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={isSent ? "btn-secondary" : "btn-primary"}
                          style={{ padding: "4px 10px", fontSize: 11 }}
                          onClick={() => handleSendServerInviteToPeer(peer)}
                          disabled={isSent}
                        >
                          {isSent ? (
                            <>
                              <Check size={12} />
                              <span>{t.inviteSentBtn}</span>
                            </>
                          ) : (
                            <>
                              <UserPlus size={12} />
                              <span>{t.sendInviteBtn}</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Shareable Server Invite Code */}
            <div className="form-group">
              <label>{t.serverInviteCodeLabel}</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="form-input"
                  readOnly
                  value={buildServerInviteCode(inviteTargetRoom || currentRoom)}
                  style={{ fontFamily: "monospace", fontSize: 11 }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    handleCopy(buildServerInviteCode(inviteTargetRoom || currentRoom))
                  }
                >
                  {copiedText === buildServerInviteCode(inviteTargetRoom || currentRoom) ? (
                    <Check size={14} />
                  ) : (
                    <Copy size={14} />
                  )}
                  <span>
                    {copiedText === buildServerInviteCode(inviteTargetRoom || currentRoom)
                      ? t.copied
                      : t.copyBtn}
                  </span>
                </button>
              </div>
            </div>

            {/* Section 3: Join via Invite Code */}
            <form onSubmit={handleRedeemServerInviteCode} style={{ marginTop: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>{t.joinByInviteCodeLabel}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="form-input"
                    placeholder={t.joinByInvitePlaceholder}
                    value={joinServerCodeInput}
                    onChange={(e) => setJoinServerCodeInput(e.target.value)}
                  />
                  <button type="submit" className="btn-success">
                    {t.joinServerBtn}
                  </button>
                </div>
              </div>
            </form>

            {joinServerStatusMsg && (
              <div
                style={{
                  marginTop: 10,
                  padding: 8,
                  borderRadius: 6,
                  fontSize: 12,
                  background:
                    joinServerStatusMsg.type === "error"
                      ? "rgba(242,63,67,0.2)"
                      : "rgba(35,165,90,0.2)",
                  color:
                    joinServerStatusMsg.type === "error" ? "#fca5a5" : "#86efac",
                }}
              >
                {joinServerStatusMsg.text}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn-secondary" onClick={() => setShowInviteModal(false)}>
                {t.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Incoming Private P2P Call */}
      {incomingDmCall && (
        <div className="incoming-call-modal">
          <div className="incoming-call-card">
            <div className="incoming-call-avatar-pulse">
              <UserAvatar
                profile={incomingDmCall.caller}
                speaking={true}
                style={{ width: 88, height: 88, fontSize: 30 }}
              />
            </div>
            <div className="incoming-call-title">
              {incomingDmCall.caller?.displayName ||
                incomingDmCall.caller?.username ||
                "Peer"}
            </div>
            <div className="incoming-call-sub">
              {incomingDmCall.withVideo
                ? t.incomingVideoCallSub(
                    incomingDmCall.caller?.displayName ||
                      incomingDmCall.caller?.username ||
                      "Peer"
                  )
                : t.incomingVoiceCallSub(
                    incomingDmCall.caller?.displayName ||
                      incomingDmCall.caller?.username ||
                      "Peer"
                  )}
            </div>

            <div className="incoming-call-actions">
              <button
                type="button"
                className="btn-success"
                style={{ padding: "10px 18px", fontSize: 13 }}
                onClick={() => handleAcceptDmCall(false)}
              >
                <PhoneCall size={16} />
                <span>{t.acceptVoiceBtn}</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "10px 18px", fontSize: 13 }}
                onClick={() => handleAcceptDmCall(true)}
              >
                <Video size={16} />
                <span>{t.acceptVideoBtn}</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  backgroundColor: "rgba(242, 63, 67, 0.25)",
                  color: "#fca5a5",
                  padding: "10px 18px",
                  fontSize: 13,
                }}
                onClick={handleDeclineDmCall}
              >
                <PhoneOff size={16} />
                <span>{t.declineCallBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stack of In-App Toast Notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="toast-card"
              onClick={() => {
                toast.onClick?.();
                setToasts((prev) => prev.filter((item) => item.id !== toast.id));
              }}
            >
              {toast.author ? (
                <UserAvatar profile={toast.author} size="small" />
              ) : (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "var(--brand-blurple)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {toast.isInvite ? <UserPlus size={16} /> : <Bell size={16} />}
                </div>
              )}
              <div className="toast-content">
                <div className="toast-title">{toast.title}</div>
                <div className="toast-body">{toast.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
