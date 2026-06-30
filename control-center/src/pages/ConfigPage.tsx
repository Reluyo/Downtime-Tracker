import { useEffect, useState } from 'react';
import { useLine } from '../lib/LineContext';
import {
  getConfig,
  saveConfig,
  getShifts,
  createShift,
  updateShift,
  deleteShift,
} from '../lib/api';
import type { Shift } from '../lib/api';
import { IconCheck } from '../components/Icons';
import LineSelectHeading from '../components/LineSelectHeading';

export default function ConfigPage() {
  const { line } = useLine();
  const [threshold, setThreshold] = useState('60');
  const [repeat, setRepeat] = useState('15');
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [notifyThreshold, setNotifyThreshold] = useState('60');
  const [notifyEmails, setNotifyEmails] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Shifts
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('');
  const [newShiftEnd, setNewShiftEnd] = useState('');
  const [addingShift, setAddingShift] = useState(false);

  useEffect(() => {
    if (!line) return;
    setLoading(true);
    Promise.all([
      getConfig(line.id).then((cfg) => {
        if (cfg) {
          setThreshold(String(cfg.alert_threshold_minutes));
          setRepeat(String(cfg.alert_repeat_minutes));
          setNotifyEnabled(cfg.notify_enabled);
          setNotifyThreshold(String(cfg.notify_threshold_minutes));
          setNotifyEmails((cfg.notify_emails ?? []).join(', '));
        }
      }),
      getShifts(line.id).then(setShifts),
    ])
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [line]);

  async function handleSave() {
    if (!line) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveConfig(line.id, {
        alert_threshold_minutes: Math.max(1, Number(threshold)),
        alert_repeat_minutes: Math.max(1, Number(repeat)),
        notify_enabled: notifyEnabled,
        notify_threshold_minutes: Math.max(1, Number(notifyThreshold)),
        notify_emails: notifyEmails
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean),
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!line) return <p>Loading line…</p>;
  if (loading) return <p>Loading…</p>;

  return (
    <section>
      <LineSelectHeading title="Alert Configuration" />
      <p className="hint">
        Controls the downtime alert on the tablet. After the threshold is reached, the
        tablet plays an alert and repeats it at the interval below until the event is closed.
      </p>

      {error && <div className="error">{error}</div>}

      <div className="config-form">
        <label>
          Alert threshold (minutes)
          <input
            type="number"
            min={1}
            value={threshold}
            onChange={(e) => {
              setThreshold(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <label>
          Repeat interval (minutes)
          <input
            type="number"
            min={1}
            value={repeat}
            onChange={(e) => {
              setRepeat(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && (
          <span className="saved-note">
            <IconCheck /> Saved
          </span>
        )}
      </div>

      <hr style={{ borderColor: 'var(--border)', margin: '32px 0' }} />

      <h2>Extended Downtime Notifications</h2>
      <p className="hint">
        Sends an email when this line is down past the threshold below. Recipients are the
        global list (see Notifications page) plus any line-specific addresses entered here.
        Re-sends follow the same repeat interval as the tablet alert above, until the event ends.
      </p>

      <div className="config-form">
        <label>
          <input
            type="checkbox"
            checked={notifyEnabled}
            onChange={(e) => {
              setNotifyEnabled(e.target.checked);
              setSaved(false);
            }}
          />{' '}
          Enable email notifications for this line
        </label>
        <label>
          Notify threshold (minutes)
          <input
            type="number"
            min={1}
            value={notifyThreshold}
            onChange={(e) => {
              setNotifyThreshold(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <label>
          Line-specific recipient emails (comma-separated)
          <input
            value={notifyEmails}
            placeholder="supervisor@example.com, lead@example.com"
            onChange={(e) => {
              setNotifyEmails(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && (
          <span className="saved-note">
            <IconCheck /> Saved
          </span>
        )}
      </div>

      <hr style={{ borderColor: 'var(--border)', margin: '32px 0' }} />

      <h2>Shifts</h2>
      <p className="hint">
        Define production shifts. Hours use 24-hour format (e.g. 6 = 6 AM, 18 = 6 PM).
        Overnight shifts: set start &gt; end (e.g. 22–6).
      </p>

      <table className="data-table" style={{ marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={{ width: 60 }}>Order</th>
            <th>Name</th>
            <th style={{ width: 90 }}>Start</th>
            <th style={{ width: 90 }}>End</th>
            <th style={{ width: 120 }}></th>
          </tr>
        </thead>
        <tbody>
          {shifts.length === 0 && (
            <tr>
              <td colSpan={5} className="empty">No shifts configured</td>
            </tr>
          )}
          {shifts.map((s) => (
            <ShiftRow key={s.id} shift={s} onChanged={() => getShifts(line.id).then(setShifts)} />
          ))}
        </tbody>
      </table>

      <div className="config-form" style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <label>
          Name
          <input value={newShiftName} onChange={(e) => setNewShiftName(e.target.value)} placeholder="e.g. 1st Shift" />
        </label>
        <label>
          Start (0-23)
          <input type="number" min={0} max={23} value={newShiftStart} onChange={(e) => setNewShiftStart(e.target.value)} style={{ width: 80 }} />
        </label>
        <label>
          End (0-23)
          <input type="number" min={0} max={23} value={newShiftEnd} onChange={(e) => setNewShiftEnd(e.target.value)} style={{ width: 80 }} />
        </label>
        <button
          className="btn-primary"
          disabled={!newShiftName.trim() || newShiftStart === '' || newShiftEnd === '' || addingShift}
          onClick={async () => {
            setAddingShift(true);
            try {
              await createShift({
                line_id: line.id,
                name: newShiftName.trim(),
                start_hour: Math.max(0, Math.min(23, Number(newShiftStart))),
                end_hour: Math.max(0, Math.min(23, Number(newShiftEnd))),
                display_order: shifts.length + 1,
              });
              setNewShiftName('');
              setNewShiftStart('');
              setNewShiftEnd('');
              setShifts(await getShifts(line.id));
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            } finally {
              setAddingShift(false);
            }
          }}
        >
          {addingShift ? 'Adding…' : 'Add shift'}
        </button>
      </div>
    </section>
  );
}

function ShiftRow({ shift, onChanged }: { shift: Shift; onChanged: () => void }) {
  const [name, setName] = useState(shift.name);
  const [startHour, setStartHour] = useState(String(shift.start_hour));
  const [endHour, setEndHour] = useState(String(shift.end_hour));
  const [order, setOrder] = useState(String(shift.display_order));

  const dirty =
    name !== shift.name ||
    Number(startHour) !== shift.start_hour ||
    Number(endHour) !== shift.end_hour ||
    Number(order) !== shift.display_order;

  return (
    <tr>
      <td>
        <input type="number" value={order} onChange={(e) => setOrder(e.target.value)} style={{ width: 50 }} />
      </td>
      <td>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td>
        <input type="number" min={0} max={23} value={startHour} onChange={(e) => setStartHour(e.target.value)} style={{ width: 60 }} />
      </td>
      <td>
        <input type="number" min={0} max={23} value={endHour} onChange={(e) => setEndHour(e.target.value)} style={{ width: 60 }} />
      </td>
      <td className="actions">
        <button
          className="btn-link-dark"
          disabled={!dirty || !name.trim()}
          onClick={async () => {
            await updateShift(shift.id, {
              name: name.trim(),
              start_hour: Math.max(0, Math.min(23, Number(startHour))),
              end_hour: Math.max(0, Math.min(23, Number(endHour))),
              display_order: Number(order),
            });
            onChanged();
          }}
        >
          Save
        </button>
        <button
          className="btn-link-danger"
          onClick={async () => {
            if (!confirm(`Delete shift "${shift.name}"?`)) return;
            await deleteShift(shift.id);
            onChanged();
          }}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
