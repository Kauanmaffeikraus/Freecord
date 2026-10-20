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
} from "lucide-react";
import {
  WebRTCVoiceEngine,
  SCREEN_RESOLUTIONS,
  CAMERA_RESOLUTIONS,
  SCREEN_FPS_OPTIONS,
} from "./services/webrtcVoiceEngine";

const AVAILABLE_BADGES = [
  "P2P Node",
  "Early Adopter",
  "Serverless Pioneer",
  "REA Verified",
  "Mesh Host",
  "Go Live Streamer",
];

const STATUS_EMOJIS = ["⚡", "🚀", "🎮", "💻", "🎧", "🔥", "🛡️", "🌙", "☕"];

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
    mediaSettingsTitle: "🎙️ Voice, Camera & Screen Share Settings",
    mediaSettingsSub: "Choose your Audio Output (Speaker/Headset), Microphone Input, Camera, and Go Live Screen Share Resolution & FPS.",
    tabProfileSettings: "✨ Profile & Identity",
    tabMediaSettings: "🎙️ Audio, Camera & Screen",
    micDeviceLabel: "Input Device (Microphone)",
    speakerDeviceLabel: "Output Device (Speaker / Headset)",
    cameraDeviceLabel: "Camera Device (Video Input)",
    defaultDeviceOption: "System Default Device",
    refreshDevicesBtn: "Refresh Devices",
    testSpeakerBtn: "🔊 Test Output Audio",
    testMicLabel: "Live Microphone Input Level",
    masterOutputVolLabel: (vol) => `Master Output Volume: ${vol}%`,
    echoCancelLabel: "Echo Cancellation",
    noiseSuppLabel: "Noise Suppression",
    autoGainLabel: "Automatic Gain Control (AGC)",
    cameraResLabel: "Camera Capture Resolution",
    testCameraBtn: "Preview Camera",
    stopTestCameraBtn: "Stop Preview",
    screenQualitySectionTitle: "🖥️ Go Live Screen Share Resolution & Frame Rate",
    screenResLabel: "Screen Share Resolution",
    screenFpsLabel: "Frame Rate (FPS)",
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
    mediaSettingsTitle: "🎙️ Configurações de Áudio, Câmera & Transmissão",
    mediaSettingsSub: "Escolha a Saída de Áudio (Fone/Caixa), o Microfone de Entrada, a Câmera e a Resolução + FPS da Transmissão de Tela (Go Live).",
    tabProfileSettings: "✨ Perfil & Identidade",
    tabMediaSettings: "🎙️ Áudio, Câmera & Tela",
    micDeviceLabel: "Dispositivo de Entrada (Microfone)",
    speakerDeviceLabel: "Dispositivo de Saída (Áudio / Fone / Alto-falante)",
    cameraDeviceLabel: "Dispositivo de Vídeo (Câmera)",
    defaultDeviceOption: "Padrão do Sistema",
    refreshDevicesBtn: "Atualizar Dispositivos",
    testSpeakerBtn: "🔊 Testar Saída de Áudio",
    testMicLabel: "Nível do Microfone em Tempo Real",
    masterOutputVolLabel: (vol) => `Volume Principal de Saída: ${vol}%`,
    echoCancelLabel: "Cancelamento de Eco",
    noiseSuppLabel: "Supressão de Ruído",
    autoGainLabel: "Controle Automático de Ganho (AGC)",
    cameraResLabel: "Resolução de Captura da Câmera",
    testCameraBtn: "Testar Câmera",
    stopTestCameraBtn: "Parar Teste",
    screenQualitySectionTitle: "🖥️ Resolução e Taxa de Quadros da Transmissão de Tela (Go Live)",
    screenResLabel: "Resolução da Transmissão de Tela",
    screenFpsLabel: "Taxa de Quadros (FPS)",
  },
};

