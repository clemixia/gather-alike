import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatMessage } from '../hooks/useChat';

interface Props {
  messages: ChatMessage[];
  userId: string | null;
  partnerName: string;
  onSend: (text: string) => void;
  onMarkRead: () => void;
  onClose: () => void;
}

export default function ChatPanel({
  messages,
  userId,
  partnerName,
  onSend,
  onMarkRead,
  onClose,
}: Props) {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current && messages.length > prevLengthRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLengthRef.current = messages.length;
  }, [messages]);

  // Mark messages as read when panel opens
  useEffect(() => {
    onMarkRead();
  }, [messages.length, onMarkRead]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '16px',
        width: 'min(360px, calc(100vw - 32px))',
        height: 'min(480px, calc(100vh - 160px))',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '2px solid var(--border)',
        borderRadius: '20px',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1400,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff0f4',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>💬 Chat with {partnerName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button
          className="button secondary small"
          onClick={onClose}
          style={{ padding: '4px 10px', fontSize: '0.85rem' }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--muted)',
              padding: '24px',
              fontSize: '0.9rem',
            }}
          >
            Say hello 💕
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === userId;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '8px 12px',
                    borderRadius: '14px',
                    background: isMe ? 'var(--accent)' : '#fff0f4',
                    color: isMe ? '#fff' : 'var(--text)',
                    border: isMe ? 'none' : '1px solid var(--border)',
                    fontSize: '0.92rem',
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.text}
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--muted)',
                    marginTop: '2px',
                    padding: '0 4px',
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                  }}
                >
                  <span>{formatTime(msg.created_at)}</span>
                  {isMe && msg.read_at && <span>✓✓</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '10px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: '8px',
          background: '#fff',
        }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          maxLength={2000}
          style={{
            flex: 1,
            border: '2px solid var(--border)',
            borderRadius: '12px',
            padding: '8px 12px',
            fontSize: '0.92rem',
            outline: 'none',
            fontFamily: 'inherit',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
        <button
          type="submit"
          className="button small"
          disabled={!text.trim()}
          style={{ padding: '8px 14px' }}
        >
          Send
        </button>
      </form>
    </div>
  );
}