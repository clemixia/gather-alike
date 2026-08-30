import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const errorDescription = params.get('error_description');

      if (errorDescription) {
        navigate('/login?error=oauth', { replace: true });
        return;
      }

      if (supabase && code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          navigate('/login?error=callback', { replace: true });
          return;
        }
      }

      navigate('/home', { replace: true });
    }

    void handleCallback();
  }, [navigate]);

  return (
    <main className="page">
      <section className="card">
        <h2>Completing sign-in…</h2>
        <p className="muted">Just a moment 💕</p>
      </section>
    </main>
  );
}