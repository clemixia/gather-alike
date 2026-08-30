import { FURNITURE_CATALOG, type FurnitureType } from '../game/furniture';

interface Props {
  onSelect: (type: FurnitureType) => void;
  onClose: () => void;
}

export default function FurnitureCatalog({ onSelect, onClose }: Props) {
  const categories = [
    { id: 'seating', name: '🪑 Seating' },
    { id: 'sleeping', name: '🛏️ Sleeping' },
    { id: 'storage', name: '📦 Storage' },
    { id: 'decor', name: '🎨 Decor' },
    { id: 'lighting', name: '💡 Lighting' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(91, 70, 80, 0.5)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="card stack-lg"
        style={{
          width: 'min(92vw, 520px)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="topbar">
          <h1>🪑 Furniture</h1>
          <button className="button secondary small" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className="muted">
          Click an item to place it in your home. You can drag to move it, or select it to rotate/delete.
        </p>

        {categories.map((cat) => {
          const items = FURNITURE_CATALOG.filter((f) => f.category === cat.id);
          if (items.length === 0) return null;

          return (
            <div key={cat.id}>
              <div className="label">{cat.name}</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: '8px',
                }}
              >
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '12px 8px',
                      background: '#fff',
                      border: '2px solid var(--border)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span style={{ fontSize: '2rem' }}>{item.emoji}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}