import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { leaveService } from '../services/leaveService';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import { Plus, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const BalanceCard = ({ type, used, total, color }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
    <p className="text-xs font-medium text-slate-500 mb-2">{type}</p>
    <div className="flex items-end justify-between mb-2">
      <span className="page-title text-2xl">{total - used}</span>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>of {total}</span>
    </div>
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min((used / total) * 100, 100)}%` }} />
    </div>
    <p className="text-xs text-slate-400 mt-1">{used} used</p>
  </div>
);

const Leaves = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = ['admin', 'super_admin', 'manager'].includes(user?.role);

  const { data: leaves, isLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => leaveService.getMyLeaves().then(r => r.data?.data?.leaves || r.data?.leaves || []),
  });

  const { data: balance } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => leaveService.getBalance().then(r => r.data?.data?.balance || r.data?.balance || {}),
  });

  // For admins: fetch pending count
  const { data: pendingLeaves } = useQuery({
    queryKey: ['team-leaves-pending-count'],
    queryFn: () => leaveService.getTeamLeaves({ status: 'pending' }).then(r => r.data?.data?.leaves || r.data?.leaves || []),
    enabled: isAdmin,
  });
  const pendingCount = pendingLeaves?.length || 0;

  const columns = [
    { key: 'leaveType', label: 'Type', render: v => v || '—' },
    { key: 'fromDate', label: 'From', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'toDate', label: 'To', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'days', label: 'Days', render: v => v || '—' },
    { key: 'reason', label: 'Reason', render: v => <span className="truncate max-w-xs block">{v || '—'}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'pending'} /> },
  ];

  const balanceItems = [
    { type: 'Casual Leave', used: balance?.cl?.used || 0, total: balance?.cl?.total || 12, color: 'bg-blue-500' },
    { type: 'Sick Leave', used: balance?.sl?.used || 0, total: balance?.sl?.total || 10, color: 'bg-red-400' },
    { type: 'Earned Leave', used: balance?.el?.used || 0, total: balance?.el?.total || 15, color: 'bg-green-500' },
  ];

  return (
    <div>
      <PageHeader title="My Leaves"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Leaves' }]}
        actions={
          <button onClick={() => navigate('/leaves/apply')}
            className="modal-btn-primary flex items-center gap-2 px-4 py-2">
            <Plus className="w-4 h-4" /> Apply Leave
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {balanceItems.map(b => <BalanceCard key={b.type} {...b} />)}
      </div>

      {/* Admin banner for pending approvals */}
      {isAdmin && pendingCount > 0 && (
        <button
          onClick={() => navigate('/leaves/team')}
          className="w-full flex items-center gap-3 p-4 mb-5 bg-amber-50 border border-amber-200 rounded-2xl text-left hover:bg-amber-100 transition-colors"
        >
          <div className="flex-shrink-0 w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
            <Bell className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {pendingCount} pending leave request{pendingCount > 1 ? 's' : ''} awaiting approval
            </p>
            <p className="text-xs text-amber-600">Click to review and approve/reject</p>
          </div>
          <span className="text-xs font-semibold text-amber-700 bg-amber-200 px-2.5 py-1 rounded-full">
            Review →
          </span>
        </button>
      )}

      <div className="crm-card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Leave History</h3>
        <DataTable columns={columns} data={leaves || []} loading={isLoading}
          onRowClick={row => navigate(`/leaves/${row._id}`)} />
      </div>
    </div>
  );
};

export default Leaves;
