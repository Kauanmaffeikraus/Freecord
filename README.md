<p align="center">
  <img src="./public/logo.png" alt="Freecord Logo" width="128" height="128" style="border-radius: 28px;" />
</p>

<h1 align="center">Freecord PTB — Serverless P2P Communication</h1>

<p align="center">
  <strong>Freecord PTB</strong> is a free, open-source desktop and mobile communication platform inspired by <strong>DiscordPTB (v1.0.1225)</strong>, engineered to operate <strong>100% Peer-to-Peer (Serverless)</strong> — interconnecting computers and smartphones directly without relying on any central server, cloud database, or mandatory accounts.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/Architecture-P2P%20Mesh%20%2B%20WebRTC-success.svg" alt="P2P Mesh + WebRTC" />
  <img src="https://img.shields.io/badge/Electron-33.x-47848F.svg" alt="Electron 33.x" />
  <img src="https://img.shields.io/badge/Android-Capacitor%20APK-3DDC84.svg" alt="Android APK" />
  <img src="https://img.shields.io/badge/React-18-61DAFB.svg" alt="React 18" />
  <img src="https://img.shields.io/badge/Servers-0%20(100%25%20Decentralized)-orange.svg" alt="Zero Servers" />
</p>

<p align="center">
  <a href="./ROADMAP.md"><strong>🗺️ View Project Roadmap & Future Enhancements (ROADMAP.md)</strong></a>
</p>

---

## 🌟 Key Features

### 🖧 100% Serverless & Decentralized Mesh Architecture
- **Hybrid TCP Mesh & WebSocket P2P Node**: Computers connect directly via `IP:Port` over persistent TCP sockets with automatic peer gossip exchange (`PEER_EXCHANGE`), while simultaneously serving a 1-byte peeking WebSocket bridge (`/p2p`) on the exact same port for mobile Android/Web clients.
- **Zero-Config LAN & VPN Auto-Discovery**: Automatically discovers and interconnects peers on the same local Wi-Fi, Ethernet, or virtual private LAN (Tailscale, ZeroTier, Radmin VPN, Hamachi) via UDP broadcast (`255.255.255.255:49150`) and multicast (`239.255.42.99:49150`).
- **Serverless WebRTC SDP Invite Codes**: Connect computers and phones across strict NATs or the internet by exchanging compact Base64 SDP Offer/Answer tokens (`fc-sdp://`) without port forwarding or central signaling servers.
- **Remembered LAN Hosts**: Automatically saves previously connected LAN endpoints for 1-tap reconnection.
- **Cryptographic Pairwise Fingerprints**: Generates deterministic SHA-256 MLS-style pairwise identity fingerprints between connected nodes.

### 📱 Native Android App (APK) & Dedicated Mobile UI
- **Discord Mobile-Inspired Layout**: Dedicated touch-optimized interface on Android with a bottom navigation bar (`Servers`, `DMs`, `LAN / P2P`, `Profile`), slide-over channel/member drawers, and compact voice sheets.
- **Seamless Desktop ↔ Mobile Interop**: Connect Android phones directly to PC nodes via local Wi-Fi (`IP:Port` WebSocket) or across networks via WebRTC SDP codes.

### 🎙️ Opus Voice, Video & 60 FPS Go Live Screen Sharing
- **Simultaneous Webcam + Screen Share Stage**: View remote/local webcams and screen broadcasts at the same time.
- **Interactive Stage Modes**: Resizable stage height (drag handle), Spotlight/Focus mode, Theater mode, Grid view, Stage fullscreen, Video tile fullscreen, and native Picture-in-Picture (PiP).
- **Floating Webcam PiP Overlay**: Displays the presenter's camera in a draggable/resizable picture-in-picture overlay on top of screen streams.
- **Fit vs. Fill & Zoom**: Toggle between aspect fit (`contain`) or fill (`cover`) and apply digital zoom (`100%`, `125%`, `150%`, `200%`) on any incoming stream.
- **Go Live Quality Selector**: Stream desktop displays or specific windows at resolutions from `720p` up to `4K` at `15`, `30`, or `60 FPS`.
- **Low-Latency Voice Engine**: Opus audio pipeline with real-time Voice Activity Detection (VAD) and speaking green-ring animation.

