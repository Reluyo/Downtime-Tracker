import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface Props {
  session: Session;
}

/**
 * Placeholder admin dashboard. Confirms the Supabase connection by reading the
 * seeded line + equipment, and lists the feature areas to be built next.
 */
export default function Dashboard({ session }: Props) {
  const [lineName, setLineName] = useState<string | null>(null);
  const [equipmentCount, setEquipmentCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: line, error: lineErr } = await supabase
        .from('lines')
        .select('id, name, short_name')
        .eq('short_name', 'PRSA 2')
        .single();

      if (lineErr) {
        setError(lineErr.message);
        return;
      }
      setLineName(`${line.name} (${line.short_name})`);

      const { count, error: eqErr } = await supabase
        .from('equipment')
        .select('id', { count: 'exact', head: true })
        .eq('line_id', line.id);

      if (eqErr) {
        setError(eqErr.message);
        return;
      }
      setEquipmentCount(count ?? 0);
    })();
  }, []);

  const sections = [
    { title: 'Downtime History', desc: 'View, filter, edit, and delete downtime events.' },
    { title: 'Equipment', desc: 'Add, edit, and deactivate equipment for a line.' },
    { title: 'Reason Codes', desc: 'Manage reason codes per equipment.' },
    { title: 'App Configuration', desc: 'Set alert threshold and repeat interval per line.' },
    { title: 'Reporting', desc: 'Total downtime by equipment, reason code, and date range.' },
  ];

  return (
    <>
      <header className="app-header">
        <h1>PRSA Downtime — Control Center</h1>
        <div>
          <span style={{ marginRight: 16, fontSize: 14 }}>{session.user.email}</span>
          <button className="btn-link" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="app-main">
        <p>
          Connected line:{' '}
          <strong>{lineName ?? (error ? '—' : 'loading…')}</strong>
          {equipmentCount !== null && ` · ${equipmentCount} equipment`}
        </p>
        {error && <div className="error">Supabase error: {error}</div>}

        <div className="section-grid">
          {sections.map((s) => (
            <div className="section-card" key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <span className="badge">Coming soon</span>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
