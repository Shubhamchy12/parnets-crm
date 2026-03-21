const LoadingSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="animate-pulse space-y-3">
    <div className="h-9 rounded-lg" style={{ background: 'var(--bg-surface-3)' }} />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} className="flex-1 h-8 rounded-lg" style={{ background: 'var(--bg-surface-3)' }} />
        ))}
      </div>
    ))}
  </div>
);

export default LoadingSkeleton;
