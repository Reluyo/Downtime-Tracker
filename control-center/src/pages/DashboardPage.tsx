import { useEffect, useState } from 'react';
import { useLine } from '../lib/LineContext';
import { getOpenEvents, getLineAvailability, getReportSummary } from '../lib/api';
import type { Line, OpenEvent, LineAvailability } from '../lib/api';
import { formatDuration, localDateKey } from '../lib/format';

const POLL_MS = 15_000;

export default function DashboardPage() {
  const { lines, loading, error } = useLine();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  if (loading) return <p>Loading…</p>;

  return (
    <section>
      <h2>Live Dashboard</h2>
      {error && <div className="error">{error}</div>}

      <div className="line-status-grid">
        {lines.map((line) => (
          <LineStatusCard key={line.id} line={line} now={now} />
        ))}
        {lines.length === 0 && <p className="empty">No lines configured</p>}
      </div>
    </section>
  );
}

function LineStatusCard({ line, now }: { line: Line; now: number }) {
  const [openEvents, setOpenEvents] = useState<OpenEvent[]>([]);
  const [availability, setAvailability] = useState<LineAvailability | null>(null);
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const today = localDateKey(new Date().toISOString());
      try {
        const [open, avail, summary] = await Promise.all([
          getOpenEvents(line.id),
          getLineAvailability(line.id, today, today),
          getReportSummary(line.id, `${today}T00:00:00`, `${today}T23:59:59.999`),
        ]);
        if (cancelled) return;
        setOpenEvents(open);
        setAvailability(avail);
        setEventCount(summary.event_count);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    load();
    const poll = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [line.id]);

  const isDown = openEvents.length > 0;

  return (
    <div className={`line-status-card${isDown ? ' line-status-card-down' : ' line-status-card-up'}`}>
      <div className="line-status-card-header">
        <span className={`status-light${isDown ? ' status-light-down' : ' status-light-up'}`} />
        <span className="line-status-card-name">{line.short_name || line.name}</span>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <p className="hint">Loading…</p>
      ) : (
        <>
          {isDown ? (
            <ul className="line-status-down-equipment">
              {openEvents.map((e) => {
                const durationSec = Math.floor((now - new Date(e.started_at).getTime()) / 1000);
                return (
                  <li key={e.id}>
                    <span className="line-status-down-equipment-name">{e.equipment_name}</span>
                    <span className="line-status-down-equipment-duration">{formatDuration(durationSec)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="line-status-running-label">Running</p>
          )}

          <div className="line-status-card-stats">
            <Stat
              label="Availability"
              value={availability?.availability_pct != null ? `${availability.availability_pct}%` : '—'}
            />
            <Stat label="Downtime" value={formatDuration(availability?.downtime_seconds ?? 0)} />
            <Stat label="Events" value={String(eventCount ?? 0)} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="line-status-stat">
      <span className="line-status-stat-value">{value}</span>
      <span className="line-status-stat-label">{label}</span>
    </div>
  );
}
