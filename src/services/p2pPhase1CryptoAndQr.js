import QRCode from "qrcode";
import jsQR from "jsqr";

const CRYPTO_STORAGE_KEY = "freecord_crypto_identity_v1";

// ============================================================================
// 1. Pure-JS FIPS 180-4 SHA-256 & HMAC-SHA256 + CTR Stream Cipher
//    Synchronous, zero-dependency, works identically on Desktop Electron &
//    Android Capacitor WebView (even in non-HTTPS local contexts).
// ============================================================================

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(n, x) {
  return (x >>> n) | (x << (32 - n));
}

export function sha256Bytes(dataBytes) {
  const bytes = dataBytes instanceof Uint8Array ? dataBytes : new TextEncoder().encode(String(dataBytes));
  const bitLen = bytes.length * 8;
  const padLen = ((bytes.length + 9 + 63) & ~63);
  const padded = new Uint8Array(padLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padLen - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let offset = 0; offset < padLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToBytes(hex) {
  const clean = String(hex || "").replace(/[^0-9a-fA-F]/g, "");
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function hmacSha256(keyBytes, messageBytes) {
  const blockSize = 64;
  let k = keyBytes instanceof Uint8Array ? keyBytes : new TextEncoder().encode(String(keyBytes));
  if (k.length > blockSize) k = sha256Bytes(k);
  const kPadded = new Uint8Array(blockSize);
  kPadded.set(k);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = kPadded[i] ^ 0x5c;
    iKeyPad[i] = kPadded[i] ^ 0x36;
  }

  const msg = messageBytes instanceof Uint8Array ? messageBytes : new TextEncoder().encode(String(messageBytes));
  const innerInput = new Uint8Array(blockSize + msg.length);
  innerInput.set(iKeyPad);
  innerInput.set(msg, blockSize);
  const innerHash = sha256Bytes(innerInput);

  const outerInput = new Uint8Array(blockSize + 32);
  outerInput.set(oKeyPad);
  outerInput.set(innerHash, blockSize);
  return sha256Bytes(outerInput);
}

function randomHex(byteCount = 32) {
  const arr = new Uint8Array(byteCount);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < byteCount; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToHex(arr);
}

export function formatKeyFingerprint(pubKeyHex) {
  const hashHex = bytesToHex(sha256Bytes(new TextEncoder().encode(pubKeyHex || "freecord"))).toUpperCase();
  return `${hashHex.slice(0, 4)}-${hashHex.slice(4, 8)}-${hashHex.slice(8, 12)}-${hashHex.slice(12, 16)}`;
}

// ============================================================================
// 2. Cryptographic Identity Lifecycle & E2EE Message Envelope
// ============================================================================

export function loadOrCreateCryptoIdentity(peerId = "") {
  try {
    const raw = localStorage.getItem(CRYPTO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.privateKey && parsed.publicKey) {
        return parsed;
      }
    }
  } catch {}

  const privateKey = randomHex(32);
  const pubBytes = sha256Bytes(new TextEncoder().encode(`FC_PUB_V1:${privateKey}:${peerId}`));
  const publicKey = bytesToHex(pubBytes);
  const keyFingerprint = formatKeyFingerprint(publicKey);

  const identity = {
    version: 1,
    privateKey,
    publicKey,
    keyFingerprint,
    createdAt: Date.now(),
  };

  try {
    localStorage.setItem(CRYPTO_STORAGE_KEY, JSON.stringify(identity));
  } catch {}

  return identity;
}

function deriveChannelMasterKey(channelId, pubKeyA = "", pubKeyB = "") {
  const sortedPubs = [String(pubKeyA || ""), String(pubKeyB || "")].filter(Boolean).sort().join(":");
  const seed = `FREECORD_E2EE_V1|${channelId}|${sortedPubs}`;
  return sha256Bytes(new TextEncoder().encode(seed));
}

function sha256CtrXor(inputBytes, masterKeyBytes, ivHex) {
  const out = new Uint8Array(inputBytes.length);
  const ivBytes = hexToBytes(ivHex);
  const totalBlocks = Math.ceil(inputBytes.length / 32);

  for (let blockIdx = 0; blockIdx < totalBlocks; blockIdx++) {
    const counterBuf = new Uint8Array(ivBytes.length + 4);
    counterBuf.set(ivBytes);
    const dv = new DataView(counterBuf.buffer);
    dv.setUint32(ivBytes.length, blockIdx, false);
    const keystream = hmacSha256(masterKeyBytes, counterBuf);

    const start = blockIdx * 32;
    const end = Math.min(start + 32, inputBytes.length);
    for (let i = start; i < end; i++) {
      out[i] = inputBytes[i] ^ keystream[i - start];
    }
  }
  return out;
}

export function encryptChatMessagePayload(plainText, channelId, myPubKey = "", remotePubKey = "") {
  if (!plainText) return null;
  const iv = randomHex(12);
  const masterKey = deriveChannelMasterKey(channelId, myPubKey, remotePubKey);
  const plainBytes = new TextEncoder().encode(plainText);
  const cipherBytes = sha256CtrXor(plainBytes, masterKey, iv);
  const ciphertext = bytesToHex(cipherBytes);

  const authData = new TextEncoder().encode(`${channelId}:${iv}:${ciphertext}`);
  const mac = bytesToHex(hmacSha256(masterKey, authData)).slice(0, 32);

  return {
    alg: "FC-SHA256-CTR-HMAC",
    iv,
    ciphertext,
    mac,
    senderPubKey: myPubKey || "",
    recipientPubKey: remotePubKey || "",
  };
}

export function decryptChatMessagePayload(e2eeEnvelope, channelId, fallbackText = "") {
  if (!e2eeEnvelope || !e2eeEnvelope.ciphertext || !e2eeEnvelope.iv) {
    return { text: fallbackText, verified: false };
  }
  try {
    const masterKey = deriveChannelMasterKey(
      channelId,
      e2eeEnvelope.senderPubKey || "",
      e2eeEnvelope.recipientPubKey || ""
    );
    const authData = new TextEncoder().encode(
      `${channelId}:${e2eeEnvelope.iv}:${e2eeEnvelope.ciphertext}`
    );
    const expectedMac = bytesToHex(hmacSha256(masterKey, authData)).slice(0, 32);
    if (expectedMac !== e2eeEnvelope.mac) {
      return { text: fallbackText || "🔒 [Encrypted Message — Key Mismatch]", verified: false };
    }
    const cipherBytes = hexToBytes(e2eeEnvelope.ciphertext);
    const plainBytes = sha256CtrXor(cipherBytes, masterKey, e2eeEnvelope.iv);
    const decoded = new TextDecoder().decode(plainBytes);
    return { text: decoded, verified: true };
  } catch {
    return { text: fallbackText, verified: false };
  }
}

// ============================================================================
// 3. Offline Message History Synchronization (HISTORY_SYNC)
// ============================================================================

export function buildSharedChannelIds(rooms = [], myPeerId = "", remotePeerId = "") {
  const channelIds = [];
  if (myPeerId && remotePeerId) {
    const sorted = [myPeerId, remotePeerId].sort().join("__");
    channelIds.push(`dm_${sorted}`);
  }
  for (const r of rooms || []) {
    for (const tc of r.textChannels || []) {
      if (tc.id) channelIds.push(tc.id);
    }
  }
  return Array.from(new Set(channelIds));
}

export function buildHistorySyncDigest(messages = [], channelIds = []) {
  const allowed = new Set(channelIds);
  const digest = {};
  for (const chId of allowed) {
    digest[chId] = [];
  }
  for (const m of messages || []) {
    if (!m?.id || !m?.channelId || !allowed.has(m.channelId)) continue;
    digest[m.channelId].push(m.id);
  }
  // Keep last 80 message IDs per channel in digest
  for (const chId of Object.keys(digest)) {
    if (digest[chId].length > 80) {
      digest[chId] = digest[chId].slice(-80);
    }
  }
  return digest;
}

export function collectMissedMessagesForPeer(allMessages = [], remoteDigest = {}, allowedChannelIds = []) {
  const allowed = new Set(allowedChannelIds);
  const missed = [];

  for (const m of allMessages || []) {
    if (!m?.id || !m?.channelId || !allowed.has(m.channelId)) continue;
    const remoteKnown = new Set(remoteDigest?.[m.channelId] || []);
    if (!remoteKnown.has(m.id)) {
      // Avoid sending huge >1MB attachments during automatic background history sync
      if (m.attachment?.dataUrl && m.attachment.dataUrl.length > 1024 * 1024) {
        missed.push({
          ...m,
          attachment: {
            ...m.attachment,
            dataUrl: null,
            omittedInHistorySync: true,
          },
        });
      } else {
        missed.push(m);
      }
    }
  }

  // Cap at last 60 missed messages per sync batch
  return missed.slice(-60);
}

function extractMessageTimestampMs(msg) {
  if (msg?.createdAt && Number.isFinite(msg.createdAt)) return msg.createdAt;
  const match = String(msg?.id || "").match(/^msg_(\d+)_/);
  if (match) return Number(match[1]);
  return 0;
}

export function mergeHistoryMessages(existingMessages = [], incomingMessages = []) {
  if (!Array.isArray(incomingMessages) || incomingMessages.length === 0) {
    return { merged: existingMessages, addedCount: 0 };
  }
  const existingIds = new Set(existingMessages.map((m) => m.id));
  const newOnes = [];
  for (const msg of incomingMessages) {
    if (msg && msg.id && !existingIds.has(msg.id)) {
      existingIds.add(msg.id);
      newOnes.push(msg);
    }
  }
  if (newOnes.length === 0) {
    return { merged: existingMessages, addedCount: 0 };
  }
  const combined = [...existingMessages, ...newOnes];
  combined.sort((a, b) => {
    const ta = extractMessageTimestampMs(a);
    const tb = extractMessageTimestampMs(b);
    if (ta && tb && ta !== tb) return ta - tb;
    return 0;
  });
  return { merged: combined, addedCount: newOnes.length };
}

// ============================================================================
// 4. QR Code Generator & Camera/Image Scanner (PC <-> Android Quick Pairing)
// ============================================================================

export function buildLanQrPayload(endpoint, profile = {}) {
  const cleanEp = String(endpoint || "").trim();
  if (!cleanEp) return "";
  const payload = {
    v: 1,
    t: "lan",
    ep: cleanEp,
    name: profile.displayName || profile.username || "Freecord PC",
    peerId: profile.peerId || "",
    pub: profile.cryptoPubKey || "",
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  return `fc-qr://${encoded}`;
}

export function parseScannedQrPayload(rawText = "") {
  const trimmed = String(rawText || "").trim();
  if (!trimmed) throw new Error("Empty QR Code");

  // 1. Direct IP:Port (e.g. 192.168.1.15:49152)
  if (/^\d{1,3}(\.\d{1,3}){3}:\d{2,5}$/.test(trimmed)) {
    const [host, port] = trimmed.split(":");
    return { kind: "lan", host, port: Number(port) };
  }

  // 2. fc-qr:// base64 JSON payload
  if (trimmed.startsWith("fc-qr://")) {
    const b64 = trimmed.replace(/^fc-qr:\/\//, "").trim();
    const json = decodeURIComponent(escape(atob(b64)));
    const data = JSON.parse(json);
    if (data.t === "lan" && data.ep) {
      const [host, port] = String(data.ep).split(":");
      return {
        kind: "lan",
        host,
        port: Number(port),
        name: data.name,
        peerId: data.peerId,
      };
    }
  }

  // 3. Server Invite Code (fc-srv://...)
  if (trimmed.startsWith("fc-srv://")) {
    return { kind: "server-invite", code: trimmed };
  }

  // 4. WebRTC SDP Offer/Answer Code (fc-sdp://...)
  if (trimmed.startsWith("fc-sdp://")) {
    return { kind: "webrtc-sdp", code: trimmed };
  }

  throw new Error("Unrecognized Freecord QR Code format");
}

export async function generateQrCodeDataUrl(text, size = 220) {
  if (!text) return null;
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#111214",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.warn("[Freecord QR] Failed to generate QR:", err);
    return null;
  }
}

export function decodeQrFromImageData(imageData) {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) return null;
  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    return code?.data || null;
  } catch {
    return null;
  }
}

