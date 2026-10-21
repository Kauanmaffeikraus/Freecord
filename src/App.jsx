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
    mediaSettingsTitle: "🎙️ Voice, Camera & Screen Share Settings",
    mediaSettingsSub: "Choose your Audio Output (Speaker/Headset), Microphone Input, Camera, and Go Live Screen Share Resolution & FPS.",
    tabProfileSettings: "✨ Profile & Identity",
    tabMediaSettings: "🎙️ Audio, Camera & Screen",
    tabUpdateSettings: "🚀 Updates",
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
    mediaSettingsTitle: "🎙️ Configurações de Áudio, Câmera & Transmissão",
    mediaSettingsSub: "Escolha a Saída de Áudio (Fone/Caixa), o Microfone de Entrada, a Câmera e a Resolução + FPS da Transmissão de Tela (Go Live).",
    tabProfileSettings: "✨ Perfil & Identidade",
    tabMediaSettings: "🎙️ Áudio, Câmera & Tela",
    tabUpdateSettings: "🚀 Atualizações",
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
        width: "100%",
        height: "100%",
        position: "relative",
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

  // Chat State
  const [messages, setMessages] = useState(INITIAL_REA_MESSAGES);
  const [chatInput, setChatInput] = useState("");
  const [typingPeers, setTypingPeers] = useState({});

  // Voice, Simultaneous Webcam + Screen Share & Resizable Stage State
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState(null);
  const [selfMute, setSelfMute] = useState(false);
  const [selfDeafen, setSelfDeafen] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [speakingMap, setSpeakingMap] = useState({});
  const [localCameraStream, setLocalCameraStream] = useState(null);
  const [localScreenStream, setLocalScreenStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [peerVolumes, setPeerVolumes] = useState({});
  const [peerScreenVolumes, setPeerScreenVolumes] = useState({});
  const [rtcStats, setRtcStats] = useState({});

  // Stage Resize, Spotlight, Theater, Fullscreen & PiP State
  const [stageHeight, setStageHeight] = useState(440);
  const [stageTheaterMode, setStageTheaterMode] = useState(false);
  const [tileMinWidth, setTileMinWidth] = useState(340);
  const [spotlightTileId, setSpotlightTileId] = useState(null);
  const [tileFitMap, setTileFitMap] = useState({});
  const [tileZoomMap, setTileZoomMap] = useState({});
  const [showWebcamPipOverlay, setShowWebcamPipOverlay] = useState(true);
  const [webcamPipWidth, setWebcamPipWidth] = useState(230);
  const stageContainerRef = useRef(null);

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
  }, [nodeStatus.profile.peerId]);

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
        if (window.DiscordNative?.p2p) {
          window.DiscordNative.p2p.send(
            {
              type: "WEBRTC_SIGNAL",
              voiceChannelId: activeVoiceChannelIdRef.current,
              signal,
            },
            targetPeerId
          );
        }
      },
      onFrameSend: (framePacket) => {
        const activeCh = activeVoiceChannelIdRef.current;
        if (!activeCh || !window.DiscordNative?.p2p) return;
        const dmTargetPeerId = outgoingDmCallRef.current?.peer?.peerId || null;
        for (const p of connectedPeersRef.current) {
          if (p.voiceChannelId === activeCh || (dmTargetPeerId && p.peerId === dmTargetPeerId)) {
            window.DiscordNative.p2p.send(
              {
                type: "MEDIA_FRAME",
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
        if (!activeCh || !window.DiscordNative?.p2p) return;
        const dmTargetPeerId = outgoingDmCallRef.current?.peer?.peerId || null;
        for (const p of connectedPeersRef.current) {
          if (p.voiceChannelId === activeCh || (dmTargetPeerId && p.peerId === dmTargetPeerId)) {
            window.DiscordNative.p2p.send(
              {
                type: "AUDIO_CHUNK",
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
        setSpeakingMap((prev) => ({ ...prev, [key]: isSpeaking }));
        if (who === "self" && activeVoiceChannelIdRef.current) {
          window.DiscordNative?.p2p?.send({
            type: "VOICE_SPEAKING",
            voiceChannelId: activeVoiceChannelIdRef.current,
            speaking: Boolean(isSpeaking),
          });
        }
      },
      onInputLevelChange: (level) => {
        setMicInputLevel(level);
      },
      onStatsUpdate: (stats) => {
        setRtcStats(stats);
      },
      onDataChannelMessage: (fromPeerId, packet) => {
        handleIncomingP2PEventRef.current?.({ ...packet, fromPeerId });
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

  // Listen for Auto-Updater status from Electron Main Process
  useEffect(() => {
    window.DiscordNative?.app?.getVersion?.().then?.((v) => {
      if (v) setAppVersion(v);
    });
    const unsub = window.DiscordNative?.updater?.onUpdateStatus?.((statusObj) => {
      if (statusObj) {
        setUpdateStatus(statusObj);
        if (statusObj.status !== "checking") {
          setIsCheckingUpdate(false);
        }
      }
    });
    return () => unsub?.();
  }, []);

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus({ status: "checking" });
    try {
      const res = await window.DiscordNative?.updater?.checkForUpdates?.();
      if (res?.dev) {
        setUpdateStatus({
          status: "dev",
          message: res.message || "Auto-updater operates in packaged builds.",
        });
      } else if (!res?.ok && res?.error) {
        setUpdateStatus({ status: "error", message: res.error });
      }
    } catch (err) {
      setUpdateStatus({ status: "error", message: err.message });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

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
      if (Array.isArray(peers)) {
        setSpeakingMap((prev) => {
          const next = { ...prev };
          for (const p of peers) {
            if (p.voiceState && typeof p.voiceState.speaking === "boolean") {
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
    if (window.DiscordNative?.p2p) {
      window.DiscordNative.p2p.send(packet, targetPeerId);
      // Only also send via DataChannel if targeting a manual browser-only WebRTC peer
      if (targetPeerId && String(targetPeerId).startsWith("webrtc_")) {
        voiceEngineRef.current?.sendViaDataChannel(packet, targetPeerId);
      }
      return;
    }
    voiceEngineRef.current?.sendViaDataChannel(packet, targetPeerId);
  };

  const handleIncomingP2PEvent = (event) => {
    switch (event.type) {
      case "CHAT_MESSAGE": {
        if (!event.message || !event.message.id) return;
        const msg = event.message;
        let isDuplicate = false;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) {
            isDuplicate = true;
            return prev;
          }
          return [...prev, msg];
        });
        if (isDuplicate) break;

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

              const textMap = new Map(
                (existing.textChannels || []).map((c) => [c.id, c])
              );
              for (const ch of incomingRoom.textChannels || []) {
                textMap.set(ch.id, incomingIsNewer ? ch : textMap.get(ch.id) || ch);
              }

              const voiceMap = new Map(
                (existing.voiceChannels || []).map((c) => [c.id, c])
              );
              for (const vc of incomingRoom.voiceChannels || []) {
                voiceMap.set(vc.id, incomingIsNewer ? vc : voiceMap.get(vc.id) || vc);
              }

              map.set(incomingRoom.id, {
                ...existing,
                ...(incomingIsNewer ? incomingRoom : {}),
                textChannels: incomingIsNewer
                  ? incomingRoom.textChannels || Array.from(textMap.values())
                  : Array.from(textMap.values()),
                voiceChannels: incomingIsNewer
                  ? incomingRoom.voiceChannels || Array.from(voiceMap.values())
                  : Array.from(voiceMap.values()),
              });
            }
          }
          return Array.from(map.values());
        });
        break;
      }

      case "DM_CALL_RING": {
        if (!event.fromPeerId || !event.channelId) break;
        if (activeVoiceChannelIdRef.current === event.channelId) {
          sendP2PPacket(
            { type: "DM_CALL_ACCEPT", channelId: event.channelId },
            event.fromPeerId
          );
          break;
        }
        const caller =
          event.caller ||
          connectedPeersRef.current.find((p) => p.peerId === event.fromPeerId) || {
            peerId: event.fromPeerId,
            displayName: "Peer",
            username: "peer",
          };
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
        const senderPeer = connectedPeersRef.current.find((p) => p.peerId === event.fromPeerId);
        if (senderPeer && senderPeer.voiceChannelId && senderPeer.voiceChannelId !== activeCh) {
          break;
        }
        voiceEngineRef.current?.handleIncomingSignal(event.fromPeerId, event.signal);
        break;
      }

      case "VOICE_SPEAKING": {
        if (event.fromPeerId) {
          setSpeakingMap((prev) => ({
            ...prev,
            [event.fromPeerId]: Boolean(event.speaking),
          }));
          voiceEngineRef.current?.setRemotePeerSpeaking(
            event.fromPeerId,
            Boolean(event.speaking)
          );
        }
        break;
      }

      case "MEDIA_FRAME": {
        const activeCh = activeVoiceChannelIdRef.current;
        if (!activeCh || !event.fromPeerId || !event.kind || !event.dataUrl) break;
        if (event.voiceChannelId && event.voiceChannelId !== activeCh) break;
        const senderPeer = connectedPeersRef.current.find((p) => p.peerId === event.fromPeerId);
        if (senderPeer && senderPeer.voiceChannelId !== activeCh) break;
        voiceEngineRef.current?.handleIncomingMediaFrame(event.fromPeerId, event);
        break;
      }

      case "AUDIO_CHUNK": {
        const activeCh = activeVoiceChannelIdRef.current;
        if (!activeCh || !event.fromPeerId || !event.pcmBase64) break;
        if (event.voiceChannelId && event.voiceChannelId !== activeCh) break;
        const senderPeer = connectedPeersRef.current.find((p) => p.peerId === event.fromPeerId);
        if (senderPeer && senderPeer.voiceChannelId !== activeCh) break;
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
    await engine.startLocalVoice();

    const vState = {
      muted: selfMute,
      deafened: selfDeafen,
      videoEnabled,
      screenSharing,
    };
    window.DiscordNative?.p2p?.setVoiceState(voiceChannel.id, vState);

    for (const peer of connectedPeers) {
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
    const engine = voiceEngineRef.current;
    engine?.setInVoiceChannel(false);
    engine?.destroyAll();
    setActiveVoiceChannelId(null);
    setVideoEnabled(false);
    setScreenSharing(false);
    setLocalCameraStream(null);
    setLocalScreenStream(null);
    setSpotlightTileId(null);
    setRemoteStreams({});
    setSpeakingMap({});
    setMicInputLevel(0);
    window.DiscordNative?.p2p?.send({ type: "VOICE_SPEAKING", speaking: false });
    window.DiscordNative?.p2p?.setVoiceState(null, { speaking: false });
  };

  const handleStartDmCall = async (peer, withVideo = false) => {
    if (!peer?.peerId) return;
    setInspectedProfile(null);
    setSelectedRoomId("dm_hub");
    setSelectedDmPeerId(peer.peerId);

    const dmCallId = getDmCallChannelId(peer.peerId);
    const peerLabel = peer.displayName || peer.username || "Peer";
    await handleJoinVoiceChannel({
      id: dmCallId,
      name: `PV @${peerLabel}`,
    });

    if (withVideo && !videoEnabled) {
      setTimeout(() => {
        toggleCamera().catch(() => {});
      }, 200);
    }

    const peerAlreadyInCall = connectedPeers.some(
      (p) => p.peerId === peer.peerId && p.voiceChannelId === dmCallId
    );
    if (!peerAlreadyInCall) {
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
    setSelectedRoomId("dm_hub");
    setSelectedDmPeerId(fromPeerId);

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
      window.DiscordNative?.p2p?.send({ type: "VOICE_SPEAKING", speaking: false });
    }
    if (activeVoiceChannelId) {
      window.DiscordNative?.p2p?.setVoiceState(activeVoiceChannelId, {
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
      window.DiscordNative?.p2p?.send({ type: "VOICE_SPEAKING", speaking: false });
    }
    voiceEngineRef.current?.setSelfDeafen(next);
    if (activeVoiceChannelId) {
      window.DiscordNative?.p2p?.setVoiceState(activeVoiceChannelId, {
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
      setLocalScreenStream(null);
      if (spotlightTileId === "self_screen") {
        setSpotlightTileId(null);
      }
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

  const toggleElementFullscreen = (el) => {
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  };

  const toggleVideoPiP = async (videoId) => {
    try {
      const videoEl = document.getElementById(videoId);
      if (!videoEl) return;
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (typeof videoEl.requestPictureInPicture === "function") {
        await videoEl.requestPictureInPicture();
      }
    } catch {}
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

  // Build simultaneous stage tiles: separate tiles for Screen Share and Webcam so both can be viewed at once
  const stageTiles = useMemo(() => {
    const tiles = [];

    // 1. Local Go Live Screen Share Tile (if active)
    if (screenSharing && localScreenStream) {
      tiles.push({
        id: "self_screen",
        peerId: nodeStatus.profile.peerId,
        isSelf: true,
        kind: "screen",
        stream: localScreenStream,
        profile: nodeStatus.profile,
        label: `${selfDisplayName} ${t.youSuffix}`,
        badge: `${t.screenBadge} • ${screenResolution.toUpperCase()} ${screenFps}FPS`,
        speaking: false,
      });
    }

    // 2. Local Webcam / Avatar Tile (always separate from Screen Share so both show simultaneously)
    tiles.push({
      id: "self_camera",
      peerId: nodeStatus.profile.peerId,
      isSelf: true,
      kind: "camera",
      stream: videoEnabled ? localCameraStream : null,
      profile: nodeStatus.profile,
      label: `${selfDisplayName} ${t.youSuffix}`,
      badge: videoEnabled ? t.cameraBadge : null,
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
        stream:
          peerCameraStream && peerCameraStream.getVideoTracks().length > 0
            ? peerCameraStream
            : null,
        frameUrl: peerCameraFrameUrl,
        profile: peer,
        label: peerName,
        badge: isCallPending
          ? "📞 Chamando..."
          : hasRemoteCamera
          ? t.cameraBadge
          : peer.voiceState?.screenSharing && !hasRemoteScreen
          ? t.liveBadge
          : null,
        speaking: Boolean(speakingMap[peer.peerId]),
      });
    }

    return tiles;
  }, [
    activeVoiceChannelId,
    outgoingDmCall,
    screenSharing,
    localScreenStream,
    videoEnabled,
    localCameraStream,
    nodeStatus.profile,
    selfDisplayName,
    screenResolution,
    screenFps,
    speakingMap,
    connectedPeers,
    remoteStreams,
    lang,
  ]);

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
          <UserAvatar
            profile={tile.profile}
            speaking={tile.speaking}
            onClick={() => setInspectedProfile(tile.profile)}
            style={{ width: isSpotlight ? 96 : 68, height: isSpotlight ? 96 : 68, fontSize: isSpotlight ? 32 : 24 }}
          />
        )}

        {/* Top-Right Hover Controls: Spotlight/Focus, Fit/Fill, Zoom, PiP, Fullscreen */}
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

              {tile.stream && (
                <button
                  type="button"
                  className="tile-ctrl-btn"
                  onClick={() => toggleVideoPiP(videoDomId)}
                  title={t.pipBtn}
                >
                  <PictureInPicture2 size={12} />
                </button>
              )}
            </>
          )}

          <button
            type="button"
            className="tile-ctrl-btn"
            onClick={() =>
              toggleElementFullscreen(document.getElementById(`tile_box_${tile.id}`))
            }
            title={t.tileFullscreenBtn}
          >
            <Maximize2 size={12} />
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
                      <span>🎙️</span>
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
                  <span>🎙️</span>
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

  return (
    <>
      {/* DiscordPTB Frameless Titlebar with Official Freecord Logo */}
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
              <span>🚀 {t.restartAndInstallBtn} (v{updateStatus.version})</span>
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

      {/* Auto-Updater Banner Notification */}
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
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>🚀</span>
            <span>{t.updateReadyNotice} ({updateStatus.version || "v1.0.0"})</span>
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
            onClick={() => window.DiscordNative?.updater?.quitAndInstall?.()}
          >
            {t.restartAndInstallBtn}
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
          }}
        >
          <span>⬇️ {t.downloadingUpdate} {updateStatus.percent || 0}%</span>
        </div>
      )}

      {/* Main Workspace */}
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
                  {settingsTab === "media"
                    ? t.mediaSettingsTitle
                    : settingsTab === "updates"
                    ? t.updateSettingsTitle
                    : `✨ ${t.profileModalTitle}`}
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
              <button
                type="button"
                className={settingsTab === "updates" ? "btn-primary" : "btn-secondary"}
                onClick={() => setSettingsTab("updates")}
              >
                {t.tabUpdateSettings}
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
                        <span style={{ color: "#57f287" }}>
                          🚀 {t.updateReadyNotice} (v{updateStatus.version})
                        </span>
                      )}
                      {updateStatus?.status === "downloading" && (
                        <span style={{ color: "#5865f2" }}>
                          ⬇️ {t.downloadingUpdate} {updateStatus.percent || 0}%
                        </span>
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
                        onClick={() => window.DiscordNative?.updater?.quitAndInstall?.()}
                      >
                        {t.restartAndInstallBtn}
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
                          const dataUrl = await resizeImageToDataUrl(file, 240, 240, 0.86);
                          setServerForm((s) => ({ ...s, iconUrl: dataUrl }));
                        } catch {}
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
                          const dataUrl = await resizeImageToDataUrl(file, 640, 260, 0.85);
                          setServerForm((s) => ({ ...s, bannerUrl: dataUrl }));
                        } catch {}
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
