export function StatTile({
  label,
  value,
  trend,
  trendTone = 'success',
}: {
  label: string;
  value: string;
  trend?: string;
  trendTone?: 'success' | 'warning' | 'danger';
}) {
  const trendColor = { success: 'text-success', warning: 'text-warning', danger: 'text-danger' }[trendTone];
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="text-xs font-semibold text-text-muted">{label}</div>
      <div className="mt-2 font-mono-num text-2xl font-semibold text-text">{value}</div>
      {trend && <div className={`mt-1.5 text-[11.5px] font-medium ${trendColor}`}>{trend}</div>}
    </div>
  );
}
