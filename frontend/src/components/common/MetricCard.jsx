/**
 * @file MetricCard.jsx
 * @description KPI telemetry card displaying metrics, icon, trend indicator, and helper text.
 */

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  badgeText,
  badgeColor = 'blue',
  onClick,
}) {
  const badgeClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  }[badgeColor] || 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-stone-200 p-5 shadow-xs transition hover:shadow-md ${
        onClick ? 'cursor-pointer hover:border-stone-400' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          {title}
        </span>
        {icon && <span className="text-xl">{icon}</span>}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-slate-900">{value}</span>
        {badgeText && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badgeClasses}`}>
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && <p className="text-xs text-stone-500 mt-2">{subtitle}</p>}
    </div>
  );
}

