import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import AstemoLogo from './AstemoLogo';
import styles from './Login.module.css';

/**
 * Admin login via Supabase Auth (email + password).
 */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setSubmitting(false);
  }

  return (
    <div className={styles.loginWrap}>
      <span className={styles.loginLogo}>
        <AstemoLogo />
      </span>
      <form className={styles.loginCard} onSubmit={handleSubmit}>
        <div className={styles.brandMark}>
          <span className="brand-dot" />
          <h1>PRSA Downtime</h1>
        </div>
        <p className={styles.subtitle}>Control Center — admin sign in</p>

        {error && <div className="error">{error}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