const INITIAL_ROOMS = [
  {
    id: "room_freecord_main",
    name: "Freecord P2P Hub",
    shortName: "FC",
    color: "#5865f2",
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
    color: "#23a55a",
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

function VideoStreamView({ stream, muted = false }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline muted={muted} />;
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

function ProfileCard({ profile, isSelf, t, onEditProfile, onQuickDm }) {
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

        {!isSelf && onQuickDm && (
          <form
            style={{ marginTop: 12 }}
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

export default function App() {
  const isElectron = Boolean(window.DiscordNative?.isRenderer);

  const [lang, setLang] = useState("en");
  const t = I18N[lang] || I18N.en;

  // Node & Profile State
  const [nodeStatus, setNodeStatus] = useState({
    instanceId: "1",
    profile: {
      peerId: `fc_web_${Math.random().toString(36).slice(2, 7)}`,
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
    },
    tcpPort: 0,
    udpDiscoveryPort: 0,
    connectionStrings: [],
    localhostEndpoint: "",
  });

  const [connectedPeers, setConnectedPeers] = useState([]);
  const [lanPeers, setLanPeers] = useState([]);

  // Rooms & Navigation State
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [selectedRoomId, setSelectedRoomId] = useState("room_freecord_main");
  const [selectedChannelId, setSelectedChannelId] = useState("ch_geral");
  const [selectedDmPeerId, setSelectedDmPeerId] = useState(null);

  // Chat State
  const [messages, setMessages] = useState(INITIAL_REA_MESSAGES);
  const [chatInput, setChatInput] = useState("");
  const [typingPeers, setTypingPeers] = useState({});

  // Voice & Video State
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState(null);
  const [selfMute, setSelfMute] = useState(false);
  const [selfDeafen, setSelfDeafen] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [speakingMap, setSpeakingMap] = useState({});
  const [localMediaStream, setLocalMediaStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [peerVolumes, setPeerVolumes] = useState({});
  const [rtcStats, setRtcStats] = useState({});

  // Modals
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectTab, setConnectTab] = useState("ip");
  const [directIpInput, setDirectIpInput] = useState("");
  const [connectStatusMsg, setConnectStatusMsg] = useState(null);
  const [copiedText, setCopiedText] = useState(null);

  // Manual Serverless WebRTC SDP state
  const [generatedInviteCode, setGeneratedInviteCode] = useState("");
  const [incomingInviteInput, setIncomingInviteInput] = useState("");
  const [generatedAnswerCode, setGeneratedAnswerCode] = useState("");

  // Screen Share Picker Modal
  const [showScreenPicker, setShowScreenPicker] = useState(false);
  const [desktopSources, setDesktopSources] = useState([]);

  // Create Room / Channel / Profile Modals
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState("text");

  // Profile Customization Studio & Media Settings Studio
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState("profile"); // "profile" | "media"
  const [inspectedProfile, setInspectedProfile] = useState(null);
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
  const [masterOutputVolume, setMasterOutputVolume] = useState(100);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [autoGainControl, setAutoGainControl] = useState(true);
  const [micInputLevel, setMicInputLevel] = useState(0);
  const [cameraTestStream, setCameraTestStream] = useState(null);

  const voiceEngineRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const avatarUploadRef = useRef(null);
  const bannerUploadRef = useRef(null);
  const lastTypingSentRef = useRef(0);

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
      onSignalSend: (targetPeerId, signal) => {
        sendP2PPacket(
          {
            type: "WEBRTC_SIGNAL",
            signal,
          },
          targetPeerId
        );
      },
      onRemoteStream: (peerId, stream) => {
        setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
      },
      onSpeakingChange: (who, isSpeaking) => {
        const key = who === "self" ? nodeStatus.profile.peerId : who;
        setSpeakingMap((prev) => ({ ...prev, [key]: isSpeaking }));
      },
      onInputLevelChange: (level) => {
        setMicInputLevel(level);
      },
      onStatsUpdate: (stats) => {
        setRtcStats(stats);
      },
      onDataChannelMessage: (fromPeerId, packet) => {
        handleIncomingP2PEvent({ ...packet, fromPeerId });
      },
      onManualPeerConnected: (peerId) => {
        const conn = engine.connections.get(peerId);
        const manualProf = conn?.manualProfile || {
          peerId,
          displayName: "WebRTC Peer",
          username: "webrtc_peer",
          tag: "SDP",
          avatarColor: "#57F287",
        };
        setConnectedPeers((prev) => {
          if (prev.some((p) => p.peerId === peerId)) return prev;
          return [
            ...prev,
            {
              ...manualProf,
              address: "WebRTC DataChannel",
              port: 0,
              rttMs: 5,
              fingerprint: "WEBRTC-DIRECT-SDP",
              voiceChannelId: null,
              voiceState: {},
            },
          ];
        });
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

  // Connect to Electron P2P Bridge if running inside Electron
  useEffect(() => {
    if (!window.DiscordNative?.p2p) return;

    const p2p = window.DiscordNative.p2p;
    p2p.getStatus().then((status) => {
      if (status) {
        setNodeStatus(status);
        setConnectedPeers(status.connectedPeers || []);
        setLanPeers(status.lanPeers || []);
      }
    });

    const unsubPeers = p2p.onPeersUpdated((peers) => {
      setConnectedPeers(peers || []);
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
      handleIncomingP2PEvent(event);
    });

    return () => {
      unsubPeers?.();
      unsubLan?.();
      unsubConnected?.();
      unsubDisconnected?.();
      unsubEvent?.();
    };
  }, [rooms]);

  const sendP2PPacket = (packet, targetPeerId = null) => {
    if (window.DiscordNative?.p2p) {
      window.DiscordNative.p2p.send(packet, targetPeerId);
    }
    voiceEngineRef.current?.sendViaDataChannel(packet, targetPeerId);
  };

  const handleIncomingP2PEvent = (event) => {
    switch (event.type) {
      case "CHAT_MESSAGE": {
        if (!event.message || !event.message.id) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.message.id)) return prev;
          return [...prev, event.message];
        });
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
        setRooms((prev) => {
          const map = new Map(prev.map((r) => [r.id, r]));
          for (const incomingRoom of event.rooms) {
            if (!map.has(incomingRoom.id)) {
              map.set(incomingRoom.id, incomingRoom);
            } else {
              const existing = map.get(incomingRoom.id);
              const textIds = new Set(existing.textChannels.map((c) => c.id));
              const voiceIds = new Set(existing.voiceChannels.map((c) => c.id));
              const mergedText = [
                ...existing.textChannels,
                ...(incomingRoom.textChannels || []).filter((c) => !textIds.has(c.id)),
              ];
              const mergedVoice = [
                ...existing.voiceChannels,
                ...(incomingRoom.voiceChannels || []).filter((c) => !voiceIds.has(c.id)),
              ];
              map.set(incomingRoom.id, {
                ...existing,
                textChannels: mergedText,
                voiceChannels: mergedVoice,
              });
            }
          }
          return Array.from(map.values());
        });
        break;
      }

      case "WEBRTC_SIGNAL": {
        if (event.fromPeerId && event.signal) {
          voiceEngineRef.current?.handleIncomingSignal(event.fromPeerId, event.signal);
        }
        break;
      }
    }
  };

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
  });

  const handleSendMessage = (e) => {
    e?.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      channelId: effectiveChannelId,
      author: buildAuthorSnapshot(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: trimmed,
      reactions: {},
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatInput("");

    const targetPeer = selectedRoomId === "dm_hub" ? selectedDmPeerId : null;
    sendP2PPacket({ type: "CHAT_MESSAGE", message: newMsg }, targetPeer);
  };

  const handleSendQuickDm = (peerProfile, text) => {
    const sorted = [nodeStatus.profile.peerId, peerProfile.peerId].sort().join("__");
    const dmChId = `dm_${sorted}`;
    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      channelId: dmChId,
      author: buildAuthorSnapshot(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text,
      reactions: {},
    };
    setMessages((prev) => [...prev, newMsg]);
    sendP2PPacket({ type: "CHAT_MESSAGE", message: newMsg }, peerProfile.peerId);
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
    reader.onload = () => {
      const isImage = file.type.startsWith("image/");
      const newMsg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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

      setMessages((prev) => [...prev, newMsg]);
      const targetPeer = selectedRoomId === "dm_hub" ? selectedDmPeerId : null;
      sendP2PPacket({ type: "CHAT_MESSAGE", message: newMsg }, targetPeer);
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

    const audioStream = await engine.startLocalVoice();
    setLocalMediaStream(audioStream);
    setActiveVoiceChannelId(voiceChannel.id);

    const vState = {
      muted: selfMute,
      deafened: selfDeafen,
      videoEnabled,
      screenSharing,
    };
    window.DiscordNative?.p2p?.setVoiceState(voiceChannel.id, vState);

    for (const peer of connectedPeers) {
      await engine.negotiateWithPeer(peer.peerId);
    }
  };

  const handleLeaveVoiceChannel = () => {
    const engine = voiceEngineRef.current;
    engine?.destroyAll();
    setActiveVoiceChannelId(null);
    setVideoEnabled(false);
    setScreenSharing(false);
    setLocalMediaStream(null);
    setRemoteStreams({});
    window.DiscordNative?.p2p?.setVoiceState(null, {});
  };

  const toggleSelfMute = () => {
    const next = !selfMute;
    setSelfMute(next);
    voiceEngineRef.current?.setSelfMute(next);
    if (activeVoiceChannelId) {
      window.DiscordNative?.p2p?.setVoiceState(activeVoiceChannelId, {
        muted: next,
        deafened: selfDeafen,
        videoEnabled,
        screenSharing,
      });
    }
  };

  const toggleSelfDeafen = () => {
    const next = !selfDeafen;
    setSelfDeafen(next);
    if (next) setSelfMute(true);
    voiceEngineRef.current?.setSelfDeafen(next);
    if (activeVoiceChannelId) {
      window.DiscordNative?.p2p?.setVoiceState(activeVoiceChannelId, {
        muted: next ? true : selfMute,
        deafened: next,
        videoEnabled,
        screenSharing,
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
        setLocalMediaStream(engine.localScreenStream || engine.localAudioStream);
      } else {
        const camStream = await engine.setVideoBroadcast(true);
        setVideoEnabled(true);
        setLocalMediaStream(camStream);
      }
      if (activeVoiceChannelId) {
        window.DiscordNative?.p2p?.setVoiceState(activeVoiceChannelId, {
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
      setLocalMediaStream(voiceEngineRef.current?.localVideoStream || voiceEngineRef.current?.localAudioStream);
      if (activeVoiceChannelId) {
        window.DiscordNative?.p2p?.setVoiceState(activeVoiceChannelId, {
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
      setLocalMediaStream(updatedStream);
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
      setLocalMediaStream(updatedStream);
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
      setLocalMediaStream(updatedStream);
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
      const stream = await voiceEngineRef.current?.setDesktopSource(sourceId, {
        resolution: screenResolution,
        frameRate: screenFps,
      });
      if (stream) {
        setScreenSharing(true);
        setLocalMediaStream(stream);
        setShowScreenPicker(false);
        if (activeVoiceChannelId) {
          window.DiscordNative?.p2p?.setVoiceState(activeVoiceChannelId, {
            muted: selfMute,
            deafened: selfDeafen,
            videoEnabled,
            screenSharing: true,
          });
        }
      }
    } catch {
      setShowScreenPicker(false);
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
      setConnectStatusMsg({
        type: "info",
        text: lang === "en" ? `Connecting directly to ${host}:${port}...` : `Conectando diretamente a ${host}:${port}...`,
      });
      const peer = await window.DiscordNative.p2p.connect(host, port);
      setConnectStatusMsg({
        type: "success",
        text:
          lang === "en"
            ? `Successfully connected to ${peer.displayName || peer.username}#${peer.tag} (${peer.address}:${peer.port})!`
            : `Conectado com sucesso a ${peer.displayName || peer.username}#${peer.tag} (${peer.address}:${peer.port})!`,
      });
      setDirectIpInput("");
    } catch (err) {
      setConnectStatusMsg({ type: "error", text: err.message });
    }
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
      color: "#5865f2",
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
        ? { ...r, textChannels: [...r.textChannels, newCh] }
        : { ...r, voiceChannels: [...r.voiceChannels, newCh] };
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
      setNodeStatus((prev) => ({
        ...prev,
        profile: { ...prev.profile, ...sanitized },
      }));
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
          speaking: Boolean(speakingMap[p.peerId]),
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
  const selfDisplayName = nodeStatus.profile.displayName || nodeStatus.profile.username;

  return (
    <>
      {/* DiscordPTB Frameless Titlebar with Official Freecord Logo */}
      <div className="titlebar">
        <div className="titlebar-left">
          <img src="./logo.png" alt="Freecord" className="titlebar-logo" />
          <span>FREECORD</span>
          <span className="ptb-badge">PTB 1.0.1225 P2P</span>
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
            onClick={() => setLang((prev) => (prev === "en" ? "pt" : "en"))}
            title="Switch Language (EN / PT-BR)"
          >
            <Globe size={10} />
            <span>{lang === "en" ? "EN" : "PT-BR"}</span>
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

      {/* Main Workspace */}
      <div className="app-shell">
        {/* Left Server / P2P Spaces Rail */}
        <div className="server-rail">
          <div
            className={`server-icon home-logo ${selectedRoomId === "dm_hub" ? "active" : ""}`}
            onClick={() => {
              setSelectedRoomId("dm_hub");
              setSelectedDmPeerId(null);
            }}
            title={t.p2pHubTitle}
          >
            <img src="./logo.png" alt="Freecord Hub" />
            {connectedPeers.length > 0 && (
              <span className="server-badge">{connectedPeers.length}</span>
            )}
          </div>

          <div className="rail-divider" />

          {rooms.map((room) => (
            <div
              key={room.id}
              className={`server-icon ${selectedRoomId === room.id ? "active" : ""}`}
              style={
                selectedRoomId === room.id
                  ? { backgroundColor: room.color }
                  : undefined
              }
              onClick={() => {
                setSelectedRoomId(room.id);
                if (room.textChannels?.[0]) {
                  setSelectedChannelId(room.textChannels[0].id);
                }
              }}
              title={room.name}
            >
              {room.shortName}
            </div>
          ))}

          <div
            className="server-icon action"
            onClick={() => setShowNewRoomModal(true)}
            title={t.newRoomTitle}
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
        <div className="channel-sidebar">
          <div
            className="sidebar-header"
            onClick={() => {
              if (selectedRoomId === "dm_hub") setShowConnectModal(true);
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src="./logo.png" alt="" style={{ width: 20, height: 20, borderRadius: 5 }} />
              {selectedRoomId === "dm_hub"
                ? t.p2pHubTitle
                : currentRoom?.name}
            </span>
            <ShieldCheck size={16} color="#23a55a" title="Serverless Direct P2P" />
          </div>

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
                  connectedPeers.map((peer) => (
                    <div
                      key={peer.peerId}
                      className={`channel-item ${selectedDmPeerId === peer.peerId ? "active" : ""}`}
                      onClick={() => setSelectedDmPeerId(peer.peerId)}
                    >
                      <div className="channel-item-left">
                        <UserAvatar profile={peer} size="small" showStatus={true} />
                        <span>{peer.displayName || peer.username}</span>
                      </div>
                      <span style={{ fontSize: 10, color: "#4ade80" }}>{peer.rttMs}ms</span>
                    </div>
                  ))
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
                {currentRoom?.textChannels?.map((ch) => (
                  <div
                    key={ch.id}
                    className={`channel-item ${selectedChannelId === ch.id ? "active" : ""}`}
                    onClick={() => setSelectedChannelId(ch.id)}
                  >
                    <div className="channel-item-left">
                      <Hash size={18} />
                      <span>{ch.name}</span>
                    </div>
                  </div>
                ))}

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

              <div className="voice-action-grid">
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
            <div className="chat-column">
              {/* Voice / Video / Go Live Stage Grid */}
              {activeVoiceChannelId && (
                <div className="voice-stage-container">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Volume2 size={16} color="#23a55a" />
                      <strong style={{ color: "#fff", fontSize: 13 }}>
                        {t.voiceStageTitle}
                      </strong>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn-secondary"
                        onClick={() => openProfileStudio("media")}
                      >
                        <Sliders size={14} />
                        <span>{t.mediaSettingsBtn}</span>
                      </button>
                      <button className="btn-secondary" onClick={toggleCamera}>
                        {videoEnabled ? t.turnOffCamera : t.turnOnCamera}
                      </button>
                      <button className="btn-primary" onClick={openGoLivePicker}>
                        <Monitor size={14} />
                        <span>
                          {screenSharing
                            ? `${t.stopGoLive} (${screenResolution.toUpperCase()} ${screenFps}FPS)`
                            : `${t.startGoLive} (${screenResolution.toUpperCase()} ${screenFps}FPS)`}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="voice-video-grid">
                    {/* Local Tile */}
                    <div
                      className={`video-tile ${
                        speakingMap[nodeStatus.profile.peerId] ? "speaking" : ""
                      }`}
                    >
                      {(videoEnabled || screenSharing) && localMediaStream ? (
                        <VideoStreamView stream={localMediaStream} muted={true} />
                      ) : (
                        <UserAvatar
                          profile={nodeStatus.profile}
                          speaking={Boolean(speakingMap[nodeStatus.profile.peerId])}
                          style={{ width: 68, height: 68, fontSize: 24 }}
                        />
                      )}
                      <div className="video-tile-overlay">
                        <span className="video-tile-name">
                          {selfDisplayName} {t.youSuffix}
                          {screenSharing && <span className="live-badge">GO LIVE</span>}
                        </span>
                      </div>
                    </div>

                    {/* Remote Peer Tiles */}
                    {connectedPeers.map((peer) => {
                      const rStream = remoteStreams[peer.peerId];
                      const hasVideo = rStream && rStream.getVideoTracks().length > 0;
                      const vol = peerVolumes[peer.peerId] ?? 100;
                      return (
                        <div
                          key={peer.peerId}
                          className={`video-tile ${speakingMap[peer.peerId] ? "speaking" : ""}`}
                        >
                          {hasVideo ? (
                            <VideoStreamView stream={rStream} muted={selfDeafen} />
                          ) : (
                            <UserAvatar
                              profile={peer}
                              speaking={Boolean(speakingMap[peer.peerId])}
                              style={{ width: 68, height: 68, fontSize: 24 }}
                            />
                          )}
                          <div className="video-tile-overlay" style={{ pointerEvents: "auto" }}>
                            <span className="video-tile-name">
                              {peer.displayName || peer.username}
                              {peer.voiceState?.screenSharing && (
                                <span className="live-badge">{t.liveBadge}</span>
                              )}
                            </span>
                            <input
                              type="range"
                              min="0"
                              max="200"
                              value={vol}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setPeerVolumes((prev) => ({ ...prev, [peer.peerId]: v }));
                                voiceEngineRef.current?.setLocalVolume(peer.peerId, v);
                              }}
                              title={t.localVolumeTooltip(peer.displayName || peer.username, vol)}
                              style={{ width: 75, cursor: "pointer" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                      <div key={msg.id} className="message-item">
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
                            <span className="message-timestamp">{msg.timestamp}</span>
                          </div>

                          <div className="message-text">{msg.text}</div>

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

                        {/* Hover Quick React Bar */}
                        <div className="quick-react-bar">
                          {["👍", "❤️", "🔥", "🚀", "⚡"].map((emoji) => (
                            <button
                              key={emoji}
                              className="quick-react-btn"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="chat-input-wrapper">
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
                    <form className="chat-input-bar" onSubmit={handleSendMessage}>
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
                      <button type="submit" className="icon-btn" title={t.sendMessageTooltip}>
                        <Send size={18} color="var(--brand-blurple)" />
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>

            {/* Right Sidebar: Connected Peers & Node Info */}
            <div className="peer-sidebar">
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
                    <span className="peer-card-sub">
                      {nodeStatus.profile.statusEmoji || ""}{" "}
                      {nodeStatus.profile.customStatus || `TCP: ${nodeStatus.tcpPort || "Web"}`}
                    </span>
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
                      <span className="peer-card-sub">
                        {peer.statusEmoji || ""} {peer.customStatus || `${peer.address}:${peer.port} • ${peer.rttMs}ms`}
                      </span>
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
          </div>
        </div>
      </div>

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
            />
          </div>
        </div>
      )}

      {/* Modal: Full Profile Customization & Voice/Video/Screen Settings Studio */}
      {showProfileModal && (
        <div className="modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="profile-studio-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
                  {settingsTab === "media" ? t.mediaSettingsTitle : `✨ ${t.profileModalTitle}`}
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {settingsTab === "media" ? (
                    t.mediaSettingsSub
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

            {/* Studio Top Tabs: Profile vs Audio/Camera/Screen */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                className={settingsTab === "profile" ? "btn-primary" : "btn-secondary"}
                onClick={() => setSettingsTab("profile")}
              >
                {t.tabProfileSettings}
              </button>
              <button
                type="button"
                className={settingsTab === "media" ? "btn-primary" : "btn-secondary"}
                onClick={() => {
                  setSettingsTab("media");
                  refreshMediaDevices();
                }}
              >
                {t.tabMediaSettings}
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
                            style={{ padding: "3px 8px", fontSize: 11 }}
                            onClick={() => voiceEngineRef.current?.startLocalVoice(true)}
                          >
                            🎙️ Test
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
                      </div>
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
                        <div className="camera-preview-box">
                          <VideoStreamView stream={cameraTestStream} muted={true} />
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
                          const dataUrl = await resizeImageToDataUrl(file, 240, 240, 0.86);
                          setProfileForm((p) => ({ ...p, avatarUrl: dataUrl }));
                        } catch {}
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
                          const dataUrl = await resizeImageToDataUrl(file, 640, 240, 0.84);
                          setProfileForm((p) => ({ ...p, bannerUrl: dataUrl }));
                        } catch {}
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

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                className={connectTab === "ip" ? "btn-primary" : "btn-secondary"}
                onClick={() => setConnectTab("ip")}
              >
                {t.tabIp}
              </button>
              <button
                className={connectTab === "lan" ? "btn-primary" : "btn-secondary"}
                onClick={() => setConnectTab("lan")}
              >
                {t.tabLan(lanPeers.length)}
              </button>
              <button
                className={connectTab === "sdp" ? "btn-primary" : "btn-secondary"}
                onClick={() => setConnectTab("sdp")}
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

            {connectTab === "lan" && (
              <div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                  {t.lanTabDesc}
                </p>
                {lanPeers.length === 0 ? (
                  <div style={{ padding: 14, background: "#2b2d31", borderRadius: 6, marginBottom: 12 }}>
                    {t.noLanDetected}
                  </div>
                ) : (
                  lanPeers.map((lp) => (
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
                          onClick={() =>
                            window.DiscordNative?.p2p?.connect(lp.host, lp.tcpPort)
                          }
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
                        const res = await voiceEngineRef.current?.createManualInviteOffer(
                          nodeStatus.profile
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
                        const res = await voiceEngineRef.current?.acceptManualInviteCode(
                          incomingInviteInput,
                          nodeStatus.profile
                        );
                        if (res.mode === "answer-generated") {
                          setGeneratedAnswerCode(res.answerCode);
                          setConnectStatusMsg({
                            type: "success",
                            text:
                              lang === "en"
                                ? "Answer Code generated! Copy it below and send it back to Computer 1."
                                : "Código de Resposta gerado! Copie abaixo e envie de volta ao Computador 1.",
                          });
                        } else {
                          setConnectStatusMsg({
                            type: "success",
                            text:
                              lang === "en"
                                ? `WebRTC P2P tunnel connected with ${res.remoteProfile.username}!`
                                : `Túnel WebRTC P2P conectado com ${res.remoteProfile.username}!`,
                          });
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
    </>
  );
}
