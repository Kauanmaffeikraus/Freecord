import React, { memo } from "react";
import { Pin, X, ArrowRight, Trash2 } from "lucide-react";
import DiscordMarkdown from "./DiscordMarkdown";

export const PinnedMessagesModal = memo(
  ({ pinnedMessages, onJumpToMessage, onUnpinMessage, onClose }) => {
    return (
      <div className="pinned-messages-backdrop" onClick={onClose}>
        <div className="pinned-messages-popover" onClick={(e) => e.stopPropagation()}>
          <div className="pinned-messages-header">
            <div className="pinned-header-title">
              <Pin size={16} />
              <span>Mensagens Fixadas</span>
              <span className="pinned-count-badge">{pinnedMessages.length}</span>
            </div>
            <button
              type="button"
              className="pinned-close-btn"
              onClick={onClose}
              title="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          <div className="pinned-messages-list">
            {pinnedMessages.length === 0 ? (
              <div className="pinned-empty-state">
                <Pin size={32} strokeWidth={1.5} color="var(--text-muted)" />
                <h4>Nenhuma mensagem fixada</h4>
                <p>Passe o mouse sobre uma mensagem e clique no ícone de alfinete para fixá-la neste canal.</p>
              </div>
            ) : (
              pinnedMessages.map((msg) => (
                <div key={msg.id} className="pinned-message-card">
                  <div className="pinned-msg-header">
                    <span className="pinned-msg-author">
                      {msg.author?.displayName || msg.author?.username || "Peer"}
                    </span>
                    <span className="pinned-msg-timestamp">{msg.timestamp}</span>
                  </div>

                  <div className="pinned-msg-content">
                    <DiscordMarkdown content={msg.text} />
                  </div>

                  {msg.attachment?.isImage && (
                    <div className="pinned-msg-attachment">
                      <img src={msg.attachment.dataUrl} alt={msg.attachment.name} />
                    </div>
                  )}

                  <div className="pinned-msg-actions">
                    <button
                      type="button"
                      className="pinned-jump-btn"
                      onClick={() => {
                        onJumpToMessage(msg.id);
                        onClose();
                      }}
                    >
                      <span>Pular</span>
                      <ArrowRight size={13} />
                    </button>

                    <button
                      type="button"
                      className="pinned-unpin-btn"
                      onClick={() => onUnpinMessage(msg.id)}
                      title="Desafixar mensagem"
                    >
                      <Trash2 size={13} />
                      <span>Desafixar</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }
);

export default PinnedMessagesModal;
