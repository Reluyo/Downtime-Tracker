import { NavLink, Outlet } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import type { SVGProps } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useLine } from '../lib/LineContext';
import { useRole } from '../lib/RoleContext';
import AstemoLogo from './AstemoLogo';
import ErrorBoundary from './ErrorBoundary';
import {
  IconEquipment,
  IconHistory,
  IconLines,
  IconReports,
  IconSignOut,
  IconSliders,
  IconTag,
  IconUsers,
} from './Icons';
import styles from './Layout.module.css';

const NAV: {
  to: string;
  label: string;
  Icon: (p: SVGProps<SVGSVGElement>) => JSX.Element;
  adminOnly?: boolean;
}[] = [
  { to: '/history', label: 'History', Icon: IconHistory },
  { to: '/lines', label: 'Lines', Icon: IconLines, adminOnly: true },
  { to: '/equipment', label: 'Equipment', Icon: IconEquipment, adminOnly: true },
  { to: '/reasons', label: 'Reason Codes', Icon: IconTag, adminOnly: true },
  { to: '/config', label: 'Configuration', Icon: IconSliders, adminOnly: true },
  { to: '/users', label: 'Users', Icon: IconUsers, adminOnly: true },
  { to: '/reports', label: 'Reports', Icon: IconReports },
];

export default function Layout({ session }: { session: Session }) {
  const { line } = useLine();
  const { isAdmin } = useRole();

  const visibleNav = NAV.filter((n) => !n.adminOnly || isAdmin);

  return (
    <div className="layout">
      <header className={styles.appHeader}>
        <div className={styles.headerLeft}>
          <span className="brand-dot" />
          <h1>PRSA Downtime</h1>
          {line && <span className={styles.lineChip}>{line.short_name}</span>}
        </div>
        <div className={styles.headerRight}>
          <span className={styles.userEmail}>{session.user.email}</span>
          <button className="btn-link" onClick={() => supabase.auth.signOut()}>
            <IconSignOut />
            Sign out
          </button>
          <span className={styles.headerLogo}>
            <AstemoLogo />
          </span>
        </div>
      </header>

      <nav className={styles.appNav}>
        {visibleNav.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.navItem}${isActive ? ` ${styles.navItemActive}` : ''}`
            }
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      <main className={styles.appMain}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
