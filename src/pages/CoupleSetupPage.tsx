import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';

export default function CoupleSetupPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { couple, loading, createCouple, error } = useCouple(session?.user?.id ?? null);

  if (loading) {
    return (
      <main className="page">
        <section className="card">
          <p className="muted">Checking your home…</p>
        </section>
      </main>
    );
  }

  // If they already have a couple, send them to home (not invite)
  if (couple) {
    return <Navigate to="/home" replace />;
  }

  async function handleCreate() {
    const code = await createCouple('Our Tiny Home');
    if (code) {
      navigate('/couple/invite', { state: { code } });
    }
  }

  return (
    <main className="page">
      <section className="card stack-lg">
        <h1>Let's build our home 💕</h1>
        <p className="muted">
          This is a private world for exactly two people. Are you setting up a new home, or joining
          your partner?
        </p>

        {error && <p className="error">{error}</p>}

        <div className="stack">
          <button className="button" onClick={handleCreate} disabled={loading}>
            🏠 Create Our Home
          </button>

          <button
            className="button secondary"
            onClick={() => navigate('/couple/join')}
            disabled={loading}
          >
            🔑 Join Our Home
          </button>
        </div>
      </section>
    </main>
  );
}