### 🎚️ Separate Voice & Stream Audio Mixers + Echo Isolation
- **Independent Dual Audio Pipeline**: Each remote peer has dedicated audio gain elements for their **Microphone Voice (`🎙️`)** and **Game/Screen Share Audio (`🖥️`)**.
- **Individual Volume Control**: Adjust voice (`0%–200%`) and stream sound (`0%–200%`) independently without altering each other.
- **Loopback Audio Echo Isolation**: Prevents viewers' voices from echoing back through the broadcaster's desktop system audio capture during Go Live streams.

### 📞 Private 1-on-1 DM Calls (Voice & Video)
- **Direct Calling in DMs**: Start a private voice or video call with any connected peer with 1 click from the DM list, DM conversation header, or user profile card.
- **Full P2P Signaling**: Handled entirely through P2P packets (`DM_CALL_RING`, `DM_CALL_ACCEPT`, `DM_CALL_REJECT`, `DM_CALL_END`).
- **Incoming Call Modal & Audio Ringtone**: Displays an animated pulsing avatar modal with real-time synthesized ringtone audio loop and options to **Accept Voice**, **Accept Video**, or **Decline**.
- **Outgoing Call Ringing Banner**: Shows calling status with a 1-click **Cancel Call** button.
- **Clean Disconnect**: Prevents audio bleed or dangling connections when hanging up or switching channels.

### 🏰 P2P Server Customization Studio
- **Full Visual Customization**: Customize server name, acronym/icon emoji, server tag badge (`✦ P2P`, `✦ SQUAD`, `✦ MESH`), description/topic, custom icon image (including animated GIFs), banner image, 2-tone gradient theme colors, and sidebar background color.
- **Channel Management**: Create, edit, and organize multiple text and voice channels per server.
- **P2P Synchronization**: Server configurations and channels sync across connected peers via `ROOM_SYNC`.

### 📨 Server Invites & Leave Server
- **1-Click DM Invites**: Send an instant server invite directly to a connected peer's DM chat.
- **Rich Interactive Embed Cards**: In chat, server invites render as Discord-style interactive embed cards with server banners, icons, description, and a **"Join Server"** (or **"Joined ✓ — Open Server"**) button.
- **Shareable Invite Codes (`fc-srv://...`)**: Generate and copy base64-encoded server invite codes containing the server snapshot and host endpoint, allowing peers to join by pasting the code.
- **Leave Server**: Leave servers at any time with persistent client-side tracking (`localStorage: freecord_left_rooms_v1`), ensuring passive `ROOM_SYNC` never re-adds servers you intentionally left.

### 🔔 Notifications & Synthesized WebAudio Effects
- **Unread Badges**: Red notification counters on the DM Hub icon, server icons (left rail), channels, and individual DM peer items.
- **Clickable Toast Notifications**: Non-intrusive top-right notification stack for messages and invites; clicking directly navigates to the conversation and focuses the app.
- **WebAudio Sound Synthesizer**: Built-in sound effects (no external audio files required) for incoming messages, server invites, incoming call ringtones, outgoing ringback tones, and call connect/disconnect.
- **Mute Toggle**: Quick-access notification toggle (`Bell` / `BellOff`) in the titlebar.
- **Native OS & Taskbar Integration**: Electron window taskbar flash (`flashFrame`) and native OS notifications when the window is in the background or minimized.

### 👤 Animated GIF Profile Studio & Media Controls
- **Animated GIF Avatars & Banners**: Full support for animated `.gif` avatars and profile banners alongside static images.
- **Profile Studio**: Set Display Name, Username, `#Tag`, Pronouns, About Me Bio, Presence Status (`Online`, `Idle`, `Do Not Disturb`, `Invisible`), Custom Status Emoji + Text, theme colors, and profile badges.
- **Audio Output Device**: Select specific speaker/headset device (`setSinkId`) with Master Volume control and test sound playback.
- **Microphone Input Device**: Real-time VU input meter with toggles for Echo Cancellation, Noise Suppression, and Automatic Gain Control (AGC).
- **Camera Device & Resolution**: Camera device selector (`480p`, `720p`, `1080p`) with live video preview.

### 📦 Cross-Platform Installers & GitHub OTA Auto-Updater
- **Windows & Linux Builds**: Package native installers for Windows (`NSIS` & `Portable`) and Linux (`AppImage` & `.deb`).
- **Automatic Over-The-Air Updates**: Integrated `electron-updater` checks GitHub Releases for new versions, downloads updates in the background, and offers 1-click restart-to-update.