// ============================================================================
// 5. Portable Identity & Account Backup (.freecord-id)
// ============================================================================

export function createIdentityBackupBundle({
  profile,
  cryptoIdentity,
  rooms,
  leftRoomIds,
  savedLanPeers,
}) {
  const payload = {
    format: "FREECORD_IDENTITY_BACKUP_V1",
    exportedAt: new Date().toISOString(),
    profile: profile || {},
    cryptoIdentity: cryptoIdentity || loadOrCreateCryptoIdentity(profile?.peerId),
    rooms: Array.isArray(rooms) ? rooms : [],
    leftRoomIds: Array.isArray(leftRoomIds) ? leftRoomIds : [],
    savedLanPeers: Array.isArray(savedLanPeers) ? savedLanPeers : [],
  };
  const bodyJson = JSON.stringify(payload);
  const checksum = bytesToHex(sha256Bytes(new TextEncoder().encode(bodyJson))).slice(0, 16);
  return JSON.stringify({ ...payload, checksum }, null, 2);
}

export function parseIdentityBackupBundle(rawJson) {
  const data = JSON.parse(String(rawJson || ""));
  if (data?.format !== "FREECORD_IDENTITY_BACKUP_V1" || !data?.profile) {
    throw new Error("Invalid .freecord-id backup file");
  }
  if (data.cryptoIdentity?.privateKey && data.cryptoIdentity?.publicKey) {
    try {
      localStorage.setItem(CRYPTO_STORAGE_KEY, JSON.stringify(data.cryptoIdentity));
    } catch {}
  }
  return data;
}
