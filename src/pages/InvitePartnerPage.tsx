import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';

export default function InvitePartnerPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { couple, inviteCode, createInvite, loading, error } = useCouple(
    session?.user?.id ?? null
  );

  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  if (authLoading || loading) {
    return (
      <main className="page">
        <section className="card">
          <p className="muted">Loading invitation…</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (error) {
    return (
      <main className="page">
        <section className="card stack-lg">
          <h1>We could not load your home</h1>
          <p className="error">{error}</p>
          <button className="button" onClick={() => navigate('/couple/setup')}>
            Back to setup
          </button>
        </section>
      </main>
    );
  }

  if (!couple) {
    return <Navigate to="/couple/setup" replace />;
  }

  async function handleGenerate() {
    setGenerating(true);
    await createInvite();
    setGenerating(false);
  }

  function handleCopy() {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <main className="page">
      <section className="card stack-lg">
        <h1>Invite your partner 💌</h1>

        <p className="muted">
          Share this secret code with your partner. Invitation codes are single-use. If your code
          was used or expired, generate a new one.
        </p>

        {couple.partner_id ? (
          <div className="info">🎉 Your partner has joined your home!</div>
        ) : (
          <div className="muted">Your partner has not joined yet.</div>
        )}

        {inviteCode ? (
          <div className="card" style={{ textAlign: 'center', background: '#fff0f4' }}>
            <p className="muted" style={{ marginBottom: '8px' }}>
              Invitation Code:
            </p>
            <h2 style={{ fontSize: '2rem', letterSpacing: '2px', color: 'var(--accent-dark)' }}>
              {inviteCode.toUpperCase()}
            </h2>
          </div>
        ) : (
          <div className="card">
            <p className="muted">No active invitation code found.</p>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <div className="stack">
          {inviteCode && (
            <button className="button secondary" onClick={handleCopy}>
              {copied ? '✅ Copied!' : '📋 Copy Code'}
            </button>
          )}

          <button className="button secondary" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : '✨ Generate new code'}
          </button>

          <button className="button" onClick={() => navigate('/home')}>
            Continue to Home →
          </button>
        </div>
      </section>
    </main>
  );
}