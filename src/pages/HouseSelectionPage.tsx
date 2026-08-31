import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { HOUSE_LAYOUTS, type HouseLayout } from '../game/layouts';

function toHexColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function LayoutPreview({ layout }: { layout: HouseLayout }) {
  const previewWidth = 180;
  const scale = previewWidth / layout.width;
  const previewHeight = layout.height * scale;

  return (
    <div
      style={{
        width: previewWidth,
        height: previewHeight,
        position: 'relative',
        background: toHexColor(layout.floorColor),
        border: '2px solid var(--border)',
        borderRadius: '10px',
        overflow: 'hidden',
      }}
    >
      {layout.walls.map((wall, index) => {
        const left = (wall.x - wall.w / 2) * scale;
        const top = (wall.y - wall.h / 2) * scale;
        const width = wall.w * scale;
        const height = wall.h * scale;

        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              background: toHexColor(layout.wallColor),
              borderRadius: '2px',
            }}
          />
        );
      })}
    </div>
  );
}

export default function HouseSelectionPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { couple, loading, createCouple, updateLayout } = useCouple(
    session?.user?.id ?? null
  );

  const [busyLayoutId, setBusyLayoutId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <main className="page">
        <section className="card">
          <p className="muted">Preparing house selection…</p>
        </section>
      </main>
    );
  }

  async function handleSelect(layout: HouseLayout) {
    if (!layout) return;

    setError(null);
    setBusyLayoutId(layout.id);

    try {
      if (!couple) {
        const code = await createCouple('Our Tiny Home', layout.id);

        if (code) {
          navigate('/couple/invite', { state: { code } });
        } else {
          setError('Could not create your home. Please try again.');
        }
      } else {
        const ok = await updateLayout(layout.id);

        if (ok) {
          navigate('/home');
        } else {
          setError('Could not update your house layout.');
        }
      }
    } finally {
      setBusyLayoutId(null);
    }
  }

  return (
    <main className="page">
      <section className="card stack-lg" style={{ width: 'min(92vw, 900px)' }}>
        <div className="topbar">
          <h1>Choose your home 🏠</h1>
          <button
            className="button secondary small"
            onClick={() => navigate(couple ? '/home' : '/couple/setup')}
          >
            ← Back
          </button>
        </div>

        <p className="muted">
          This layout will be saved for both of you. You can change it later, but furniture may
          need rearranging.
        </p>

        {error && <p className="error">{error}</p>}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '14px',
          }}
        >
          {HOUSE_LAYOUTS.map((layout) => {
            const isCurrent = couple?.layout_id === layout.id;
            const busy = busyLayoutId === layout.id;

            return (
              <div
                key={layout.id}
                className="card stack"
                style={{
                  border: isCurrent ? '2px solid var(--accent)' : '2px solid var(--border)',
                }}
              >
                <LayoutPreview layout={layout} />

                <div>
                  <h2>{layout.name}</h2>
                  <p className="muted" style={{ fontSize: '0.9rem', marginTop: '6px' }}>
                    {layout.description}
                  </p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {layout.rooms.map((room) => (
                    <span key={room.id} className="pill" style={{ fontSize: '0.78rem' }}>
                      {room.name}
                    </span>
                  ))}
                </div>

                <button
                  className="button small"
                  onClick={() => handleSelect(layout)}
                  disabled={busy || isCurrent}
                >
                  {busy
                    ? 'Saving…'
                    : isCurrent
                      ? '✅ Current home'
                      : couple
                        ? 'Change to this home'
                        : 'Choose this home'}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}