/**
 * Astemo corporate wordmark, rendered for the dark theme:
 * white "Astemo" wordmark, an Astemo Red rule, and the "Mobility Beyond"
 * tagline. Used in the top-right of every main screen.
 */
export default function AstemoLogo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className={size === 'lg' ? 'astemo-logo lg' : 'astemo-logo'} aria-label="Astemo — Mobility Beyond">
      <span className="astemo-word">Astemo</span>
      <span className="astemo-rule" aria-hidden />
      <span className="astemo-tag">Mobility Beyond</span>
    </span>
  );
}
