import { NavLink, Outlet } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { useLine } from '../lib/LineContext';

const NAV = [
  { to: '/history', label: 'History' },
  { to: '/equipment', label: 'Equipment' },
  { to: '/reasons', label: 'Reason Codes' },
  { to: '/config', label: 'Configuration' },
  { to: '/reports', label: 'Reports' },
];

export default function Layout({ session }: { session: Session }) {
  const { line } = useLine();

  return (
    <div className="layout">
      <header className="app-header">
        <div className="header-left">
          <h1>PRSA Downtime</h1>
          {line && <span className="line-chip">{line.short_name}</span>}
        </div>
        <div className="header-right">
          <span className="user-email">{session.user.email}</span>
          <button className="btn-link" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="app-nav">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
