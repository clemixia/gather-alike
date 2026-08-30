import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/env';

export default function LandingPage() {
  const { session, loading } = useAuth();
  const configured = isSupabaseConfigured();

  if (!configured) {
    return (
      <main className="page">
        <section className="card stack-lg">
          <div className="stack">
            <h1>🏠 Our Tiny Home</h1>
            <p className="muted">
              A private cozy 2D world for two people.
            </p>
          </div>

          <div className="card">
            <h2>Setup needed</h2>
            <p className="muted">
              Add <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code>{' '}
              file, then restart the dev server.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="card stack-lg">
        <div className="stack">
          <h1>🏠 Our Tiny Home</h1>
          <p className="muted">
            A tiny private digital home for you and your partner. Walk around,
            chat, react, decorate, and automatically connect when you are near
            each other.
          </p>
        </div>

        {loading ? (
          <p className="muted">Checking session…</p>
        ) : session ? (
          <div className="stack">
            <Link className="button" to="/home">
              Enter our home
            </Link>
            <p className="muted">
              Couple onboarding will be added in Phase 3.
            </p>
          </div>
        ) : (
          <div className="stack">
            <Link className="button" to="/login">
              Log in
            </Link>
            <Link className="button secondary" to="/login?mode=signup">
              Create account
            </Link>
          </div>
        )}

        <div className="stack">
          <span className="pill">💕 Private couple world</span>
          <span className="pill">🎮 Cozy top-down movement</span>
          <span className="pill">📞 Proximity calling</span>
        </div>
      </section>
    </main>
  );
}