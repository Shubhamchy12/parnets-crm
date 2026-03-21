import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const PageHeader = ({ title, breadcrumbs = [], actions }) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 mb-1" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              {b.href
                ? <Link to={b.href} className="breadcrumb-link transition-colors">{b.label}</Link>
                : <span>{b.label}</span>
              }
            </span>
          ))}
        </nav>
      )}
      <h1 className="page-title">{title}</h1>
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
