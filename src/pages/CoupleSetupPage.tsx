import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';

export default function CoupleSetupPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { couple, loading, error } = useCouple(session?.user?.id ?? null);

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
    // If they already have a couple, send them to home (not invite)
  // BUT: Don't redirect if we just came from /home (prevents infinite loop)
  if (couple) {
  console.log('🟢 [CoupleSetup] Couple exists → redirecting to /home');
  return <Navigate to="/home" replace />;
}

  function handleCreate() {
  navigate('/house-selection');
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