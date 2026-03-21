import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';

const DataTable = ({ columns, data, loading, pageSize = 10, onRowClick, emptyMessage }) => {
  const safeData = Array.isArray(data) ? data : [];

  // Safely convert any value to a renderable React node
  const safeRender = (value) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toLocaleDateString();
    if (Array.isArray(value)) return value.length ? value.map(v => (typeof v === 'object' ? JSON.stringify(v) : v)).join(', ') : '—';
    if (typeof value === 'object') {
      // Try common name fields first
      if (value.name) return value.name;
      if (value.title) return value.title;
      if (value.label) return value.label;
      // Flatten address-like objects
      const parts = Object.values(value).filter(v => v && typeof v === 'string');
      return parts.length ? parts.join(', ') : '—';
    }
    return '—';
  };
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = sortKey
    ? [...safeData].sort((a, b) => {
        const av = a[sortKey] ?? ''; const bv = b[sortKey] ?? '';
        return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
      })
    : safeData;

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <LoadingSkeleton rows={5} cols={columns.length} />;
  if (!safeData.length) return <EmptyState message={emptyMessage} />;

  return (
    <div>
      <div className="crm-table-wrap overflow-x-auto -mx-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className="crm-table text-sm" style={{ minWidth: '600px', width: '100%' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={col.sortable !== false ? 'cursor-pointer select-none' : ''}
                  style={{ userSelect: 'none' }}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === 'asc'
                        ? <ChevronUp className="w-3 h-3" />
                        : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr key={row._id || i}
                onClick={() => onRowClick?.(row)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map(col => (
                  <td key={col.key}
                    onClick={col.sortable === false ? e => e.stopPropagation() : undefined}
                  >
                    {col.render ? col.render(row[col.key], row) : safeRender(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, safeData.length)} of {safeData.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => Math.abs(p - page) <= 2)
              .map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-8 h-8 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: p === page ? 'var(--brand-primary)' : 'transparent',
                    color: p === page ? '#fff' : 'var(--text-secondary)',
                  }}
                  onMouseEnter={e => { if (p !== page) e.currentTarget.style.background = 'var(--bg-surface-2)'; }}
                  onMouseLeave={e => { if (p !== page) e.currentTarget.style.background = 'transparent'; }}
                >
                  {p}
                </button>
              ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
