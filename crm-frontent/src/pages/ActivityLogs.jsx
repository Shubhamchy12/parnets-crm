import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Activity, AlertCircle, CheckCircle, Info, Clock, Download } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/common/PageHeader';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

const ActivityLogs = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const isSuperAdmin = user?.role === 'super_admin';

  const { data, isLoading } = useQuery({
    queryKey: ['activities', isSuperAdmin],
    queryFn: () => {
      const endpoint = isSuperAdmin ? '/activities' : '/activities/my';
      return api.get(endpoint, { params: { limit: 100 } }).then(r => r.data?.data?.activities || []);
    },
  });

  const filtered = (data || []).filter(a =>
    !search ||
    a.action?.toLowerCase().includes(search.toLowerCase()) ||
    a.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.entity?.toLowerCase().includes(search.toLowerCase())
  );

  const getSeverityStyle = (action = '') => {
    if (action.includes('delete') || action.includes('fail') || action.includes('error')) return { icon: <AlertCircle className="w-4 h-4 text-red-500" />, border: 'border-l-red-400 bg-red-50' };
    if (action.includes('update') || action.includes('edit')) return { icon: <AlertCircle className="w-4 h-4 text-yellow-500" />, border: 'border-l-yellow-400 bg-yellow-50' };
    if (action.includes('create') || action.includes('login') || action.includes('checkin')) return { icon: <CheckCircle className="w-4 h-4 text-green-500" />, border: 'border-l-green-400 bg-green-50' };
    return { icon: <Info className="w-4 h-4 text-blue-500" />, border: 'border-l-blue-400 bg-blue-50' };
  };

  return (
    <div>
      <PageHeader
        title="Activity Logs"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Activity Logs' }]}
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search activities..."
            className="crm-input pl-9" />
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No activities found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a, i) => {
            const { icon, border } = getSeverityStyle(a.action);
            return (
              <div key={a._id || i} className={`bg-white rounded-xl border-l-4 border border-slate-100 shadow-sm p-4 ${border}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-slate-800">{a.user?.name || 'System'}</span>
                      {a.user?.role && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full capitalize">{a.user.role.replace(/_/g, ' ')}</span>
                      )}
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{a.action?.replace(/_/g, ' ')}</span>
                    </div>
                    {a.description && <p className="text-sm text-slate-600 mb-1">{a.description}</p>}
                    {a.entity && <p className="text-xs" style={{ color: "var(--text-muted)" }}>Entity: {a.entity} {a.entityId ? `(${a.entityId})` : ''}</p>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;
