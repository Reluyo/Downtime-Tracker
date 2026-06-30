import { useCallback, useEffect, useState } from 'react';
import { useLine } from '../lib/LineContext';
import { createReason, getEquipment, getReasons, updateReason } from '../lib/api';
import type { DowntimeReason, Equipment } from '../lib/api';
import LineSelectHeading from '../components/LineSelectHeading';

export default function ReasonsPage() {
  const { line } = useLine();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentId, setEquipmentId] = useState('');
  const [reasons, setReasons] = useState<DowntimeReason[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New-reason form
  const [newLabel, setNewLabel] = useState('');
  const [newRequiresNote, setNewRequiresNote] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!line) return;
    getEquipment(line.id, false)
      .then((eq) => {
        setEquipment(eq);
        setEquipmentId(eq.length > 0 ? eq[0].id : '');
      })
      .catch((e) => setError(e.message));
  }, [line]);

  const load = useCallback(async () => {
    if (!equipmentId) return;
    setLoading(true);
    setError(null);
    try {
      setReasons(await getReasons(equipmentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [equipmentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    if (!equipmentId || !newLabel.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await createReason({
        equipment_id: equipmentId,
        label: newLabel.trim(),
        requires_note: newRequiresNote,
        display_order: reasons.length + 1,
      });
      setNewLabel('');
      setNewRequiresNote(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  }

  async function persist(id: string, patch: Partial<DowntimeReason>) {
    try {
      await updateReason(id, patch);
      await load();
    } catch (e) {
      alert(`Update failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (!line) return <p>Loading line…</p>;

  return (
    <section>
      <LineSelectHeading title="Reason Codes" />

      <label className="inline-label">
        Equipment
        <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
          {equipment.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.name}
            </option>
          ))}
        </select>
      </label>

      {error && <div className="error">{error}</div>}

      <div className="add-row">
        <input
          placeholder="New reason label"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={newRequiresNote}
            onChange={(e) => setNewRequiresNote(e.target.checked)}
          />
          Requires note
        </label>
        <button
          className="btn-primary"
          onClick={handleAdd}
          disabled={adding || !newLabel.trim() || !equipmentId}
        >
          {adding ? 'Adding…' : 'Add reason'}
        </button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Order</th>
              <th>Label</th>
              <th style={{ width: 130 }}>Requires note</th>
              <th style={{ width: 110 }}>Status</th>
              <th style={{ width: 160 }}></th>
            </tr>
          </thead>
          <tbody>
            {reasons.map((r) => (
              <ReasonRow key={r.id} reason={r} onSave={persist} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ReasonRow({
  reason,
  onSave,
}: {
  reason: DowntimeReason;
  onSave: (id: string, patch: Partial<DowntimeReason>) => void;
}) {
  const [label, setLabel] = useState(reason.label);
  const [order, setOrder] = useState(String(reason.display_order));

  const dirty = label !== reason.label || order !== String(reason.display_order);

  return (
    <tr className={reason.is_active ? '' : 'row-inactive'}>
      <td>
        <input
          className="order-input"
          type="number"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        />
      </td>
      <td>
        <input value={label} onChange={(e) => setLabel(e.target.value)} />
      </td>
      <td>
        <input
          type="checkbox"
          checked={reason.requires_note}
          onChange={(e) => onSave(reason.id, { requires_note: e.target.checked })}
        />
      </td>
      <td>
        <span className={reason.is_active ? 'badge closed' : 'badge'}>
          <span className="dot" />
          {reason.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="actions">
        <button
          className="btn-link-dark"
          disabled={!dirty || !label.trim()}
          onClick={() => onSave(reason.id, { label: label.trim(), display_order: Number(order) })}
        >
          Save
        </button>
        <button
          className="btn-link-danger"
          onClick={() => onSave(reason.id, { is_active: !reason.is_active })}
        >
          {reason.is_active ? 'Deactivate' : 'Reactivate'}
        </button>
      </td>
    </tr>
  );
}
