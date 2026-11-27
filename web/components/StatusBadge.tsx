export default function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}) {
  return <span className={`status-badge status-${tone}`}>{label}</span>;
}
