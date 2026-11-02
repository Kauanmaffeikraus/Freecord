const net = require("net");
const EventEmitter = require("events");
const fs = require("fs");
const path = require("path");

class DiscordRpcServer extends EventEmitter {
  constructor() {
    super();
    this.server = null;
    this.activeSockets = new Set();
    this.activities = new Map(); // socket -> activity
  }

  getPipePath(index = 0) {
    if (process.platform === "win32") {
      return `\\\\?\\pipe\\discord-ipc-${index}`;
    } else {
      const prefix = process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || process.env.TMP || "/tmp";
      return path.join(prefix, `discord-ipc-${index}`);
    }
  }

  start(startIndex = 0) {
    if (this.server) return;

    const tryListen = (index) => {
      if (index > 9) {
        console.warn("[Discord RPC Server] All pipes (0-9) are in use or unavailable.");
        return;
      }

      const pipePath = this.getPipePath(index);

      // On Linux/macOS, delete existing socket file if it exists
      if (process.platform !== "win32" && fs.existsSync(pipePath)) {
        try {
          fs.unlinkSync(pipePath);
        } catch {}
      }

      const srv = net.createServer((socket) => {
        this.handleConnection(socket);
      });

      srv.on("error", (err) => {
        if (err.code === "EADDRINUSE" || err.code === "EACCES") {
          // Pipe in use by another instance or official Discord app; try next pipe
          tryListen(index + 1);
        } else {
          console.warn(`[Discord RPC Server] Error on pipe ${pipePath}:`, err.message);
        }
      });

      srv.listen(pipePath, () => {
        this.server = srv;
        this.currentPipeIndex = index;
        console.log(`[Discord RPC Server] Listening on pipe index ${index}: ${pipePath}`);
      });
    };

    tryListen(startIndex);
  }

  stop() {
    for (const socket of this.activeSockets) {
      try {
        socket.destroy();
      } catch {}
    }
    this.activeSockets.clear();
    this.activities.clear();

    if (this.server) {
      try {
        this.server.close();
      } catch {}
      this.server = null;
    }
  }

  handleConnection(socket) {
    this.activeSockets.add(socket);
    let buffer = Buffer.alloc(0);
    let clientId = null;

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (buffer.length >= 8) {
        const opcode = buffer.readInt32LE(0);
        const length = buffer.readInt32LE(4);

        if (buffer.length < 8 + length) {
          // Incomplete frame, wait for more data
          break;
        }

        const payloadBuf = buffer.slice(8, 8 + length);
        buffer = buffer.slice(8 + length);

        try {
          const payloadStr = payloadBuf.toString("utf8");
          const payload = JSON.parse(payloadStr);
          this.processMessage(socket, opcode, payload, (id) => {
            clientId = id;
          });
        } catch (parseErr) {
          console.warn("[Discord RPC Server] Failed to parse payload:", parseErr.message);
        }
      }
    });

    const cleanup = () => {
      this.activeSockets.delete(socket);
      if (this.activities.has(socket)) {
        this.activities.delete(socket);
        this.emitLatestActivity();
      }
    };

    socket.on("close", cleanup);
    socket.on("error", cleanup);
    socket.on("end", cleanup);
  }

  sendFrame(socket, opcode, payloadObj) {
    try {
      const json = JSON.stringify(payloadObj);
      const payloadBuf = Buffer.from(json, "utf8");
      const header = Buffer.alloc(8);
      header.writeInt32LE(opcode, 0);
      header.writeInt32LE(payloadBuf.length, 4);
      socket.write(Buffer.concat([header, payloadBuf]));
    } catch (err) {
      console.warn("[Discord RPC Server] Send error:", err.message);
    }
  }

  processMessage(socket, opcode, payload, setClientId) {
    switch (opcode) {
      case 0: { // HANDSHAKE
        const cId = payload.client_id;
        if (cId) setClientId(cId);

        // Reply with READY dispatch
        this.sendFrame(socket, 1, {
          cmd: "DISPATCH",
          evt: "READY",
          data: {
            v: 1,
            config: {
              cdn_host: "cdn.discordapp.com",
              api_endpoint: "//discord.com/api",
              environment: "production"
            },
            user: {
              id: cId || "100000000000000000",
              username: "FreecordUser",
              discriminator: "0001",
              avatar: null,
              flags: 0,
              premium_type: 2
            }
          }
        });
        break;
      }

      case 1: { // FRAME
        if (payload.cmd === "SET_ACTIVITY") {
          const args = payload.args || {};
          const act = args.activity;
          if (act) {
            const formatted = {
              name: act.name || act.details || "Jogo / Aplicativo",
              details: act.details || "",
              state: act.state || "",
              timestamps: act.timestamps || null,
              assets: act.assets || null,
              startTime: act.timestamps?.start ? (act.timestamps.start > 1e11 ? act.timestamps.start : act.timestamps.start * 1000) : Date.now(),
              category: "Discord RPC",
              source: "rpc"
            };
            this.activities.set(socket, formatted);
          } else {
            this.activities.delete(socket);
          }

          // Acknowledge SET_ACTIVITY
          this.sendFrame(socket, 1, {
            cmd: "SET_ACTIVITY",
            data: act || {},
            evt: null,
            nonce: payload.nonce || null
          });

          this.emitLatestActivity();
        } else if (payload.cmd === "SUBSCRIBE" || payload.cmd === "UNSUBSCRIBE") {
          this.sendFrame(socket, 1, {
            cmd: payload.cmd,
            data: { evt: payload.evt },
            evt: null,
            nonce: payload.nonce || null
          });
        }
        break;
      }

      case 2: { // CLOSE
        this.activities.delete(socket);
        this.emitLatestActivity();
        try {
          socket.end();
        } catch {}
        break;
      }

      case 3: { // PING
        this.sendFrame(socket, 4, payload);
        break;
      }
    }
  }

  emitLatestActivity() {
    let latest = null;
    for (const act of this.activities.values()) {
      latest = act;
    }
    this.emit("activity-changed", latest);
  }
}

module.exports = { DiscordRpcServer };
