interface Props {
  chatOpen: boolean;
  unreadCount: number;
  editMode: boolean;
  onToggleChat: () => void;
  onWave: () => void;
  onOpenEmoji: () => void;
  onToggleEdit: () => void;
}

export default function ActionBar({
  chatOpen,
  unreadCount,
  editMode,
  onToggleChat,
  onWave,
  onOpenEmoji,
  onToggleEdit,
}: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        padding: '8px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '2px solid var(--border)',
        borderRadius: '999px',
        boxShadow: 'var(--shadow)',
        zIndex: 1300,
      }}
    >
      <ActionButton
        label="💬"
        title="Chat"
        onClick={onToggleChat}
        active={chatOpen}
        badge={unreadCount > 0 ? unreadCount : undefined}
      />
      <ActionButton label="👋" title="Wave" onClick={onWave} />
      <ActionButton label="✨" title="Send emoji" onClick={onOpenEmoji} />
      <ActionButton label="🪑" title="Edit furniture" onClick={onToggleEdit} active={editMode} />
    </div>
  );
}

function ActionButton({
  label,
  title,
  onClick,
  active,
  badge,
}: {
  label: string;
  title: string;
  onClick: () => void;
  active?: boolean;
  badge?: number;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        position: 'relative',
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        border: 'none',
        background: active ? 'var(--accent)' : 'transparent',
        fontSize: '1.3rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 120ms ease',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = '#fff0f4';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      {label}
      {badge !== undefined && (
        <span
          style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: 'var(--danger)',
            color: '#fff',
            fontSize: '0.7rem',
            fontWeight: 700,
            borderRadius: '999px',
            minWidth: '18px',
            height: '18px',
            padding: '0 5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #fff',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}