import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getLines } from './api';
import type { Line } from './api';

const SELECTED_LINE_KEY = 'downtime-selected-line';

interface LineContextValue {
  lines: Line[];
  line: Line | null;
  setLineId: (id: string) => void;
  refreshLines: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const LineContext = createContext<LineContextValue | undefined>(undefined);

export function LineProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [lineId, setLineIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function setLineId(id: string) {
    setLineIdState(id);
    localStorage.setItem(SELECTED_LINE_KEY, id);
  }

  const refreshLines = useCallback(async () => {
    const data = await getLines();
    setLines(data);
    if (data.length > 0 && !data.find((l) => l.id === lineId)) {
      setLineId(data[0].id);
    }
  }, [lineId]);

  useEffect(() => {
    getLines()
      .then((data) => {
        setLines(data);
        const saved = localStorage.getItem(SELECTED_LINE_KEY);
        if (saved && data.find((l) => l.id === saved)) {
          setLineIdState(saved);
        } else if (data.length > 0) {
          setLineId(data[0].id);
        }
      })
      .catch((e) => setError(e.message ?? String(e)))
      .finally(() => setLoading(false));
  }, []);

  const line = lines.find((l) => l.id === lineId) ?? null;

  return (
    <LineContext.Provider value={{ lines, line, setLineId, refreshLines, loading, error }}>
      {children}
    </LineContext.Provider>
  );
}

export function useLine(): LineContextValue {
  const ctx = useContext(LineContext);
  if (!ctx) throw new Error('useLine must be used within a LineProvider');
  return ctx;
}
