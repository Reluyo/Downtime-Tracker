import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

/**
 * Root of the control center. Handles the Supabase Auth session and routes
 * between the login screen and the (placeholder) admin dashboard.
 *
 * NOTE: This is scaffolding. The dashboard sections are stubs that confirm the
 * Supabase connection works; feature screens (history, equipment, reasons,
 * config, reporting) are built in a later pass.
 */
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="app-main">Loading…</div>;
  }

  if (!session) {
    return <Login />;
  }

  return <Dashboard session={session} />;
}
