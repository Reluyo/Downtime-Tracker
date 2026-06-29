import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getLines } from './api';
import type { Line } from './api';

interface LineContextValue {
  lines: Line[];
  line: Line | null; // currently selected line (PoC: the first/only line)
  setLineId: (id: string) => void;
  loading: boolean;
  error: string | null;
}

const LineContext = createContext<LineContextValue | undefined>(undefined);

export function LineProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [lineId, setLineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLines()
      .then((data) => {
        setLines(data);
        if (data.length > 0) setLineId(data[0].id);
      })
      .catch((e) => setError(e.message ?? String(e)))
      .finally(() => setLoading(false));
  }, []);

  const line = lines.find((l) => l.id === lineId) ?? null;

  return (
    <LineContext.Provider value={{ lines, line, setLineId, loading, error }}>
      {children}
    </LineContext.Provider>
  );
}

export function useLine(): LineContextValue {
  const ctx = useContext(LineContext);
  if (!ctx) throw new Error('useLine must be used within a LineProvider');
  return ctx;
}
