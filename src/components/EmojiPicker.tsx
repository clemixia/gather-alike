import { useState } from 'react';

const EMOJIS = ['❤️', '🥺', '😂', '😘', '😭', '😍', '🫂', '✨', '🌸', '💕', '🥰', '💖'];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1500,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '16px',
        paddingBottom: '120px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '2px solid var(--border)',
          borderRadius: '20px',
          padding: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '6px',
          boxShadow: 'var(--shadow)',
          maxWidth: '320px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onMouseEnter={() => setHovered(emoji)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            style={{
              fontSize: hovered === emoji ? '2rem' : '1.5rem',
              background: hovered === emoji ? '#fff0f4' : 'transparent',
              border: 'none',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer',
              transition: 'all 120ms ease',
              transform: hovered === emoji ? 'scale(1.15)' : 'scale(1)',
            }}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}