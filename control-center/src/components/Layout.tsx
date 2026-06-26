import { NavLink, Outlet } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import type { SVGProps } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useLine } from '../lib/LineContext';
import AstemoLogo from './AstemoLogo';
import {
  IconEquipment,
  IconHistory,
  IconReports,
  IconSignOut,
  IconSliders,
  IconTag,
} from './Icons';

const NAV: { to: string; label: string; Icon: (p: SVGProps<SVGSVGElement>) => JSX.Element }[] = [
  { to: '/history', label: 'History', Icon: IconHistory },
  { to: '/equipment', label: 'Equipment', Icon: IconEquipment },
  { to: '/reasons', label: 'Reason Codes', Icon: IconTag },
  { to: '/config', label: 'Configuration', Icon: IconSliders },
  { to: '/reports', label: 'Reports', Icon: IconReports },
];

export default function Layout({ session }: { session: Session }) {
  const { line } = useLine();

  return (
    <div className="layout">
      <header className="app-header">
        <div className="header-left">
          <span className="brand-dot" />
          <h1>PRSA Downtime</h1>
          {line && <span className="line-chip">{line.short_name}</span>}
        </div>
        <div className="header-right">
          <span className="user-email">{session.user.email}</span>
          <button className="btn-link" onClick={() => supabase.auth.signOut()}>
            <IconSignOut />
            Sign out
          </button>
          <span className="header-logo">
            <AstemoLogo />
          </span>
        </div>
      </header>

      <nav className="app-nav">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
