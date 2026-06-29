import { useCallback, useEffect, useState } from 'react';
import { useLine } from '../lib/LineContext';
import { createLine, getLines, updateLine } from '../lib/api';
import type { Line } from '../lib/api';

export default function LinesPage() {
  const { setLineId } = useLine();
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLines(await getLines());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    if (!newName.trim() || !newShortName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const created = await createLine({ name: newName.trim(), short_name: newShortName.trim() });
      setNewName('');
      setNewShortName('');
      await load();
      setLineId(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  }

  async function persist(id: string, patch: Partial<Line>) {
    try {
      await updateLine(id, patch);
      await load();
    } catch (e) {
      alert(`Update failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  return (
    <section>
      <h2>Lines</h2>
      {error && <div className="error">{error}</div>}

      <div className="add-row">
        <input
          placeholder="Line name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          placeholder="Short name"
          value={newShortName}
          onChange={(e) => setNewShortName(e.target.value)}
          style={{ width: 140 }}
        />
        <button
          className="btn-primary"
          onClick={handleAdd}
          disabled={adding || !newName.trim() || !newShortName.trim()}
        >
          {adding ? 'Adding…' : 'Add line'}
        </button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th style={{ width: 160 }}>Short Name</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={3} className="empty">No lines configured</td>
              </tr>
            )}
            {lines.map((l) => (
              <LineRow key={l.id} line={l} onSave={persist} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function LineRow({
  line,
  onSave,
}: {
  line: Line;
  onSave: (id: string, patch: Partial<Line>) => void;
}) {
  const [name, setName] = useState(line.name);
  const [shortName, setShortName] = useState(line.short_name);

  const dirty = name !== line.name || shortName !== line.short_name;

  return (
    <tr>
      <td>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td>
        <input value={shortName} onChange={(e) => setShortName(e.target.value)} />
      </td>
      <td className="actions">
        <button
          className="btn-link-dark"
          disabled={!dirty || !name.trim() || !shortName.trim()}
          onClick={() => onSave(line.id, { name: name.trim(), short_name: shortName.trim() })}
        >
          Save
        </button>
      </td>
    </tr>
  );
}
