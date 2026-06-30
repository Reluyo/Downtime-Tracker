import { useEffect, useState } from 'react';
import { getGlobalEmails, addGlobalEmail, deleteGlobalEmail } from '../lib/api';
import type { GlobalNotificationEmail } from '../lib/api';

export default function NotificationsPage() {
  const [emails, setEmails] = useState<GlobalNotificationEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    return getGlobalEmails()
      .then(setEmails)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!newEmail.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await addGlobalEmail(newEmail.trim());
      setNewEmail('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  }

  return (
    <section>
      <h2>Notifications</h2>
      <p className="hint">
        These addresses receive an email for extended downtime on every line. To add
        addresses for a single line only, use that line's Configuration page.
      </p>

      {error && <div className="error">{error}</div>}

      <div className="add-row">
        <input
          placeholder="email@example.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          style={{ width: 320 }}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn-primary" onClick={handleAdd} disabled={adding || !newEmail.trim()}>
          {adding ? 'Adding…' : 'Add'}
        </button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {emails.length === 0 && (
              <tr>
                <td colSpan={2} className="empty">No global recipients configured</td>
              </tr>
            )}
            {emails.map((e) => (
              <tr key={e.id}>
                <td>{e.email}</td>
                <td className="actions">
                  <button
                    className="btn-link-danger"
                    onClick={async () => {
                      if (!confirm(`Remove ${e.email}?`)) return;
                      await deleteGlobalEmail(e.id);
                      await refresh();
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
