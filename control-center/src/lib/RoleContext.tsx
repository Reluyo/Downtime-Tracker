import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getUserRole } from './api';

type Role = 'admin' | 'viewer';

interface RoleContextValue {
  role: Role;
  isAdmin: boolean;
  loading: boolean;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const [role, setRole] = useState<Role>('viewer');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserRole(session.user.id)
      .then(setRole)
      .catch(() => setRole('viewer'))
      .finally(() => setLoading(false));
  }, [session.user.id]);

  return (
    <RoleContext.Provider value={{ role, isAdmin: role === 'admin', loading }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within a RoleProvider');
  return ctx;
}
