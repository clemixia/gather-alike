import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/env';
import { friendlyError } from '../lib/errors';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!isSupabaseConfigured()) {
    return (
      <main className="page">
        <section className="card">
          <h2>Supabase not configured</h2>
          <p className="muted">
            Add Supabase environment variables before using authentication.
          </p>
        </section>
      </main>
    );
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        navigate('/home', { replace: true });
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          navigate('/home', { replace: true });
        } else {
          setInfo('Account created. Please check your email to confirm it.');
        }
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    if (!supabase) return;

    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (oauthError) throw oauthError;
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <section className="card stack-lg">
        <div className="topbar">
          <h1>{mode === 'signin' ? 'Welcome back' : 'Create account'}</h1>
          <Link to="/">← Home</Link>
        </div>

        <div className="stack">
          <button
            type="button"
            className={`button secondary ${mode === 'signin' ? '' : 'muted'}`}
            onClick={() => setMode('signin')}
          >
            Log in
          </button>
          <button
            type="button"
            className={`button secondary ${mode === 'signup' ? '' : 'muted'}`}
            onClick={() => setMode('signup')}
          >
            Sign up
          </button>
        </div>

        <form className="stack" onSubmit={handleEmailSubmit}>
          <div>
            <div className="label">Email</div>
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div>
            <div className="label">Password</div>
            <input
              className="input"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>

          {error ? <p className="error">{error}</p> : null}
          {info ? <p className="info">{info}</p> : null}

          <button className="button" type="submit" disabled={busy}>
            {mode === 'signin' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <div className="stack">
          <div className="muted">or</div>
          <button
            className="button secondary"
            type="button"
            onClick={handleGoogleLogin}
            disabled={busy}
          >
            Continue with Google
          </button>
        </div>

        <p className="footer-note">
          Later, after login, you will create your couple or join your partner.
        </p>
      </section>
    </main>
  );
}