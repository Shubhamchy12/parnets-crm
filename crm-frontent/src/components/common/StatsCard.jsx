const StatsCard = ({ title, value, icon: Icon, color = 'bg-blue-600', change, sub }) => (
  <div className="stats-card">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{title}</p>
        <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</p>
        {change && <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-success)' }}>{change}</p>}
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
      {Icon && (
        <div className={`${color} p-3 rounded-xl flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  </div>
);

export default StatsCard;
