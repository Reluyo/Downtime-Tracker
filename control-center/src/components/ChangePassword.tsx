import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import AstemoLogo from './AstemoLogo';
import styles from './Login.module.css';

/**
 * Blocking screen shown when the signed-in user must set a new password
 * (e.g. after an admin reset their password from User Management).
 */
export default function ChangePassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDone();
  }

  return (
    <div className={styles.loginWrap}>
      <span className={styles.loginLogo}>
        <AstemoLogo />
      </span>
      <form className={styles.loginCard} onSubmit={handleSubmit}>
        <div className={styles.brandMark}>
          <span className="brand-dot" />
          <h1>Astemo Downtime</h1>
        </div>
        <p className={styles.subtitle}>You must set a new password to continue</p>

        {error && <div className="error">{error}</div>}

        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={12}
          required
        />

        <label htmlFor="confirm-password">Confirm password</label>
        <input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Set password'}
        </button>
      </form>
    </div>
  );
}
