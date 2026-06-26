import { useEffect, useState } from 'react';
import { useLine } from '../lib/LineContext';
import { getConfig, saveConfig } from '../lib/api';

export default function ConfigPage() {
  const { line } = useLine();
  const [threshold, setThreshold] = useState('60');
  const [repeat, setRepeat] = useState('15');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!line) return;
    setLoading(true);
    getConfig(line.id)
      .then((cfg) => {
        if (cfg) {
          setThreshold(String(cfg.alert_threshold_minutes));
          setRepeat(String(cfg.alert_repeat_minutes));
        }
      })
      .catch((e) => setError(e.message))
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
      <h2>Alert Configuration — {line.short_name}</h2>
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
        {saved && <span className="saved-note">Saved ✓</span>}
      </div>
    </section>
  );
}
