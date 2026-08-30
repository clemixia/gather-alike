import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';

export default function JoinCouplePage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { joinCouple, loading, error } = useCouple(session?.user?.id ?? null);
  const [code, setCode] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    
    // Only navigate if the join was successful
    const success = await joinCouple(code.trim());
    
    if (success) {
      navigate('/home');
    }
  }

  return (
    <main className="page">
      <section className="card stack-lg">
        <div className="topbar">
          <h1>Join your home 🔑</h1>
          <Link to="/couple/setup">← Back</Link>
        </div>

        <p className="muted">
          Enter the invitation code your partner gave you.
        </p>

        <form className="stack" onSubmit={handleSubmit}>
          <div>
            <div className="label">Invitation Code</div>
            <input
              className="input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. a1b2c3d4e5"
              autoComplete="off"
              required
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button className="button" type="submit" disabled={loading || !code.trim()}>
            {loading ? 'Joining...' : 'Enter Our Home'}
          </button>
        </form>
      </section>
    </main>
  );
}