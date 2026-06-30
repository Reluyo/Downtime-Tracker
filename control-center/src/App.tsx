import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import { LineProvider } from './lib/LineContext';
import { RoleProvider, useRole } from './lib/RoleContext';
import Login from './components/Login';
import ChangePassword from './components/ChangePassword';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import EquipmentPage from './pages/EquipmentPage';
import ReasonsPage from './pages/ReasonsPage';
import ConfigPage from './pages/ConfigPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import LinesPage from './pages/LinesPage';
import NotificationsPage from './pages/NotificationsPage';

/** Guard that redirects viewers away from admin-only routes. */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useRole();
  if (!isAdmin) return <Navigate to="/history" replace />;
  return <>{children}</>;
}

/**
 * Root of the control center. Gates on the Supabase Auth session, then renders
 * the admin app (routing + line context + role context).
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

  if (loading) return <div className="app-main">Loading...</div>;
  if (!session) return <Login />;
  if (session.user.user_metadata?.must_change_password) {
    return (
      <ChangePassword
        onDone={() => {
          supabase.auth.getSession().then(({ data }) => setSession(data.session));
        }}
      />
    );
  }

  return (
    <RoleProvider session={session}>
      <LineProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout session={session} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route
                path="/equipment"
                element={
                  <AdminRoute>
                    <EquipmentPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/reasons"
                element={
                  <AdminRoute>
                    <ReasonsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/config"
                element={
                  <AdminRoute>
                    <ConfigPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <AdminRoute>
                    <UsersPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/lines"
                element={
                  <AdminRoute>
                    <LinesPage />
                  </AdminRoute>
                }
              />
              <Route path="/reports" element={<ReportsPage />} />
              <Route
                path="/notifications"
                element={
                  <AdminRoute>
                    <NotificationsPage />
                  </AdminRoute>
                }
              />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LineProvider>
    </RoleProvider>
  );
}
