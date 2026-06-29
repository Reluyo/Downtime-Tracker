import { useEffect, useState } from 'react';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../lib/api';
import type { ManagedUser } from '../lib/api';
import { IconCheck } from '../components/Icons';

export default function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New user form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setCreating(true);
    setError(null);
    try {
      await createUser(email.trim(), password, role);
      setEmail('');
      setPassword('');
      setRole('viewer');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  if (loading && users.length === 0) return <p>Loading…</p>;

  return (
    <section>
      <h2>User Management</h2>
      <p className="hint">
        Create and manage users for both the control center and tablet. Admins
        have full access; viewers can only see history and reports.
      </p>

      {error && <div className="error">{error}</div>}

      <table className="data-table" style={{ marginBottom: 24 }}>
        <thead>
          <tr>
            <th>Email</th>
            <th style={{ width: 120 }}>Role</th>
            <th style={{ width: 160 }}>Last Sign In</th>
            <th style={{ width: 100 }}>Password</th>
            <th style={{ width: 140 }}></th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="empty">No users</td>
            </tr>
          )}
          {users.map((u) => (
            <UserRow key={u.id} user={u} onChanged={load} />
          ))}
        </tbody>
      </table>

      <h3>Add User</h3>
      <form
        className="config-form"
        style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}
        onSubmit={handleCreate}
      >
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="min 6 chars"
            minLength={6}
            required
          />
        </label>
        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'viewer')}>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button className="btn-primary" type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Create user'}
        </button>
      </form>
    </section>
  );
}

function UserRow({ user, onChanged }: { user: ManagedUser; onChanged: () => void }) {
  const [role, setRole] = useState(user.role);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const roleDirty = role !== user.role;
  const passDirty = newPassword.length > 0;
  const dirty = roleDirty || passDirty;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const patch: { role?: string; password?: string } = {};
      if (roleDirty) patch.role = role;
      if (passDirty) patch.password = newPassword;
      await updateUser(user.id, patch);
      setNewPassword('');
      setSaved(true);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete user "${user.email}"? This cannot be undone.`)) return;
    try {
      await deleteUser(user.id);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  const lastSignIn = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString()
    : 'Never';

  return (
    <tr>
      <td>{user.email}</td>
      <td>
        <select value={role} onChange={(e) => { setRole(e.target.value as 'admin' | 'viewer'); setSaved(false); }}>
          <option value="viewer">Viewer</option>
          <option value="admin">Admin</option>
        </select>
      </td>
      <td>{lastSignIn}</td>
      <td>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => { setNewPassword(e.target.value); setSaved(false); }}
          placeholder="new…"
          style={{ width: 80 }}
        />
      </td>
      <td className="actions">
        <button className="btn-link-dark" disabled={!dirty || saving} onClick={handleSave}>
          {saving ? '…' : 'Save'}
        </button>
        {saved && <span style={{ color: 'var(--ok)' }}><IconCheck /></span>}
        <button className="btn-link-danger" onClick={handleDelete}>Delete</button>
      </td>
    </tr>
  );
}
