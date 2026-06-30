import { useEffect, useState } from 'react';
import { useLine } from '../lib/LineContext';
import {
  getEquipment,
  getOpenEvents,
  getLineAvailability,
  getReportByReason,
} from '../lib/api';
import type { Equipment, OpenEvent, LineAvailability, ReportByReason } from '../lib/api';
import { formatDuration, localDateKey } from '../lib/format';
import LineSelectHeading from '../components/LineSelectHeading';

const POLL_MS = 15_000;

export default function DashboardPage() {
  const { line } = useLine();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [openEvents, setOpenEvents] = useState<OpenEvent[]>([]);
  const [availability, setAvailability] = useState<LineAvailability | null>(null);
  const [topReasons, setTopReasons] = useState<ReportByReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!line) return;
    let cancelled = false;

    async function load() {
      if (!line) return;
      const today = localDateKey(new Date().toISOString());
      try {
        const [eq, open, avail, reasons] = await Promise.all([
          getEquipment(line.id, false),
          getOpenEvents(line.id),
          getLineAvailability(line.id, today, today),
          getReportByReason(line.id, `${today}T00:00:00`, `${today}T23:59:59.999`),
        ]);
        if (cancelled) return;
        setEquipment(eq);
        setOpenEvents(open);
        setAvailability(avail);
        setTopReasons(reasons.slice(0, 5));
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
  }, [line]);

  if (!line) return <p>Loading line…</p>;
  if (loading) return <p>Loading…</p>;

  const openByEquipment = new Map(openEvents.map((e) => [e.equipment_id, e]));
  const downCount = openEvents.length;
  const maxReasonSeconds = Math.max(1, ...topReasons.map((r) => r.total_seconds));

  return (
    <section>
      <LineSelectHeading title="Live Dashboard" />
      {error && <div className="error">{error}</div>}

      <div className="dashboard-summary">
        <SummaryCard
          label="Equipment Down"
          value={`${downCount} / ${equipment.length}`}
          tone={downCount > 0 ? 'danger' : 'ok'}
        />
        <SummaryCard
          label="Availability (today)"
          value={availability?.availability_pct != null ? `${availability.availability_pct}%` : '—'}
          tone={
            availability?.availability_pct == null
              ? 'neutral'
              : availability.availability_pct >= 85
                ? 'ok'
                : availability.availability_pct >= 60
                  ? 'warn'
                  : 'danger'
          }
        />
        <SummaryCard
          label="Downtime (today)"
          value={formatDuration(availability?.downtime_seconds ?? 0)}
          tone="neutral"
        />
      </div>

      <h2>Equipment Status</h2>
      <div className="equipment-grid">
        {equipment.map((eq) => {
          const open = openByEquipment.get(eq.id);
          const durationSec = open ? Math.floor((now - new Date(open.started_at).getTime()) / 1000) : null;
          return (
            <div key={eq.id} className={`equipment-card${open ? ' equipment-card-down' : ' equipment-card-up'}`}>
              <span className="equipment-card-status">{open ? 'DOWN' : 'RUNNING'}</span>
              <span className="equipment-card-name">{eq.name}</span>
              {open && <span className="equipment-card-duration">{formatDuration(durationSec ?? 0)}</span>}
            </div>
          );
        })}
        {equipment.length === 0 && <p className="empty">No equipment configured for this line</p>}
      </div>

      <h2>Top Downtime Reasons (today)</h2>
      {topReasons.length === 0 ? (
        <p className="empty">No downtime logged today</p>
      ) : (
        <div className="reason-bars">
          {topReasons.map((r) => (
            <div key={r.reason_id ?? r.reason_label} className="reason-bar-row">
              <span className="reason-bar-label">{r.reason_label}</span>
              <div className="reason-bar-track">
                <div
                  className="reason-bar-fill"
                  style={{ width: `${(r.total_seconds / maxReasonSeconds) * 100}%` }}
                />
              </div>
              <span className="reason-bar-value">{formatDuration(r.total_seconds)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'ok' | 'warn' | 'danger' | 'neutral';
}) {
  return (
    <div className={`summary-card summary-card-${tone}`}>
      <span className="summary-card-label">{label}</span>
      <span className="summary-card-value">{value}</span>
    </div>
  );
}