### 📎 Direct P2P File Transfers
- Send images, screenshots, and files up to 15 MB directly peer-to-peer.
- Inline media preview and direct download without cloud hosting.

### 🌐 Bilingual Interface (EN / PT-BR)
- Instant one-click toggle between **English** and **Portuguese (PT-BR)** with persisted preferences in `localStorage` and `settings.json`.

---

## 🏗️ Architecture Overview

```
                      +-----------------------------+
                      |   Electron Main Process     |
                      |     (electron/main.cjs)     |
                      +--------------+--------------+
                                     | (IPC Bridge)
                      +--------------v--------------+
                      |   Preload Context Bridge    |
                      |   (window.DiscordNative)    |
                      +--------------+--------------+
                                     |
         +---------------------------+---------------------------+
         |                                                       |
+--------v-------------------+                 +-----------------v-------------------+
|    P2P Network Node        |                 |   WebRTC Voice & Media Engine       |
|  (electron/p2pNode.cjs)    |                 | (src/services/webrtcVoiceEngine.js) |
+----------------------------+                 +-------------------------------------+
| • Hybrid TCP + WS Router   |                 | • RTCPeerConnection Mesh            |
| • UDP LAN/VPN Discovery    |                 | • Dual Audio Mixers (Voice/Stream)  |
| • Peer Gossip Exchange     |                 | • Opus Voice + VAD + Echo Isolation |
| • Signaling & Event Router |                 | • Desktop & Window Capture (GoLive) |
| • SHA-256 MLS Fingerprints |                 | • Camera & Screen Media Bundles     |
+----------------------------+                 +-------------------------------------+
                                     |
                      +--------------v--------------+
                      |  React + Vite + Capacitor   |
                      |  Desktop & Android Mobile   |
                      +-----------------------------+
```

| Component | Path | Description |
| :--- | :--- | :--- |
| **P2P Node Engine** | `electron/p2pNode.cjs` | Hybrid TCP mesh + WebSocket `/p2p` server, UDP broadcast/multicast LAN discovery, peer gossip, RTT ping, SHA-256 identity fingerprinting. |
| **Electron Main** | `electron/main.cjs` | Frameless window manager, `electron-updater` OTA handler, multi-instance launcher (`--peer-instance=<id>`), `desktopCapturer`, `flashFrame`. |
| **Preload Bridge** | `electron/preload.cjs` | `contextBridge` exposing `window.DiscordNative` (window controls, P2P APIs, auto-updater events, settings persistence, screen capture). |
| **WebRTC Media Engine** | `src/services/webrtcVoiceEngine.js` | WebRTC mesh manager, separate Voice and Screen Share gain mixers, loopback echo isolation, Web Audio VAD, SDP token exchange. |
| **User Interface** | `src/App.jsx`, `src/styles.css` | DiscordPTB-inspired desktop UI + dedicated Android mobile UI, stage manager, profile/server studios, notification manager. |
| **Android Container** | `android/` | Capacitor Android project with runtime camera/microphone permission handlers (`MainActivity.java`). |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `>= 20.0.0` (Recommended: `v22+`)
- **npm**: `>= 10.0.0`

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/Kauanmaffeikraus/Freecord.git
cd Freecord

# 2. Install dependencies
npm install

# 3. Start Freecord in development mode
npm start
```

### Building Desktop Installers & Android APK

```bash
# Build Windows NSIS Installer & Portable executable
npm run dist:win

# Build Linux AppImage & Debian (.deb) packages
npm run dist:linux

# Build Android APK (requires Android SDK & Java 21)
npm run build:apk
```

---

## 🧪 Testing Multi-Peer P2P on a Single Computer

You can test full real-time P2P chat, file transfers, private DM calls, voice chat, and Go Live screen sharing on a single machine:

1. Click **"Spawn 2nd Local Peer"** (`Abrir 2º Peer Local`) in the Freecord titlebar, or run:
   ```bash
   npm run peer2
   ```
2. A second independent Freecord window will launch with an isolated profile, storage, and port.
3. Both instances will automatically discover and connect to each other via UDP LAN discovery.

---

## 🗺️ Roadmap

See [ROADMAP.md](./ROADMAP.md) for the complete list of implemented milestones and upcoming planned features.

---

## 📜 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
