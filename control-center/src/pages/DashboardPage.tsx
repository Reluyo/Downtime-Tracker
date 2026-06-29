import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLine } from '../lib/LineContext';
import { getEquipment, getEvents } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import type { DowntimeEventRow, Equipment } from '../types';
import { formatDuration, startOfDayIso, endOfDayIso } from '../lib/format';

function elapsedSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

function LiveTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(elapsedSince(startedAt));
  useEffect(() => {
    const id = setInterval(() => setElapsed(elapsedSince(startedAt)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return <span className="mono live-timer">{formatDuration(elapsed)}</span>;
}

export default function DashboardPage() {
  const { line } = useLine();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [todayEvents, setTodayEvents] = useState<DowntimeEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const load = useCallback(async () => {
    if (!line) return;
    setLoading(true);
    try {
      const [eq, events] = await Promise.all([
        getEquipment(line.id),
        getEvents({
          lineId: line.id,
          startDate: startOfDayIso(today),
          endDate: endOfDayIso(today),
        }),
      ]);
      setEquipment(eq);
      setTodayEvents(events);
    } finally {
      setLoading(false);
    }
  }, [line, today]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!line) return;
    const channel = supabase
      .channel('dashboard-events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'downtime_events', filter: `line_id=eq.${line.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [line, load]);

  const openEvents = useMemo(
    () => todayEvents.filter((e) => !e.ended_at),
    [todayEvents],
  );
  const closedEvents = useMemo(
    () => todayEvents.filter((e) => e.ended_at),
    [todayEvents],
  );
  const totalDowntime = closedEvents.reduce(
    (sum, e) => sum + (e.duration_seconds ?? 0),
    0,
  );
  const avgDuration = closedEvents.length
    ? Math.round(totalDowntime / closedEvents.length)
    : 0;

  const openByEquipment = useMemo(() => {
    const map = new Map<string, DowntimeEventRow>();
    for (const e of openEvents) map.set(e.equipment_id, e);
    return map;
  }, [openEvents]);

  const topEquipment = useMemo(() => {
    const map = new Map<string, { name: string; seconds: number; count: number }>();
    for (const e of closedEvents) {
      const prev = map.get(e.equipment_id) ?? { name: e.equipment_name, seconds: 0, count: 0 };
      prev.seconds += e.duration_seconds ?? 0;
      prev.count += 1;
      map.set(e.equipment_id, prev);
    }
    return [...map.values()].sort((a, b) => b.seconds - a.seconds).slice(0, 5);
  }, [closedEvents]);

  if (!line) return <p>Loading line…</p>;
  if (loading) return <p>Loading…</p>;

  return (
    <section className="dashboard">
      <h2>Dashboard — {line.short_name}</h2>

      <div className="stat-cards">
        <div className={`stat-card ${openEvents.length > 0 ? 'stat-alert' : 'stat-ok'}`}>
          <span className="stat-value">{openEvents.length}</span>
          <span className="stat-label">Open events</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{closedEvents.length}</span>
          <span className="stat-label">Closed today</span>
        </div>
        <div className="stat-card">
          <span className="stat-value mono">{formatDuration(totalDowntime)}</span>
          <span className="stat-label">Total downtime</span>
        </div>
        <div className="stat-card">
          <span className="stat-value mono">{formatDuration(avgDuration)}</span>
          <span className="stat-label">Avg duration</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dash-panel">
          <h3>Equipment Status</h3>
          <div className="equipment-grid">
            {equipment.filter((e) => e.is_active).map((eq) => {
              const openEvt = openByEquipment.get(eq.id);
              return (
                <div
                  key={eq.id}
                  className={`eq-tile ${openEvt ? 'eq-down' : 'eq-running'}`}
                >
                  <span className="eq-name">{eq.name}</span>
                  {openEvt ? (
                    <LiveTimer startedAt={openEvt.started_at} />
                  ) : (
                    <span className="eq-status-text">Running</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="dash-panel">
          <h3>Active Downtime</h3>
          {openEvents.length === 0 ? (
            <p className="empty-state">All equipment is running.</p>
          ) : (
            <div className="active-events">
              {openEvents.map((e) => (
                <div key={e.id} className="active-event-card">
                  <div className="ae-header">
                    <span className="ae-equipment">{e.equipment_name}</span>
                    <span className="badge open"><span className="dot" />DOWN</span>
                  </div>
                  <LiveTimer startedAt={e.started_at} />
                </div>
              ))}
            </div>
          )}

          <h3 style={{ marginTop: 24 }}>Top Equipment by Downtime Today</h3>
          {topEquipment.length === 0 ? (
            <p className="empty-state">No closed events today.</p>
          ) : (
            <div className="bar-chart">
              {topEquipment.map((item) => {
                const maxSec = topEquipment[0].seconds;
                const pct = maxSec > 0 ? (item.seconds / maxSec) * 100 : 0;
                return (
                  <div key={item.name} className="bar-row">
                    <span className="bar-label">{item.name}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="bar-value mono">{formatDuration(item.seconds)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
