import { useCallback, useEffect, useState } from 'react';
import { useLine } from '../lib/LineContext';
import { createEquipment, getEquipment, updateEquipment } from '../lib/api';
import type { Equipment } from '../types';

export default function EquipmentPage() {
  const { line } = useLine();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New-equipment form
  const [newName, setNewName] = useState('');
  const [newOrder, setNewOrder] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!line) return;
    setLoading(true);
    setError(null);
    try {
      setEquipment(await getEquipment(line.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [line]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    if (!line || !newName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const order = newOrder ? Number(newOrder) : equipment.length + 1;
      await createEquipment({ line_id: line.id, name: newName.trim(), display_order: order });
      setNewName('');
      setNewOrder('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  }

  async function persist(id: string, patch: Partial<Equipment>) {
    try {
      await updateEquipment(id, patch);
      await load();
    } catch (e) {
      alert(`Update failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (!line) return <p>Loading line…</p>;

  return (
    <section>
      <h2>Equipment — {line.short_name}</h2>
      {error && <div className="error">{error}</div>}

      <div className="add-row">
        <input
          placeholder="New equipment name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          className="order-input"
          type="number"
          placeholder="Order"
          value={newOrder}
          onChange={(e) => setNewOrder(e.target.value)}
        />
        <button className="btn-primary" onClick={handleAdd} disabled={adding || !newName.trim()}>
          {adding ? 'Adding…' : 'Add equipment'}
        </button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Order</th>
              <th>Name</th>
              <th style={{ width: 110 }}>Status</th>
              <th style={{ width: 160 }}></th>
            </tr>
          </thead>
          <tbody>
            {equipment.map((eq) => (
              <EquipmentRow key={eq.id} equipment={eq} onSave={persist} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function EquipmentRow({
  equipment,
  onSave,
}: {
  equipment: Equipment;
  onSave: (id: string, patch: Partial<Equipment>) => void;
}) {
  const [name, setName] = useState(equipment.name);
  const [order, setOrder] = useState(String(equipment.display_order));

  const dirty = name !== equipment.name || order !== String(equipment.display_order);

  return (
    <tr className={equipment.is_active ? '' : 'row-inactive'}>
      <td>
        <input
          className="order-input"
          type="number"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        />
      </td>
      <td>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td>
        <span className={equipment.is_active ? 'badge closed' : 'badge'}>
          {equipment.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="actions">
        <button
          className="btn-link-dark"
          disabled={!dirty || !name.trim()}
          onClick={() => onSave(equipment.id, { name: name.trim(), display_order: Number(order) })}
        >
          Save
        </button>
        <button
          className="btn-link-danger"
          onClick={() => onSave(equipment.id, { is_active: !equipment.is_active })}
        >
          {equipment.is_active ? 'Deactivate' : 'Reactivate'}
        </button>
      </td>
    </tr>
  );
}
