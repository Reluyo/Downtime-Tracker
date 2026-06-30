import { useLine } from '../lib/LineContext';

/** Renders "Title — <line short name / dropdown>" matching the Equipment page heading. */
export default function LineSelectHeading({ title }: { title: string }) {
  const { lines, line, setLineId } = useLine();
  if (!line) return <h2>{title}</h2>;

  return (
    <h2>
      {title} —{' '}
      {lines.length > 1 ? (
        <select
          className="line-select-inline"
          value={line.id}
          onChange={(e) => setLineId(e.target.value)}
        >
          {lines.map((l) => (
            <option key={l.id} value={l.id}>{l.short_name}</option>
          ))}
        </select>
      ) : (
        line.short_name
      )}
    </h2>
  );
}
