import React, { useState, useEffect } from "react";

export function InGameOverlay() {
  const [voicePeers, setVoicePeers] = useState([]);

  useEffect(() => {
    const cleanup = window.DiscordNative?.overlay?.onVoicePeers((peers) => {
      setVoicePeers(Array.isArray(peers) ? peers : []);
    });
    return () => cleanup?.();
  }, []);

  return (
    <div className="ingame-overlay-container">
      {voicePeers.map((peer) => {
        const isSpeaking = Boolean(peer.speaking);
        return (
          <div
            key={peer.peerId}
            className={`overlay-peer-item ${isSpeaking ? "speaking" : ""}`}
          >
            <div className={`overlay-avatar-wrap ${isSpeaking ? "speaking" : ""}`}>
              {peer.avatarUrl ? (
                <img src={peer.avatarUrl} alt="" className="overlay-avatar-img" />
              ) : (
                <div
                  className="overlay-avatar-placeholder"
                  style={{ backgroundColor: peer.avatarColor || "#5865f2" }}
                >
                  {(peer.displayName || peer.username || "P").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <span className="overlay-peer-name">
              {peer.displayName || peer.username}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default InGameOverlay;
